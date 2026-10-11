import { AuthorizedScope } from "./auth";
import { GlobalFilters } from "./filter";

/** Decimal strings are view outputs; the UI formats them without calculating KPIs. */
export type Decimal = string;
export interface KpiSummary {
  portfolioBalance: Decimal | null;
  portfolioTarget: Decimal | null;
  gapToTarget: Decimal | null;
  achievementPercentage: Decimal | null;
  monthlyPaceRequired: Decimal | null;
  activeCustomersCount: number;
  totalDealsCount: number;
  weightedYieldPercentage: Decimal | null;
  monthlyNetMovement: Decimal | null;
  mtdInflow: Decimal | null;
  mtdOutflow: Decimal | null;
  ytdInflow: Decimal | null;
  ytdOutflow: Decimal | null;
  ytdNetMovement: Decimal | null;
  profitability: Decimal | null;
  wacc: Decimal | null;
  asOfDate: string;
  currency: string;
  dataVersion: string;
  metricDefinitionVersion: string;
  availability: "available" | "no-data";
  provisional: boolean;
  paceBasis: string;
}

export interface MonthlyMovement {
  month: string;
  openingPosition: number | Decimal;
  externalInflows: number | Decimal;
  outflowsLiquidations: number | Decimal;
  netMovement: number | Decimal;
  closingPosition: number | Decimal;
  targetPosition: number | Decimal | null;
  paceRequired: number | Decimal | null;
}

export interface CustomerSummaryItem {
  customerId: string;
  customerName: string;
  accountNumber: string;
  totalPortfolio: number;
  activeInvestmentsCount: number;
  relationshipOfficerId: string;
  relationshipOfficerName: string;
  branchName: string;
  tier: "Platinum" | "Gold" | "Silver" | "Standard";
}

export interface InvestmentDealItem {
  investmentId: string;
  customerId: string;
  customerName: string;
  productCode: string;
  productName: string;
  principalAmount: number;
  interestRatePercentage: number;
  tenorDays: number;
  effectiveDate: string;
  maturityDate: string;
  roId: string;
  roName: string;
  status: "Active" | "Matured" | "Pending";
}

export interface RoPerformanceItem {
  roId: string;
  roName: string;
  regionId: string;
  regionName: string;
  branchName: string;
  closingPosition: Decimal | null;
  targetAmount: Decimal | null;
  achievementPercentage: Decimal | null;
  gapAmount: Decimal | null;
  requiredPaceMonthly: Decimal | null;
  monthlyNetMovement: Decimal | null;
  wacc: Decimal | null;
  profitability: Decimal | null;
  customerCount: number;
}

export interface ProductInvestmentMixItem {
  productCode: string;
  productName: string;
  allocatedAmount: Decimal;
  percentageShare: Decimal;
  denominatorAmount: Decimal;
}

export interface PerformanceRepository {
  getKpiSummary(scope: AuthorizedScope, filters: GlobalFilters): Promise<KpiSummary>;
  getMonthlyMovement(scope: AuthorizedScope, filters: GlobalFilters): Promise<MonthlyMovement[]>;
  getCustomerList(scope: AuthorizedScope, filters: GlobalFilters): Promise<CustomerSummaryItem[]>;
  getInvestmentList(scope: AuthorizedScope, filters: GlobalFilters): Promise<InvestmentDealItem[]>;
  getRoPerformanceComparison(scope: AuthorizedScope, filters: GlobalFilters): Promise<RoPerformanceItem[]>;
  getProductInvestmentMix(scope: AuthorizedScope, filters: GlobalFilters): Promise<ProductInvestmentMixItem[]>;
}
