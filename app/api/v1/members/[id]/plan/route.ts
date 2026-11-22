import { z } from "zod";
import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse } from "@/lib/validate";
import { buyPlanForMember } from "@/lib/services/members";

// Staff changing a member's plan at the desk. The plan code is
// validated against the Plan table inside buyPlanForMember — an
// unknown code is a 400. The new term starts today. staffReceipt
// records that the desk took payment at the counter; there is no
// plan-change history model yet, so it is accepted, not persisted,
// and no MembershipRenewal record is written for a plan change.
const planChangeInput = z.object({
  planCode: z.string().min(1, "Pick a plan"),
  staffReceipt: z.boolean().optional().default(true),
});

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Member id is required");
    const input = parse(planChangeInput, await body(req));
    return buyPlanForMember(id, input.planCode);
  });
