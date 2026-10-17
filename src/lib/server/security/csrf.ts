import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "mis_csrf";

export function issueCsrfToken(response: NextResponse): string {
  const token = randomBytes(32).toString("base64url");
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production" && process.env.MIS_IDENTITY_TEST_MODE !== "true",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
    priority: "high",
  });
  return token;
}

export function verifyCsrf(request: NextRequest): boolean {
  const cookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const header = request.headers.get("x-csrf-token");
  if (!cookie || !header) return false;
  const left = Buffer.from(cookie);
  const right = Buffer.from(header);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export function requestNetworkContext(request: NextRequest): { ip: string | null; userAgent: string | null } {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return { ip: forwarded || request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") };
}
