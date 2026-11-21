import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getGoogleRedirectUri } from "@/lib/auth";

// Google sign-in / sign-up initiation for members, users, and staff.
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment.
// When credentials are not yet configured, routes gracefully to the Demo Google Account Chooser.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "member";
  const defaultNext = type === "staff" ? "/dashboard" : "/member";
  const next = req.nextUrl.searchParams.get("next") ?? defaultNext;
  const plan = req.nextUrl.searchParams.get("plan");

  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };

  jar.set("cc_gtype", type, opts);
  jar.set("cc_gnext", next.startsWith("/") ? next : defaultNext, opts);
  if (plan) jar.set("cc_gplan", plan, opts);

  // If real Google Client ID is configured, proceed with official Google OAuth flow
  if (id) {
    const state = crypto.randomBytes(16).toString("hex");
    jar.set("cc_gstate", state, opts);
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", id);
    url.searchParams.set("redirect_uri", getGoogleRedirectUri(req));
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    return NextResponse.redirect(url);
  }

  // If GOOGLE_CLIENT_ID is not configured in local environment, route to Google Account Chooser
  if (type === "staff") {
    return NextResponse.redirect(new URL("/login?error=google", req.url));
  }
  return NextResponse.redirect(
    new URL(`/member-login?google_demo=1&next=${encodeURIComponent(next)}`, req.url),
  );
}
