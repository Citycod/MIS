export type UserRole = "RO" | "REGIONAL_MANAGER";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roId?: string; // Present for RO users
  regionId: string; // Primary region
  allowedRegionIds: string[]; // Regional Managers may have multi-region access
  allowedRoIds: string[]; // Regional Managers have list of ROs in region
  branchName?: string;
  title: string;
  avatarUrl?: string;
}

export interface AuthorizedScope {
  userId: string;
  role: UserRole;
  allowedRegionIds: string[];
  allowedRoIds: string[];
  effectiveRegionId: string;
  effectiveRoIds: string[]; // Array of selected/authorized RO IDs ('ALL' represented as full allowed array)
  isLockedRo: boolean; // True for RO role (cannot select other ROs)
  isLockedRegion: boolean; // True for RO role (cannot select other regions)
}

export interface Session {
  user: User;
  scope: AuthorizedScope;
  expiresAt: string;
}
