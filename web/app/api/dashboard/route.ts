import { NextResponse } from "next/server";
import { ownerDashboard } from "@/lib/odoo/dashboard";

export async function GET(req: Request) {
  const date = new URL(req.url).searchParams.get("date")
    ?? new Date().toISOString().slice(0, 10);
  try { return NextResponse.json(await ownerDashboard(date)); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
