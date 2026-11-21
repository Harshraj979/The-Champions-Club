import { handle, body } from "@/lib/http";
import { pinLogin, setSessionCookie } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    const data = await body(req);
    const { role, pin } = (data || {}) as { role?: string; pin?: string };
    if (!role || !pin) {
      throw badRequest("Role and PIN are required");
    }
    const { staff, token } = await pinLogin(role as any, String(pin));
    await setSessionCookie(token);
    return { staff, token };
  });
