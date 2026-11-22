import { db } from "../db";
import { badRequest, conflict, notFound } from "../errors";
import type { ExpenseDTO, InvoiceDTO, PayrollDTO } from "../types";

// Owner finance, deliberately light: bills out, money out, staff pay.
// No ledgers or double entry — just the records the owner actually
// keeps, with the totals that matter.
//
// Tax is EXCLUSIVE: an invoice's amount is pre-tax, taxAmount is the tax
// charged on top of it, and the total due is amount + taxAmount. The
// reports read the two figures separately and never net output tax
// (invoices) against withheld tax (payroll TDS).
//
// Payroll leave: approved Leave rows are the source of truth for
// leaveDays — the API refuses a number that disagrees with them.
// Annual/sick leave is paid; UNPAID leave deducts salary/30 per day.
// Net is always salary − unpaid-leave deduction − tax.

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY_MS = 24 * 60 * 60 * 1000;

// Service-level validation: the route validators already reject most
// of this, but the service must not trust its caller.
const isMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const isRealDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, mo, d] = s.split("-").map(Number); // Date.parse("2026-02-30") rolls to Mar 2 — check the parts
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
};
const positiveInt = (n: number) => Number.isInteger(n) && n > 0;
const nonBlank = (s: string) => typeof s === "string" && s.trim().length > 0;

// Days of [from, to] (inclusive UTC-midnight dates) that fall inside the
// half-open month window [start, end).
const overlapDays = (from: Date, to: Date, start: Date, end: Date) => {
  const s = Math.max(from.getTime(), start.getTime());
  const e = Math.min(to.getTime(), end.getTime() - DAY_MS);
  return e < s ? 0 : Math.round((e - s) / DAY_MS) + 1;
};

const monthWindow = (month: string) => {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const [y, m] = month.split("-").map(Number);
  const end = new Date(Date.UTC(y, m, 1)); // first of the next month
  return { start, end };
};

// Approved leave for one person in one month: total days, and the UNPAID
// days (the only ones that deduct from pay).
async function approvedLeave(staffId: number, month: string): Promise<{ total: number; unpaid: number }> {
  const { start, end } = monthWindow(month);
  const rows = await db.leave.findMany({
    where: { staffId, status: "APPROVED", fromDate: { lt: end }, toDate: { gte: start } },
  });
  let total = 0;
  let unpaid = 0;
  for (const r of rows) {
    const d = overlapDays(r.fromDate, r.toDate, start, end);
    total += d;
    if (r.type === "UNPAID") unpaid += d;
  }
  return { total, unpaid };
}

const leaveDeduction = (salary: number, unpaidDays: number) => Math.round((salary * unpaidDays) / 30);

