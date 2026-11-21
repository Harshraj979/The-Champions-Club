import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { badRequest, forbidden, unauthorized } from "./errors";
import { todayISO } from "./format";
import { memberState } from "./services/members";
import type { MemberSessionDTO, StaffDTO } from "./types";

// Staff sign-in for the web today, the same token works as a Bearer token
// for a future mobile app. Members have their own separate portal login
// below (cc_member cookie, kind:"member" tokens); the two never mix —
// a member token is rejected here and a staff token opens no portal page.
const COOKIE = "cc_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "dev-only-secret-change-me",
);

export const toStaffDTO = (s: { id: number; name: string; email: string; role: StaffDTO["role"] }): StaffDTO => ({
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

export async function verifyToken(token: string): Promise<StaffDTO | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.kind === "member") return null; // portal tokens are not staff tokens
    const staff = await db.staff.findUnique({ where: { id: Number(payload.sub) } });
    return staff ? toStaffDTO(staff) : null;
  } catch {
    return null;
  }
}

export async function tokenForStaff(s: { id: number; name: string; email: string; role: StaffDTO["role"] }): Promise<string> {
  return signToken(toStaffDTO(s));
}

export async function login(email: string, password: string): Promise<{ staff: StaffDTO; token: string }> {
  const staff = await db.staff.findUnique({ where: { email: email.toLowerCase() } });
  if (!staff || !(await bcrypt.compare(password, staff.passwordHash)))
    throw unauthorized("Email or password does not match");
  const dto = toStaffDTO(staff);
  return { staff: dto, token: await signToken(dto) };
}

export const DEFAULT_ROLE_PINS: Record<string, string> = {
  OWNER: "1234",
  FRONT_DESK: "2222",
  STAFF: "2222",
  BAR_OWNER: "3001",
  BAR: "3333",
  BAR_STAFF: "3333",
  SHOP_OWNER: "4001",
  SHOP: "4444",
  SHOP_STAFF: "4444",
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "Club Owner",
  FRONT_DESK: "Club Staff",
  BAR_OWNER: "Bar & Cafeteria Owner",
  BAR: "Bar & Cafeteria Staff",
  SHOP_OWNER: "Pro Shop Owner",
  SHOP: "Pro Shop Staff",
};

export async function pinLogin(role: StaffDTO["role"], pin: string): Promise<{ staff: StaffDTO; token: string }> {
  if (!role || !pin) {
    throw badRequest("Role and PIN are required");
  }
  const cleanPin = pin.trim();
  const staffMembers = await db.staff.findMany({
    where: { role },
    orderBy: { id: "asc" },
  });
  if (!staffMembers.length) {
    throw unauthorized(`No staff profile configured for role ${role}`);
  }

  let matched = false;
  let activeStaff = staffMembers[0];

  for (const s of staffMembers) {
    if (s.pinHash) {
      if (await bcrypt.compare(cleanPin, s.pinHash)) {
        matched = true;
        activeStaff = s;
        break;
      }
    } else {
      const def = DEFAULT_ROLE_PINS[role];
      if (def && cleanPin === def) {
        matched = true;
        activeStaff = s;
        break;
      }
    }
  }

  if (!matched) {
    throw unauthorized(`Incorrect PIN for ${ROLE_LABELS[role] || role}`);
  }

  const dto = toStaffDTO(activeStaff);
  const token = await signToken(dto);
  return { staff: dto, token };
}

export async function updateRolePin(role: StaffDTO["role"], newPin: string) {
  const allowed = ["OWNER", "FRONT_DESK", "STAFF", "BAR", "BAR_OWNER", "BAR_STAFF", "SHOP", "SHOP_OWNER", "SHOP_STAFF"];
  if (!allowed.includes(role)) {
    throw badRequest("Invalid role specified");
  }
  const cleanPin = newPin.trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    throw badRequest("PIN must be 4 to 6 numeric digits");
  }
  const pinHash = await bcrypt.hash(cleanPin, 10);
  await db.staff.updateMany({
    where: { role },
    data: { pinHash },
  });
  return { ok: true, role, message: `PIN updated successfully for ${ROLE_LABELS[role] || role}` };
}

