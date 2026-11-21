import { handle, body } from "@/lib/http";
import { requireStaff } from "@/lib/auth";
import { parse, bookingInput } from "@/lib/validate";
import { createBooking, listBookings } from "@/lib/services/bookings";

// The full booking list is a staff view. Creating a booking is public:
// members book by name, exactly as they did at the desk.
export const GET = (req: Request) =>
  handle(async () => {
    await requireStaff(req);
    return listBookings(new URL(req.url).searchParams.get("date") ?? undefined);
  });

export const POST = (req: Request) =>
  handle(async () => {
    const input = parse(bookingInput, await body(req));
    return createBooking({ ...input, phone: input.phone ?? "" });
  }, 201);
