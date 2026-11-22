import { handle, body } from "@/lib/http";
import { login, setSessionCookie } from "@/lib/auth";
import { parse, loginInput } from "@/lib/validate";
import { limitLogin } from "@/lib/rate-limit";

export const POST = (req: Request) =>
  handle(async () => {
    limitLogin(req);
    const input = parse(loginInput, await body(req));
    const { staff, token } = await login(input.email, input.password);
    await setSessionCookie(token);
    // The token lives in the httpOnly cookie only — it is never
    // returned in a JSON body.
    return { staff };
  });
