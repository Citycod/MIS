import "server-only";

import type { AuthorizedScope } from "@/types/auth";
import { ScopeError } from "@/lib/server/security/scope";

const PHASE2_REGION_SCOPE: Record<string, { regionId: string; roIds: string[] }> = {
  "REG-01": { regionId: "LAG", roIds: ["RO-LAG-01", "RO-LAG-02"] },
  "REG-02": { regionId: "ABJ", roIds: ["RO-ABJ-01"] },
};

const PHASE2_RO_SCOPE: Record<string, string> = {
  "RO-001": "RO-LAG-01",
  "RO-002": "RO-LAG-02",
  "RO-003": "RO-ABJ-01",
};

export function mapFinancialSampleScope(scope: AuthorizedScope, demoV2: boolean) {
  if (demoV2) {
    return { regionId: scope.effectiveRegionId, roIds: scope.effectiveRoIds };
  }
  const mappedRegion = PHASE2_REGION_SCOPE[scope.effectiveRegionId];
  if (!mappedRegion) throw new ScopeError("The financial sample has no mapped regional scope for this user.");
  const roIds = scope.effectiveRoIds
    .map(roId => PHASE2_RO_SCOPE[roId])
    .filter((roId): roId is string => Boolean(roId) && mappedRegion.roIds.includes(roId));
  if (roIds.length === 0) throw new ScopeError("The financial sample has no mapped officer scope for this user.");
  return { regionId: mappedRegion.regionId, roIds };
}
