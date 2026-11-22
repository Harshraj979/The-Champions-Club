import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import { addDaysISO, todayISO } from "../format";
import { createRazorpayOrder, verifyRazorpayPayment } from "../razorpay";
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
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  dateOfBirth?: Date | null;
};

// The front desk's renewal chase list: plans ending within the next
// `withinDays` days (14 by default), soonest first, with days left.
export async function expiringMembers(withinDays = 14): Promise<ExpiringDTO[]> {
  // The date window is a DB filter, not a scan of every member in
  // memory: expiry from today up to today + withinDays.
  const today = todayISO();
  const rows = await db.member.findMany({
    where: {
      expiresOn: {
        gte: new Date(`${today}T00:00:00.000Z`),
        lt: new Date(`${addDaysISO(today, withinDays + 1)}T00:00:00.000Z`),
      },
    },
    include: { plan: true },
    orderBy: { expiresOn: "asc" },
  });
  return rows.map((m) => {
    const exp = m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : "";
    const daysLeft = exp ? Math.round((Date.parse(exp) - Date.parse(today)) / 86400000) : 0;
    return { id: m.id, name: m.name, phone: m.phone, planName: m.plan?.name ?? "No plan", expiresOn: exp, daysLeft };
  });
}

// Junior is for under-18s only: a date of birth is required and the
// member must be under 18 on the day they join.
export function assertJuniorEligible(dateOfBirth: string | undefined, planCode?: string | null): void {
  if (planCode !== "junior") return;
  if (!dateOfBirth) throw badRequest("Junior is for under-18s — a date of birth is required");
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  const joinedMs = Date.parse(todayISO());
  let age = new Date(joinedMs).getUTCFullYear() - dob.getUTCFullYear();
  const mth = new Date(joinedMs).getUTCMonth() - dob.getUTCMonth();
  if (mth < 0 || (mth === 0 && new Date(joinedMs).getUTCDate() < dob.getUTCDate())) age -= 1;
  if (age >= 18) throw badRequest("Junior is for under-18s — this member is 18 or older");
}
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
  // A member with no plan reports "none" — never "expired", which
  // means something else (a plan that ran out).
  state: memberState(m.expiresOn),
  expiresOn: m.expiresOn ? m.expiresOn.toISOString().slice(0, 10) : "",
  parentName: m.parentName ?? null,
  parentPhone: m.parentPhone ?? null,
  parentEmail: m.parentEmail ?? null,
  dateOfBirth: m.dateOfBirth ? m.dateOfBirth.toISOString().slice(0, 10) : null,
});

export const findMemberByName = (name: string) =>
  db.member.findFirst({
    where: { name: { equals: name.trim(), mode: "insensitive" } },
    include: { plan: true },
  });

export async function listMembers(q?: string): Promise<MemberDTO[]> {
  const trimmed = q?.trim();
  const rows = await db.member.findMany({
    where: trimmed
      ? {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { email: { contains: trimmed, mode: "insensitive" } },
            { phone: { contains: trimmed } },
          ],
        }
      : undefined,
    include: { plan: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toMemberDTO);
}

export async function createMember(
  input: {
    name: string;
    phone: string;
    email?: string;
    planCode: string;
    parentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    dateOfBirth?: string;
  },
  client: Prisma.TransactionClient | typeof db = db,
): Promise<MemberDTO> {
  const plan = await client.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");

  const email = input.email?.trim().toLowerCase() || null;
  const dob = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;
  assertJuniorEligible(input.dateOfBirth, input.planCode);

  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);

  // Creating a member never overwrites an existing one: a duplicate
  // email, or the same name with the same phone, is a conflict the
  // desk resolves — silently updating would overwrite the plan,
  // expiry and password of the wrong person.
  const phone = input.phone?.trim() || "";
  if (email) {
    const byEmail = await client.member.findFirst({
      where: { email: { equals: email, mode: "insensitive" as const } },
      select: { id: true },
    });
    if (byEmail) throw conflict("A member with that email already exists");
  }
  if (phone) {
    const sameNamePhone = await client.member.findFirst({
      where: { name: { equals: input.name.trim(), mode: "insensitive" as const }, phone },
      select: { id: true },
    });
    if (sameNamePhone) throw conflict("A member with that name and phone number already exists");
  }

  const passwordHash = email
    ? await bcrypt.hash(input.phone.trim() ? input.phone : email, 10)
    : null;
  const row = await client.member.create({
    data: {
      name: input.name,
      phone: input.phone,
      email,
      passwordHash,
      planId: plan.id,
      joinedOn: joined,
      expiresOn: expires,
      parentName: input.parentName?.trim() || null,
      parentPhone: input.parentPhone?.trim() || null,
      parentEmail: input.parentEmail?.trim().toLowerCase() || null,
      dateOfBirth: dob,
    },
    include: { plan: true },
  });
  return toMemberDTO(row);
}

