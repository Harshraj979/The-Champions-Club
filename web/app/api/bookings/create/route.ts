import { NextResponse } from "next/server";
import { createBooking } from "@/lib/odoo/bookings";

// Staff-only route in production: gate it with the Odoo session check from M1.
// Odoo enforces the hard rules (overlap, grid, max 2/day, expired member) -
// a rejection here is Odoo's ValidationError surfaced, never a silent pass.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.courtId || !body?.date || body?.startTime === undefined)
    return NextResponse.json({ error: "courtId, date and startTime are required" }, { status: 400 });
  if (!body?.partnerId && !body?.walkinName)
    return NextResponse.json({ error: "partnerId or walkinName is required" }, { status: 400 });
  try { return NextResponse.json({ booking: await createBooking(body) }, { status: 201 }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 422 }); }
}
