"use client";
import { useMemo, useState } from "react";
import { courts, demoTaken, fmtTime, inr } from "@/lib/demo";

const today = new Date().toISOString().slice(0, 10);
const allSlots = Array.from({ length: 31 }, (_, i) => 6 + i * 0.5); // 6:00 .. 21:00

export default function Courts() {
  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [taken, setTaken] = useState<Record<number, number[]>>(demoTaken);
  const court = courts.find((c) => c.id === courtId)!;
  const busy = useMemo(() => taken[courtId] ?? [], [taken, courtId]);
  const free = (t: number) => !busy.some((b) => Math.abs(b - t) < 1);

  async function book() {
    if (slot === null || !name.trim()) return;
    const body = { courtId, date, startTime: slot, walkinName: name.trim() };
    try {
      const r = await fetch("/api/bookings/create", { method: "POST", body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Booking refused");
      setMsg({ ok: true, text: `Booked — ${court.name}, ${fmtTime(slot)}.` });
    } catch {
      // demo mode: enforce the same overlap rule locally, then book it
      if (!free(slot)) return setMsg({ ok: false, text: "That court is already booked at that time. No double-booking, ever." });
      setTaken((t) => ({ ...t, [courtId]: [...(t[courtId] ?? []), slot] }));
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
