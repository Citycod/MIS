import "server-only";
import type { User } from "@/types/auth";
import { MOCK_PRODUCTS, MOCK_REGIONS, MOCK_USERS } from "@/mocks/fixtures";
import { getMisDataMode } from "./data-mode";
import snapshots from "@/mocks/dashboard-snapshots.json";
import { MIS_PRODUCTS } from "@/lib/products";

export interface DataRegion { id: string; name: string; code: string }
export interface DataProduct { code: string; name: string; sourceName?: string }
export interface DataCatalog {
  users: Record<string, User>;
  regions: DataRegion[];
  products: DataProduct[];
  defaultDate: string;
  reportingDates: readonly string[];
}

const demoRoIds = {
  LAG: ["RO-LAG-01", "RO-LAG-02", "RO-LAG-03", "RO-LAG-04"],
  ABJ: ["RO-ABJ-01", "RO-ABJ-02", "RO-ABJ-03", "RO-ABJ-04"],
  PH: ["RO-PH-01", "RO-PH-02", "RO-PH-03", "RO-PH-04"],
} as const;

const roUser = (id: string, roId: string, regionId: keyof typeof demoRoIds, ordinal: string): User => ({
  id,
  name: `Demo ${regionId === "PH" ? "Port Harcourt" : regionId === "LAG" ? "Lagos" : "Abuja"} RO ${ordinal}`,
  email: `${roId.toLowerCase()}@demo.invalid`,
  role: "RO",
  roId,
  regionId,
  allowedRegionIds: [regionId],
  allowedRoIds: [roId],
  branchName: `${regionId} Synthetic Branch`,
  title: "Relationship Officer · Synthetic Demo",
});

const managerUser = (id: string, regionId: keyof typeof demoRoIds): User => ({
  id,
  name: `Demo ${regionId === "PH" ? "Port Harcourt" : regionId === "LAG" ? "Lagos" : "Abuja"} Regional Manager`,
  email: `rm-${regionId.toLowerCase()}@demo.invalid`,
  role: "REGIONAL_MANAGER",
  regionId,
  allowedRegionIds: [regionId],
  allowedRoIds: [...demoRoIds[regionId]],
  branchName: `${regionId} Synthetic Regional Office`,
  title: "Regional Manager · Synthetic Demo",
});

const DEMO_USERS: Record<string, User> = {
  "USR-RO-001": roUser("USR-RO-001", "RO-LAG-01", "LAG", "01"),
  "USR-RO-002": roUser("USR-RO-002", "RO-LAG-02", "LAG", "02"),
  "USR-RO-003": roUser("USR-RO-003", "RO-ABJ-01", "ABJ", "01"),
  "USR-DEMO-RO-LAG-03": roUser("USR-DEMO-RO-LAG-03", "RO-LAG-03", "LAG", "03"),
  "USR-DEMO-RO-LAG-04": roUser("USR-DEMO-RO-LAG-04", "RO-LAG-04", "LAG", "04"),
  "USR-DEMO-RO-ABJ-02": roUser("USR-DEMO-RO-ABJ-02", "RO-ABJ-02", "ABJ", "02"),
  "USR-DEMO-RO-ABJ-03": roUser("USR-DEMO-RO-ABJ-03", "RO-ABJ-03", "ABJ", "03"),
  "USR-DEMO-RO-ABJ-04": roUser("USR-DEMO-RO-ABJ-04", "RO-ABJ-04", "ABJ", "04"),
  "USR-DEMO-RO-PH-01": roUser("USR-DEMO-RO-PH-01", "RO-PH-01", "PH", "01"),
  "USR-DEMO-RO-PH-02": roUser("USR-DEMO-RO-PH-02", "RO-PH-02", "PH", "02"),
  "USR-DEMO-RO-PH-03": roUser("USR-DEMO-RO-PH-03", "RO-PH-03", "PH", "03"),
  "USR-DEMO-RO-PH-04": roUser("USR-DEMO-RO-PH-04", "RO-PH-04", "PH", "04"),
  "USR-RM-001": managerUser("USR-RM-001", "LAG"),
  "USR-RM-002": managerUser("USR-RM-002", "ABJ"),
  "USR-DEMO-RM-PH": managerUser("USR-DEMO-RM-PH", "PH"),
};

// Exact published cutoffs. A well-formed date outside these sets returns no data.
export const DEMO_V2_SUPPORTED_AS_OF_DATES = [
  "2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31",
  "2026-06-30", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-10",
] as const;

const DEMO_CATALOG: DataCatalog = {
  users: DEMO_USERS,
  regions: [
    { id: "LAG", name: "Lagos Region", code: "LAG" },
    { id: "ABJ", name: "Abuja Region", code: "ABJ" },
    { id: "PH", name: "Port Harcourt Region", code: "PH" },
  ],
  products: [...MIS_PRODUCTS],
  defaultDate: "2026-10-10",
  reportingDates: DEMO_V2_SUPPORTED_AS_OF_DATES,
};

// The supplied v2.1 reporting views publish complete month-end snapshots through
// September and the explicitly documented partial October as-of date. Keep this
// list beside the catalog so every server boundary applies the same contract.
export function isDemoV2SupportedAsOfDate(value: string): boolean {
  return (DEMO_V2_SUPPORTED_AS_OF_DATES as readonly string[]).includes(value);
}

const PHASE2_CATALOG: DataCatalog = {
  users: MOCK_USERS,
  regions: MOCK_REGIONS,
  products: MOCK_PRODUCTS,
  defaultDate: "2026-09-30",
  reportingDates: [...new Set(snapshots.map(snapshot => snapshot.date))].sort(),
};

export function getActiveDataCatalog(): DataCatalog {
  return getMisDataMode() === "demo-v2" ? DEMO_CATALOG : PHASE2_CATALOG;
}

export function getProductName(productCode: string): string | null {
  const product = getActiveDataCatalog().products.find(item => item.code === productCode);
  return product?.sourceName ?? product?.name ?? null;
}
