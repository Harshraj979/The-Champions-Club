import { NextResponse } from "next/server";
import { cancelBooking } from "@/lib/odoo/bookings";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.bookingId)
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  try { await cancelBooking(body.bookingId); return NextResponse.json({ ok: true }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
