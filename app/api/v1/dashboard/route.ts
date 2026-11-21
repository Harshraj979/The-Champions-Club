import { handle } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { todayISO } from "@/lib/format";
import { getDashboard } from "@/lib/services/dashboard";

export const GET = (req: Request) =>
  handle(async () => {
    await requireStaff(req);
    return getDashboard(new URL(req.url).searchParams.get("date") ?? todayISO());
  });
