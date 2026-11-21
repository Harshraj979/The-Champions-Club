import { NextResponse } from "next/server";
import { listProducts } from "@/lib/odoo/shop";

export async function GET() {
  try { return NextResponse.json({ products: await listProducts() }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
