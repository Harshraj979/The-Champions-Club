"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox } from "@/components/States";

const hours = [
  { what: "Courts", when: "6 AM to 10 PM" },
  { what: "Shop", when: "8 AM to 9 PM" },
  { what: "Bar & Café", when: "11 AM to 11 PM" },
  { what: "Friday Social Play", when: "Fridays, 7 PM" },
];

export default function Home() {
  const today = todayISO();
  const plans = useApi(() => api.plans());
  const courts = useApi(() => api.courts());
  const products = useApi(() => api.products());
  const schedule = useApi(() => api.schedule(today), [today]);

  const gear = products.data?.filter((p) => p.category === "GEAR") ?? [];
  const bar = products.data?.filter((p) => p.category === "BAR") ?? [];

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
              <Link className="btn btn-ghost-light" href="/courts">See court times</Link>
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
          {schedule.loading ? (
            <Loading />
          ) : schedule.error ? (
            <ErrorBox message={schedule.error} onRetry={schedule.reload} />
          ) : schedule.data!.length === 0 ? (
            <p className="muted">Nothing on court yet today. The first slot is 6 AM.</p>
          ) : (
            <div className="ledger-wrap">
              <table className="ledger">
                <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="r hide-m">Price</th></tr></thead>
                <tbody>
                  {schedule.data!.map((b) => (
                    <tr key={b.id}>
                      <td className="num">{fmtTime(b.start)}</td>
                      <td>{b.court}</td>
                      <td>{b.who}</td>
                      <td className="r num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12 }}>One hour a booking, a new slot every half hour. A court is never double-booked.</p>
        </section>

        <section className="block" id="plans">
          <div className="sec-head">
            <h2>Membership</h2>
            <Link className="text-link" href="/trial">Start with a trial</Link>
          </div>
          {plans.loading ? (
            <Loading rows={3} />
          ) : plans.error ? (
            <ErrorBox message={plans.error} onRetry={plans.reload} />
          ) : (
            <div className="ledger-wrap">
              <table className="ledger">
                <thead><tr><th>Plan</th><th>Courts</th><th className="hide-m">Shop discount</th><th className="hide-m">Bar discount</th><th className="r">Term</th></tr></thead>
                <tbody>
                  {plans.data!.map((p) => (
                    <tr key={p.code}>
                      <td style={{ fontWeight: 500 }}>{p.name}</td>
                      <td>{p.courtPrice === 0 ? "Included" : `${inr(p.courtPrice)} an hour`}</td>
                      <td className="hide-m">{p.shopDiscount}% off</td>
                      <td className="hide-m">{p.barDiscount ? `${p.barDiscount}% off` : "Full price"}</td>
                      <td className="r num">{p.termDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted" style={{ marginTop: 12 }}>Your plan sets your prices everywhere at once: courts, shop and bar. Two court bookings a day at most, on every plan.</p>
        </section>

        <section className="block">
          <div className="sec-head">
            <h2>Courts</h2>
            <Link className="text-link" href="/courts">See free slots</Link>
          </div>
          {courts.loading ? (
            <Loading rows={3} />
          ) : courts.error ? (
            <ErrorBox message={courts.error} onRetry={courts.reload} />
          ) : (
            <div className="rows">
              {courts.data!.map((c) => (
                <div className="row-item" key={c.id}>
                  <div className="row-main">
                    <p className="row-name">{c.name}</p>
                    <p className="muted">{c.sport} · walk-in <span className="num">{inr(c.walkinPrice)}</span> an hour</p>
                  </div>
                  <Link className="text-link" href="/courts">Book</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="block" style={{ paddingBottom: 16 }}>
          <div className="rows">
            <div className="row-item">
              <div className="row-main">
                <p className="row-name">Club shop</p>
                <p className="muted">
                  {gear.length} lines on the shelf{gear.length ? <>, from {inr(Math.min(...gear.map((p) => p.price)))}</> : ""}. What is listed is what is in stock.
                </p>
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
