import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signMemberToken, setMemberSessionCookie, toMemberSessionDTO } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email || "tanish.sarkar@gmail.com";
    const rawName = body.name || "Tanish Sarkar";
    const planCode = body.planCode;

    if (!rawEmail || !rawEmail.includes("@")) {
      return NextResponse.json({ error: "Valid Google email is required" }, { status: 400 });
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    let member = await db.member.findUnique({
      where: { email: cleanEmail },
      include: { plan: true },
    });

    if (!member) {
      let planId: number | null = null;
      if (planCode && ["gold", "silver", "junior"].includes(planCode.toLowerCase())) {
        const plan = await db.plan.findUnique({ where: { code: planCode.toLowerCase() } });
        if (plan) planId = plan.id;
      } else {
        // default to active gold plan for seamless member experience
        const goldPlan = await db.plan.findUnique({ where: { code: "gold" } });
        if (goldPlan) planId = goldPlan.id;
      }
      const expiresOn = planId ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : null;
      member = await db.member.create({
        data: {
          name: rawName.trim(),
          email: cleanEmail,
          phone: "9811000001",
          planId,
          joinedOn: new Date(),
          expiresOn,
        },
        include: { plan: true },
      });
    }

    const token = await signMemberToken(member.id);
    await setMemberSessionCookie(token);

    return NextResponse.json({
      ok: true,
      member: toMemberSessionDTO(member),
      token,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Google demo login failed" }, { status: 500 });
  }
}
