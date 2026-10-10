import { NextRequest, NextResponse } from "next/server";
import { setSessionUser } from "@/lib/server/security/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const success = await setSessionUser(userId);
    if (!success) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Session created" });
  } catch {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }
}
