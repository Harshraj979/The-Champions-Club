import { db } from "../db";
import { badRequest, conflict } from "../errors";
import { memberState, findMemberByName } from "./members";

// Shop orders and bar tabs. One stock list serves the counter and the
// website: a sale checks stock and takes it off in the same transaction,
// so the shelf can never sell what it does not have. Member plan
// discounts are applied here, from the plan on record, never by the client.

type Item = { productId: number; qty: number };

async function priceItems(items: Item[], category: "GEAR" | "BAR") {
  const ids = items.map((i) => i.productId);
  const products = await db.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) throw badRequest("One of those products does not exist");
  return items.map((i) => {
    const p = products.find((x) => x.id === i.productId)!;
    if (p.category !== category) throw badRequest(`${p.name} is not sold here`);
    return { product: p, qty: i.qty, lineTotal: p.price * i.qty };
  });
}

export async function createOrder(input: {
  items: Item[];
  memberName: string;
  payMethod: "CASH" | "CARD" | "UPI";
}) {
  const member = input.memberName ? await findMemberByName(input.memberName) : null;
  if (input.memberName && !member) throw badRequest(`No member named ${input.memberName}`);
  const active = member && memberState(member.expiresOn) === "active";
  const discountPct = active ? member.plan.shopDiscount : 0;

  return db.$transaction(async (tx) => {
    const lines = await priceItems(input.items, "GEAR");
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
        subtotal,
        discount,
        total: subtotal - discount,
        payMethod: input.payMethod,
        items: {
          create: lines.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.product.price })),
        },
      },
      include: { items: true },
    });
    for (const l of lines) {
      if (l.product.stock !== null)
        await tx.product.update({ where: { id: l.product.id }, data: { stock: { decrement: l.qty } } });
    }
    return { id: order.id, subtotal, discount, total: order.total, payMethod: order.payMethod };
  });
}

export async function settleTab(input: {
  items: Item[];
  planCode: string;
  payMethod: "CASH" | "CARD" | "UPI";
}) {
  const plan =
    input.planCode === "walkin" ? null : await db.plan.findUnique({ where: { code: input.planCode } });
  if (input.planCode !== "walkin" && !plan) throw badRequest("Pick a plan that exists");
  const discountPct = plan?.barDiscount ?? 0;
  const lines = await priceItems(input.items, "BAR");
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discount = Math.round((subtotal * discountPct) / 100);
  const tab = await db.tab.create({
    data: {
      planCode: input.planCode,
      discountPct,
      subtotal,
      total: subtotal - discount,
      payMethod: input.payMethod,
      items: { create: lines.map((l) => ({ productId: l.product.id, qty: l.qty, price: l.product.price })) },
    },
  });
  return { id: tab.id, subtotal, discount, total: tab.total, payMethod: tab.payMethod };
}
