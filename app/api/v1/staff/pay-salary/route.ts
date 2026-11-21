import { handle, body } from "@/lib/http";
import { requireRole, payStaffSalary } from "@/lib/auth";
import { badRequest } from "@/lib/errors";

export const POST = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER");
    const data = await body(req);
    const { staffId, amount, month, paymentRef } = (data || {}) as {
      staffId?: number;
      amount?: number;
      month?: string;
      paymentRef?: string;
    };
    if (!staffId || amount === undefined) {
      throw badRequest("staffId and amount are required");
    }
    return await payStaffSalary({
      staffId: Number(staffId),
      amount: Number(amount),
      month,
      paymentRef,
    });
  });
