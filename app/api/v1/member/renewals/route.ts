import { db } from "@/lib/db";
import { handle } from "@/lib/http";
import { requireMember } from "@/lib/auth";

const iso = (d: Date) => d.toISOString().slice(0, 10);

// A member's own renewal history: identity comes from the session, so a
// member can only ever see their own rows.
export const GET = (req: Request) =>
  handle(async () => {
    const session = await requireMember(req);
    const rows = await db.membershipRenewal.findMany({
      where: { memberId: session.id },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return rows.map((r) => ({
      id: r.id,
      planCode: r.plan.code,
      planName: r.plan.name,
      amount: r.amount,
      payMethod: r.payMethod,
      renewedFrom: iso(r.renewedFrom),
      renewedTo: iso(r.renewedTo),
      createdAt: iso(r.createdAt),
    }));
  });
