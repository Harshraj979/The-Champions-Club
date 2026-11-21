import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { verifyJWT } from "@/lib/jwt";

export async function GET() {
  const cookieStore = await cookies();
  const tokenFromCookie = cookieStore.get("auth_token")?.value;
  const headerStore = await headers();
  const authHeader = headerStore.get("authorization");
  const tokenFromHeader = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const token = tokenFromCookie || tokenFromHeader;
  if (!token) return NextResponse.json({ user: null }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null, error: "Invalid or expired token." }, { status: 401 });

  return NextResponse.json({
    user: { id: payload.sub, email: payload.email, name: payload.name, role: payload.role },
  });
}
