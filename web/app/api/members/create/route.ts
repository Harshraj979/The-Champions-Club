import { NextResponse } from "next/server";
import { createMember } from "@/lib/odoo/members";

// Staff-only route in production: gate it with the Odoo session check from M1
// before exposing this app beyond the club network / demo tunnel.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.planId || !body?.expiry)
    return NextResponse.json({ error: "name, planId and expiry are required" }, { status: 400 });
  try { return NextResponse.json({ member: await createMember(body) }, { status: 201 }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
