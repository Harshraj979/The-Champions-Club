import { db } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { istDayStart, addDaysISO, todayISO } from "../format";
import { createRazorpayOrder, razorpayConfigured, verifyPaymentSignature } from "../razorpay";
import type { OrderDTO, TabDTO } from "../types";
import { memberState, findMemberByName } from "./members";

// Shop orders and bar tabs. One stock list serves the counter and the
// website: a sale checks stock and takes it off in the same transaction,
// so the shelf can never sell what it does not have. Member plan
// discounts are applied here, from the plan on record, never by the client.

type Item = { productId: number; qty: number };

async function priceItems(items: Item[], category: "GEAR" | "BAR") {
  // The service never trusts quantities: zod already checks them on
  // the route, but this runs for every caller, so a bad qty can never
  // reach the stock maths (a negative qty would increase stock).
  for (const i of items) {
    if (!Number.isInteger(i.qty) || i.qty < 1)
      throw badRequest("Quantities must be whole numbers of at least 1");
  }
  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) throw badRequest("One of those products does not exist");
  return items.map((i) => {
    const p = products.find((x) => x.id === i.productId)!;
    if (p.category !== category) throw badRequest(`${p.name} is not sold here`);
    return { product: p, qty: i.qty, lineTotal: p.price * i.qty };
  });
}

// ---------- Shop: pickup orders ----------

export async function createOrder(input: {
  items: Item[];
  name: string;
  phone: string;
  payMethod: "CASH" | "CARD" | "UPI";
  fulfilment?: "PICKUP" | "DELIVERY";
  address?: string;
  payOnline?: boolean;
  // When a signed-in member orders, their id comes from the session
  // — never matched back by name or phone (an empty phone can match
  // the wrong member).
  memberId?: number;
}) {
  const fulfilment = input.fulfilment ?? "PICKUP";
  const address = fulfilment === "DELIVERY" ? (input.address ?? "").trim() : "";
  if (fulfilment === "DELIVERY" && address.length < 10)
    throw badRequest("Add the full delivery address");
  if (input.payOnline && !razorpayConfigured())
    throw badRequest("Online payment is not switched on yet. Pay at the counter instead.");
  // Merge duplicate lines for the same product, so the order does not
  // fail on the unique (orderId, productId) key.
  const items = input.items.reduce<Item[]>((acc, i) => {
    const existing = acc.find((x) => x.productId === i.productId);
    if (existing) existing.qty += i.qty;
    else acc.push({ ...i });
    return acc;
  }, []);
  // Merging happens before validation, so 99 + 99 of one product
  // cannot slip past the 99-per-line cap as 198.
  if (items.some((i) => i.qty > 99)) throw badRequest("At most 99 of one product per order");
  const member = input.memberId
    ? await db.member.findUnique({ where: { id: input.memberId }, include: { plan: true } })
    : await findMemberByName(input.name);
  const planState = member?.plan ? memberState(member.expiresOn) : "none";
  const active = planState === "active" || planState === "expiring";
  const discountPct = active && member?.plan ? member.plan.shopDiscount : 0;

  const created = await db.$transaction(async (tx) => {
    const lines = await priceItems(items, "GEAR");
    for (const l of lines) {
      if (l.product.stock !== null && l.qty > l.product.stock)
        throw conflict(
          l.product.stock === 0
            ? `${l.product.name} is out of stock`
            : `Only ${l.product.stock} left of ${l.product.name}`,
        );
    }
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const discount = Math.round((subtotal * discountPct) / 100);
    const order = await tx.order.create({
      data: {
        memberId: member?.id,
        name: input.name,
        phone: input.phone,
        subtotal,
        discount,
        total: subtotal - discount,
        payMethod: input.payOnline ? "ONLINE" : input.payMethod,
        // Every order starts PENDING: it becomes PAID only through a
        // verified Razorpay confirm, or the desk marking it paid via
        // /orders/[id]/pay once the money is taken.
        payState: "PENDING",
        fulfilment,
        address: address || null,
        items: {
          create: lines.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.product.price })),
        },
      },
      include: { items: { include: { product: true } } },
    });
    for (const l of lines) {
      if (l.product.stock !== null) {
        const updated = await tx.product.updateMany({
          where: { id: l.product.id, stock: { gte: l.qty } },
          data: { stock: { decrement: l.qty } },
        });
        if (updated.count === 0) throw conflict(`${l.product.name} is out of stock`);
      }
    }
    return order;
  });

  if (!input.payOnline) return toOrderDTO(created as OrderRow);
  // Online: open the real Razorpay order. payOnline already requires
  // Razorpay to be configured (checked above), so there is no demo
  // order id and no unpaid path to PAID.
  const razorpayOrderId = await createRazorpayOrder(created.total, `order_${created.id}`);
  const withRp = await db.order.update({
    where: { id: created.id },
    data: { razorpayOrderId },
    include: { items: { include: { product: true } } },
  });
  return { ...toOrderDTO(withRp as OrderRow), razorpayOrderId };
}

