import bcrypt from "bcryptjs";
import { db } from "../db";
import { badRequest, notFound } from "../errors";
import { todayISO } from "../format";
import type { ExpiringDTO, MemberDTO, MemberHomeDTO, MemberState } from "../types";
import { toBookingDTO } from "./bookings";
import { toOrderDTO, toTabDTO } from "./sales";

type MemberRow = {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  expiresOn: Date | null;
  plan: { name: string; code: string } | null;
};

// The front desk's renewal chase list: plans ending within the next
// `withinDays` days (14 by default), soonest first, with days left.
export async function expiringMembers(withinDays = 14): Promise<ExpiringDTO[]> {
  const rows = await db.member.findMany({ include: { plan: true }, orderBy: { expiresOn: "asc" } });
  const today = todayISO();
  const out: ExpiringDTO[] = [];
  for (const m of rows) {
    if (!m.expiresOn || !m.plan) continue;
    const exp = m.expiresOn.toISOString().slice(0, 10);
    const daysLeft = Math.round((Date.parse(exp) - Date.parse(today)) / 86400000);
    if (daysLeft >= 0 && daysLeft <= withinDays)
      out.push({ id: m.id, name: m.name, phone: m.phone, planName: m.plan.name, expiresOn: exp, daysLeft });
  }
  return out;
}

// Membership state is derived from the expiry date, never stored, so it
// can never disagree with the dates.
export const memberState = (expiresOn: Date | null | undefined, onISO: string = todayISO()): MemberState | "none" => {
  if (!expiresOn) return "none";
  const exp = expiresOn.toISOString().slice(0, 10);
  if (exp < onISO) return "expired";
  const soon = new Date(Date.parse(onISO) + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return exp <= soon ? "expiring" : "active";
};

export const toMemberDTO = (m: MemberRow): MemberDTO => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email ?? null,
  plan: m.plan ? m.plan.name : "None",
  planCode: m.plan ? m.plan.code : "none",
  state: (memberState(m.expiresOn) === "none" ? "expired" : memberState(m.expiresOn)) as MemberState,
  expiresOn: m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : "",
});

export const findMemberByName = (name: string) =>
  db.member.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    include: { plan: true },
  });

export async function listMembers(q?: string): Promise<MemberDTO[]> {
  const rows = await db.member.findMany({
    where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
    include: { plan: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toMemberDTO);
}

export async function createMember(input: { name: string; phone: string; email?: string; planCode: string }): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const email = input.email?.trim().toLowerCase() || null;

  if (email || input.phone) {
    const existing = await db.member.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: { equals: email, mode: "insensitive" } }] : []),
          ...(input.phone ? [{ phone: input.phone.trim() }] : []),
        ],
      },
      include: { plan: true },
    });
    if (existing) {
      const passwordHash = existing.passwordHash ?? (input.phone ? await bcrypt.hash(input.phone, 10) : null);
      const updated = await db.member.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          phone: input.phone.trim() || existing.phone,
          email: email || existing.email,
          planId: plan.id,
          joinedOn: joined,
          expiresOn: expires,
          passwordHash,
        },
        include: { plan: true },
      });
      return toMemberDTO(updated);
    }
  }

  const passwordHash = email && input.phone ? await bcrypt.hash(input.phone, 10) : null;
  const row = await db.member.create({
    data: { name: input.name, phone: input.phone, email, passwordHash, planId: plan.id, joinedOn: joined, expiresOn: expires },
    include: { plan: true },
  });
  return toMemberDTO(row);
}

export async function availMembership(input: {
  email: string;
  name?: string;
  phone?: string;
  planCode: string;
}): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a valid plan (gold, silver, or junior)");

  const cleanEmail = input.email.trim().toLowerCase();
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);

  let member = await db.member.findFirst({
    where: {
      OR: [
        { email: { equals: cleanEmail, mode: "insensitive" } },
        ...(input.phone ? [{ phone: input.phone.trim() }] : []),
      ],
    },
    include: { plan: true },
  });

  if (member) {
    const cleanPhone = input.phone?.trim() || member.phone;
    const cleanName = input.name?.trim() || member.name;
    const passwordHash = member.passwordHash ?? (await bcrypt.hash(cleanPhone || "demo1234", 10));
    const updated = await db.member.update({
      where: { id: member.id },
      data: {
        planId: plan.id,
        joinedOn: joined,
        expiresOn: expires,
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        passwordHash,
      },
      include: { plan: true },
    });
    return toMemberDTO(updated);
  } else {
    const cleanPhone = input.phone?.trim() || `9811${Math.floor(100000 + Math.random() * 900000)}`;
    const cleanName = input.name?.trim() || cleanEmail.split("@")[0];
    const passwordHash = await bcrypt.hash(cleanPhone, 10);
    const created = await db.member.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        planId: plan.id,
        joinedOn: joined,
        expiresOn: expires,
      },
      include: { plan: true },
    });
    return toMemberDTO(created);
  }
}

export async function getMember(id: number): Promise<MemberDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  return toMemberDTO(row);
}

export async function buyPlanForMember(memberId: number, planCode: string): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const updated = await db.member.update({
    where: { id: memberId },
    data: { planId: plan.id, joinedOn: joined, expiresOn: expires },
    include: { plan: true },
  });
  return toMemberDTO(updated);
}

// Everything the portal home shows: the member's plan, bookings,
// shop orders and bar tabs, all read off their member record.
export async function memberHome(id: number): Promise<MemberHomeDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  const [bookings, orders, tabs] = await Promise.all([
    db.booking.findMany({
      where: { memberId: id },
      include: { court: true },
      orderBy: [{ date: "desc" }, { start: "asc" }],
      take: 20,
    }),
    db.order.findMany({
      where: { memberId: id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.tab.findMany({
      where: { memberId: id },
      include: { items: { include: { product: true } } },
      orderBy: { id: "desc" },
      take: 10,
    }),
  ]);
  return {
    member: toMemberDTO(row),
    bookings: bookings.map(toBookingDTO),
    orders: orders.map(toOrderDTO),
    tabs: tabs.map((t) => toTabDTO(t as Parameters<typeof toTabDTO>[0])),
  };
}
