import "server-only";
import type { User } from "@/types/auth";
import { MOCK_PRODUCTS, MOCK_REGIONS, MOCK_USERS } from "@/mocks/fixtures";
export function getFilterOptions(user: User) {
  return {
    regions: MOCK_REGIONS.filter(r => user.allowedRegionIds.includes(r.id)),
    officers: Object.values(MOCK_USERS).filter(u => u.role === "RO" && user.allowedRoIds.includes(u.roId!) && user.allowedRegionIds.includes(u.regionId))
      .map(u => ({ id: u.roId!, name: u.name, regionId: u.regionId })),
    products: MOCK_PRODUCTS,
  };
}
