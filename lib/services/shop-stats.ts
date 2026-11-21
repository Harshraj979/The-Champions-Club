import { db } from "../db";
import { badRequest } from "../errors";
import { addDaysISO, isISODate, istDayStart, todayISO } from "../format";
import { toOrderDTO } from "./sales";
import type { OrderDTO, ProductDTO } from "../types";

export type ShopDashboardDTO = {
  date: string;
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  metrics: {
    ordersCount: number;
    averageOrderValue: number;
    pickupCount: number;
    deliveryCount: number;
    inventoryTotalValuation: number;
  };
  inventorySummary: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockItems: ProductDTO[];
  };
  topProducts: {
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
  recentOrders: OrderDTO[];
};

export async function getShopDashboard(date: string = todayISO()): Promise<ShopDashboardDTO> {
  if (!isISODate(date)) throw badRequest("Date must be YYYY-MM-DD");

  const [todayOrders, weekOrders, monthOrders, products, recentOrderRows] = await Promise.all([
    db.order.findMany({
      where: {
        createdAt: { gte: istDayStart(date), lt: istDayStart(addDaysISO(date, 1)) },
        payState: { not: "PENDING" },
      },
      include: { items: { include: { product: true } } },
    }),
    db.order.findMany({
      where: {
        createdAt: { gte: istDayStart(addDaysISO(date, -6)), lt: istDayStart(addDaysISO(date, 1)) },
        payState: { not: "PENDING" },
      },
      select: { total: true },
    }),
    db.order.findMany({
      where: {
        createdAt: { gte: istDayStart(addDaysISO(date, -29)), lt: istDayStart(addDaysISO(date, 1)) },
        payState: { not: "PENDING" },
      },
      select: { total: true },
    }),
    db.product.findMany({
      where: { category: "GEAR" },
      orderBy: { stock: "asc" },
    }),
    db.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const revToday = todayOrders.reduce((s, o) => s + o.total, 0);
  const revWeek = weekOrders.reduce((s, o) => s + o.total, 0);
  const revMonth = monthOrders.reduce((s, o) => s + o.total, 0);

  const ordersCount = todayOrders.length;
  const averageOrderValue = ordersCount > 0 ? Math.round(revToday / ordersCount) : 0;
  const pickupCount = todayOrders.filter((o) => o.fulfilment === "PICKUP").length;
  const deliveryCount = todayOrders.filter((o) => o.fulfilment === "DELIVERY").length;

  // Inventory stats
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;
  const lowStockCount = products.filter((p) => p.stock !== null && p.stock > 0 && p.stock <= p.lowAt).length;
  const lowStockItems = products
    .filter((p) => p.stock !== null && p.stock <= p.lowAt)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
      lowAt: p.lowAt,
      category: p.category,
    }));
  const inventoryTotalValuation = products.reduce((acc, p) => acc + p.price * (p.stock ?? 0), 0);

  // Top products sold today
  const productSalesMap = new Map<number, { name: string; qty: number; revenue: number }>();
  for (const o of todayOrders) {
    for (const item of o.items) {
      const prev = productSalesMap.get(item.productId) ?? { name: item.product.name, qty: 0, revenue: 0 };
      productSalesMap.set(item.productId, {
        name: item.product.name,
        qty: prev.qty + item.qty,
        revenue: prev.revenue + item.price * item.qty,
      });
    }
  }

  const topProducts = [...productSalesMap.entries()]
    .map(([productId, data]) => ({ productId, ...data }))
    .sort((a, b) => b.qty - a.qty);

  // Payment breakdown
  const methodMap = new Map<string, { amount: number; count: number }>();
  for (const o of todayOrders) {
    const prev = methodMap.get(o.payMethod) ?? { amount: 0, count: 0 };
    methodMap.set(o.payMethod, { amount: prev.amount + o.total, count: prev.count + 1 });
  }

  const methodLabels: Record<string, string> = {
    ONLINE: "Demo Razorpay",
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
      ordersCount,
      averageOrderValue,
      pickupCount,
      deliveryCount,
      inventoryTotalValuation,
    },
    inventorySummary: {
      totalProducts,
      lowStockCount,
      outOfStockCount,
      lowStockItems,
    },
    topProducts,
    byMethod,
    recentOrders: recentOrderRows.map((o) => toOrderDTO(o as any)),
  };
}
