import { NextResponse } from "next/server";
import { issueCsrfToken } from "@/lib/server/security/csrf";
import { getIdentityDatabase } from "@/lib/server/identity/store";

export async function GET() {
  getIdentityDatabase();
  const response = NextResponse.json({ token: "" }, { headers: { "Cache-Control": "no-store" } });
  const token = issueCsrfToken(response);
  return NextResponse.json({ token }, {
    headers: response.headers,
  });
}