// The client returns from Razorpay checkout with a signed payment
// proof; only a valid signature flips the order to PAID.
export async function confirmPayment(
  orderId: number,
  proof: { razorpayOrderId: string; paymentId: string; signature: string },
): Promise<OrderDTO> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw notFound("No such order");
  // The signature is checked first, for every order: a forged confirm
  // for an already-paid order used to return success without any check.
  if (order.razorpayOrderId !== proof.razorpayOrderId)
    throw badRequest("That payment does not belong to this order");
  if (!verifyPaymentSignature(proof.razorpayOrderId, proof.paymentId, proof.signature))
    throw forbidden("Payment could not be verified");
  if (order.payState === "PAID") return toOrderDTO(order as OrderRow);
  const updated = await db.order.update({
    where: { id: orderId },
    data: { payState: "PAID", razorpayPaymentId: proof.paymentId },
    include: { items: { include: { product: true } } },
  });
  return toOrderDTO(updated as OrderRow);
}

type OrderRow = {
  id: number;
  name: string;
  phone: string;
  subtotal: number;
  discount: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI" | "ONLINE";
  payState: string;
  fulfilment: string;
  address: string | null;
  createdAt: Date;
  items: { productId: number; qty: number; price: number; product: { name: string } }[];
};

export const toOrderDTO = (o: OrderRow): OrderDTO => ({
  id: o.id,
  name: o.name,
  phone: o.phone,
  subtotal: o.subtotal,
  discount: o.discount,
  total: o.total,
  payMethod: o.payMethod,
  payState: o.payState === "PENDING" ? "PENDING" : "PAID",
  fulfilment: o.fulfilment === "DELIVERY" ? "DELIVERY" : "PICKUP",
  address: o.address,
  createdAt: o.createdAt.toISOString(),
  items: o.items.map((i) => ({ productId: i.productId, name: i.product.name, qty: i.qty, price: i.price })),
});

// Order history: no dates means today (the staff default); from/to
// open any window, page is 1-based, 50 rows a page. Listing also
// sweeps up abandoned online checkouts (see expireUnpaidOrders), so
// a dead checkout never holds stock past its window.
export async function listOrders(opts: { from?: string; to?: string; page?: number } = {}): Promise<OrderDTO[]> {
  await expireUnpaidOrders();
  const page = Math.max(1, opts.page ?? 1);
  const from = opts.from ? istDayStart(opts.from) : istDayStart(todayISO());
  const to = opts.to ? istDayStart(addDaysISO(opts.to, 1)) : istDayStart(addDaysISO(todayISO(), 1));
  const rows = await db.order.findMany({
    where: { createdAt: { gte: from, lt: to } },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
    skip: (page - 1) * 50,
  });
  return rows.map(toOrderDTO);
}

