import { NextResponse } from "next/server";
import { clearMemberSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearMemberSessionCookie();
  return NextResponse.json({ ok: true });
}