export async function availMembership(input: {
  email: string;
  name?: string;
  phone?: string;
  planCode: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  dateOfBirth?: string;
}): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: input.planCode } });
  if (!plan) throw badRequest("Pick a valid plan (gold, silver, or junior)");

  const cleanEmail = input.email.trim().toLowerCase();
  // A membership needs a real phone number the club can reach: no
  // generated fake numbers, and no matching by phone — duplicates
  // are matched by email only.
  const cleanPhone = input.phone?.trim() || "";
  if (cleanPhone.replace(/\D/g, "").length < 10)
    throw badRequest("Add the member's real 10-digit phone number");
  assertJuniorEligible(input.dateOfBirth, input.planCode);
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const dob = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null;

  let member = await db.member.findFirst({
    where: { email: { equals: cleanEmail, mode: "insensitive" } },
    include: { plan: true },
  });

  if (member) {
    const cleanName = input.name?.trim() || member.name;
    const passwordHash = member.passwordHash ?? (await bcrypt.hash(cleanPhone, 10));
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
        parentName: input.parentName?.trim() || member.parentName,
        parentPhone: input.parentPhone?.trim() || member.parentPhone,
        parentEmail: input.parentEmail?.trim().toLowerCase() || member.parentEmail,
        dateOfBirth: dob || member.dateOfBirth,
      },
      include: { plan: true },
    });
    return toMemberDTO(updated);
  } else {
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
        parentName: input.parentName?.trim() || null,
        parentPhone: input.parentPhone?.trim() || null,
        parentEmail: input.parentEmail?.trim().toLowerCase() || null,
        dateOfBirth: dob,
      },
      include: { plan: true },
    });
    return toMemberDTO(created);
  }
}

// The amount a plan costs to buy or renew. Plan has no membership-fee
// field yet, so the plan's tennis hourly rate stands in for the fee —
// the same rate the renewal amount has always used. When Plan.fee
// Plan.fee is the per-term membership fee; falls back to the tennis rate only when unset.
export const planFee = (plan: { tennisPrice: number; fee?: number | null }): number =>
  plan.fee && plan.fee > 0 ? plan.fee : plan.tennisPrice;

export type PaymentProof = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

type PlanPaymentOptions = {
  payMethod?: "CASH" | "CARD" | "UPI" | "ONLINE";
  proof?: PaymentProof;
  staffReceipt?: boolean;
};