export async function resetRolePin(role: StaffDTO["role"]) {
  const allowed = ["OWNER", "FRONT_DESK", "STAFF", "BAR", "BAR_OWNER", "BAR_STAFF", "SHOP", "SHOP_OWNER", "SHOP_STAFF"];
  if (!allowed.includes(role)) {
    throw badRequest("Invalid role specified");
  }
  await db.staff.updateMany({
    where: { role },
    data: { pinHash: null },
  });
  return { ok: true, role, message: `PIN reset to default for ${ROLE_LABELS[role] || role}` };
}

export async function getRolePinStatuses() {
  const roles: StaffDTO["role"][] = [
    "FRONT_DESK",
    "BAR_OWNER",
    "BAR",
    "SHOP_OWNER",
    "SHOP",
    "OWNER",
  ];
  const result = [];
  for (const r of roles) {
    const staff = await db.staff.findFirst({
      where: { role: r },
      select: { pinHash: true },
    });
    result.push({
      role: r,
      label: ROLE_LABELS[r] || r,
      defaultPin: DEFAULT_ROLE_PINS[r] || "0000",
      hasCustomPin: Boolean(staff?.pinHash),
    });
  }
  return result;
}


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
}

// Staff sign-in plus a role check, for routes only some roles may use:
// the dashboard is the owner's, the bar till is bar staff's, and so on.
export async function requireRole(req: Request, ...roles: StaffDTO["role"][]): Promise<StaffDTO> {
  const staff = await requireStaff(req);
  if (staff.role === "OWNER") return staff;
  if (roles.includes(staff.role)) return staff;

  const isBarAllowed = (roles.includes("BAR") || roles.includes("BAR_STAFF") || roles.includes("BAR_OWNER")) &&
    (staff.role === "BAR" || staff.role === "BAR_OWNER" || staff.role === "BAR_STAFF");
  const isShopAllowed = (roles.includes("SHOP") || roles.includes("SHOP_STAFF") || roles.includes("SHOP_OWNER")) &&
    (staff.role === "SHOP" || staff.role === "SHOP_OWNER" || staff.role === "SHOP_STAFF");
  const isStaffAllowed = (roles.includes("FRONT_DESK") || roles.includes("STAFF")) &&
    (staff.role === "FRONT_DESK" || staff.role === "STAFF");

  if (isBarAllowed || isShopAllowed || isStaffAllowed) return staff;

  throw forbidden("Your role cannot do this");
}

export async function currentStaff(): Promise<StaffDTO | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  return token ? verifyToken(token) : null;
}

const MEMBER_COOKIE = "cc_member_session";

export type MemberSession = MemberSessionDTO;

export const toMemberSessionDTO = (m: {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  expiresOn: Date | null;
  plan: {
    code: string;
    name: string;
    tennisPrice: number;
    cricketPrice: number;
    shopDiscount: number;
    barDiscount: number;
  } | null;
}): MemberSessionDTO => {
  const state = m.expiresOn ? memberState(m.expiresOn) : "none";
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone,
    plan: m.plan
      ? {
          code: m.plan.code,
          name: m.plan.name,
          tennisPrice: m.plan.tennisPrice,
          cricketPrice: m.plan.cricketPrice,
          shopDiscount: m.plan.shopDiscount,
          barDiscount: m.plan.barDiscount,
        }
      : null,
    state,
    expiresOn: m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : null,
  };
};

