// proxy.ts
import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_ROUTES = ["/dashboard", "/tournament", "/profile", "/admin"];
// Routes only for unauthenticated users
const AUTH_ROUTES = ["/", "/onboarding"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get("__session")?.value;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r);

  // Redirect unauthenticated users away from protected routes
  if (isProtected && !sessionCookie) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect authenticated users away from login page
  if (isAuthRoute && sessionCookie && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron).*)",
  ],
};
