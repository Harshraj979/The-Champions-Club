import { NextResponse } from "next/server";
import { availability } from "@/lib/odoo/bookings";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const courtId = Number(p.get("courtId")), date = p.get("date");
  if (!courtId || !date)
    return NextResponse.json({ error: "courtId and date are required" }, { status: 400 });
  try { return NextResponse.json({ free: await availability(courtId, date) }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
