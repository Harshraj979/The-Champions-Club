import { handle, body } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { parse, orderInput } from "@/lib/validate";
import { createOrder, listOrders } from "@/lib/services/sales";
import { badRequest } from "@/lib/errors";

// Placing a pickup order is public: the shop page takes orders from
// anyone. Stock and member discounts are settled by the service, not
// the client. The staff list of today's orders is shop work — the
// front desk reads it too.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "SHOP", "FRONT_DESK");
    const q = new URL(req.url).searchParams;
    const from = q.get("from") ?? undefined;
    const to = q.get("to") ?? undefined;
    const page = q.get("page") ? Number(q.get("page")) : undefined;
    if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) throw badRequest("from must be YYYY-MM-DD");
    if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw badRequest("to must be YYYY-MM-DD");
    if (page !== undefined && (!Number.isInteger(page) || page < 1)) throw badRequest("page must be 1 or more");
    return listOrders({ from, to, page });
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(orderInput, await body(req));
    // Orders start PENDING, whoever places them: a staff session in
    // this browser is not proof the money was taken. The desk marks
    // the order PAID via /orders/[id]/pay once it is.
    return createOrder({ ...input });
  }, 201);
