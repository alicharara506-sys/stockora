import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { APP_NAV_SLUGS } from "@/lib/nav";

const AUTH_ROUTES = ["/login", "/signup", "/forgot-password", "/reset-password"];
const PROTECTED_SLUGS = new Set(APP_NAV_SLUGS);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const firstSegment = pathname.split("/")[1];
  const isDashboardRoute = PROTECTED_SLUGS.has(firstSegment) || pathname.startsWith("/onboarding");
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (isDashboardRoute && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

// Runs on every non-static, non-API request; the handler above narrows down
// to the actual protected routes using APP_NAV_SLUGS (matcher values must be
// static, so that list can't be spread into this config directly).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)"],
};
