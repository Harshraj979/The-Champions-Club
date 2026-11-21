import { handle, body } from "@/lib/http";
import {
  requireRole,
  getRolePinStatuses,
  getStaffMemberStatuses,
  updateRolePin,
  resetRolePin,
  updateStaffPin,
  resetStaffPin,
} from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const [roles, staff] = await Promise.all([
      getRolePinStatuses(),
      getStaffMemberStatuses(),
    ]);
    return { roles, staff };
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const data = await body(req);
    const { role, staffId, pin, reset } = (data || {}) as {
      role?: string;
      staffId?: number;
      pin?: string;
      reset?: boolean;
    };

    if (staffId) {
      if (reset) {
        return await resetStaffPin(Number(staffId));
      }
      if (!pin) throw badRequest("PIN is required");
      return await updateStaffPin(Number(staffId), String(pin));
    }

    if (!role) {
      throw badRequest("Staff ID or Role is required");
    }
    if (reset) {
      return await resetRolePin(role as any);
    }
    if (!pin) {
      throw badRequest("PIN is required");
    }
    return await updateRolePin(role as any, String(pin));
  });
