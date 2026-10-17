import type { UserRole } from "@/types/auth";

export const IDENTITY_PROVIDERS = [
  "local",
  "microsoft_entra",
  "odoo_federation",
  "enterprise_oidc",
  "enterprise_saml",
] as const;

export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];
export type IdentityStatus = "active" | "suspended" | "deactivated";
export type AuditOutcome = "success" | "failure" | "denied";

export interface ManagedIdentityUser {
  id: string;
  staffId: string;
  displayName: string;
  email: string;
  title: string;
  branchName?: string;
  status: IdentityStatus;
  role: UserRole;
  regionId: string;
  roId?: string;
  allowedRegionIds: string[];
  allowedRoIds: string[];
  permissions: string[];
  providers: IdentityProvider[];
  mfaEnabled: boolean;
  mustChangePassword: boolean;
}

export interface AuditContext {
  actorUserId?: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateIdentityUserInput {
  id: string;
  staffId: string;
  displayName: string;
  email: string;
  title: string;
  branchName?: string;
  role: UserRole;
  regionId: string;
  roId?: string;
  allowedRegionIds: string[];
  allowedRoIds: string[];
  temporaryPassword: string;
  canManageUsers?: boolean;
}

export interface UpdateIdentityUserInput {
  displayName?: string;
  email?: string;
  title?: string;
  branchName?: string;
  status?: IdentityStatus;
  role?: UserRole;
  regionId?: string;
  roId?: string | null;
  allowedRegionIds?: string[];
  allowedRoIds?: string[];
  canManageUsers?: boolean;
}
