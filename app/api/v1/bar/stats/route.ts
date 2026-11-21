import { handle } from "@/lib/http";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getBarDashboard } from "@/lib/services/bar-stats";

export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "BAR_OWNER");
    const date = new URL(req.url).searchParams.get("date") ?? todayISO();
    return getBarDashboard(date);
  });
