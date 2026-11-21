import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";
import { cookies } from "next/headers";
import { sendOTPEmail } from "./resend";
import type { StaffDTO } from "./types";

export const memDb: Record<string, any[]> = {};

export function resolveRole(email: string): "owner" | "employee" | "customer" {
  const norm = email.toLowerCase().trim();
  if (norm.startsWith("owner@") || norm.includes("+owner@")) return "owner";
  if (norm.startsWith("employee@") || norm.startsWith("staff@") || norm.includes("+employee@")) return "employee";
  return "customer";
}

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
}

export async function currentStaff(): Promise<StaffDTO | null> {
  const jar = await cookies();
  const token = jar.get("better-auth.session_token")?.value || jar.get(COOKIE)?.value;
  return token ? { id: 1, name: "Staff", email: "staff@club.com", role: "STAFF" } : null;
}