// Unpaid-leave deduction per (staffId, month) for a batch of payroll
// rows, so listPayroll nets match createPayroll without a query per row.
async function unpaidDeductions(
  rows: { staffId: number | null; month: string; salary: number }[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const ids = [...new Set(rows.map((r) => r.staffId).filter((id): id is number => id !== null))];
  if (ids.length === 0) return out;
  const leaves = await db.leave.findMany({
    where: { staffId: { in: ids }, status: "APPROVED", type: "UNPAID" },
  });
  for (const r of rows) {
    if (r.staffId === null) continue;
    const { start, end } = monthWindow(r.month);
    let days = 0;
    for (const l of leaves) {
      if (l.staffId !== r.staffId) continue;
      days += overlapDays(l.fromDate, l.toDate, start, end);
    }
    out.set(`${r.staffId}|${r.month}`, leaveDeduction(r.salary, days));
  }
  return out;
}

type InvoiceRow = {
  id: number; billedTo: string; detail: string; amount: number;
  taxRate: number | null; taxAmount: number | null; status: string;
  issuedOn: Date; paidAt: Date | null; payMethod: string | null; memberId: number | null;
};

// payMethod/memberId ride along in the JSON ahead of the DTO type — the
// fields are recorded now; lib/types.ts catches up with them.
const toInvoiceDTO = (r: InvoiceRow): InvoiceDTO =>
  ({
    id: r.id, billedTo: r.billedTo, detail: r.detail, amount: r.amount,
    taxRate: r.taxRate, taxAmount: r.taxAmount,
    status: r.status === "PAID" ? "PAID" : "UNPAID",
    issuedOn: iso(r.issuedOn), paidAt: r.paidAt ? iso(r.paidAt) : null,
    payMethod: r.payMethod ?? null,
    memberId: r.memberId,
  }) as unknown as InvoiceDTO;

type PayrollRow = {
  id: number; staffName: string; month: string; salary: number;
  leaveDays: number; tax: number; status: string; payMethod: string | null;
};

const toPayrollDTO = (r: PayrollRow, deduction: number): PayrollDTO =>
  ({
    id: r.id, staffName: r.staffName, month: r.month, salary: r.salary,
    leaveDays: r.leaveDays, tax: r.tax,
    net: r.salary - deduction - r.tax,
    status: r.status === "PAID" ? "PAID" : "PENDING",
    payMethod: r.payMethod ?? null,
  }) as unknown as PayrollDTO;

const PAY_METHODS = ["CASH", "CARD", "UPI", "ONLINE"] as const;
type PayMethod = (typeof PAY_METHODS)[number];
const checkPayMethod = (m: string | undefined): PayMethod | undefined => {
  if (m === undefined) return undefined;
  if (!(PAY_METHODS as readonly string[]).includes(m)) throw badRequest("Pay method must be CASH, CARD, UPI or ONLINE");
  return m as PayMethod;
};

export async function listInvoices(): Promise<InvoiceDTO[]> {
  // Unpaid first, capped per group: a plain take: 200 on the whole list
  // would let old unpaid bills drop off behind paid ones.
  const [unpaid, paid] = await Promise.all([
    db.invoice.findMany({ where: { status: "UNPAID" }, orderBy: { issuedOn: "desc" }, take: 200 }),
    db.invoice.findMany({ where: { status: "PAID" }, orderBy: { issuedOn: "desc" }, take: 200 }),
  ]);
  return [...unpaid, ...paid].map((r) => toInvoiceDTO(r as InvoiceRow));
}

export async function createInvoice(input: {
  billedTo: string; detail: string; amount: number; taxRate?: number; memberId?: number; issuedOn?: string;
}): Promise<InvoiceDTO> {
  if (!nonBlank(input.billedTo)) throw badRequest("The invoice needs a billed-to name");
  if (!positiveInt(input.amount)) throw badRequest("The invoice needs a positive amount");
  // The tax fields existed in the schema but nothing ever set them, so
  // tax reporting always read zero. A rate, when given, is applied
  // here — the tax amount is computed, never trusted from the client.
  // Tax is exclusive: amount is pre-tax, taxAmount sits on top of it.
  if (input.taxRate !== undefined && (!Number.isInteger(input.taxRate) || input.taxRate < 0 || input.taxRate > 100))
    throw badRequest("Tax rate must be a whole percent between 0 and 100");
  if (input.memberId !== undefined) {
    if (!Number.isInteger(input.memberId) || input.memberId <= 0) throw badRequest("memberId must be a member id");
    const member = await db.member.findUnique({ where: { id: input.memberId } });
    if (!member) throw badRequest("No member with that id — the bill cannot be linked to them");
  }
  if (input.issuedOn !== undefined && !isRealDate(input.issuedOn))
    throw badRequest("issuedOn must be a real YYYY-MM-DD date");
  const taxRate = input.taxRate ?? null;
  const taxAmount = taxRate === null ? null : Math.round((input.amount * taxRate) / 100);
  const r = await db.invoice.create({
    data: {
      billedTo: input.billedTo.trim(),
      detail: input.detail,
      amount: input.amount,
      taxRate,
      taxAmount,
      memberId: input.memberId ?? null,
      ...(input.issuedOn ? { issuedOn: new Date(`${input.issuedOn}T00:00:00.000Z`) } : {}),
    },
  });
  return toInvoiceDTO(r as InvoiceRow);
}

export async function markInvoicePaid(id: number, payMethod?: string): Promise<InvoiceDTO> {
  const method = checkPayMethod(payMethod);
  // Atomic: only an UNPAID invoice flips, so two pays racing each other
  // cannot both succeed.
  const updated = await db.invoice.updateMany({
    where: { id, status: "UNPAID" },
    data: { status: "PAID", paidAt: new Date(), ...(method ? { payMethod: method } : {}) },
  });
  if (updated.count === 0) {
    const row = await db.invoice.findUnique({ where: { id } });
    if (!row) throw notFound("No such invoice");
    throw conflict("That invoice is already paid");
  }
  const r = await db.invoice.findUnique({ where: { id } });
  if (!r) throw notFound("No such invoice");
  return toInvoiceDTO(r as InvoiceRow);
}

export async function listExpenses(): Promise<ExpenseDTO[]> {
  const rows = await db.expense.findMany({ orderBy: { spentOn: "desc" }, take: 200 });
  return rows.map((r) => ({
    id: r.id, title: r.title, category: r.category, amount: r.amount,
    spentOn: iso(r.spentOn), note: r.note,
  }));
}

export async function createExpense(input: { title: string; category: string; amount: number; spentOn: string; note: string }): Promise<ExpenseDTO> {
  if (!nonBlank(input.title)) throw badRequest("The expense needs a title");
  if (!nonBlank(input.category)) throw badRequest("The expense needs a category");
  if (!positiveInt(input.amount)) throw badRequest("The expense needs a positive amount");
  if (!isRealDate(input.spentOn)) throw badRequest("Date must be a real YYYY-MM-DD date");
  const r = await db.expense.create({
    data: { title: input.title.trim(), category: input.category.trim(), amount: input.amount, spentOn: new Date(`${input.spentOn}T00:00:00.000Z`), note: input.note },
  });
  return { id: r.id, title: r.title, category: r.category, amount: r.amount, spentOn: iso(r.spentOn), note: r.note };
}

export async function listPayroll(): Promise<PayrollDTO[]> {
  const rows = await db.payroll.findMany({ orderBy: [{ month: "desc" }, { staffName: "asc" }], take: 200 });
  const deductions = await unpaidDeductions(rows);
  return rows.map((r) =>
    toPayrollDTO(r as PayrollRow, deductions.get(`${r.staffId}|${r.month}`) ?? 0),
  );
}

export async function createPayroll(input: { staffName: string; month: string; salary: number; leaveDays: number; tax: number }): Promise<PayrollDTO> {
  if (!positiveInt(input.salary)) throw badRequest("Salary must be a positive amount");
  if (!Number.isInteger(input.leaveDays) || input.leaveDays < 0) throw badRequest("Leave days cannot be negative");
  if (input.leaveDays > 31) throw badRequest("Leave days cannot be more than 31 in a month");
  if (!Number.isInteger(input.tax) || input.tax < 0) throw badRequest("Tax cannot be negative");
  if (!isMonth(input.month)) throw badRequest("Month must be YYYY-MM with a real month (01-12)");
  // The roster is the source of truth: free-text names let the same
  // person be paid twice under different spellings. Match the roster
  // case-insensitively and store the roster spelling.
  const staff = await db.staff.findFirst({ where: { name: { equals: input.staffName, mode: "insensitive" } } });
  if (!staff) throw badRequest(`No staff member called "${input.staffName}" — pick someone from the roster`);
  // Approved leave is the source of truth for leaveDays: the number
  // entered must agree with the approved leave in that month.
  const approved = await approvedLeave(staff.id, input.month);
  if (input.leaveDays !== approved.total)
    throw badRequest(
      `${staff.name} has ${approved.total} approved leave day${approved.total === 1 ? "" : "s"} in ${input.month} — leave days come from approved leave`,
    );
  const deduction = leaveDeduction(input.salary, approved.unpaid);
  if (deduction + input.tax > input.salary)
    throw badRequest("Tax plus the unpaid-leave deduction is more than the salary — the net would be negative");
  const dup = await db.payroll.findFirst({ where: { staffId: staff.id, month: input.month } });
  if (dup) throw conflict(`${staff.name} already has a payroll record for ${input.month}`);
  try {
    const r = await db.payroll.create({
      data: { staffName: staff.name, staffId: staff.id, month: input.month, salary: input.salary, leaveDays: approved.total, tax: input.tax },
    });
    return toPayrollDTO(r as PayrollRow, deduction);
  } catch (e) {
    // The @@unique([staffId, month]) guard: a race that slips past the
    // check is a conflict (409), not a 500.
    if ((e as { code?: string })?.code === "P2002")
      throw conflict(`${staff.name} already has a payroll record for ${input.month}`);
    throw e;
  }
}

export async function markPayrollPaid(id: number, payMethod?: string): Promise<PayrollDTO> {
  const method = checkPayMethod(payMethod);
  // Atomic, like markInvoicePaid: only a PENDING record flips, and the
  // payment is timestamped this time (paidAt was never set before).
  const updated = await db.payroll.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), ...(method ? { payMethod: method } : {}) },
  });
  if (updated.count === 0) {
    const row = await db.payroll.findUnique({ where: { id } });
    if (!row) throw notFound("No such payroll record");
    throw conflict("That payroll record is already paid");
  }
  const r = await db.payroll.findUnique({ where: { id } });
  if (!r) throw notFound("No such payroll record");
  const deductions = await unpaidDeductions([r]);
  return toPayrollDTO(r as PayrollRow, deductions.get(`${r.staffId}|${r.month}`) ?? 0);
}
