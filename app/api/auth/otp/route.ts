import { NextResponse } from "next/server";
import { lastDevOTP } from "@/lib/resend";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (lastDevOTP && (!email || lastDevOTP.email.toLowerCase().trim() === email)) {
    return NextResponse.json({ otp: lastDevOTP.otp });
  }
  return NextResponse.json({ otp: null });
}
