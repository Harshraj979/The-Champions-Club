import { handle, body } from "@/lib/http";
import { loginWithPin, setSessionCookie } from "@/lib/auth";
import { parse, pinInput } from "@/lib/validate";

// Till sign-in: a 4-digit PIN at the bar and shop counters.
export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(pinInput, await body(req));
    const { staff, token } = await loginWithPin(input.pin);
    await setSessionCookie(token);
    return { staff, token };
  });
