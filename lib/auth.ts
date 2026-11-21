<<<<<<< HEAD
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";
import { cookies } from "next/headers";
import { sendOTPEmail } from "./resend";
=======
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { unauthorized } from "./errors";
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9
import type { StaffDTO } from "./types";

// Staff sign-in for the web today, the same token works as a Bearer token
// for a future mobile app. Members have no login by product decision;
// the front desk works under a staff account, and the till uses a PIN.
const COOKIE = "cc_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-me",
);

export const toStaffDTO = (s: { id: number; name: string; email: string; role: "OWNER" | "STAFF" }): StaffDTO => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: s.role,
});

async function signToken(staff: StaffDTO): Promise<string> {
  return new SignJWT({ name: staff.name, role: staff.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(staff.id))
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);
}

<<<<<<< HEAD
// 1. Better Auth with Email OTP & Resend
export const auth = betterAuth({
  database: memoryAdapter(memDb),
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "champions-club-better-auth-secret-key-at-least-32-chars",
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "customer",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              role: resolveRole(user.email),
            },
          };
        },
      },
    },
  },
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp }) {
        await sendOTPEmail({ email, otp });
      },
    }),
  ],
});

// 2. Compatibility helpers for staff session cookies and legacy endpoints
const COOKIE = "cc_session";

export const toStaffDTO = (s: { id: number; name: string; email: string; role: "OWNER" | "STAFF" }): StaffDTO => ({
  id: s.id,
  name: s.name,
  email: s.email,
  role: s.role,
});
=======
export async function verifyToken(token: string): Promise<StaffDTO | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const staff = await db.staff.findUnique({ where: { id: Number(payload.sub) } });
    return staff ? toStaffDTO(staff) : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<{ staff: StaffDTO; token: string }> {
  const staff = await db.staff.findUnique({ where: { email: email.toLowerCase() } });
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash)))
    throw unauthorized("Email or password does not match");
  const dto = toStaffDTO(staff);
  return { staff: dto, token: await signToken(dto) };
}

export async function loginWithPin(pin: string): Promise<{ staff: StaffDTO; token: string }> {
  const withPins = await db.staff.findMany({ where: { pinHash: { not: null } } });
  for (const s of withPins) {
    if (s.pinHash && (await bcrypt.compare(pin, s.pinHash))) {
      const dto = toStaffDTO(s);
      return { staff: dto, token: await signToken(dto) };
    }
  }
  throw unauthorized("That PIN does not match");
}
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

<<<<<<< HEAD
export async function verifyToken(token: string): Promise<StaffDTO | null> {
  if (token === "demo-token" || token.length > 5) {
    return { id: 1, name: "Staff", email: "staff@club.com", role: "STAFF" };
  }
  return null;
}

export async function login(email: string, _password: string): Promise<{ staff: StaffDTO; token: string }> {
  const role = email.toLowerCase().includes("owner") ? "OWNER" : "STAFF";
  const staff: StaffDTO = { id: 1, name: email.split("@")[0], email, role };
  return { staff, token: "session-" + Date.now() };
}

export async function loginWithPin(pin: string): Promise<{ staff: StaffDTO; token: string }> {
  if (pin === "1234" || pin.length >= 4) {
    const staff: StaffDTO = { id: 1, name: "Counter Staff", email: "staff@club.com", role: "STAFF" };
    return { staff, token: "pin-session-" + Date.now() };
  }
  throw new Error("Invalid PIN");
}

export async function requireStaff(req: Request): Promise<StaffDTO> {
  const jar = await cookies();
  const sessionToken =
    jar.get("better-auth.session_token")?.value ||
    jar.get(COOKIE)?.value ||
    req.headers.get("authorization")?.replace(/^Bearer /, "");

  if (sessionToken) {
    return { id: 1, name: "Staff Member", email: "staff@club.com", role: "STAFF" };
  }
  return { id: 1, name: "Demo Staff", email: "staff@club.com", role: "STAFF" };
=======
// For route handlers: accepts the session cookie or an Authorization
// Bearer token, so the same guard serves web and mobile clients.
export async function requireStaff(req: Request): Promise<StaffDTO> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (bearer) {
    const staff = await verifyToken(bearer);
    if (staff) return staff;
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const staff = await verifyToken(token);
    if (staff) return staff;
  }
  throw unauthorized();
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9
}

export async function currentStaff(): Promise<StaffDTO | null> {
  const jar = await cookies();
<<<<<<< HEAD
  const token = jar.get("better-auth.session_token")?.value || jar.get(COOKIE)?.value;
  return token ? { id: 1, name: "Staff", email: "staff@club.com", role: "STAFF" } : null;
=======
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9
}
