import { NextResponse } from "next/server";
import { currentMember } from "@/lib/auth";

export async function GET() {
  const member = await currentMember();
  return NextResponse.json({ member });
}
