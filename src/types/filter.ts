export type PeriodMode = "MTD" | "YTD";

export interface GlobalFilters {
  regionId: string;
  roId: string; // 'ALL' or specific roId
  asOfDate: string; // ISO date string (YYYY-MM-DD)
  productCode: string; // 'PROD-ALL' or specific product code
  periodMode: PeriodMode;
}

export interface OptionItem {
  value: string;
  label: string;
  disabled?: boolean;
}
