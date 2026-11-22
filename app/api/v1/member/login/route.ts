import { handle, body } from "@/lib/http";
import { memberLogin, setMemberCookie } from "@/lib/auth";
import { parse, memberLoginInput } from "@/lib/validate";
import { limitLogin } from "@/lib/rate-limit";

export const POST = (req: Request) =>
  handle(async () => {
    limitLogin(req);
    const input = parse(memberLoginInput, await body(req));
    const { member, token } = await memberLogin(input.email, input.password);
    await setMemberCookie(token);
    // The token lives in the httpOnly cookie only — it is never
    // returned in a JSON body.
    return { member };
  });
