import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { buyPlanForMember } from "@/lib/services/members";
import { badRequest } from "@/lib/errors";

export async function POST(req: Request) {
  try {
    const member = await requireMember(req);
    const body = await req.json().catch(() => null);
    if (!body || !body.planCode) {
      throw badRequest("Plan code is required");
    }
    const updated = await buyPlanForMember(member.id, body.planCode);
    return NextResponse.json({ ok: true, member: updated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Failed to purchase plan" },
      { status: e.status || 400 },
    );
  }
}
