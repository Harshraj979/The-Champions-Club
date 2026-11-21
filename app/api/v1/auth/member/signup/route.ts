import { NextResponse } from "next/server";
import { memberSignup, setMemberSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      throw badRequest("Request body is required.");
    }
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.replace(/\D/g, "");
    const password = body.password;

    if (!name) throw badRequest("Please enter your name.");
    if (!email || !email.includes("@")) throw badRequest("Please enter a valid email address.");
    if (!phone || phone.length < 10) throw badRequest("Please enter a valid 10-digit phone number.");
    if (!password || password.length < 4) throw badRequest("Password must be at least 4 characters.");

    const { member, token } = await memberSignup({
      name,
      email,
      phone,
      password,
      planCode: body.planCode,
      parentName: body.parentName,
      parentPhone: body.parentPhone,
      parentEmail: body.parentEmail,
      dateOfBirth: body.dateOfBirth,
    });
    await setMemberSessionCookie(token);
    return NextResponse.json({ ok: true, member });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to sign up" },
      { status: e.status || 400 },
    );
  }
}
