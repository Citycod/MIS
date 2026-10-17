import { NextRequest, NextResponse } from "next/server";
import { IdentityAdminError, requireIdentityAdmin } from "@/lib/server/identity/admin";
import {
  administratorResetPassword,
  createManagedIdentityUser,
  linkProviderIdentity,
  listManagedIdentityUsers,
  recordAudit,
  revokeUserSessions,
  unlinkProviderIdentity,
  updateManagedIdentityUser,
} from "@/lib/server/identity/store";
import { IDENTITY_PROVIDERS, type CreateIdentityUserInput, type IdentityProvider, type UpdateIdentityUserInput } from "@/lib/server/identity/types";
import { requestNetworkContext, verifyCsrf } from "@/lib/server/security/csrf";

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map(item => item.trim()) : [];
}

function errorResponse(error: unknown) {
  const status = error instanceof IdentityAdminError ? error.status : 400;
  return NextResponse.json({ error: error instanceof Error ? error.message : "User administration request failed." }, { status });
}

export async function GET() {
  try {
    await requireIdentityAdmin();
    return NextResponse.json({ users: listManagedIdentityUsers() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) return NextResponse.json({ error: "Invalid security token." }, { status: 403 });
  try {
    const session = await requireIdentityAdmin();
    const body = await request.json() as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";
    const context = { ...requestNetworkContext(request), actorUserId: session.user.id };
    if (action === "create") {
      const role = body.role === "REGIONAL_MANAGER" ? "REGIONAL_MANAGER" : "RO";
      const input: CreateIdentityUserInput = {
        id: String(body.id ?? "").trim(), staffId: String(body.staffId ?? "").trim(), displayName: String(body.displayName ?? "").trim(),
        email: String(body.email ?? "").trim(), title: String(body.title ?? "").trim(), branchName: String(body.branchName ?? "").trim() || undefined,
        role, regionId: String(body.regionId ?? "").trim(), roId: String(body.roId ?? "").trim() || undefined,
        allowedRegionIds: strings(body.allowedRegionIds), allowedRoIds: strings(body.allowedRoIds),
        temporaryPassword: String(body.temporaryPassword ?? ""), canManageUsers: body.canManageUsers === true,
      };
      if (!input.displayName || !input.email || !input.title || !input.regionId || !input.allowedRegionIds.length || !input.allowedRoIds.length) throw new Error("Complete all required staff and assignment fields.");
      return NextResponse.json({ user: createManagedIdentityUser(input, context) }, { status: 201 });
    }
    const userId = String(body.userId ?? "").trim();
    if (!userId) throw new Error("User ID is required.");
    if (action === "update") {
      if (userId === session.user.id && body.status && body.status !== "active") throw new Error("You cannot suspend your own active administrator account.");
      const input: UpdateIdentityUserInput = {
        displayName: typeof body.displayName === "string" ? body.displayName : undefined,
        email: typeof body.email === "string" ? body.email : undefined,
        title: typeof body.title === "string" ? body.title : undefined,
        branchName: typeof body.branchName === "string" ? body.branchName : undefined,
        status: body.status === "active" || body.status === "suspended" || body.status === "deactivated" ? body.status : undefined,
        role: body.role === "RO" || body.role === "REGIONAL_MANAGER" ? body.role : undefined,
        regionId: typeof body.regionId === "string" ? body.regionId : undefined,
        roId: body.roId === null || typeof body.roId === "string" ? body.roId : undefined,
        allowedRegionIds: Array.isArray(body.allowedRegionIds) ? strings(body.allowedRegionIds) : undefined,
        allowedRoIds: Array.isArray(body.allowedRoIds) ? strings(body.allowedRoIds) : undefined,
        canManageUsers: typeof body.canManageUsers === "boolean" ? body.canManageUsers : undefined,
      };
      return NextResponse.json({ user: updateManagedIdentityUser(userId, input, context) });
    }
    if (action === "reset-password") {
      administratorResetPassword(userId, String(body.temporaryPassword ?? ""), context);
      return NextResponse.json({ success: true });
    }
    if (action === "revoke-sessions") {
      const count = revokeUserSessions(userId, userId === session.user.id ? session.sessionId : undefined);
      recordAudit(context, "identity.sessions.revoked", "success", "user", userId, { count });
      return NextResponse.json({ success: true, count });
    }
    if (action === "link-provider") {
      const provider = String(body.provider ?? "") as IdentityProvider;
      if (!(IDENTITY_PROVIDERS as readonly string[]).includes(provider)) throw new Error("Unsupported identity provider.");
      linkProviderIdentity(userId, provider, String(body.subject ?? ""), body.verified === true, context);
      return NextResponse.json({ success: true });
    }
    if (action === "unlink-provider") {
      const provider = String(body.provider ?? "") as IdentityProvider;
      if (provider === "local" || !(IDENTITY_PROVIDERS as readonly string[]).includes(provider)) throw new Error("Only linked external identities may be removed here.");
      unlinkProviderIdentity(userId, provider as Exclude<IdentityProvider, "local">, String(body.subject ?? ""), context);
      return NextResponse.json({ success: true });
    }
    throw new Error("Unsupported user administration action.");
  } catch (error) { return errorResponse(error); }
}
