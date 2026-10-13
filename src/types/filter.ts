export type PeriodMode = "MTD" | "YTD";
export type RoleView = "portfolio-overview" | "investment-breakdown" | "monthly-movement";

export interface GlobalFilters {
  // Optional for existing repository callers; server normalization always supplies it.
  // Presentation only: never an entitlement or an authenticated role.
  roleView?: RoleView;
  regionId: string;
  roId: string; // 'ALL' or specific roId
  startDate?: string; // ISO date string (YYYY-MM-DD)
  asOfDate: string; // ISO date string (YYYY-MM-DD)
  productCode: string; // 'PROD-ALL' or specific product code
  periodMode: PeriodMode;
}

export interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}
