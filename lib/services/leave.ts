import { db } from "../db";
import { isISODate, todayISO } from "../format";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import type { LeaveDTO } from "../types";

// Leave: a staff member's time off. Approved leave is the source of
// truth for Payroll.leaveDays; only one live request may cover a day,
// so overlapping requests are refused up front. A request may not start
// in the past, may not run longer than 60 days, and may not cover a day
// the person is already on shift.

type LeaveRow = {
  id: number;
  staffId: number;
  fromDate: Date;
  toDate: Date;
  type: string;
  reason: string | null;
  status: string;
  decidedBy: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  staff: { name: string; role: string };
};

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LEAVE_DAYS = 60;

export const toLeaveDTO = (l: LeaveRow): LeaveDTO => ({
  id: l.id,
  staffId: l.staffId,
  staffName: l.staff.name,
  role: l.staff.role,
  fromDate: iso(l.fromDate),
  toDate: iso(l.toDate),
  type: l.type as LeaveDTO["type"],
  reason: l.reason ?? "",
  status: l.status as LeaveDTO["status"],
  decidedBy: l.decidedBy,
  decidedAt: l.decidedAt ? iso(l.decidedAt) : null,
  createdAt: iso(l.createdAt),
});

export async function listLeaves(staffId?: number): Promise<LeaveDTO[]> {
  const rows = await db.leave.findMany({
    where: staffId ? { staffId } : undefined,
    include: { staff: true },
    orderBy: [{ fromDate: "asc" }],
    take: 200,
  });
  return rows.map((r) => toLeaveDTO(r as LeaveRow));
}

export async function requestLeave(input: {
  staffId: number;
  from: string;
  to: string;
  type: "ANNUAL" | "SICK" | "UNPAID" | "OTHER";
  reason?: string;
}): Promise<LeaveDTO> {
  const staff = await db.staff.findUnique({ where: { id: input.staffId } });
  if (!staff) throw badRequest("Pick a staff member who exists");
  // The service never trusts its caller: dates are checked here too,
  // not only in the route's zod schema.
  if (!isISODate(input.from) || !isISODate(input.to))
    throw badRequest("Leave dates must be real YYYY-MM-DD dates");
  if (input.from < todayISO()) throw badRequest("Leave cannot start in the past");
  if (input.to < input.from) throw badRequest("The leave cannot end before it starts");
  const days = Math.round((Date.parse(input.to) - Date.parse(input.from)) / DAY_MS) + 1;
  if (days > MAX_LEAVE_DAYS) throw badRequest(`Leave cannot be longer than ${MAX_LEAVE_DAYS} days`);
  // Overlap checks and the create run in one transaction, so two
  // simultaneous requests cannot both pass the check.
  const row = await db.$transaction(async (tx) => {
    const overlap = await tx.leave.findFirst({
      where: {
        staffId: input.staffId,
        status: { in: ["PENDING", "APPROVED"] },
        fromDate: { lte: day(input.to) },
        toDate: { gte: day(input.from) },
      },
    });
    if (overlap)
      throw conflict(
        `${staff.name} already has ${overlap.status === "APPROVED" ? "approved" : "pending"} leave overlapping those dates`,
      );
    // A shift already on the rota cannot be silently left uncovered.
    const shift = await tx.shift.findFirst({
      where: { staffId: input.staffId, date: { gte: day(input.from), lte: day(input.to) } },
      orderBy: { date: "asc" },
    });
    if (shift)
      throw conflict(
        `${staff.name} is already on shift on ${iso(shift.date)} inside those dates — remove the shift first`,
      );
    return tx.leave.create({
      data: {
        staffId: input.staffId,
        fromDate: day(input.from),
        toDate: day(input.to),
        type: input.type,
        reason: input.reason?.trim() || null,
      },
      include: { staff: true },
    });
  });
  return toLeaveDTO(row as LeaveRow);
}

// Atomic: only a PENDING request flips, so two owners deciding at once
// cannot approve it twice.
export async function decideLeave(id: number, status: "APPROVED" | "REJECTED", decidedBy: string): Promise<LeaveDTO> {
  const updated = await db.leave.updateMany({
    where: { id, status: "PENDING" },
    data: { status, decidedBy, decidedAt: new Date() },
  });
  if (updated.count === 0) {
    const exists = await db.leave.findUnique({ where: { id } });
    if (!exists) throw notFound("No such leave request");
    throw conflict("That leave request has already been decided");
  }
  const row = await db.leave.findUnique({ where: { id }, include: { staff: true } });
  return toLeaveDTO(row as LeaveRow);
}

// Withdraw: only while still PENDING, by the person who filed it or by
// the owner. A decided request is history, not something to delete.
export async function withdrawLeave(id: number, staffId: number, isOwner: boolean): Promise<{ ok: true }> {
  const row = await db.leave.findUnique({ where: { id } });
  if (!row) throw notFound("No such leave request");
  if (!isOwner && row.staffId !== staffId) throw forbidden("You can only withdraw your own leave requests");
  if (row.status !== "PENDING") throw conflict("That leave request has already been decided — it cannot be withdrawn");
  await db.leave.delete({ where: { id } });
  return { ok: true };
}
