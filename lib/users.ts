import type { Role } from "./jwt";

export type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  password: string;
};

export const USERS: User[] = [
  { id: "1", email: "customer@club.com", name: "Aarav Sharma", role: "customer", password: "password123" },
  { id: "2", email: "employee@club.com", name: "Dev Staff", role: "employee", password: "password123" },
  { id: "3", email: "owner@club.com", name: "Vikram Owner", role: "owner", password: "password123" },
];

export function validateLoginInput(body: unknown): { email?: string; password?: string; error?: string } {
  if (!body || typeof body !== "object") return { error: "Request body is required." };
  const b = body as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const password = typeof b.password === "string" ? b.password : "";
  if (!email) return { error: "Email is required." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email format." };
  if (!password) return { error: "Password is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  return { email, password };
}

export function authenticate(email: string, pass: string): Omit<User, "password"> | null {
  const user = USERS.find((u) => u.email === email && u.password === pass);
  if (!user) return null;
  const { password: _, ...safe } = user;
  return safe;
}
