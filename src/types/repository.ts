import { AuthorizedScope } from "./auth";
import { GlobalFilters } from "./filter";

export interface KpiSummary {
  portfolioBalance: number;
  portfolioTarget: number;
  gapToTarget: number;
  achievementPercentage: number;
  monthlyPaceRequired: number;
  activeCustomersCount: number;
  totalDealsCount: number;
  weightedYieldPercentage: number;
  asOfDate: string;
}

export interface MonthlyMovement {
  month: string; // e.g. "2026-09"
  openingPosition: number;
  externalInflows: number;
  outflowsLiquidations: number;
  netMovement: number;
  closingPosition: number;
  targetPosition: number;
  paceRequired: number;
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
  closingPosition: number;
  targetAmount: number;
  achievementPercentage: number;
  gapAmount: number;
  requiredPaceMonthly: number;
  customerCount: number;
}

export interface ProductInvestmentMixItem {
  productCode: string;
  productName: string;
  allocatedAmount: number;
  percentageShare: number;
}

export interface PerformanceRepository {
  getKpiSummary(scope: AuthorizedScope, filters: GlobalFilters): Promise<KpiSummary>;
  getMonthlyMovement(scope: AuthorizedScope, filters: GlobalFilters): Promise<MonthlyMovement[]>;
  getCustomerList(scope: AuthorizedScope, filters: GlobalFilters): Promise<CustomerSummaryItem[]>;
  getInvestmentList(scope: AuthorizedScope, filters: GlobalFilters): Promise<InvestmentDealItem[]>;
  getRoPerformanceComparison(scope: AuthorizedScope, filters: GlobalFilters): Promise<RoPerformanceItem[]>;
  getProductInvestmentMix(scope: AuthorizedScope, filters: GlobalFilters): Promise<ProductInvestmentMixItem[]>;
}
