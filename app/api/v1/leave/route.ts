import { handle, body } from "@/lib/http";
import { requireRole, requireStaff } from "@/lib/auth";
import { parse, leaveRequestInput } from "@/lib/validate";
import { listLeaves, requestLeave } from "@/lib/services/leave";
import { forbidden } from "@/lib/errors";

// Leave requests: the owner sees every request; anyone else sees only
// their own. Anyone on staff can file a request (the desk files for
// people too); only the owner decides, on PATCH /leave/[id].
export const GET = (req: Request) =>
  handle(async () => {
    const staff = await requireStaff(req);
    return listLeaves(staff.role === "OWNER" ? undefined : staff.id);
  });

export const POST = (req: Request) =>
  handle(async () => {
    const staff = await requireRole(req, "OWNER", "FRONT_DESK", "STAFF", "BAR", "SHOP");
    const input = parse(leaveRequestInput, await body(req));
    // No staffId means "for me". Only the owner or front desk may
    // file leave for someone else.
    const staffId = input.staffId ?? staff.id;
    if (staffId !== staff.id && staff.role !== "OWNER" && staff.role !== "FRONT_DESK")
      throw forbidden("Only the owner or front desk can file leave for someone else");
    return requestLeave({ ...input, staffId });
  }, 201);