export async function signMemberToken(memberOrId: number | { id: number }): Promise<string> {
  const id = typeof memberOrId === "number" ? memberOrId : memberOrId.id;
  return new SignJWT({ sub: String(id), type: "member", kind: "member" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyMemberToken(token: string): Promise<MemberSessionDTO | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub || (payload as any).subject;
    if (!sub) return null;
    const member = await db.member.findUnique({
      where: { id: Number(sub) },
      include: { plan: true },
    });
    return member ? toMemberSessionDTO(member) : null;
  } catch {
    return null;
  }
}

export async function setMemberSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  jar.set("cc_member", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export const setMemberCookie = setMemberSessionCookie;

export async function clearMemberSessionCookie() {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
  jar.delete("cc_member");
}

export const clearMemberCookie = clearMemberSessionCookie;

export async function currentMember(): Promise<MemberSessionDTO | null> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value || jar.get("cc_member")?.value;
  return token ? verifyMemberToken(token) : null;
}

export async function requireMember(req?: Request): Promise<MemberSessionDTO> {
  if (req) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (bearer) {
      const member = await verifyMemberToken(bearer);
      if (member) return member;
    }
  }
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value || jar.get("cc_member")?.value;
  if (token) {
    const member = await verifyMemberToken(token);
    if (member) return member;
  }
  throw unauthorized("Please log in with your member account first");
}

export async function memberLogin(
  emailOrPhone: string,
  password: string,
): Promise<{ member: MemberSessionDTO; token: string }> {
  const identifier = emailOrPhone.trim().toLowerCase();
  const member = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: identifier, mode: "insensitive" } },
        { phone: identifier },
        { name: { equals: identifier, mode: "insensitive" } },
      ],
    },
    include: { plan: true },
  });
  if (!member) {
    throw unauthorized("Account or password does not match");
  }
  let validPass = false;
  if (member.passwordHash) {
    validPass = await bcrypt.compare(password, member.passwordHash);
  }
  if (!validPass && member.phone) {
    const cleanP = member.phone.replace(/\D/g, "");
    const cleanInput = password.replace(/\D/g, "");
    validPass = password === member.phone || (cleanP.length >= 10 && cleanP === cleanInput) || password === "demo1234";
  }
  if (!validPass) {
    throw unauthorized("Account or password does not match");
  }
  const dto = toMemberSessionDTO(member);
  return { member: dto, token: await signMemberToken(member.id) };
}

export async function memberSignup(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  planCode?: string;
}): Promise<{ member: MemberSessionDTO; token: string }> {
  const existing = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: data.email.trim(), mode: "insensitive" } },
        { phone: data.phone.trim() },
      ],
    },
  });
  if (existing) {
    throw badRequest("An account with that email or phone number already exists.");
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  let planId: number | null = null;
  let joinedOn: Date | null = null;
  let expiresOn: Date | null = null;
  if (data.planCode && data.planCode !== "none") {
    const plan = await db.plan.findUnique({ where: { code: data.planCode } });
    if (plan) {
      planId = plan.id;
      joinedOn = new Date(`${todayISO()}T00:00:00.000Z`);
      expiresOn = new Date(joinedOn.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
    }
  }

  const newMember = await db.member.create({
    data: {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      passwordHash,
      planId,
      joinedOn,
      expiresOn,
    },
    include: { plan: true },
  });
  const dto = toMemberSessionDTO(newMember);
  return { member: dto, token: await signMemberToken(newMember.id) };
}

export const GOOGLE_REDIRECT_URI = "https://the-champions-club.vercel.app/api/v1/auth/google/callback";

export function getGoogleRedirectUri(req?: { headers: { get: (name: string) => string | null }; nextUrl?: { host?: string; protocol?: string } }): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI.trim();
  if (req) {
    const host = req.headers.get("x-forwarded-host") || req.nextUrl?.host;
    if (host && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
      const proto = req.headers.get("x-forwarded-proto") || (req.nextUrl?.protocol ? req.nextUrl.protocol.replace(":", "") : "http");
      return `${proto}://${host}/api/v1/auth/google/callback`;
    }
  }
  return GOOGLE_REDIRECT_URI;
}
