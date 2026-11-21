import { NextResponse } from "next/server";
import { searchMembers } from "@/lib/odoo/members";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  try { return NextResponse.json({ members: await searchMembers(q) }); }
  catch (e) { return NextResponse.json({ error: String(e) }, { status: 502 }); }
}
