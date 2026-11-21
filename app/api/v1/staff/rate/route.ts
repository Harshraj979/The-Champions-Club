import { handle, body } from "@/lib/http";
import { requireRole, updateStaffHourlyRate } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const data = await body(req);
    const { staffId, hourlyRate } = (data || {}) as { staffId?: number; hourlyRate?: number };
    if (!staffId || hourlyRate === undefined) {
      throw badRequest("staffId and hourlyRate are required");
    }
    return await updateStaffHourlyRate(Number(staffId), Number(hourlyRate));
  });
