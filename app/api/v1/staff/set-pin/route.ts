import { handle, body } from "@/lib/http";
import { requireRole, updateRolePin } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const data = await body(req);
    const { role, pin } = (data || {}) as { role?: string; pin?: string };
    if (!role || !pin) {
      throw badRequest("Role and PIN are required");
    }
    return await updateRolePin(role as any, String(pin));
  });
