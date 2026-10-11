import type { GlobalFilters } from "@/types/filter";
export type SearchParams = Record<string, string | string[] | undefined>;
export const DEFAULT_DATE = "2026-09-30";
export const FILTER_KEYS = ["regionId", "roId", "asOfDate", "productCode", "periodMode"] as const;
export function filterQuery(filters: GlobalFilters) {
  return new URLSearchParams({ ...filters }).toString();
}
export function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
