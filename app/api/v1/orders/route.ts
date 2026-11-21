import { handle, body } from "@/lib/http";
import { requireRole, requireStaff } from "@/lib/auth";
import { parse, orderInput } from "@/lib/validate";
import { createOrder, listOrders } from "@/lib/services/sales";

// Placing a pickup order is public: the shop page takes orders from
// anyone. Stock and member discounts are settled by the service, not
// the client. The staff list of today's orders is shop work.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "SHOP");
    return listOrders();
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(orderInput, await body(req));
    // A staff session in this browser means the counter took the
    // order (and the money). Anyone else's order stays PENDING.
    const staff = await requireStaff(req).catch(() => null);
    return createOrder({ ...input, paidAtCounter: staff !== null });
  }, 201);
