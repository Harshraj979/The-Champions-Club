import { db } from "../db";
import type { CourtDTO, PlanDTO, ProductDTO } from "../types";

// The club's standing data: plans, courts, products. Read by every page
// and by the booking and sales services for prices.
export async function listPlans(): Promise<PlanDTO[]> {
  const rows = await db.plan.findMany({ orderBy: { id: "asc" } });
  return rows.map((p) => ({
    code: p.code,
    name: p.name,
    courtPrice: p.courtPrice,
    shopDiscount: p.shopDiscount,
    barDiscount: p.barDiscount,
    termDays: p.termDays,
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
