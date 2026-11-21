import { NextResponse } from "next/server";
import { validateLoginInput, authenticate } from "@/lib/users";
import { signJWT } from "@/lib/jwt";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed JSON." }, { status: 400 });
  }

  const { email, password, error } = validateLoginInput(body);
  if (error || !email || !password) {
    return NextResponse.json({ error: error ?? "Validation failed." }, { status: 400 });
  }

  const user = authenticate(email, password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = await signJWT({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const res = NextResponse.json({ ok: true, token, user });
  res.cookies.set("auth_token", token, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 86400 * 7,
  });
  return res;
}
