import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/dashboard/:path*", "/bookings/:path*", "/members/:path*", "/bar/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value ||
    req.cookies.get("auth_token")?.value ||
    req.cookies.get("cc_session")?.value;

  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
