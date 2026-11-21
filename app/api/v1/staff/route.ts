import { handle, body } from "@/lib/http";
import { requireRole, createStaffMember } from "@/lib/auth";
import { listStaff } from "@/lib/services/shifts";

// The staff roster (names and roles only — never credentials).
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listStaff();
  });

// Add a new staff member (Owner only)
export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const payload = await body(req);
    return createStaffMember(payload as any);
  });

