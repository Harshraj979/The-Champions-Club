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
