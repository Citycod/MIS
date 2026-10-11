import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@/types/auth";
import type { GlobalFilters } from "@/types/filter";
import { normalizeAuthorizedScope, ScopeError } from "@/lib/server/security/scope";

const catalog = {
  "ro_overview:movement": "RO", "ro_overview:position": "RO",
  "regional_overview:movement": "REGIONAL_MANAGER", "regional_overview:position": "REGIONAL_MANAGER",
  "regional_overview:ro_position_target": "REGIONAL_MANAGER", investment_mix: "BOTH",
} as const;
type Registry = { domain: string; dashboards: Record<string, { uuid: string; datasetId: number }> };
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;

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
  const runtime = path.join(process.cwd(), ".local", "superset");
  const registry: Registry = JSON.parse(await readFile(path.join(runtime, "registry.json"), "utf8"));
  const secrets = JSON.parse(await readFile(path.join(runtime, "secrets.json"), "utf8"));
  const dashboard = registry.dashboards[dashboardKey];
  if (!dashboard) throw new Error("Analytics dashboard is not configured");
  const domain = new URL(registry.domain);
  if (domain.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(domain.hostname)) throw new Error("Local analytics must use loopback");
  // Scope and every visible filter are enforced in Superset SQL, including cached queries.
  // scope_key identifies a precomputed, exact set of authorized ROs, never an ALL wildcard.
  const clause = [
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
