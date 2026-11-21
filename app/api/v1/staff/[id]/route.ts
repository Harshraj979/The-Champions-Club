import { handle } from "@/lib/http";
import { requireRole, deleteStaffMember } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

// Remove a staff member and cleanly dissociate shifts, logs, and audit records (Owner only)
export const DELETE = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Valid staff id is required");
    return deleteStaffMember(id);
  });
