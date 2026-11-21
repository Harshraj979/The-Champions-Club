import { handle, body } from "@/lib/http";
import { requireRole, getRolePinStatuses, updateRolePin, resetRolePin } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const roles = await getRolePinStatuses();
    return { roles };
  });

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const data = await body(req);
    const { role, pin, reset } = (data || {}) as { role?: string; pin?: string; reset?: boolean };
    if (!role) {
      throw badRequest("Role is required");
    }
    if (reset) {
      return await resetRolePin(role as any);
    }
    if (!pin) {
      throw badRequest("PIN is required");
    }
    return await updateRolePin(role as any, String(pin));
  });
