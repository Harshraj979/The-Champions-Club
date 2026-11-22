import { db } from "../db";
import { badRequest } from "../errors";
import { addDaysISO, isISODate, istDayStart, todayISO } from "../format";
import type { TaxSummaryDTO } from "../types";

// Tax reporting for the owner: output tax (charged on invoices, on top
// of the pre-tax amount) and withheld tax (deducted from staff pay) as
// SEPARATE figures. They are different positions — output tax is owed to
// the tax office, withheld tax was already paid on the staff's behalf —
// so they are never netted into one number. Invoices count by the IST
// day they were issued; payroll counts by whole months overlapping the
// window (a YYYY-MM string has no day, so a month counts whole when it
// overlaps the window).
export function defaultTaxWindow(): { from: string; to: string } {
  const first = `${todayISO().slice(0, 7)}-01`;
  const [y, m] = first.split("-").map(Number);
  const nextFirst = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  return { from: first, to: addDaysISO(nextFirst, -1) };
}

export async function taxSummary(input: { from?: string; to?: string }): Promise<TaxSummaryDTO> {
  // Both dates together, or neither for the current month. A half-open
  // window is a 400, not a silent fallback to a different window.
  if ((input.from && !input.to) || (!input.from && input.to))
    throw badRequest("Give both from and to, or neither for the current month");
  const w = input.from && input.to ? { from: input.from, to: input.to } : defaultTaxWindow();
  if (!isISODate(w.from) || !isISODate(w.to)) throw badRequest("Dates must be real YYYY-MM-DD dates");
  if (w.from > w.to) throw badRequest("The start date cannot be after the end date");
  const fromDay = istDayStart(w.from);
  const toDay = istDayStart(addDaysISO(w.to, 1));
  const [invoices, payroll] = await Promise.all([
    db.invoice.aggregate({
      where: { issuedOn: { gte: fromDay, lt: toDay } },
      _sum: { amount: true, taxAmount: true },
      _count: true,
    }),
    db.payroll.aggregate({
      where: { month: { gte: w.from.slice(0, 7), lte: w.to.slice(0, 7) } },
      _sum: { tax: true },
      _count: true,
    }),
  ]);
  const invoiced = invoices._sum.amount ?? 0;
  // taxAmount is null on invoices raised before tax was recorded, or
  // with no tax rate — null counts as no tax, never as an error.
  const invoiceTax = invoices._sum.taxAmount ?? 0;
  const payrollTax = payroll._sum.tax ?? 0;
  // invoiced is pre-tax; invoiceTax is the tax on top of it. The two
  // are reported side by side, never added into one "with tax" total,
  // and never netted against payrollTax.
  return {
    from: w.from,
    to: w.to,
    invoiced,
    invoiceCount: invoices._count,
    invoiceTax,
    payrollTax,
    payrollCount: payroll._count,
  } as TaxSummaryDTO;
}