// Online orders hold stock from the moment they are placed, but an
// abandoned checkout must not hold it forever: a PENDING online order
// older than `ageMinutes` (30 by default) is cancelled and its stock
// is put back on the shelf. Counter orders are never touched — the
// desk settles those by hand.
export async function expireUnpaidOrders(ageMinutes = 30): Promise<number> {
  const cutoff = new Date(Date.now() - ageMinutes * 60 * 1000);
  const stale = await db.order.findMany({
    where: { payMethod: "ONLINE", payState: "PENDING", status: "PLACED", createdAt: { lt: cutoff } },
    include: { items: true },
  });
  if (!stale.length) return 0;
  await db.$transaction(async (tx) => {
    for (const o of stale) {
      for (const item of o.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
        if (product?.stock !== null && product?.stock !== undefined) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }
      await tx.order.update({ where: { id: o.id }, data: { status: "CANCELLED" } });
    }
  });
  return stale.length;
}

// A PENDING counter order becomes PAID when the desk takes the money.
// Atomic: only a PENDING order flips, so two staff cannot pay it twice.
export async function markOrderPaid(id: number): Promise<OrderDTO> {
  const updated = await db.order.updateMany({
    where: { id, payState: "PENDING" },
    data: { payState: "PAID" },
  });
  if (updated.count === 0) {
    const exists = await db.order.findUnique({ where: { id } });
    if (!exists) throw notFound("No such order");
    throw conflict("That order is already paid");
  }
  const row = await db.order.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
  return toOrderDTO(row as OrderRow);
}

// ---------- Bar: tabs with a real open → settle life ----------

type TabRow = {
  id: number;
  who: string;
  tableNo: number | null;
  status: "OPEN" | "SETTLED";
  planCode: string;
  discountPct: number;
  subtotal: number;
  total: number;
  payMethod: "CASH" | "CARD" | "UPI" | "ONLINE" | null;
  items: { productId: number; qty: number; price: number; product: { name: string } }[];
};

const tabInclude = { items: { include: { product: true } } } as const;

export const toTabDTO = (t: TabRow): TabDTO => ({
  id: t.id,
  who: t.who,
  tableNo: t.tableNo,
  status: t.status,
  planCode: t.planCode,
  discountPct: t.discountPct,
  subtotal: t.subtotal,
  total: t.total,
  payMethod: t.payMethod,
  items: t.items.map((i) => ({ productId: i.productId, name: i.product.name, qty: i.qty, price: i.price })),
});

async function getTabRow(id: number): Promise<TabRow> {
  const tab = await db.tab.findUnique({ where: { id }, include: tabInclude });
  if (!tab) throw notFound("No such tab");
  return tab as TabRow;
}

export async function listTabs(): Promise<TabDTO[]> {
  const rows = await db.tab.findMany({
    where: {
      OR: [{ status: "OPEN" }, { settledAt: { gte: istDayStart(todayISO()) } }],
    },
    include: tabInclude,
    orderBy: { openedAt: "asc" },
  });
  return rows.map((t) => toTabDTO(t as TabRow));
}

export async function openTab(input: { who: string; tableNo?: number }): Promise<TabDTO> {
  if (input.tableNo !== undefined && (input.tableNo < 1 || input.tableNo > 8))
    throw badRequest("Tables run T1 to T8");
  const member = await findMemberByName(input.who);
  // The discount snapshot is taken here, at open time: a member with
  // an active plan gets their plan code, everyone else is a walk-in.
  // Settle later uses this snapshot, never a fresh expiry check.
  const planState = member?.plan ? memberState(member.expiresOn) : "none";
  const hasActivePlan = planState === "active" || planState === "expiring";
  // The occupied-table check and the create run in one transaction,
  // so two requests racing for the same table cannot both open a tab.
  const tab = await db.$transaction(async (tx) => {
    if (input.tableNo !== undefined) {
      const busy = await tx.tab.findFirst({ where: { tableNo: input.tableNo, status: "OPEN" } });
      if (busy) throw conflict(`Table ${input.tableNo} already has an open tab (${busy.who})`);
    }
    return tx.tab.create({
      data: {
        who: member?.name ?? input.who,
        memberId: member?.id,
        tableNo: input.tableNo,
        status: "OPEN",
        planCode: hasActivePlan ? member!.plan!.code : "walkin",
      },
      include: tabInclude,
    });
  });
  return toTabDTO(tab as TabRow);
}

