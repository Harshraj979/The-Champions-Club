"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { courts, takenSlots, todayISO, fmtTime } from "@/lib/data";
import { useStore } from "@/lib/store";

const slots = Array.from({ length: 31 }, (_, i) => 6 + i * 0.5);

export default function Trial() {
  const today = todayISO();
  const [f, setF] = useState({ name: "", phone: "", courtId: 1, date: today, startTime: 17 });
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const { store, addBooking } = useStore();

  const busy = useMemo(() => [
    ...(f.date === today ? (takenSlots[f.courtId] ?? []) : []),
    ...store.bookings.filter((b) => b.courtId === f.courtId && b.date === f.date && b.state === "booked").map((b) => b.time),
  ], [store.bookings, f.courtId, f.date, today]);
  const freeSlots = slots.filter((t) => !busy.some((b) => Math.abs(b - t) < 1));
  const court = courts.find((c) => c.id === f.courtId)!;

  function submit() {
    if (!f.name.trim()) return setErr("Your name is missing.");
    if (f.phone.replace(/\D/g, "").length < 10) return setErr("Add a phone number the desk can reach you on.");
    if (!freeSlots.includes(f.startTime)) return setErr("That time was just taken. Pick another slot.");
    addBooking({ courtId: f.courtId, court: court.name, who: f.name.trim(), date: f.date, time: f.startTime, type: "trial", price: 0 });
    setDone(true);
  }

  if (done) return (
    <main className="wrap page" style={{ maxWidth: 680 }}>
      <h1 className="page-title">You are booked in, {f.name.trim().split(" ")[0]}.</h1>
      <p className="sub" style={{ maxWidth: 520 }}>
        Free trial on {court.name}, {f.date === today ? "today" : f.date} at {fmtTime(f.startTime)}. One hour, rackets and balls on us.
        If you like it, the front desk can set up your plan the same day.
      </p>
      <p style={{ marginTop: 20, display: "flex", gap: 16 }}>
        <Link className="text-link" href="/courts">See all court times</Link>
        <Link className="text-link" href="/#plans">Look at membership</Link>
      </p>
    </main>
  );

  return (
    <main className="wrap page" style={{ maxWidth: 680 }}>
      <div className="page-head">
        <h1 className="page-title">Book a free trial</h1>
        <p className="sub">One hour on court, no card and no commitment.</p>
      </div>
      <div className="form-grid">
        <div>
          <label htmlFor="t-name">Your name</label>
          <input id="t-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="t-phone">Phone</label>
          <input id="t-phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} autoComplete="tel" inputMode="tel" placeholder="So the desk can confirm" />
        </div>
        <div>
          <label>Court</label>
          <div className="seg" role="group" aria-label="Court">
            {courts.map((c) => (
              <button key={c.id} aria-pressed={f.courtId === c.id} onClick={() => setF({ ...f, courtId: c.id })}>{c.name}</button>
            ))}
          </div>
        </div>
        <div className="field-row">
          <div>
            <label htmlFor="t-date">Date</label>
            <input id="t-date" type="date" value={f.date} min={today} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
          <div>
            <label htmlFor="t-time">Start time</label>
            <select id="t-time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: Number(e.target.value) })}>
              {freeSlots.map((t) => <option key={t} value={t}>{fmtTime(t)}</option>)}
            </select>
          </div>
        </div>
        {freeSlots.length === 0 && <div className="notice err">No free slots on {court.name} that day. Try another court or day.</div>}
        {err && <div className="notice err" role="alert">{err}</div>}
        <div>
          <button className="btn btn-ink" disabled={freeSlots.length === 0} onClick={submit}>Book my trial</button>
        </div>
      </div>
    </main>
  );
}
