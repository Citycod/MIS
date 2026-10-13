import "server-only";
import { AuthorizedScope, User } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";
import { normalizeRoleView, validDate } from "@/lib/filters";
import { getActiveDataCatalog } from "@/lib/server/repository/data-catalog";
import { getAssignedPrimaryRegion } from "./primary-region";

export class ScopeError extends Error {}
export class FilterError extends Error {}

export function normalizeAuthorizedScope(user: User, raw: Partial<GlobalFilters> = {}): { scope: AuthorizedScope; filters: GlobalFilters } {
  const catalog = getActiveDataCatalog();
  const isRo = user.role === "RO";
  // regionId is the trusted primary assignment, not a browser-selected default.
  // Never pick the first entitlement for an ambiguously assigned manager.
  const assignedRegion = getAssignedPrimaryRegion(user);
  if (!assignedRegion || !catalog.regions.some(region => region.id === assignedRegion)) {
    throw new ScopeError("A valid primary region assignment is required. Contact your administrator; multi-region policy requires a stakeholder decision.");
  }
  const regionId = raw.regionId || assignedRegion;
  if (!user.allowedRegionIds.includes(regionId) || regionId !== assignedRegion) {
    throw new ScopeError("Region is outside your authorized scope.");
  }
  const allowedRoIds = Object.values(catalog.users)
    .filter(u => u.role === "RO" && u.regionId === regionId && user.allowedRoIds.includes(u.roId!))
    .map(u => u.roId!);
  const roId = raw.roId || (isRo ? user.roId! : "ALL");
  if ((isRo && roId !== user.roId) || (roId !== "ALL" && !allowedRoIds.includes(roId))) {
    throw new ScopeError("Officer is outside your authorized region.");
  }
  const asOfDate = raw.asOfDate || catalog.defaultDate;
  const productCode = raw.productCode || "PROD-ALL";
  const periodMode = raw.periodMode || "MTD";
  const startDate = raw.startDate || (periodMode === "YTD" ? `${asOfDate.slice(0, 4)}-01-01` : `${asOfDate.slice(0, 7)}-01`);
  if (!validDate(asOfDate)) throw new FilterError("Enter a valid reporting date.");
  if (!validDate(startDate) || startDate > asOfDate) throw new FilterError("Enter a valid reporting date range.");
  if (!catalog.products.some(p => p.code === productCode)) throw new FilterError("Select a valid product.");
  if (periodMode !== "MTD" && periodMode !== "YTD") throw new FilterError("Select MTD or YTD.");
  return {
    scope: {
      userId: user.id, role: user.role, allowedRegionIds: user.allowedRegionIds,
      allowedRoIds, effectiveRegionId: regionId,
      effectiveRoIds: roId === "ALL" ? allowedRoIds : [roId],
      isLockedRo: isRo, isLockedRegion: true,
    },
    filters: { regionId, roId, startDate, asOfDate, productCode, periodMode, roleView: normalizeRoleView(raw.roleView) },
  };
}

export function revalidateAuthorizedScope(scope: AuthorizedScope, filters: GlobalFilters): AuthorizedScope {
  const user = getActiveDataCatalog().users[scope.userId];
  if (!user || user.role !== scope.role) throw new ScopeError("Invalid principal.");
  const effective = normalizeAuthorizedScope(user, filters).scope;
  const requested = [...scope.effectiveRoIds].sort().join(",");
  const revalidated = [...effective.effectiveRoIds].sort().join(",");
  if (effective.effectiveRegionId !== scope.effectiveRegionId || requested !== revalidated) {
    throw new ScopeError("Requested filters exceed the authorized scope.");
  }
  return effective;
}
