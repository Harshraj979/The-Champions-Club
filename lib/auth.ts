import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { memoryAdapter } from "better-auth/adapters/memory";
import { sendOTPEmail } from "./resend";

export const memDb: Record<string, any[]> = {};

export function resolveRole(email: string): "owner" | "employee" | "customer" {
  const norm = email.toLowerCase().trim();
  if (norm.startsWith("owner@") || norm.includes("+owner@")) return "owner";
  if (norm.startsWith("employee@") || norm.startsWith("staff@") || norm.includes("+employee@")) return "employee";
  return "customer";
}

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
