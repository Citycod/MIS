import "server-only";
import { AuthorizedScope, User } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";
import { MOCK_PRODUCTS, MOCK_USERS } from "@/mocks/fixtures";
import { DEFAULT_DATE, validDate } from "@/lib/filters";

export class ScopeError extends Error {}
export class FilterError extends Error {}

export function normalizeAuthorizedScope(user: User, raw: Partial<GlobalFilters> = {}): { scope: AuthorizedScope; filters: GlobalFilters } {
  const isRo = user.role === "RO";
  const regionId = raw.regionId || user.regionId;
  if (!user.allowedRegionIds.includes(regionId) || (isRo && regionId !== user.regionId)) {
    throw new ScopeError("Region is outside your authorized scope.");
  }
  const allowedRoIds = Object.values(MOCK_USERS)
    .filter(u => u.role === "RO" && u.regionId === regionId && user.allowedRoIds.includes(u.roId!))
    .map(u => u.roId!);
  const roId = raw.roId || (isRo ? user.roId! : "ALL");
  if ((isRo && roId !== user.roId) || (roId !== "ALL" && !allowedRoIds.includes(roId))) {
    throw new ScopeError("Officer is outside your authorized region.");
  }
  const asOfDate = raw.asOfDate || DEFAULT_DATE;
  const productCode = raw.productCode || "PROD-ALL";
  const periodMode = raw.periodMode || "MTD";
  if (!validDate(asOfDate)) throw new FilterError("Enter a valid reporting date.");
  if (!MOCK_PRODUCTS.some(p => p.code === productCode)) throw new FilterError("Select a valid product.");
  if (periodMode !== "MTD" && periodMode !== "YTD") throw new FilterError("Select MTD or YTD.");
  return {
    scope: {
      userId: user.id, role: user.role, allowedRegionIds: user.allowedRegionIds,
      allowedRoIds, effectiveRegionId: regionId,
      effectiveRoIds: roId === "ALL" ? allowedRoIds : [roId],
      isLockedRo: isRo, isLockedRegion: isRo,
    },
    filters: { regionId, roId, asOfDate, productCode, periodMode },
  };
}
