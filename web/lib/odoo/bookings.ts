import { createRecord, executeKw, searchRead } from "./client";

export type Court = { id: number; name: string; sport: string; walkin_price: number };
export type Booking = {
  id: number; court_id: [number, string]; partner_id: [number, string] | false;
  date: string; start_time: number; booking_type: string; state: string; price: number;
};
const OPEN = 6, CLOSE = 22; // sessions are 1 hour, last start 21:00

export const listCourts = () =>
  searchRead<Court>("club.court", [["active", "=", true]], ["name", "sport", "walkin_price"]);

// Free start times (30-min grid) for one court on one date, from live Odoo data.
export async function availability(courtId: number, date: string) {
  const taken = await searchRead<Booking>("club.booking",
    [["court_id", "=", courtId], ["date", "=", date], ["state", "=", "booked"]],
    ["start_time"]);
  const busy = new Set(taken.map((b) => b.start_time));
  const free: number[] = [];
  for (let t = OPEN; t <= CLOSE - 1; t += 0.5)
    if (![...busy].some((b) => Math.abs(b - t) < 1)) free.push(t);
  return free;
}

export async function createBooking(input: {
  courtId: number; date: string; startTime: number;
  partnerId?: number; walkinName?: string; type?: string;
}) {
  const id = await createRecord("club.booking", {
    court_id: input.courtId, date: input.date, start_time: input.startTime,
    partner_id: input.partnerId ?? false, walkin_name: input.walkinName ?? false,
    booking_type: input.type ?? "regular",
  });
  const [booking] = await searchRead<Booking>("club.booking", [["id", "=", id]],
    ["court_id", "partner_id", "date", "start_time", "booking_type", "state", "price"], 1);
  return booking;
}

export const cancelBooking = (bookingId: number) =>
  executeKw("club.booking", "action_cancel", [[bookingId]]);
