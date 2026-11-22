import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { badRequest } from "@/lib/errors";
import { markBookingPaid } from "@/lib/services/bookings";

const methods = ["CASH", "CARD", "UPI", "ONLINE"] as const;

export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Booking id is required");
    const body = (await req.json().catch(() => ({}))) as { payMethod?: string };
    if (!(methods as readonly string[]).includes(body.payMethod ?? ""))
      throw badRequest("payMethod must be CASH, CARD, UPI or ONLINE");
    return markBookingPaid(id, body.payMethod as (typeof methods)[number]);
  });
