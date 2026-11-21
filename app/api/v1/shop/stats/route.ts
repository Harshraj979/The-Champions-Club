import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getShopDashboard } from "@/lib/services/shop-stats";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "SHOP");
    const date = new URL(req.url).searchParams.get("date") ?? todayISO();
    return getShopDashboard(date);
  });
