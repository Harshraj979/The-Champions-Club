import { handle } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { findMemberByName, memberState } from "@/lib/services/members";

// Public and narrow on purpose: the courts and shop pages recognise a
// member by name and show their plan and price. Returns null for
// walk-ins, and never exposes the member list.
export const GET = (req: Request) =>
  handle(async () => {
    const name = new URL(req.url).searchParams.get("name")?.trim();
    if (!name) throw badRequest("name is required");
    const m = await findMemberByName(name);
    if (!m) return { member: null };
    return {
      member: {
        name: m.name,
        plan: m.plan ? m.plan.name : "No Plan",
        planCode: m.plan ? m.plan.code : "none",
        state: memberState(m.expiresOn),
        tennisPrice: m.plan ? m.plan.tennisPrice : 500,
        cricketPrice: m.plan ? m.plan.cricketPrice : 800,
        shopDiscount: m.plan ? m.plan.shopDiscount : 0,
        barDiscount: m.plan ? m.plan.barDiscount : 0,
      },
    };
  });
