import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/types/auth";
import type { GlobalFilters } from "@/types/filter";
import { normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";
import { getMisDataMode } from "@/lib/server/repository/data-mode";
import { getProductDisplayName, getProductName, isDemoV2SupportedAsOfDate } from "@/lib/server/repository/data-catalog";
import { mapFinancialSampleScope } from "@/lib/server/financial-sample/scope";

const catalog = {
  "ro_overview:movement": "RO", "ro_overview:position": "RO",
  "regional_overview:movement": "REGIONAL_MANAGER", "regional_overview:position": "REGIONAL_MANAGER",
  "regional_overview:ro_position_target": "REGIONAL_MANAGER", investment_mix: "BOTH",
  monthly_performance_review: "BOTH",
  csv_monthly_performance_review: "BOTH",
  financial_sample_overview: "BOTH",
  financial_sample_investments: "BOTH",
  financial_sample_customers: "BOTH",
  financial_sample_concentration: "BOTH",
  financial_sample_profitability: "BOTH",
  financial_sample_targets: "BOTH",
  financial_sample_export: "BOTH",
} as const;
type Registry = {
  domain: string;
  dashboards: Record<string, { uuid: string; datasetId: number; dashboardId?: number; chartId?: number }>;
};
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

function demoV2RlsClause(scope: ReturnType<typeof normalizeAuthorizedScope>["scope"], filters: GlobalFilters): string {
  // Every demo dataset exposes these fields. RLS deliberately carries the
  // effective URL state into Superset so a guest cannot remove it in chart SQL.
  if (!isDemoV2SupportedAsOfDate(filters.asOfDate)) return "1 = 0";
  const month = `${filters.asOfDate.slice(0, 7)}-01`;
  const start = filters.periodMode === "MTD" ? month : `${filters.asOfDate.slice(0, 4)}-01-01`;
  const clauses = [
    "data_classification = 'SYNTHETIC_DEMO_ONLY'",
    `region_id = ${literal(scope.effectiveRegionId)}`,
    `ro_id IN (${scope.effectiveRoIds.map(literal).join(", ")})`,
    `reporting_month BETWEEN ${literal(start)} AND ${literal(month)}`,
  ];
  if (filters.productCode !== "PROD-ALL") {
    const product = getProductName(filters.productCode);
    if (!product) throw new ScopeError("Product is outside the authorized reporting catalog.");
    clauses.push(`product = ${literal(product)}`);
  }
  return clauses.join(" AND ");
}

function monthlyReviewRlsClause(user: User, scope: ReturnType<typeof normalizeAuthorizedScope>["scope"], filters: GlobalFilters, mode: ReturnType<typeof getMisDataMode>): string {
  const scopeKey = user.role === "RO" || filters.roId !== "ALL"
    ? scope.effectiveRoIds[0]
    : mode === "demo-v2" ? `${scope.effectiveRegionId}:ALL` : user.allowedRoIds.slice().sort().join(",");
  const product = filters.productCode === "PROD-ALL" ? "All Products" : getProductName(filters.productCode);
  if (!product) throw new ScopeError("Product is outside the authorized reporting catalog.");
  return [
    "data_classification = 'SYNTHETIC_DEMO_ONLY'",
    `region_id = ${literal(scope.effectiveRegionId)}`,
    `scope_key = ${literal(scopeKey)}`,
    `reporting_date BETWEEN ${literal(filters.startDate!)} AND ${literal(filters.asOfDate)}`,
    `product_filter = ${literal(product)}`,
  ].join(" AND ");
}

function csvReviewRlsClause(user: User, scope: ReturnType<typeof normalizeAuthorizedScope>["scope"], filters: GlobalFilters): string {
  const scopeKey = user.role === "RO" || filters.roId !== "ALL" ? scope.effectiveRoIds[0] : `${scope.effectiveRegionId}:ALL`;
  const clauses = [
    "data_classification = 'SYNTHETIC_CSV_IMPORT'",
    `region_id = ${literal(scope.effectiveRegionId)}`,
    `scope_key = ${literal(scopeKey)}`,
    `reporting_date BETWEEN ${literal(filters.startDate!)} AND ${literal(filters.asOfDate)}`,
  ];
  if (filters.productCode !== "PROD-ALL") {
    const product = getProductName(filters.productCode);
    if (!product) throw new ScopeError("Product is outside the authorized reporting catalog.");
    clauses.push(`product = ${literal(product)}`);
  }
  return clauses.join(" AND ");
}

const FINANCIAL_SAMPLE_KEYS = new Set([
  "financial_sample_overview",
  "financial_sample_investments",
  "financial_sample_customers",
  "financial_sample_concentration",
  "financial_sample_profitability",
  "financial_sample_targets",
  "financial_sample_export",
]);

function financialSampleRlsClause(
  scope: ReturnType<typeof normalizeAuthorizedScope>["scope"],
  filters: GlobalFilters,
  mode: ReturnType<typeof getMisDataMode>,
): string {
  if (filters.asOfDate !== "2026-10-10") {
    throw new ScopeError("The financial sample is available only at its configured 10 October 2026 cutoff.");
  }
  const { regionId, roIds } = mapFinancialSampleScope(scope, mode === "demo-v2");
  const clauses = [
    "data_classification = 'SYNTHETIC_DEMO_ONLY'",
    `region_id = ${literal(regionId)}`,
    `ro_id IN (${roIds.map(literal).join(", ")})`,
    `reporting_cutoff = ${literal(filters.asOfDate)}`,
    `reporting_date BETWEEN ${literal(filters.startDate!)} AND ${literal(filters.asOfDate)}`,
  ];
  if (filters.productCode !== "PROD-ALL") {
    const product = getProductDisplayName(filters.productCode);
    if (!product) throw new ScopeError("Product is outside the authorized reporting catalog.");
    clauses.push(`product = ${literal(product)}`);
  }
  return clauses.join(" AND ");
}

async function supersetPost(domain: string, route: string, body: unknown, accessToken?: string, extraHeaders: Record<string, string> = {}) {
  const response = await fetch(`${domain}${route}`, {
    method: "POST", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Superset service request failed");
  return response.json();
}

export async function createGuestToken(user: User, dashboardKey: string, rawFilters: Partial<GlobalFilters>) {
  if (!Object.hasOwn(catalog, dashboardKey)) throw new ScopeError("Unknown analytics dashboard.");
  const role = catalog[dashboardKey as keyof typeof catalog];
  if (role !== "BOTH" && role !== user.role) throw new ScopeError("Dashboard is outside your role.");
  const { scope, filters } = normalizeAuthorizedScope(user, rawFilters);
  // Explicit development opt-in. Runtime files contain no production schema or credentials.
  if (process.env.PIS_SUPERSET_LOCAL_ENABLED !== "true") throw new Error("Local analytics is not enabled");
  const mode = getMisDataMode();
  const runtime = path.join(process.cwd(), ".local", "superset");
  // The default registry remains entirely separate from the parallel demo-v2
  // UUIDs; no demo request can select a Phase 2 dashboard resource.
  const registryName = FINANCIAL_SAMPLE_KEYS.has(dashboardKey)
    ? "financial-sample-registry.json"
    : dashboardKey === "csv_monthly_performance_review"
    ? "csv-import-registry.json"
    : mode === "demo-v2" ? "demo-v2-registry.json" : "registry.json";
  const registry: Registry = JSON.parse(await readFile(path.join(runtime, registryName), "utf8"));
  const secrets = JSON.parse(await readFile(path.join(runtime, "secrets.json"), "utf8"));
  const dashboard = registry.dashboards[dashboardKey];
  if (!dashboard) throw new Error("Analytics dashboard is not configured");
  const domain = new URL(registry.domain);
  if (domain.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(domain.hostname)) throw new Error("Local analytics must use loopback");
  // Scope and every visible filter are enforced in Superset SQL, including cached queries.
  // scope_key identifies a precomputed, exact set of authorized ROs, never an ALL wildcard.
  const clause = FINANCIAL_SAMPLE_KEYS.has(dashboardKey)
    ? financialSampleRlsClause(scope, filters, mode)
    : dashboardKey === "csv_monthly_performance_review"
    ? csvReviewRlsClause(user, scope, filters)
    : dashboardKey === "monthly_performance_review"
    ? monthlyReviewRlsClause(user, scope, filters, mode)
    : mode === "demo-v2"
    ? demoV2RlsClause(scope, filters)
    : [
        `region_id = ${literal(scope.effectiveRegionId)}`,
        `scope_key = ${literal(scope.effectiveRoIds.slice().sort().join(","))}`,
        `as_of_date = ${literal(filters.asOfDate)}`,
        `product_filter = ${literal(filters.productCode)}`,
        `period_mode = ${literal(filters.periodMode)}`,
      ].join(" AND ");
  const login = await supersetPost(registry.domain, "/api/v1/security/login", {
    username: "pis-token-broker", password: secrets.broker_password, provider: "db", refresh: false,
  });
  const csrfResponse = await fetch(`${registry.domain}/api/v1/security/csrf_token/`, {
    cache: "no-store", signal: AbortSignal.timeout(15000), headers: { Authorization: `Bearer ${login.access_token}` },
  });
  if (!csrfResponse.ok) throw new Error("Superset session initialization failed");
  const csrf = await csrfResponse.json();
  const cookie = csrfResponse.headers.getSetCookie().map(value => value.split(";")[0]).join("; ");
  const result = await supersetPost(registry.domain, "/api/v1/security/guest_token/", {
    user: { username: user.id, first_name: "Synthetic", last_name: "Viewer" },
    resources: [{ type: "dashboard", id: dashboard.uuid }],
    // Global guest RLS also protects requests that attempt to change the dataset.
    rls: [{ clause }],
  }, login.access_token, { "X-CSRFToken": csrf.result, Cookie: cookie });
  return { token: result.token, dashboardId: dashboard.uuid, supersetDomain: registry.domain, expiresIn: 300, synthetic: true };
}
