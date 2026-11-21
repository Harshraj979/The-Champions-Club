import { handle, body } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { parse, tabInput } from "@/lib/validate";
import { settleTab } from "@/lib/services/sales";

// Settling a bar tab is till work, so it needs a staff session.
export const POST = (req: Request) =>
  handle(async () => {
    await requireStaff(req);
    const input = parse(tabInput, await body(req));
    return settleTab(input);
  }, 201);
