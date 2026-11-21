"use client";
import { todayBookings, todayISO, fmtTime, inr } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function Bookings() {
  const { store, cancelBooking } = useStore();
  const today = todayISO();
  const seeds = todayBookings.map((b) => ({
    id: b.id, date: today, court: b.court, who: b.who, time: b.time, type: b.type, price: b.price,
    state: store.cancelledSeeds.includes(b.id) ? "cancelled" : "booked", seed: true,
  }));
  const mine = store.bookings.map((b) => ({ ...b, seed: false }));
  const rows = [...seeds, ...mine].sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time);
  const live = rows.filter((b) => b.state === "booked");

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Bookings</h1>
        <p className="sub">Every booking on the books. Cancelling frees the slot at once. Staff view.</p>
      </div>
      {live.length === 0 ? (
        <div className="empty">No bookings standing. Everything has been cancelled, and the courts are free.</div>
      ) : (
        <table className="ledger">
          <thead><tr><th>Date</th><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Price</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={`${b.seed ? "s" : "m"}-${b.id}`}>
                <td className="num">{b.date}</td>
                <td className="num">{fmtTime(b.time)}</td>
                <td>{b.court}</td>
                <td>{b.who}</td>
                <td className="num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                <td><span className={`status ${b.state}`}>{b.state === "booked" ? "Booked" : "Cancelled"}</span></td>
                <td className="r">{b.state === "booked" && <button className="text-link" onClick={() => cancelBooking(b.id, b.seed)}>Cancel</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
