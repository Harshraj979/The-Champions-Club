import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_ROLE_PINS, ROLE_LABELS } from "@/lib/auth";

export async function GET() {
  try {
    const staff = await db.staff.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        pinHash: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    let seenOwner = false;
    const result = [];
    for (const s of staff) {
      if (s.role === "OWNER") {
        if (!seenOwner) {
          seenOwner = true;
          result.push({
            id: s.id,
            name: "Vikram Rao (Club Owner)",
            role: s.role,
            roleLabel: ROLE_LABELS[s.role] || s.role,
            hasCustomPin: Boolean(s.pinHash),
            defaultPin: DEFAULT_ROLE_PINS[s.role] || "0000",
          });
        }
      } else {
        result.push({
          id: s.id,
          name: s.name,
          role: s.role,
          roleLabel: ROLE_LABELS[s.role] || s.role,
          hasCustomPin: Boolean(s.pinHash),
          defaultPin: DEFAULT_ROLE_PINS[s.role] || "0000",
        });
      }
    }

    return NextResponse.json({ ok: true, staff: result });
  } catch {
    return NextResponse.json({ ok: false, staff: [] });
  }
}
