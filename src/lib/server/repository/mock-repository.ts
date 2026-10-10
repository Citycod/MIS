import { AuthorizedScope } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";
import {
  CustomerSummaryItem,
  InvestmentDealItem,
  KpiSummary,
  MonthlyMovement,
  PerformanceRepository,
  ProductInvestmentMixItem,
  RoPerformanceItem,
} from "@/types/repository";
import { MOCK_CUSTOMERS, MOCK_INVESTMENTS, MOCK_MOVEMENT_LEDGER } from "@/mocks/fixtures";

export class MockPerformanceRepository implements PerformanceRepository {
  async getKpiSummary(scope: AuthorizedScope, filters: GlobalFilters): Promise<KpiSummary> {
    const isRegionalAll = scope.role === "REGIONAL_MANAGER" && (filters.roId === "ALL" || !filters.roId);

    if (isRegionalAll && scope.effectiveRegionId === "REG-01") {
      // REG-01 Aggregate totals (RO-001 + RO-002)
      return {
        portfolioBalance: 1110000000,
        portfolioTarget: 1700000000,
        gapToTarget: 590000000,
        achievementPercentage: 65.29,
        monthlyPaceRequired: 147500000,
        activeCustomersCount: 18,
        totalDealsCount: 24,
        weightedYieldPercentage: 16.85,
        asOfDate: filters.asOfDate || "2026-09-30",
      };
    }

    if (filters.roId === "RO-002") {
      return {
        portfolioBalance: 310000000,
        portfolioTarget: 500000000,
        gapToTarget: 190000000,
        achievementPercentage: 62.0,
        monthlyPaceRequired: 47500000,
        activeCustomersCount: 6,
        totalDealsCount: 8,
        weightedYieldPercentage: 15.9,
        asOfDate: filters.asOfDate || "2026-09-30",
      };
    }

    // Default RO-001
    return {
      portfolioBalance: 800000000,
      portfolioTarget: 1200000000,
      gapToTarget: 400000000,
      achievementPercentage: 66.67,
      monthlyPaceRequired: 100000000,
      activeCustomersCount: 12,
      totalDealsCount: 16,
      weightedYieldPercentage: 17.2,
      asOfDate: filters.asOfDate || "2026-09-30",
    };
  }

  async getMonthlyMovement(_scope: AuthorizedScope, _filters: GlobalFilters): Promise<MonthlyMovement[]> {
    return MOCK_MOVEMENT_LEDGER;
  }

  async getCustomerList(scope: AuthorizedScope, _filters: GlobalFilters): Promise<CustomerSummaryItem[]> {
    if (scope.role === "RO") {
      return MOCK_CUSTOMERS.filter((c) => c.relationshipOfficerId === scope.userId || c.relationshipOfficerId === "RO-001");
    }
    return MOCK_CUSTOMERS;
  }

  async getInvestmentList(scope: AuthorizedScope, _filters: GlobalFilters): Promise<InvestmentDealItem[]> {
    if (scope.role === "RO") {
      return MOCK_INVESTMENTS.filter((inv) => inv.roId === scope.userId || inv.roId === "RO-001");
    }
    return MOCK_INVESTMENTS;
  }

  async getRoPerformanceComparison(_scope: AuthorizedScope, _filters: GlobalFilters): Promise<RoPerformanceItem[]> {
    return [
      {
        roId: "RO-001",
        roName: "Adebayo Sterling",
        regionId: "REG-01",
        regionName: "Lagos Region",
        branchName: "Victoria Island Branch",
        closingPosition: 800000000,
        targetAmount: 1200000000,
        achievementPercentage: 66.67,
        gapAmount: 400000000,
        requiredPaceMonthly: 100000000,
        customerCount: 12,
      },
      {
        roId: "RO-002",
        roName: "Chioma Okonkwo",
        regionId: "REG-01",
        regionName: "Lagos Region",
        branchName: "Ikeja Branch",
        closingPosition: 310000000,
        targetAmount: 500000000,
        achievementPercentage: 62.0,
        gapAmount: 190000000,
        requiredPaceMonthly: 47500000,
        customerCount: 6,
      },
    ];
  }

  async getProductInvestmentMix(scope: AuthorizedScope, filters: GlobalFilters): Promise<ProductInvestmentMixItem[]> {
    // Investment Product Mix fixture from spec 12 (MTD/YTD composition)
    if (filters.roId === "RO-002") {
      return [
        { productCode: "PROD-FIXED", productName: "Fixed Deposit", allocatedAmount: 20000000, percentageShare: 40.0 },
        { productCode: "PROD-TREASURY", productName: "Treasury Bills", allocatedAmount: 20000000, percentageShare: 40.0 },
        { productCode: "PROD-SUKUK", productName: "Sukuk Investments", allocatedAmount: 10000000, percentageShare: 20.0 },
      ];
    }

    if (scope.role === "REGIONAL_MANAGER" && (filters.roId === "ALL" || !filters.roId)) {
      return [
        { productCode: "PROD-FIXED", productName: "Fixed Deposit", allocatedAmount: 90000000, percentageShare: 52.94 },
        { productCode: "PROD-TREASURY", productName: "Treasury Bills", allocatedAmount: 50000000, percentageShare: 29.41 },
        { productCode: "PROD-SUKUK", productName: "Sukuk Investments", allocatedAmount: 30000000, percentageShare: 17.65 },
      ];
    }

    // Default RO-001
    return [
      { productCode: "PROD-FIXED", productName: "Fixed Deposit", allocatedAmount: 70000000, percentageShare: 58.33 },
      { productCode: "PROD-TREASURY", productName: "Treasury Bills", allocatedAmount: 30000000, percentageShare: 25.0 },
      { productCode: "PROD-SUKUK", productName: "Sukuk Investments", allocatedAmount: 20000000, percentageShare: 16.67 },
    ];
  }
}
