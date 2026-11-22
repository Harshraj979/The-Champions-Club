import { handle, body } from "@/lib/http";
import { pinLogin, setSessionCookie } from "@/lib/auth";
import { parse, pinLoginInput } from "@/lib/validate";
import { limitLogin } from "@/lib/rate-limit";

export const POST = (req: Request) =>
  handle(async () => {
    limitLogin(req);
    const input = parse(pinLoginInput, await body(req));
    const { staff, token } = await pinLogin(input.role as any, input.pin, input.staffId);
    await setSessionCookie(token);
    // The token lives in the httpOnly cookie only — it is never
    // returned in a JSON body.
    return { staff };
  });
