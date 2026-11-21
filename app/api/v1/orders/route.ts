import { handle, body } from "@/lib/http";
import { parse, orderInput } from "@/lib/validate";
import { createOrder } from "@/lib/services/sales";

// Public: the shop page takes pickup orders from anyone. Stock and
// member discounts are settled by the service, not the client.
export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(orderInput, await body(req));
    return createOrder({ ...input, memberName: input.memberName ?? "" });
  }, 201);
