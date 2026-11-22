import { handle, body } from "@/lib/http";
import { memberSignup, setMemberSessionCookie } from "@/lib/auth";
import { parse, memberSignupInput } from "@/lib/validate";
import { limitLogin } from "@/lib/rate-limit";

export const POST = (req: Request) =>
  handle(async () => {
    limitLogin(req);
    const input = parse(memberSignupInput, await body(req));
    const { member, token } = await memberSignup({
      name: input.name,
      email: input.email,
      phone: input.phone.replace(/\D/g, ""),
      password: input.password,
      planCode: input.planCode,
      parentName: input.parentName,
      parentPhone: input.parentPhone,
      parentEmail: input.parentEmail || undefined,
      dateOfBirth: input.dateOfBirth,
    });
    await setMemberSessionCookie(token);
    return { ok: true, member };
  }, 201);
