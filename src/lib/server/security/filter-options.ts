import "server-only";
import type { User } from "@/types/auth";
import { getActiveDataCatalog } from "@/lib/server/repository/data-catalog";
import { ROLE_VIEWS } from "@/lib/filters";
import { normalizeAuthorizedScope } from "./scope";
export function getFilterOptions(user: User) {
  const catalog = getActiveDataCatalog();
  const { scope } = normalizeAuthorizedScope(user);
  return {
    regions: catalog.regions.filter(r => r.id === scope.effectiveRegionId),
    officers: Object.values(catalog.users).filter(u => u.role === "RO" && scope.allowedRoIds.includes(u.roId!) && u.regionId === scope.effectiveRegionId)
      .map(u => ({ id: u.roId!, name: u.name, regionId: u.regionId })),
    products: catalog.products,
    roleViews: ROLE_VIEWS,
    defaultDate: catalog.defaultDate,
    reportingDates: catalog.reportingDates,
  };
}
