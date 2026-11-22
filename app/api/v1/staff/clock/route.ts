import { handle, body } from "@/lib/http";
import { currentStaff, toggleStaffClock } from "@/lib/auth";
import { badRequest, forbidden, unauthorized } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    const staff = await currentStaff();
    if (!staff) throw unauthorized("Must be signed in as staff");
    const data = (await body(req).catch(() => ({}))) as { staffId?: number | string };
    if (data?.staffId === undefined || data?.staffId === null || data?.staffId === "") {
      return await toggleStaffClock(staff.id);
    }
    const targetStaffId = Number(data.staffId);
    if (!Number.isInteger(targetStaffId) || targetStaffId <= 0)
      throw badRequest("staffId must be a positive integer");
    // Staff clock themselves; only the owner clocks someone else.
    if (targetStaffId !== staff.id && staff.role !== "OWNER")
      throw forbidden("You can only clock yourself in or out");
    return await toggleStaffClock(targetStaffId);
  });
