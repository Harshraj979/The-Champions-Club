import { handle, body } from "@/lib/http";
import { login, setSessionCookie } from "@/lib/auth";
import { parse, loginInput } from "@/lib/validate";

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(loginInput, await body(req));
    const { staff, token } = await login(input.email, input.password);
    await setSessionCookie(token);
    return { staff, token };
  });