// A plan change needs money behind it: either a Razorpay payment
// verified against the plan amount, or a staff-recorded counter
// receipt. Anything else is a free plan.
async function requirePlanPayment(amount: number, opts: PlanPaymentOptions): Promise<"CASH" | "CARD" | "UPI" | "ONLINE"> {
  if (opts.proof) {
    const p = opts.proof;
    if (!p.razorpayOrderId || !p.razorpayPaymentId || !p.razorpaySignature)
      throw badRequest("Incomplete payment proof — order, payment and signature are all required");
    await verifyRazorpayPayment(p.razorpayOrderId, p.razorpayPaymentId, p.razorpaySignature, amount);
    return "ONLINE";
  }
  if (opts.staffReceipt) {
    const method = opts.payMethod ?? "CASH";
    if (method === "ONLINE") throw badRequest("An online payment needs its Razorpay proof — a staff receipt cannot cover it");
    return method;
  }
  throw badRequest("Payment is required — pay online or ask the front desk to record the payment");
}

// Mint the Razorpay order a buy/renew checkout starts from. The
// client pays it, then calls back with the signed proof.
export async function createPlanPaymentOrder(
  memberId: number,
  planCode?: string,
): Promise<{ razorpayOrderId: string; planCode: string; amount: number }> {
  const member = await db.member.findUnique({ where: { id: memberId }, include: { plan: true } });
  if (!member) throw notFound("No such member");
  const plan = planCode
    ? await db.plan.findUnique({ where: { code: planCode } })
    : member.plan;
  if (!plan) throw badRequest(planCode ? "Pick a plan that exists" : "This member has no plan to renew");
  const amount = planFee(plan);
  const razorpayOrderId = await createRazorpayOrder(amount, `plan_${memberId}_${plan.code}_${Date.now()}`);
  return { razorpayOrderId, planCode: plan.code, amount };
}

// Renew a plan: the new term starts at the later of today and the
// current expiry, so renewing early never loses days. The renewal is
// recorded in MembershipRenewal in the same transaction as the new
// expiry, so the paper trail and the member record cannot disagree.
export async function renewMember(id: number, opts: PlanPaymentOptions = {}): Promise<MemberDTO> {
  const member = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!member) throw notFound("No such member");
  if (!member.plan || !member.planId) throw badRequest("Member does not have an active plan to renew");
  const amount = planFee(member.plan);
  const payMethod = await requirePlanPayment(amount, opts);
  const today = todayISO();
  const currentExp = member.expiresOn ? member.expiresOn.toISOString().slice(0, 10) : today;
  const from = currentExp > today ? currentExp : today;
  const to = addDaysISO(from, member.plan.termDays);
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.member.update({
      where: { id },
      data: { expiresOn: new Date(`${to}T00:00:00.000Z`) },
      include: { plan: true },
    });
    await tx.membershipRenewal.create({
      data: {
        memberId: id,
        planId: member.planId!,
        amount,
        payMethod,
        renewedFrom: new Date(`${from}T00:00:00.000Z`),
        renewedTo: new Date(`${to}T00:00:00.000Z`),
      },
    });
    return row;
  });
  return toMemberDTO(updated);
}

export async function getMember(id: number): Promise<MemberDTO> {
  const row = await db.member.findUnique({ where: { id }, include: { plan: true } });
  if (!row) throw notFound("No such member");
  return toMemberDTO(row);
}

export async function buyPlanForMember(
  memberId: number,
  planCode: string,
  opts: PlanPaymentOptions = {},
): Promise<MemberDTO> {
  const plan = await db.plan.findUnique({ where: { code: planCode } });
  if (!plan) throw badRequest("Pick a plan that exists");
  const amount = planFee(plan);
  const payMethod = await requirePlanPayment(amount, opts);
  const joined = new Date(`${todayISO()}T00:00:00.000Z`);
  const expires = new Date(joined.getTime() + plan.termDays * 24 * 60 * 60 * 1000);
  const updated = await db.$transaction(async (tx) => {
    const row = await tx.member.update({
      where: { id: memberId },
      data: { planId: plan.id, joinedOn: joined, expiresOn: expires },
      include: { plan: true },
    });
    await tx.membershipRenewal.create({
      data: {
        memberId,
        planId: plan.id,
        amount,
        payMethod,
        renewedFrom: joined,
        renewedTo: expires,
      },
    });
    return row;
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
