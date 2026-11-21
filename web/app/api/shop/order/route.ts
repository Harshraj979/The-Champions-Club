import { NextResponse } from "next/server";
import { createOrder } from "@/lib/odoo/shop";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.partnerId || !Array.isArray(body?.items) || !body.items.length)
    return NextResponse.json({ error: "partnerId and items are required" }, { status: 400 });
  try { return NextResponse.json(await createOrder(body), { status: 201 }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
