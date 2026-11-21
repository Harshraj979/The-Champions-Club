import { NextResponse } from "next/server";
import { memberLogin, setMemberSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.identifier || !body.password) {
      throw badRequest("Email/phone and password are required.");
    }
    const { member, token } = await memberLogin(body.identifier, body.password);
    await setMemberSessionCookie(token);
    return NextResponse.json({ ok: true, member });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to sign in" },
      { status: e.status || 401 },
    );
  }
}
