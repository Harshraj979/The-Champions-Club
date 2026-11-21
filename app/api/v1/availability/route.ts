import { handle } from "@/lib/http";
import { badRequest } from "@/lib/errors";
import { takenStarts } from "@/lib/services/bookings";

// Public: which starts are taken on one court on one date. A booking
// covers a full hour, so the client blocks the starts either side too.
export const GET = (req: Request) =>
  handle(async () => {
    const q = new URL(req.url).searchParams;
    const courtId = Number(q.get("courtId"));
    const date = q.get("date") ?? "";
    if (!Number.isInteger(courtId) || courtId <= 0) throw badRequest("courtId is required");
    return { courtId, date, taken: await takenStarts(courtId, date) };
  });
