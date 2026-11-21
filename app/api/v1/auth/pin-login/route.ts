import { handle, body } from "@/lib/http";
import { pinLogin, setSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    const data = await body(req);
    const { role, pin, staffId } = (data || {}) as { role?: string; pin?: string; staffId?: number };
    if ((!role && !staffId) || !pin) {
      throw badRequest("Role/Staff ID and PIN are required");
    }
    const { staff, token } = await pinLogin(role as any, String(pin), staffId ? Number(staffId) : undefined);
    await setSessionCookie(token);
    return { staff, token };
  });
