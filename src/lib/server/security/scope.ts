import { AuthorizedScope, User } from "@/types/auth";
import { GlobalFilters } from "@/types/filter";

export function normalizeAuthorizedScope(
  user: User,
  rawFilters?: Partial<GlobalFilters>
): { scope: AuthorizedScope; filters: GlobalFilters } {
  const isRo = user.role === "RO";

  let effectiveRegionId: string;
  let effectiveRoIds: string[];
  let selectedRoId: string;

  if (isRo) {
    // RO is strictly locked to own assigned region and RO ID
    effectiveRegionId = user.regionId;
    selectedRoId = user.roId || "RO-001";
    effectiveRoIds = [selectedRoId];
  } else {
    // Regional Manager: validate region selection against allowed regions
    const requestedRegion = rawFilters?.regionId;
    if (requestedRegion && user.allowedRegionIds.includes(requestedRegion)) {
      effectiveRegionId = requestedRegion;
    } else {
      effectiveRegionId = user.regionId || user.allowedRegionIds[0] || "REG-01";
    }

    // Validate RO selection against allowed ROs
    const requestedRo = rawFilters?.roId;
    if (requestedRo && requestedRo !== "ALL" && user.allowedRoIds.includes(requestedRo)) {
      selectedRoId = requestedRo;
      effectiveRoIds = [requestedRo];
    } else {
      selectedRoId = "ALL";
      effectiveRoIds = user.allowedRoIds; // All authorized ROs in region
    }
  }

  const scope: AuthorizedScope = {
    userId: user.id,
    role: user.role,
    allowedRegionIds: user.allowedRegionIds,
    allowedRoIds: user.allowedRoIds,
    effectiveRegionId,
    effectiveRoIds,
    isLockedRo: isRo,
    isLockedRegion: isRo,
  };

  const filters: GlobalFilters = {
    regionId: effectiveRegionId,
    roId: selectedRoId,
    asOfDate: rawFilters?.asOfDate || "2026-09-30",
    productCode: rawFilters?.productCode || "PROD-ALL",
    periodMode: rawFilters?.periodMode === "YTD" ? "YTD" : "MTD",
  };

  return { scope, filters };
}
