import type { GlobalFilters, RoleView } from "@/types/filter";
export type SearchParams = Record<string, string | string[] | undefined>;
export const DEFAULT_DATE = "2026-09-30";
export const ROLE_VIEWS = [
  { value: "portfolio-overview", label: "Portfolio Overview" },
  { value: "investment-breakdown", label: "Investment Breakdown" },
  { value: "monthly-movement", label: "Monthly Movement" },
] as const;
export const DEFAULT_ROLE_VIEW: RoleView = "portfolio-overview";
export function normalizeRoleView(value: unknown): RoleView {
  return ROLE_VIEWS.find(option => option.value === value)?.value ?? DEFAULT_ROLE_VIEW;
}
export const FILTER_KEYS = ["roleView", "regionId", "roId", "startDate", "asOfDate", "productCode", "periodMode"] as const;
export function filterQuery(filters: GlobalFilters) {
  return new URLSearchParams(Object.entries({ ...filters, roleView: normalizeRoleView(filters.roleView) })
    .filter((entry): entry is [string, string] => typeof entry[1] === "string")).toString();
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
