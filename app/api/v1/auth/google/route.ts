import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getGoogleRedirectUri, safeNextPath } from "@/lib/auth";

// Google sign-in / sign-up initiation strictly for club members & users.
// Staff and Owner sign in with email or PIN — there is no staff
// Google entry point.
export async function GET(req: NextRequest) {
  const rawNext = req.nextUrl.searchParams.get("next") ?? "/member";
  const next = safeNextPath(rawNext);

  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const jar = await cookies();
  const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
  jar.set("cc_gtype", "member", opts);
  jar.set("cc_gnext", next, opts);
  // No plan cookie is set here: a plan is only ever granted by a
  // verified payment, never by a client-set cookie.

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
    new URL(`/member-login?error=google_config&next=${encodeURIComponent(next)}`, req.url),
  );
}
