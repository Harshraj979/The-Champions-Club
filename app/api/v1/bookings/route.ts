import { handle, body } from "@/lib/http";
import { currentStaff, currentMember, requireRole } from "@/lib/auth";
import { parse, bookingInput } from "@/lib/validate";
import { createBooking, listBookings } from "@/lib/services/bookings";
import { unauthorized, forbidden } from "@/lib/errors";

// The booking list is a front-desk view. Trials are public (the website's
// free-trial offer); regular bookings can be made by front-desk/owners or
// directly by signed-in club members with an active plan.
export const GET = (req: Request) =>
  handle(async () => {
    await requireRole(req, "OWNER", "FRONT_DESK", "STAFF");
    return listBookings(new URL(req.url).searchParams.get("date") ?? undefined);
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(bookingInput, await body(req));
    const staffUser = await currentStaff();
    const memberUser = await currentMember();
    if (input.type !== "TRIAL") {
      if (!staffUser && !memberUser) {
        throw unauthorized("Sign in required to book a court");
      }
      if (!staffUser && memberUser) {
        if (!memberUser.plan || (memberUser.state !== "active" && memberUser.state !== "expiring")) {
          throw forbidden("An active membership plan is required to book a court.");
        }
        input.name = memberUser.name;
        if (!input.phone) input.phone = memberUser.phone;
        if (!input.email) input.email = memberUser.email ?? undefined;
      }
    }
    return createBooking({
      ...input,
      phone: input.phone ?? "",
      email: input.email || undefined,
      isStaffBooking: !!staffUser,
    });
  }, 201);
