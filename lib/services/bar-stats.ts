import { db } from "../db";
import { badRequest } from "../errors";
import { addDaysISO, isISODate, istDayStart, todayISO } from "../format";
import { toTabDTO } from "./sales";
import type { TabDTO } from "../types";

export type BarDashboardDTO = {
  date: string;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  metrics: {
    openTabsCount: number;
    openTabsValue: number;
    settledTodayCount: number;
    averageTabValue: number;
    activeTables: number[];
  };
  topItems: {
    productId: number;
    name: string;
    qty: number;
    revenue: number;
  }[];
  byMethod: {
    method: "CASH" | "CARD" | "UPI" | "ONLINE";
    label: string;
    amount: number;
    count: number;
  }[];
  recentSettled: TabDTO[];
};

export async function getBarDashboard(date: string = todayISO()): Promise<BarDashboardDTO> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");

  const [todayTabs, weekTabs, monthTabs, openTabs, recentSettledRows] = await Promise.all([
    db.tab.findMany({
      where: {
        status: "SETTLED",
        settledAt: { gte: istDayStart(date), lt: istDayStart(addDaysISO(date, 1)) },
      },
      include: { items: { include: { product: true } } },
    }),
    db.tab.findMany({
      where: {
        status: "SETTLED",
        settledAt: { gte: istDayStart(addDaysISO(date, -6)), lt: istDayStart(addDaysISO(date, 1)) },
      },
      select: { total: true },
    }),
    db.tab.findMany({
      where: {
        status: "SETTLED",
        settledAt: { gte: istDayStart(addDaysISO(date, -29)), lt: istDayStart(addDaysISO(date, 1)) },
      },
      select: { total: true },
    }),
    db.tab.findMany({
      where: { status: "OPEN" },
      select: { subtotal: true, tableNo: true },
    }),
    db.tab.findMany({
      // Recent means the selected day, not the global latest 10.
      where: {
        status: "SETTLED",
        settledAt: { gte: istDayStart(date), lt: istDayStart(addDaysISO(date, 1)) },
      },
      include: { items: { include: { product: true } } },
      orderBy: { settledAt: "desc" },
      take: 10,
    }),
  ]);

  const revToday = todayTabs.reduce((s, t) => s + t.total, 0);
  const revWeek = weekTabs.reduce((s, t) => s + t.total, 0);
  const revMonth = monthTabs.reduce((s, t) => s + t.total, 0);

  const openTabsCount = openTabs.length;
  const openTabsValue = openTabs.reduce((s, t) => s + t.subtotal, 0);
  const settledTodayCount = todayTabs.length;
  const averageTabValue = settledTodayCount > 0 ? Math.round(revToday / settledTodayCount) : 0;
  const activeTables = openTabs.map((t) => t.tableNo).filter((n): n is number => n !== null);

  // Top items aggregation
  const itemMap = new Map<number, { name: string; qty: number; revenue: number }>();
  for (const t of todayTabs) {
    for (const item of t.items) {
      const prev = itemMap.get(item.productId) ?? { name: item.product.name, qty: 0, revenue: 0 };
      itemMap.set(item.productId, {
        name: item.product.name,
        qty: prev.qty + item.qty,
        revenue: prev.revenue + item.price * item.qty,
      });
    }
  }

  const topItems = [...itemMap.entries()]
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.qty - a.qty);

  // Payment breakdown
  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const t of todayTabs) {
    if (t.payMethod) {
      const prev = methodMap.get(t.payMethod) ?? { amount: 0, count: 0 };
      methodMap.set(t.payMethod, { amount: prev.amount + t.total, count: prev.count + 1 });
    }
  }

  const methodLabels: Record<string, string> = {
    ONLINE: "Online (Razorpay)",
    UPI: "UPI",
    CASH: "Cash",
    CARD: "Card",
  };

  const byMethod = ["ONLINE", "UPI", "CASH", "CARD"].map((m) => ({
    method: m as "CASH" | "CARD" | "UPI" | "ONLINE",
    label: methodLabels[m] || m,
    amount: methodMap.get(m)?.amount ?? 0,
    count: methodMap.get(m)?.count ?? 0,
  }));

  return {
    date,
    revenue: {
      today: revToday,
      week: revWeek,
      month: revMonth,
    },
    metrics: {
      openTabsCount,
      openTabsValue,
      settledTodayCount,
      averageTabValue,
      activeTables,
    },
    topItems,
    byMethod,
    recentSettled: recentSettledRows.map((t) => toTabDTO(t as any)),
  };
}
