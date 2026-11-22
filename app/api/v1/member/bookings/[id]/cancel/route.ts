import { handle } from "@/lib/http";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { requireMember } from "@/lib/auth";
import { getMember } from "@/lib/services/members";
import { cancelBooking } from "@/lib/services/bookings";
import { db } from "@/lib/db";
import { istMinutesNow, todayISO } from "@/lib/format";

// A member cancelling their own booking. Identity comes from the
// session, never from the request body. The booking must belong to the
// signed-in member — matched on phone (or on the member link the desk
// set when the booking was made) — and the slot must not have started.
export const POST = (req: Request, { params }: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const session = await requireMember(req);
    const id = Number((await params).id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest("Booking id is required");
    const member = await getMember(session.id);
    const row = await db.booking.findUnique({ where: { id } });
    if (!row) throw notFound("No such booking");
    const digits = (s: string) => s.replace(/\D/g, "");
    const ownByPhone = digits(row.phone) === digits(member.phone);
    const ownByLink = row.memberId === member.id;
    if (!ownByPhone && !ownByLink) throw forbidden("That booking is not on your account");
    const dayISO = row.date.toISOString().slice(0, 10);
    if (dayISO < todayISO() || (dayISO === todayISO() && row.start <= istMinutesNow()))
      throw badRequest("That slot has already started");
    return cancelBooking(id);
  });
