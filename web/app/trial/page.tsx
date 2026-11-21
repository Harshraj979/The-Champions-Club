"use client";
import { useState } from "react";
import { courts, fmtTime } from "@/lib/demo";

const slots = Array.from({ length: 31 }, (_, i) => 6 + i * 0.5);
export default function Trial() {
  const [f, setF] = useState({ name: "", phone: "", courtId: 1, date: "", startTime: 17 });
  const [done, setDone] = useState(false);
  async function submit() {
    try {
      const r = await fetch("/api/bookings/create", { method: "POST",
        body: JSON.stringify({ courtId: f.courtId, date: f.date, startTime: f.startTime, walkinName: f.name, type: "trial" }) });
      if (!r.ok) throw new Error();
    } catch { /* demo mode: accept locally */ }
    setDone(true);
  }
  if (done) return (
    <main className="wrap page"><h2 className="title">You're booked in.</h2>
      <p className="sub">{f.name}, your free trial is on {courts.find((c) => c.id === f.courtId)?.name} at {fmtTime(f.startTime)}. Just show up — rackets are on us.</p></main>
  );
  return (
    <main className="wrap page" style={{ maxWidth: 640 }}>
      <h2 className="title">Book a free trial</h2>
      <p className="sub">One hour on court, no card, no commitment. If you like it, the front desk sets up your plan the same day.</p>
      <div className="grid" style={{ gap: 14 }}>
        <div><label>Your name</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
        <div><label>Phone</label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label>Court</label>
          <select value={f.courtId} onChange={(e) => setF({ ...f, courtId: Number(e.target.value) })}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div className="row">
          <div><label>Date</label><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div><label>Start time</label>
            <select value={f.startTime} onChange={(e) => setF({ ...f, startTime: Number(e.target.value) })}>
              {slots.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
            </select></div>
        </div>
        <button className="pill black" disabled={!f.name || !f.date} onClick={submit}>Book my trial</button>
      </div>
    </main>
  );
}
