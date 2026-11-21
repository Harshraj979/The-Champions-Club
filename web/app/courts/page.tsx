"use client";
import { useMemo, useState } from "react";
import { courts, demoTaken, fmtTime, inr } from "@/lib/demo";
import { useStore } from "@/lib/store";

const today = new Date().toISOString().slice(0, 10);
const allSlots = Array.from({ length: 31 }, (_, i) => 6 + i * 0.5); // 6:00 .. 21:00

export default function Courts() {
  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { store, addBooking } = useStore();
  const court = courts.find((c) => c.id === courtId)!;
  // taken = today's seed bookings + anything booked in this prototype, for this court and day
  const busy = useMemo(() => [
    ...(date === today ? (demoTaken[courtId] ?? []) : []),
    ...store.bookings.filter((b) => b.courtId === courtId && b.date === date && b.state === "booked").map((b) => b.time),
  ], [store.bookings, courtId, date]);
  const free = (t: number) => !busy.some((b) => Math.abs(b - t) < 1);
  const record = () => addBooking({ courtId, court: court.name, who: name.trim(), date, time: slot!, type: "regular", price: court.walkin_price });

  async function book() {
    if (slot === null || !name.trim()) return;
    const body = { courtId, date, startTime: slot, walkinName: name.trim() };
    try {
      const r = await fetch("/api/bookings/create", { method: "POST", body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Booking refused");
      record();
      setMsg({ ok: true, text: `Booked — ${court.name}, ${fmtTime(slot)}.` });
    } catch {
      // demo mode: enforce the same overlap rule locally, then book it
      if (!free(slot)) return setMsg({ ok: false, text: "That court is already booked at that time. No double-booking, ever." });
      record();
      setMsg({ ok: true, text: `Booked (demo) — ${court.name}, ${fmtTime(slot)}, ${inr(court.walkin_price)} at the desk.` });
    }
    setSlot(null);
  }

  return (
    <main className="wrap page">
      <h2 className="title">Courts &amp; booking</h2>
      <p className="sub">Pick a court and a day. Greyed slots are taken — a session covers the full hour.</p>
      <div className="row">
        <div><label>Court</label>
          <select value={courtId} onChange={(e) => { setCourtId(Number(e.target.value)); setSlot(null); }}>
            {courts.map((c) => <option key={c.id} value={c.id}>{c.name} — walk-in {inr(c.walkin_price)}/hr</option>)}
          </select></div>
        <div><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label>Your name (members: your registered name)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Sharma" /></div>
      </div>
      <div className="slots">
        {allSlots.map((t) => (
          <button key={t} disabled={!free(t)} onClick={() => setSlot(t)}
            className={`slot ${slot === t ? "on" : ""} ${!free(t) ? "off" : ""}`}>{fmtTime(t)}</button>
        ))}
      </div>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <button className="pill black" style={{ marginTop: 18 }} disabled={slot === null || !name.trim()} onClick={book}>
        {slot === null ? "Pick a slot" : `Book ${court.name} at ${fmtTime(slot)}`}
      </button>
    </main>
  );
}
