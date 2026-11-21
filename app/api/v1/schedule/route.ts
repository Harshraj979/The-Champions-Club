import { handle } from "@/lib/http";
import { todayISO } from "@/lib/format";
import { listSchedule } from "@/lib/services/bookings";

export const GET = (req: Request) =>
  handle(() => listSchedule(new URL(req.url).searchParams.get("date") ?? todayISO()));
