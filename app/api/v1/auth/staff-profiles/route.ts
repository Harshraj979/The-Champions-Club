import { handle } from "@/lib/http";
import { requireRole, ROLE_LABELS } from "@/lib/auth";
import { db } from "@/lib/db";

// Staff profiles are the owner's business: only the owner may list
// them, and the list never includes a PIN — custom or default.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const staff = await db.staff.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        pinHash: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });
    return {
      ok: true,
      staff: staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        roleLabel: ROLE_LABELS[s.role] || s.role,
        hasCustomPin: Boolean(s.pinHash),
      })),
    };
  });
