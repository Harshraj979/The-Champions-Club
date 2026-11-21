import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, availPlanInput } from "@/lib/validate";
import { availMembership } from "@/lib/services/members";

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const input = parse(availPlanInput, await body(req));
    return availMembership(input);
  }, 200);
