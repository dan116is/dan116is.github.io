import { NextRequest, NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

const PUBLIC_ROUTES = ["/", "/support"];
const PUBLIC_PREFIXES = ["/auth/", "/legal/", "/api/auth/"];

const PROTECTED_PREFIXES = [
  "/city/",
  "/dashboard/",
];

const PROTECTED_EXACT = [
  "/wallet",
  "/profile",
  "/leaderboard",
  "/clubs",
  "/subscriptions",
];

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

function isProtectedRoute(pathname: string): boolean {
  if (PROTECTED_EXACT.includes(pathname)) return true;
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  // /city without trailing slash
  if (pathname === "/city") return true;
  // /dashboard without trailing slash
  if (pathname === "/dashboard") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Only enforce auth on protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get("session")?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let user;
  try {
    user = await validateSession(sessionToken);
  } catch {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user) {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("session");
    return response;
  }

  // Banned users always get redirected to login
  if (user.isBanned) {
    const response = NextResponse.redirect(new URL("/auth/login", req.url));
    response.cookies.delete("session");
    return response;
  }

  // KYC-pending users: allow /city/* but block other protected routes
  const isKycApproved = user.kycStatus === "APPROVED";
  const isCityRoute =
    pathname === "/city" ||
    pathname.startsWith("/city/");

  if (!isKycApproved && !isCityRoute) {
    // Redirect non-city protected routes to city with a KYC banner query param
    const cityUrl = new URL("/city", req.url);
    cityUrl.searchParams.set("kyc_required", "1");
    return NextResponse.redirect(cityUrl);
  }

  // Add user info to request headers for server components
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email);
  requestHeaders.set("x-user-username", user.username);
  requestHeaders.set("x-user-role", user.role);
  requestHeaders.set("x-user-vip-level", user.vipLevel);
  requestHeaders.set("x-user-kyc-status", user.kycStatus);
  requestHeaders.set("x-user-is-verified", String(user.isVerified));

  // For KYC-pending users on city route, add a banner header
  if (!isKycApproved && isCityRoute) {
    requestHeaders.set("x-kyc-banner", "true");
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
