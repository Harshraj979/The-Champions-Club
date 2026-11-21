import { db } from "../db";
import { badRequest } from "../errors";
import { isISODate } from "../format";
import type { DashboardDTO } from "../types";
import { toBookingDTO } from "./bookings";

// The owner's day in one read: money from courts, shop and bar, how it
// was paid, who is on court, and what is running low in the shop.
export async function getDashboard(date: string): Promise<DashboardDTO> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");
  const day = new Date(`${date}T00:00:00.000Z`);
  const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const [courtAgg, orders, tabs, onCourt, low] = await Promise.all([
    db.booking.aggregate({
      where: { date: day, state: "BOOKED" },
      _sum: { price: true },
    }),
    db.order.findMany({ where: { createdAt: { gte: day, lt: next } }, select: { total: true, payMethod: true } }),
    db.tab.findMany({ where: { settledAt: { gte: day, lt: next } }, select: { total: true, payMethod: true } }),
    db.booking.findMany({
      where: { date: day, state: "BOOKED" },
      include: { court: true },
      orderBy: { start: "asc" },
    }),
    db.product.findMany({ where: { category: "GEAR" }, orderBy: { stock: "asc" } }),
  ]);

  const courts = courtAgg._sum.price ?? 0;
  const shop = orders.reduce((s, o) => s + o.total, 0);
  const bar = tabs.reduce((s, t) => s + t.total, 0);

  const byMethodMap = new Map<string, number>();
  for (const r of [...orders, ...tabs])
    byMethodMap.set(r.payMethod, (byMethodMap.get(r.payMethod) ?? 0) + r.total);

  return {
    date,
    totals: { courts, shop, bar, total: courts + shop + bar },
    byMethod: [...byMethodMap.entries()].map(([method, amount]) => ({
      method: method as "CASH" | "CARD" | "UPI",
      amount,
    })),
    onCourt: onCourt.map(toBookingDTO),
    lowStock: low
      .filter((p) => p.stock !== null && p.stock <= p.lowAt)
      .map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, lowAt: p.lowAt, category: p.category })),
  };
}
