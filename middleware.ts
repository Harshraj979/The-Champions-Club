<<<<<<< HEAD
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/lib/jwt";
import { canAccess } from "@/lib/rbac";

export const config = {
  matcher: ["/dashboard/:path*", "/bar/:path*", "/bookings/:path*", "/members/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  const payload = token ? await verifyJWT(token) : null;
  const pathname = req.nextUrl.pathname;
  const requiredRole = pathname.startsWith("/dashboard") ? "owner" : "employee";

  if (!payload) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (!canAccess(payload.role, requiredRole)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "forbidden");
    url.searchParams.set("required", requiredRole);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
=======
import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Staff pages sit behind sign-in. This checks the session token's
// signature and expiry at the edge; API handlers re-check against the
// database on every call.
const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-secret-change-me");
const STAFF_PAGES = ["/dashboard", "/bookings", "/members", "/bar"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!STAFF_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/")))
    return NextResponse.next();
  const token = req.cookies.get("cc_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch {
      // fall through to the redirect
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/dashboard/:path*", "/bookings/:path*", "/members/:path*", "/bar/:path*"] };
>>>>>>> 7509cadebf15daa1026aa672220ccc99f6d7cfda
