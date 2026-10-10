import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/security/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dashboardId } = body;

    if (!dashboardId) {
      return NextResponse.json({ error: "dashboardId is required" }, { status: 400 });
    }

    // In production, this handler calls self-hosted Superset /api/v1/security/guest_token/
    // using SUPERSET_ADMIN_USERNAME / SUPERSET_ADMIN_PASSWORD credentials and injects RLS scope.
    // For local development before Superset setup, return a structured mock token payload.

    const mockGuestToken = `mock-superset-token-${session.user.id}-${dashboardId}-${Date.now()}`;

    return NextResponse.json({
      token: mockGuestToken,
      expiration: Date.now() + 3600 * 1000,
      scope: {
        regionId: session.scope.effectiveRegionId,
        roIds: session.scope.effectiveRoIds,
      },
      status: "DEVELOPMENT_MOCK_TOKEN",
      message: "Self-hosted Superset instance not connected yet. Token generated from Next.js guest-token broker.",
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate guest token" }, { status: 500 });
  }
}
