"use client";
import { useMemo, useState } from "react";
import { courts, members, plans, takenSlots, todayBookings, todayISO, fmtTime, inr } from "@/lib/data";
import { useStore } from "@/lib/store";

const allSlots = Array.from({ length: 31 }, (_, i) => 6 + i * 0.5); // 6:00 AM to 9:00 PM starts, one hour each

export default function Courts() {
  const today = todayISO();
  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { store, addBooking } = useStore();
  const court = courts.find((c) => c.id === courtId)!;

  const busy = useMemo(() => [
    ...(date === today ? (takenSlots[courtId] ?? []) : []),
    ...store.bookings.filter((b) => b.courtId === courtId && b.date === date && b.state === "booked").map((b) => b.time),
  ], [store.bookings, courtId, date, today]);
  const free = (t: number) => !busy.some((b) => Math.abs(b - t) < 1);

  // the club's own rules, applied the same way for everyone
  const member = members.find((m) => m.name.toLowerCase() === name.trim().toLowerCase());
  const plan = member ? plans.find((p) => p.name === member.plan) : undefined;
  const price = slot === null ? null : member ? (plan?.court ?? court.walkin) : court.walkin;
  const mineToday = store.bookings.filter((b) => b.date === date && b.state === "booked" && b.who.toLowerCase() === name.trim().toLowerCase()).length
    + (date === today ? todayBookings.filter((b) => b.who.toLowerCase() === name.trim().toLowerCase()).length : 0);

  function book() {
    if (slot === null || !name.trim()) return;
    if (member?.state === "expired") return setMsg({ ok: false, text: `${member.name}'s plan has expired. The front desk can renew it in a minute.` });
    if (mineToday >= 2) return setMsg({ ok: false, text: "Two bookings a day is the limit, on every plan." });
    if (!free(slot)) return setMsg({ ok: false, text: "That court is already booked at that time." });
    addBooking({ courtId, court: court.name, who: name.trim(), date, time: slot, type: "regular", price: price ?? court.walkin });
    setMsg({ ok: true, text: `Booked. ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)}${price ? `, ${inr(price)} at the desk` : ", covered by your plan"}.` });
    setSlot(null);
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Courts</h1>
        <p className="sub">Pick a court and a day. Crossed-out slots are taken, and a booking covers the full hour.</p>
      </div>

      <div className="seg" role="group" aria-label="Court">
        {courts.map((c) => (
          <button key={c.id} aria-pressed={courtId === c.id} onClick={() => { setCourtId(c.id); setSlot(null); }}>
            {c.name} · <span className="num">{inr(c.walkin)}</span>
          </button>
        ))}
      </div>

      <div className="field-row" style={{ marginTop: 20, maxWidth: 640 }}>
        <div>
          <label htmlFor="date">Date</label>
          <input id="date" type="date" value={date} min={today} onChange={(e) => { setDate(e.target.value); setSlot(null); }} />
        </div>
        <div>
          <label htmlFor="name">Your name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Members: your registered name" />
        </div>
      </div>
      {member && (
        <p className="muted" style={{ marginTop: 10 }}>
          {member.state === "expired"
            ? `${member.name}, ${member.plan} plan, expired. Bookings are paused until it is renewed.`
            : `${member.name}, ${member.plan} plan${plan ? `, courts at ${plan.court === 0 ? "no charge" : inr(plan.court) + " an hour"}` : ""}.`}
        </p>
      )}

      <div className="slots" role="group" aria-label="Start times">
        {allSlots.map((t) => (
          <button key={t} className="slot num" disabled={!free(t)} aria-pressed={slot === t} onClick={() => setSlot(t)}>{fmtTime(t)}</button>
        ))}
      </div>

      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

      <div className="summary">
        <p className="s-lines">
          {slot === null ? "No slot picked yet." : <>{court.name} at <span className="num">{fmtTime(slot)}</span> · <span className="num s-total" style={{ fontSize: 16 }}>{price === 0 ? "Covered by your plan" : inr(price ?? 0)}</span></>}
        </p>
        <button className="btn btn-ink" disabled={slot === null || !name.trim()} onClick={book}>
          {slot === null ? "Pick a slot first" : `Book ${court.name} at ${fmtTime(slot)}`}
        </button>
      </div>

      <p className="muted" style={{ marginTop: 28, maxWidth: 640 }}>
        The rules are the same for everyone: one hour a booking, two bookings a day at most, and an expired plan pauses booking until it is renewed. Friday Social Play is the one exception, shared courts from 7 PM.
      </p>
    </main>
  );
}
