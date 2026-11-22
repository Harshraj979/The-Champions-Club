import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { BOOKING_LEN, LAST_START_MIN, OPEN_MIN, SLOT_STEP, fmtTime, isISODate, istMinutesNow, todayISO } from "../format";
import type { BookingDTO } from "../types";
import { findMemberByName, memberState } from "./members";
import { createEnquiry } from "./enquiries";

// Court booking rules, enforced here on the server so no client, web or
// mobile, can break them:
// - one hour a booking, starts on the 30-minute grid, 6 AM to 10 PM
// - a court is never double-booked (checked inside a transaction that
//   locks the court row, so two requests racing for one slot cannot both win)
// - at most 2 bookings per person per day (Friday Social Play excluded)
// - an expired plan pauses booking until it is renewed
// - members pay their plan price, walk-ins pay the court rate, trials are free

type BookingRow = {
  id: number;
  courtId: number;
  court: { name: string };
  who: string;
  phone: string;
  date: Date;
  start: number;
  type: BookingDTO["type"];
  price: number;
  state: BookingDTO["state"];
};

export const toBookingDTO = (b: BookingRow): BookingDTO => ({
  id: b.id,
  courtId: b.courtId,
  court: b.court.name,
  who: b.who,
  phone: b.phone,
  date: b.date.toISOString().slice(0, 10),
  start: b.start,
  type: b.type,
  price: b.price,
  state: b.state,
  payState: b.payState ?? "UNPAID",
  payMethod: b.payMethod ?? null,
});

// The PDF caps every member at two slots a day, whatever the plan.
export function getMaxDailySlotsForPlan(_planCode?: string | null): number {
  return 2;
}

const overlaps = (aStart: number, bStart: number) =>
  aStart < bStart + BOOKING_LEN && bStart < aStart + BOOKING_LEN;

export async function takenStarts(
  courtId: number,
  date: string,
): Promise<{ start: number; type: "REGULAR" | "TRIAL" | "FRIDAY_SOCIAL" }[]> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");
  const rows = await db.booking.findMany({
    where: { courtId, date: new Date(`${date}T00:00:00.000Z`), state: "BOOKED" },
    select: { start: true, type: true },
  });
  return rows.map((r) => ({ start: r.start, type: r.type }));
}

// The public court sheet for one day: who is on court and when. Names
// were always shown on the club board; phone numbers never leave here.
export async function listSchedule(date: string): Promise<BookingDTO[]> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");
  const rows = await db.booking.findMany({
    where: { date: new Date(`${date}T00:00:00.000Z`), state: "BOOKED" },
    include: { court: true },
    orderBy: { start: "asc" },
  });
  return rows.map((b) => ({ ...toBookingDTO(b), phone: "" }));
}

