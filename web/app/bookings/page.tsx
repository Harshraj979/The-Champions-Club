"use client";
import { todayBookings, fmtTime, inr } from "@/lib/demo";
import { useStore } from "@/lib/store";

const today = new Date().toISOString().slice(0, 10);
export default function Bookings() {
  const { store, cancelBooking } = useStore();
  const seeds = todayBookings.map((b) => ({
    id: b.id, date: today, court: b.court, who: b.who, time: b.time, price: b.price,
    state: store.cancelledSeeds.includes(b.id) ? "cancelled" : b.state, seed: true,
  }));
  const mine = store.bookings.map((b) => ({ ...b, seed: false }));
  const rows = [...seeds, ...mine].sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time);
  async function cancel(id: number, seed: boolean) {
    try { await fetch("/api/bookings/cancel", { method: "POST", body: JSON.stringify({ bookingId: id }) }); } catch { /* demo */ }
    cancelBooking(id, seed);
  }
  return (
    <main className="wrap page">
      <h2 className="title">Bookings</h2>
      <p className="sub">Every booking on the books. Cancelling frees the slot at once. <span className="tag grey">Staff view</span></p>
      <div className="card">
        <table><thead><tr><th>Date</th><th>Time</th><th>Court</th><th>Who</th><th>Price</th><th>State</th><th /></tr></thead>
          <tbody>{rows.map((b) => (
            <tr key={`${b.seed ? "s" : "m"}-${b.id}`}><td>{b.date}</td><td>{fmtTime(b.time)}</td><td>{b.court}</td><td>{b.who}</td><td>{inr(b.price)}</td>
              <td>{b.state === "booked" ? <span className="tag">Booked</span> : <span className="tag red">Cancelled</span>}</td>
              <td>{b.state === "booked" && <button className="pill ghost" onClick={() => cancel(b.id, b.seed)}>Cancel</button>}</td></tr>))}
          </tbody></table>
      </div>
    </main>
  );
}
