import { NextResponse } from "next/server";
import { memberSignup, setMemberSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.name || !body.email || !body.phone || !body.password) {
      throw badRequest("Name, email, phone, and password are required.");
    }
    const { member, token } = await memberSignup(body);
    await setMemberSessionCookie(token);
    return NextResponse.json({ ok: true, member });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to sign up" },
      { status: e.status || 400 },
    );
  }
}