export async function listBookings(date?: string, state?: string): Promise<BookingDTO[]> {
  if (date !== undefined && !isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");
  if (state !== undefined && state !== "BOOKED" && state !== "CANCELLED")
    throw badRequest("state must be BOOKED or CANCELLED");
  const where: Prisma.BookingWhereInput = {
    ...(date
      ? { date: new Date(`${date}T00:00:00.000Z`) }
      : { date: { gte: new Date(`${todayISO()}T00:00:00.000Z`) } }),
    ...(state ? { state } : {}),
  };
  const rows = await db.booking.findMany({
    where,
    include: { court: true },
    orderBy: [{ date: "asc" }, { start: "asc" }],
    take: 100,
  });
  return rows.map(toBookingDTO);
}

export async function createBooking(input: {
  courtId: number;
  date: string;
  start: number;
  name: string;
  phone: string;
  email?: string;
  type: "REGULAR" | "TRIAL" | "FRIDAY_SOCIAL";
  isStaffBooking?: boolean;
  // When a signed-in member books, their id comes from the session —
  // never matched back by name, phone or email.
  memberId?: number;
}): Promise<BookingDTO> {
  if (!isISODate(input.date)) throw badRequest("Date must be YYYY-MM-DD");
  if (input.date < todayISO()) throw badRequest("That date has already passed");
  if (input.date === todayISO() && input.start <= istMinutesNow())
    throw badRequest("That time has already passed today");
  if (input.start < OPEN_MIN || input.start > LAST_START_MIN || input.start % SLOT_STEP !== 0)
    throw badRequest("Start times run on the half hour, 6 AM to 9 PM");
  if (input.type === "TRIAL" && input.phone.replace(/\D/g, "").length < 10)
    throw badRequest("Add a phone number the desk can reach you on");
  if (input.type === "FRIDAY_SOCIAL" && new Date(`${input.date}T00:00:00.000Z`).getUTCDay() !== 5)
    throw badRequest("Friday Social Play is only on Fridays");

  const court = await db.court.findUnique({ where: { id: input.courtId } });
  if (!court) throw notFound("No such court");

  const cleanEmail = input.email?.trim().toLowerCase() || null;
  let member: any = null;

  // A booking never creates a member and never rewrites a member's
  // email: memberships are made at the front desk or by sign-up.
  if (input.memberId) {
    member = await db.member.findUnique({ where: { id: input.memberId }, include: { plan: true } });
  } else {
    if (cleanEmail) {
      member = await db.member.findFirst({
        where: { email: { equals: cleanEmail, mode: "insensitive" } },
        include: { plan: true },
      });
    }

    if (!member && input.phone) {
      const cleanPhone = input.phone.replace(/\D/g, "");
      if (cleanPhone.length >= 10) {
        member = await db.member.findFirst({
          where: { phone: cleanPhone },
          include: { plan: true },
        });
      }
    }

    if (!member) {
      member = await findMemberByName(input.name);
    }
  }

  const planState = member?.plan ? memberState(member.expiresOn, input.date) : "none";
  const hasActivePlan = planState === "active" || planState === "expiring";

  if (input.type !== "TRIAL") {
    if (!input.isStaffBooking) {
      if (!member || !hasActivePlan) {
        throw forbidden(
          member
            ? `${member.name}'s membership plan is not active. Please choose an active plan to reserve courts.`
            : "An active club membership is required to book a court. Please sign in or register with a membership plan.",
        );
      }
    }
  }

  const planPrice = hasActivePlan
    ? (court.sport === "Cricket" ? member.plan.cricketPrice : member.plan.tennisPrice)
    : court.walkinPrice;
  const price = input.type === "TRIAL" ? 0 : planPrice;
  const day = new Date(`${input.date}T00:00:00.000Z`);

  const created = await db.$transaction(async (tx) => {
    // Lock the court row so bookings for this court are written one at a
    // time. The overlap check below then cannot race.
    await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${court.id} FOR UPDATE`;

    const sameDay = await tx.booking.findMany({
      where: {
        courtId: court.id,
        date: day,
        state: "BOOKED",
        ...(input.type === "FRIDAY_SOCIAL" ? { type: { not: "FRIDAY_SOCIAL" } } : {}),
      },
      select: { start: true },
    });
    if (sameDay.some((b) => overlaps(b.start, input.start)))
      throw conflict("That court is already booked at that time");

    if (input.type === "TRIAL") {
      // Trials are free, so one phone number gets one trial a day —
      // otherwise a single number could block a court all day.
      const digits = input.phone.replace(/\D/g, "");
      const trials = await tx.booking.findMany({
        where: { date: day, state: "BOOKED", type: "TRIAL" },
        select: { phone: true },
      });
      if (trials.some((t) => t.phone.replace(/\D/g, "") === digits))
        throw conflict("One free trial per phone number per day");
    }

    if (input.type === "REGULAR") {
      const maxSlots = getMaxDailySlotsForPlan(member?.plan?.code);
      // Counted by the linked member, falling back to the phone
      // number — never by the `who` name, which two people can share.
      const todays = await tx.booking.findMany({
        where: { date: day, state: "BOOKED", type: "REGULAR" },
        select: { memberId: true, phone: true },
      });
      const digits = (input.phone || member?.phone || "").replace(/\D/g, "");
      const mine = todays.filter(
        (b) =>
          (member?.id && b.memberId === member.id) ||
          (digits.length >= 10 && b.phone.replace(/\D/g, "") === digits),
      ).length;
      if (mine >= maxSlots) {
        throw conflict("Two bookings a day at most — this member already has 2 bookings on that day.");
      }
    }

    return tx.booking.create({
      data: {
        courtId: court.id,
        memberId: member?.id ?? null,
        who: member?.name ?? input.name,
        phone: input.phone || member?.phone || "",
        date: day,
        start: input.start,
        type: input.type,
        price,
      },
      include: { court: true },
    });
  });

  const dto = toBookingDTO(created);
  if (input.type === "TRIAL") {
    // A trial is also a lead: it lands on the enquiries list so the desk
    // can follow up. Never let a CRM hiccup fail the booking itself —
    // but never swallow it silently either: a failed lead is logged.
    await createEnquiry({
      name: dto.who,
      contact: input.phone,
      interest: "Free trial",
      message: `Trial on ${court.name}, ${input.date} at ${fmtTime(input.start)}`,
    }).catch((e) => {
      console.error("trial enquiry failed", e);
    });
  }
  return dto;
}

export async function cancelBooking(id: number): Promise<BookingDTO> {
  const row = await db.booking.findUnique({ where: { id }, include: { court: true } });
  if (!row) throw notFound("No such booking");
  if (row.state === "CANCELLED") throw conflict("That booking is already cancelled");
  // Same rule as booking: once the slot has started, it cannot be
  // cancelled (no refund / no-show handling exists to fall back on).
  const dayISO = row.date.toISOString().slice(0, 10);
  if (dayISO < todayISO() || (dayISO === todayISO() && row.start <= istMinutesNow()))
    throw conflict("That slot has already started");
  const updated = await db.booking.update({
    where: { id },
    data: { state: "CANCELLED" },
    include: { court: true },
  });
  return toBookingDTO(updated);
}

// Court money is only counted once it is actually taken: staff mark a
// booking paid (cash/card/UPI/online at the desk) and the dashboard counts
// only PAID bookings as court revenue. Atomic so two desks cannot both
// record the same payment.
export async function markBookingPaid(
  id: number,
  payMethod: "CASH" | "CARD" | "UPI" | "ONLINE",
): Promise<BookingDTO> {
  const row = await db.booking.findUnique({ where: { id }, include: { court: true } });
  if (!row) throw notFound("No such booking");
  if (row.state !== "BOOKED") throw conflict("Only a booked slot can be marked paid");
  if (row.payState === "PAID") throw conflict("That booking is already paid");
  const updated = await db.booking.updateMany({
    where: { id, state: "BOOKED", payState: "UNPAID" },
    data: { payState: "PAID", payMethod, paidAt: new Date() },
  });
  if (updated.count === 0) throw conflict("That booking is already paid");
  const fresh = await db.booking.findUnique({ where: { id }, include: { court: true } });
  return toBookingDTO(fresh!);
}
