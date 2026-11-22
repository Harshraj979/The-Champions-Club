import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getGoogleRedirectUri, safeNextPath } from "@/lib/auth";

// Google sign-in / sign-up initiation strictly for club members & users.
// Staff and Owner access is restricted to secure role PINs.
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "member";
  if (type === "staff") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const rawNext = req.nextUrl.searchParams.get("next") ?? "/member";
  const next = safeNextPath(rawNext);
  const plan = req.nextUrl.searchParams.get("plan");

  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("cc_gtype", "member", opts);
  jar.set("cc_gnext", next, opts);
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

  return NextResponse.redirect(
    new URL(`/member-login?next=${encodeURIComponent(next)}`, req.url),
  );
}
