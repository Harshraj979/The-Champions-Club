import Link from "next/link";
import { plans, courts, inr } from "@/lib/demo";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <h1>First serve at six.<br />Last over by dusk.</h1>
        <p>Two tennis courts, a cricket pitch, a gear shop and a bar that knows
           your name — run as one club, booked in seconds, not WhatsApp threads.</p>
        <Link href="/trial"><button className="pill glass">Book a free trial</button></Link>
        <div className="today-card">
          <h3>Today at the club</h3>
          <div><span>Courts</span><b>6 AM – 10 PM</b></div>
          <div><span>Shop</span><b>8 AM – 9 PM</b></div>
          <div><span>Bar &amp; Café</span><b>11 AM – 11 PM</b></div>
          <div><span>Friday Social Play</span><b>7 PM</b></div>
        </div>
      </section>

      <section className="wrap" id="plans">
        <h2 className="title">Membership</h2>
        <p className="sub">Three plans. The plan sets your court price and your shop and bar discounts — applied automatically, everywhere.</p>
        <div className="grid c3">
          {plans.map((p) => (
            <div className="card" key={p.code}>
              <h3>{p.name}</h3>
              <div className="big">{p.court === 0 ? "Free courts" : `${inr(p.court)} / hr`}</div>
              <p className="muted" style={{ marginTop: 8 }}>
                Shop −{p.shop}% · Bar −{p.bar}% · {p.days} days validity<br />
                Max 2 court bookings a day, like everyone.
              </p>
              <Link href="/trial"><button className="pill green" style={{ marginTop: 14 }}>Start with a trial</button></Link>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap">
        <h2 className="title">Courts</h2>
        <p className="sub">One-hour sessions, a new slot every 30 minutes. A court can never be double-booked — the system simply refuses.</p>
        <div className="grid c3">
          {courts.map((c) => (
            <div className="card" key={c.id}>
              <h3>{c.name}</h3>
              <p className="muted" style={{ textTransform: "capitalize" }}>{c.sport} · walk-in {inr(c.walkin_price)}/hr</p>
              <Link href="/courts"><button className="pill ghost" style={{ marginTop: 12 }}>See free slots</button></Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
