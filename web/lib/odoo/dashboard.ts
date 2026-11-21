import { searchRead } from "./client";

// The owner dashboard is computed here, in TypeScript: Odoo only stores
// the records, Next does the maths and the shaping.
type BookingRow = {
  id: number; court_id: [number, string]; partner_id: [number, string] | false;
  walkin_name: string | false; start_time: number; booking_type: string; price: number;
};
type PosRow = { amount_total: number; config_id: [number, string] };

export async function ownerDashboard(date: string) {
  const bookings = await searchRead<BookingRow>("club.booking",
    [["date", "=", date], ["state", "=", "booked"]],
    ["court_id", "partner_id", "walkin_name", "start_time", "booking_type", "price"]);
  const courts = bookings.reduce((s, b) => s + b.price, 0);

  // POS totals for the day, split by counter. POS may not be installed
  // in every database, so a failure here just zeroes that part.
  let shop = 0, bar = 0;
  try {
    const orders = await searchRead<PosRow>("pos.order",
      [["date_order", ">=", `${date} 00:00:00`], ["date_order", "<=", `${date} 23:59:59`],
       ["state", "in", ["paid", "done", "invoiced"]]],
      ["amount_total", "config_id"]);
    for (const o of orders)
      if (o.config_id?.[1]?.toLowerCase().includes("bar")) bar += o.amount_total;
      else shop += o.amount_total;
  } catch { /* POS not installed yet */ }

  return {
    date, courts, shop, bar, total: courts + shop + bar,
    bookings: bookings.map((b) => ({
      id: b.id, court: b.court_id?.[1] ?? "",
      who: b.partner_id ? b.partner_id[1] : `Walk-in: ${b.walkin_name ?? ""}`,
      time: b.start_time, type: b.booking_type, price: b.price,
    })),
  };
}
