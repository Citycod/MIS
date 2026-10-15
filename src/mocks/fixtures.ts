import { User } from "@/types/auth";
import {
  CustomerSummaryItem,
  InvestmentDealItem,
  MonthlyMovement,
} from "@/types/repository";
import { MIS_PRODUCTS } from "@/lib/products";

export interface RegionInfo {
  id: string;
  name: string;
  code: string;
}

export const MOCK_REGIONS: RegionInfo[] = [
  { id: "REG-01", name: "Lagos Region", code: "LAG" },
  { id: "REG-02", name: "Abuja Region", code: "ABJ" },
];

export const MOCK_USERS: Record<string, User> = {
  "USR-RO-001": {
    id: "USR-RO-001",
    name: "Adebayo Adeyemi",
    email: "adebayo.adeyemi@demo.invalid",
    role: "RO",
    roId: "RO-001",
    regionId: "REG-01",
    allowedRegionIds: ["REG-01"],
    allowedRoIds: ["RO-001"],
    branchName: "Victoria Island Branch",
    title: "Senior Relationship Officer",
  },
  "USR-RO-002": {
    id: "USR-RO-002",
    name: "Chioma Okonkwo",
    email: "chioma.okonkwo@demo.invalid",
    role: "RO",
    roId: "RO-002",
    regionId: "REG-01",
    allowedRegionIds: ["REG-01"],
    allowedRoIds: ["RO-002"],
    branchName: "Ikeja Branch",
    title: "Relationship Officer",
  },
  "USR-RO-003": {
    id: "USR-RO-003",
    name: "Emeka Nwosu",
    email: "emeka.nwosu@demo.invalid",
    role: "RO",
    roId: "RO-003",
    regionId: "REG-02",
    allowedRegionIds: ["REG-02"],
    allowedRoIds: ["RO-003"],
    branchName: "Maitama Branch",
    title: "Relationship Officer",
  },
  "USR-RM-001": {
    id: "USR-RM-001",
    name: "Babatunde Folorunsho",
    email: "babatunde.folorunsho@demo.invalid",
    role: "REGIONAL_MANAGER",
    regionId: "REG-01",
    allowedRegionIds: ["REG-01"],
    allowedRoIds: ["RO-001", "RO-002"],
    branchName: "Lagos Regional Office",
    title: "Regional Manager (Lagos)",
  },
  "USR-RM-002": {
    id: "USR-RM-002",
    name: "Aisha Bello",
    email: "aisha.bello@demo.invalid",
    role: "REGIONAL_MANAGER",
    regionId: "REG-02",
    allowedRegionIds: ["REG-02"],
    allowedRoIds: ["RO-003"],
    branchName: "Abuja Regional Office",
    title: "Regional Manager (Abuja)",
  },
};

export const MOCK_PRODUCTS = [...MIS_PRODUCTS];

export const MOCK_MOVEMENT_LEDGER: MonthlyMovement[] = [
  {
    month: "2026-08",
    openingPosition: 600000000,
    externalInflows: 140000000,
    outflowsLiquidations: 30000000,
    netMovement: 110000000,
    closingPosition: 710000000,
    targetPosition: 1000000000,
    paceRequired: 72500000,
  },
  {
    month: "2026-09",
    openingPosition: 710000000,
    externalInflows: 120000000,
    outflowsLiquidations: 30000000,
    netMovement: 90000000,
    closingPosition: 800000000,
    targetPosition: 1200000000,
    paceRequired: 100000000,
  },
];

export const MOCK_CUSTOMERS: CustomerSummaryItem[] = [
  {
    customerId: "CUST-001",
    customerName: "Alpha Trading Ltd",
    accountNumber: "0019823411",
    totalPortfolio: 350000000,
    activeInvestmentsCount: 3,
    relationshipOfficerId: "RO-001",
    relationshipOfficerName: "Adebayo Adeyemi",
    branchName: "Victoria Island Branch",
    tier: "Platinum",
  },
  {
    customerId: "CUST-002",
    customerName: "Beta Logistics West Africa",
    accountNumber: "0028712390",
    totalPortfolio: 250000000,
    activeInvestmentsCount: 2,
    relationshipOfficerId: "RO-001",
    relationshipOfficerName: "Adebayo Adeyemi",
    branchName: "Victoria Island Branch",
    tier: "Gold",
  },
  {
    customerId: "CUST-003",
    customerName: "Gamma Energy Holdings",
    accountNumber: "0031109482",
    totalPortfolio: 200000000,
    activeInvestmentsCount: 2,
    relationshipOfficerId: "RO-001",
    relationshipOfficerName: "Adebayo Adeyemi",
    branchName: "Victoria Island Branch",
    tier: "Platinum",
  },
  {
    customerId: "CUST-004",
    customerName: "Delta Tech Ventures",
    accountNumber: "0048812039",
    totalPortfolio: 310000000,
    activeInvestmentsCount: 4,
    relationshipOfficerId: "RO-002",
    relationshipOfficerName: "Chioma Okonkwo",
    branchName: "Ikeja Branch",
    tier: "Gold",
  },
];

export const MOCK_INVESTMENTS: InvestmentDealItem[] = [
  {
    investmentId: "INV-2026-001",
    customerId: "CUST-001",
    customerName: "Alpha Trading Ltd",
    productCode: "PROD-FIXED",
    productName: "Fixed Deposit",
    principalAmount: 70000000,
    interestRatePercentage: 16.5,
    tenorDays: 90,
    effectiveDate: "2026-07-01",
    maturityDate: "2026-09-29",
    roId: "RO-001",
    roName: "Adebayo Adeyemi",
    status: "Active",
  },
  {
    investmentId: "INV-2026-002",
    customerId: "CUST-002",
    customerName: "Beta Logistics West Africa",
    productCode: "PROD-TREASURY",
    productName: "Treasury Bills",
    principalAmount: 30000000,
    interestRatePercentage: 18.2,
    tenorDays: 182,
    effectiveDate: "2026-06-15",
    maturityDate: "2026-12-14",
    roId: "RO-001",
    roName: "Adebayo Adeyemi",
    status: "Active",
  },
  {
    investmentId: "INV-2026-003",
    customerId: "CUST-003",
    customerName: "Gamma Energy Holdings",
    productCode: "PROD-SUKUK",
    productName: "Sukuk Investments",
    principalAmount: 20000000,
    interestRatePercentage: 14.8,
    tenorDays: 365,
    effectiveDate: "2026-01-10",
    maturityDate: "2027-01-10",
    roId: "RO-001",
    roName: "Adebayo Adeyemi",
    status: "Active",
  },
];
