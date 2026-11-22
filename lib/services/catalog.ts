import { db } from "../db";
import { badRequest, notFound } from "../errors";
import type { CourtDTO, PlanDTO, ProductDTO } from "../types";

// The club's standing data: plans, courts, products. Read by every page
// and by the booking and sales services for prices.
export async function listPlans(): Promise<PlanDTO[]> {
  const rows = await db.plan.findMany({ orderBy: { id: "asc" } });
  return rows.map((p) => ({
    code: p.code,
    name: p.name,
    tennisPrice: p.tennisPrice,
    cricketPrice: p.cricketPrice,
    shopDiscount: p.shopDiscount,
    barDiscount: p.barDiscount,
    termDays: p.termDays,
    fee: p.fee,
  }));
}

export async function listCourts(): Promise<CourtDTO[]> {
  const rows = await db.court.findMany({ orderBy: { id: "asc" } });
  return rows.map((c) => ({ id: c.id, name: c.name, sport: c.sport, walkinPrice: c.walkinPrice }));
}

export async function listProducts(category?: "GEAR" | "BAR"): Promise<ProductDTO[]> {
  const rows = await db.product.findMany({
    where: category ? { category } : undefined,
    orderBy: { id: "asc" },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    lowAt: p.lowAt,
    category: p.category,
  }));
}

// Stock only goes up here: the shop floor sells it down. There was no
// way to add stock or change the low-stock level after seeding.
export async function restockProduct(id: number, qty: number, lowAt?: number): Promise<ProductDTO> {
  if (!Number.isInteger(qty) || qty <= 0) throw badRequest("Restock quantity must be a whole number above 0");
  if (qty > 10000) throw badRequest("Restock quantity cannot be more than 10,000 at a time");
  if (lowAt !== undefined && (!Number.isInteger(lowAt) || lowAt < 0)) throw badRequest("lowAt must be a whole number of 0 or more");
  const product = await db.product.findUnique({ where: { id } });
  if (!product) throw notFound("No such product");
  if (product.stock === null) throw badRequest("Bar items are not stocked — there is nothing to restock");
  const r = await db.product.update({
    where: { id },
    data: { stock: { increment: qty }, ...(lowAt !== undefined ? { lowAt } : {}) },
  });
  return { id: r.id, name: r.name, price: r.price, stock: r.stock, lowAt: r.lowAt, category: r.category };
}
