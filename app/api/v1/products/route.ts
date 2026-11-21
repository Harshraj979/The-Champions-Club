import { handle } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { listProducts } from "@/lib/services/catalog";

export const GET = (req: Request) =>
  handle(() => {
    const c = new URL(req.url).searchParams.get("category");
    if (c !== null && c !== "GEAR" && c !== "BAR") throw badRequest("Category must be GEAR or BAR");
    return listProducts(c ?? undefined);
  });
