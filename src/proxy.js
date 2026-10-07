import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// Coarse, fast route protection only. This is NOT the real authorization
// boundary — it only checks whether a session cookie is present, so it
// can run on every matched request without a database lookup. The actual
// check (session validity, expiry, account status, role) happens in
// src/lib/auth/guards.js, called from each protected route group's
// layout. If this file were ever removed, every protected page would
// still be safe — it would just take one extra render before redirecting.
const PROTECTED_PREFIXES = ["/student", "/trainer", "/admin"];

export function proxy(request) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  if (hasSessionCookie) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/student/:path*", "/trainer/:path*", "/admin/:path*"],
};
