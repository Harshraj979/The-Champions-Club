import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  getGoogleRedirectUri,
  safeNextPath,
  setSessionCookie,
  tokenForStaff,
  signMemberToken,
  setMemberSessionCookie,
} from "@/lib/auth";

// Google sends the browser back here. Handles both Member/User and Staff logins.
export async function GET(req: NextRequest) {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.url));
  const jar = await cookies();
  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const authType = jar.get("cc_gtype")?.value || "member";
  const loginPath = authType === "staff" ? "/login" : "/member-login";
  const defaultDest = authType === "staff" ? "/dashboard" : "/member";
  const next = jar.get("cc_gnext")?.value ?? defaultDest;

  if (!code || !state || jar.get("cc_gstate")?.value !== state) {
    return back(`${loginPath}?error=google`);
  }
  jar.delete("cc_gstate");
  jar.delete("cc_gtype");
  jar.delete("cc_gnext");
  jar.delete("cc_gplan");

  const clientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  const redirectUri = getGoogleRedirectUri(req);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => "");
    console.error("google token exchange failed", tokenRes.status, detail.slice(0, 300));
    return back(`${loginPath}?error=gtoken`);
  }
  const { access_token } = await tokenRes.json();

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) return back(`${loginPath}?error=google`);
  const info = await infoRes.json();
  if (!info.email || info.email_verified === false) return back(`${loginPath}?error=google`);

  const cleanEmail = String(info.email).toLowerCase().trim();

  // MEMBER / USER FLOW (Sign in or auto sign up)
  if (authType !== "staff") {
    let member = await db.member.findUnique({
      where: { email: cleanEmail },
      include: { plan: true },
    });

    if (!member) {
      // Auto-register new member via Google Auth. No plan is granted
      // here: a plan cookie is client-set and forgeable, so Google
      // sign-in creates a plan-less account and the member buys a
      // plan (verified payment) afterwards.
      const memberName = String(info.name || cleanEmail.split("@")[0]).trim();
      member = await db.member.create({
        data: {
          name: memberName,
          email: cleanEmail,
          phone: "",
          planId: null,
          joinedOn: new Date(),
          expiresOn: null,
        },
        include: { plan: true },
      });
    }

    const token = await signMemberToken(member.id);
    await setMemberSessionCookie(token);

    // The post-login destination must stay on this site, and never
    // land back on a login page.
    let destination = safeNextPath(next, "/member");
    if (destination.includes("login")) destination = "/member";
    return back(destination);
  }

  // Staff and Owner cannot sign in with Google — they must use their secure role PIN
  return back("/login");
}
