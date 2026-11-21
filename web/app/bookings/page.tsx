"use client";
import { useState } from "react";
import { todayBookings, fmtTime, inr } from "@/lib/demo";

export default function Bookings() {
  const [rows, setRows] = useState(todayBookings);
  async function cancel(id: number) {
    try { await fetch("/api/bookings/cancel", { method: "POST", body: JSON.stringify({ bookingId: id }) }); } catch { /* demo */ }
    setRows((r) => r.map((b) => (b.id === id ? { ...b, state: "cancelled" } : b)));
  }
  return (
    <main className="wrap page">
      <h2 className="title">Bookings</h2>
      <p className="sub">Today, across all courts. Cancelling frees the slot at once. <span className="tag grey">Staff view</span></p>
      <div className="card">
        <table><thead><tr><th>Time</th><th>Court</th><th>Who</th><th>Price</th><th>State</th><th /></tr></thead>
          <tbody>{rows.map((b) => (
            <tr key={b.id}><td>{fmtTime(b.time)}</td><td>{b.court}</td><td>{b.who}</td><td>{inr(b.price)}</td>
              <td>{b.state === "booked" ? <span className="tag">Booked</span> : <span className="tag red">Cancelled</span>}</td>
              <td>{b.state === "booked" && <button className="pill ghost" onClick={() => cancel(b.id)}>Cancel</button>}</td></tr>))}
          </tbody></table>
      </div>
    </main>
  );
}
