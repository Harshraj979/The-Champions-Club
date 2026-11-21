import Link from "next/link";
import { plans, courts, products, hours, todayBookings, fmtTime, inr } from "@/lib/data";

export default function Home() {
  const gear = products.filter((p) => p.category === "gear");
  const bar = products.filter((p) => p.category === "bar");
  return (
    <main>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="The club ground, seen from above" width={2744} height={1568} fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-in">
          <div className="hero-text">
            <h1>First serve at six. Last over by dusk.</h1>
            <p>Two tennis courts, a cricket pitch, a gear shop and a bar that knows your name. Booked in seconds, not WhatsApp threads.</p>
            <div className="hero-actions">
              <Link className="btn btn-paper" href="/trial">Book a free trial</Link>
              <Link className="btn" style={{ color: "#fff", borderColor: "rgba(255,255,255,.45)" }} href="/courts">See court times</Link>
            </div>
            <div className="hero-hours">
              {hours.map((h) => (
                <div key={h.what}><span>{h.what}</span><b>{h.when}</b></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="wrap">
        <section className="block">
          <div className="sec-head">
            <h2>On court today</h2>
            <Link className="text-link" href="/courts">Book a court</Link>
          </div>
          <table className="ledger">
            <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="r hide-m">Price</th></tr></thead>
            <tbody>
              {todayBookings.map((b) => (
                <tr key={b.id}>
                  <td className="num">{fmtTime(b.time)}</td>
                  <td>{b.court}</td>
                  <td>{b.who}</td>
                  <td className="r num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 12 }}>One hour a booking, a new slot every half hour. A court is never double-booked.</p>
        </section>

        <section className="block" id="plans">
          <div className="sec-head">
            <h2>Membership</h2>
            <Link className="text-link" href="/trial">Start with a trial</Link>
          </div>
          <table className="ledger">
            <thead><tr><th>Plan</th><th>Courts</th><th className="hide-m">Shop discount</th><th className="hide-m">Bar discount</th><th className="r">Term</th></tr></thead>
            <tbody>
              {plans.map((p) => (
                <tr key={p.code}>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{p.court === 0 ? "Included" : `${inr(p.court)} an hour`}</td>
                  <td className="hide-m">{p.shop}% off</td>
                  <td className="hide-m">{p.bar ? `${p.bar}% off` : "Full price"}</td>
                  <td className="r num">{p.days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ marginTop: 12 }}>Your plan sets your prices everywhere at once: courts, shop and bar. Two court bookings a day at most, on every plan.</p>
        </section>

        <section className="block">
          <div className="sec-head">
            <h2>Courts</h2>
            <Link className="text-link" href="/courts">See free slots</Link>
          </div>
          <div className="rows">
            {courts.map((c) => (
              <div className="row-item" key={c.id}>
                <div className="row-main">
                  <p className="row-name">{c.name}</p>
                  <p className="muted">{c.sport} · walk-in <span className="num">{inr(c.walkin)}</span> an hour</p>
                </div>
                <Link className="text-link" href="/courts">Book</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="block" style={{ paddingBottom: 16 }}>
          <div className="rows">
            <div className="row-item">
              <div className="row-main">
                <p className="row-name">Club shop</p>
                <p className="muted">{gear.length} lines on the shelf, from {inr(Math.min(...gear.map((p) => p.price)))}. What is listed is what is in stock.</p>
              </div>
              <Link className="text-link" href="/shop">Shop</Link>
            </div>
            <div className="row-item">
              <div className="row-main">
                <p className="row-name">Bar &amp; Café</p>
                <p className="muted">{bar.map((p) => p.name.toLowerCase()).join(", ")}. Member plans take their discount at the till.</p>
              </div>
              <Link className="text-link" href="/bar">Bar &amp; Café</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
