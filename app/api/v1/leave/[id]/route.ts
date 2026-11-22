import { handle, body } from "@/lib/http";
import { requireRole, requireStaff } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { parse, leaveDecisionInput } from "@/lib/validate";
import { decideLeave, withdrawLeave } from "@/lib/services/leave";

// Only the owner approves or rejects leave, and only while it is still
// pending — the service flips it atomically, so a double decision is a
// conflict, not a second record.
export const PATCH = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const staff = await requireRole(req, "OWNER");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Leave id is required");
    const input = parse(leaveDecisionInput, await body(req));
    return decideLeave(id, input.status, staff.name);
  });

// Withdraw: a staff member pulls back their own still-pending request;
// the owner can withdraw anyone's. A decided request cannot be withdrawn.
export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const staff = await requireStaff(req);
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Leave id is required");
    return withdrawLeave(id, staff.id, staff.role === "OWNER");
  });
