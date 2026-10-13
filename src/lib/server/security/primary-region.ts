import type { User } from "@/types/auth";

// regionId is the explicit primary assignment in the existing identity contract.
// Do not infer a primary assignment from allowedRegionIds, even for one region.
export function getAssignedPrimaryRegion(user: User): string | null {
  return user.regionId && user.allowedRegionIds.includes(user.regionId) ? user.regionId : null;
}