// Bar vs Cafeteria item classification:
// Junior members are minors (under 18) and do not have access to the bar / alcohol,
// they only have access to cafeteria items (food, coffee, shakes, non-alcoholic beverages).
export function isBarRestrictedItem(product: { name: string; category?: string }): boolean {
  const n = product.name.toLowerCase();
  const barKeywords = [
    "beer",
    "wine",
    "cocktail",
    "whiskey",
    "whisky",
    "vodka",
    "gin",
    "rum",
    "tequila",
    "alcohol",
    "liquor",
    "draught",
    "cider",
    "brandy",
    "shot",
    "bar drink",
    "spirit",
    "tonic",
  ];
  return barKeywords.some((k) => n.includes(k));
}

export async function addTabItems(id: number, items: Item[]): Promise<TabDTO> {
  const tab = await getTabRow(id);
  if (tab.status !== "OPEN") throw conflict("That tab is already settled");
  const lines = await priceItems(items, "BAR");

  // Junior membership restriction check:
  // Junior members do not have access to the bar, only to cafeteria.
  if (tab.planCode === "junior") {
    const barRestricted = lines.filter((l) => isBarRestrictedItem(l.product));
    if (barRestricted.length > 0) {
      throw forbidden(
        `Junior members do not have access to the bar. Only cafeteria items (food, coffee, shakes, juices) are permitted. Restricted item(s): ${barRestricted.map((b) => b.product.name).join(", ")}`
      );
    }
  }

  await db.$transaction(async (tx) => {
    for (const l of lines) {
      await tx.tabItem.upsert({
        where: { tabId_productId: { tabId: id, productId: l.product.id } },
        create: { tabId: id, productId: l.product.id, qty: l.qty, price: l.product.price },
        update: { qty: { increment: l.qty } },
      });
    }
    const now = await tx.tabItem.findMany({ where: { tabId: id } });
    const subtotal = now.reduce((s, i) => s + i.price * i.qty, 0);
    await tx.tab.update({ where: { id }, data: { subtotal, total: subtotal } });
  });
  return toTabDTO(await getTabRow(id));
}

export async function settleTab(id: number, payMethod: "CASH" | "CARD" | "UPI" | "ONLINE"): Promise<TabDTO> {
  const tab = await db.tab.findUnique({ where: { id } });
  if (!tab) throw notFound("No such tab");
  if (tab.status !== "OPEN") throw conflict("That tab is already settled");
  // The discount comes from the plan snapshotted on the tab when it
  // was opened (tab.planCode), not the member's current plan and not
  // a fresh expiry check: a plan change or an expiry between open
  // and settle must not change the discount.
  // Nobody types a discount, and nobody can inflate one.
  const plan =
    tab.planCode === "walkin" ? null : await db.plan.findUnique({ where: { code: tab.planCode } });
  const discountPct = plan ? plan.barDiscount : 0;
  const discount = Math.round((tab.subtotal * discountPct) / 100);
  // Atomic settle: only an OPEN tab flips to SETTLED. Two settles
  // racing each other cannot both win — the loser updates 0 rows.
  const settled = await db.tab.updateMany({
    where: { id, status: "OPEN" },
    data: {
      status: "SETTLED",
      planCode: tab.planCode,
      discountPct,
      total: tab.subtotal - discount,
      payMethod,
      settledAt: new Date(),
    },
  });
  if (settled.count === 0) throw conflict("That tab is already settled");
  return toTabDTO(await getTabRow(id));
}
