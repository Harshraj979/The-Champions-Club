"use client";
import Link from "next/link";
import { todayBookings, dayTotals, todayISO, fmtTime, inr } from "@/lib/data";
import { useStore } from "@/lib/store";

export default function Dashboard() {
  const { store } = useStore();
  const today = todayISO();
  const mine = store.bookings.filter((b) => b.state === "booked" && b.date === today);
  const courts = dayTotals.courts + mine.reduce((s, b) => s + b.price, 0);
  const shop = dayTotals.shop + store.shopRevenue;
  const bar = dayTotals.bar + store.barRevenue;
  const figures = [
    { label: "Courts today", value: courts },
    { label: "Shop today", value: shop },
    { label: "Bar today", value: bar },
    { label: "Total today", value: courts + shop + bar, total: true },
  ];
  const onCourt = [
    ...todayBookings.filter((b) => !store.cancelledSeeds.includes(b.id)).map((b) => ({ key: `s${b.id}`, time: b.time, court: b.court, who: b.who, type: b.type, price: b.price })),
    ...mine.map((b) => ({ key: `m${b.id}`, time: b.time, court: b.court, who: b.who, type: b.type, price: b.price })),
  ].sort((a, b) => a.time - b.time);

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Owner dashboard</h1>
        <p className="sub">The whole day in one place: courts, shop and bar. Staff view.</p>
      </div>
      <div className="figures">
        {figures.map((f) => (
          <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
            <p className="f-label">{f.label}</p>
            <p className="f-value num">{inr(f.value)}</p>
          </div>
        ))}
      </div>

      <section className="block">
        <div className="sec-head">
          <h2>On court today</h2>
          <Link className="text-link" href="/bookings">All bookings</Link>
        </div>
        {onCourt.length === 0 ? (
          <div className="empty">Nothing on court today yet. Bookings made on the Courts page will show up here.</div>
        ) : (
          <table className="ledger">
            <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="r">Price</th></tr></thead>
            <tbody>
              {onCourt.map((b) => (
                <tr key={b.key}>
                  <td className="num">{fmtTime(b.time)}</td>
                  <td>{b.court}</td>
                  <td>{b.who}</td>
                  <td className="hide-m">{b.type === "friday_social" ? "Social Play" : b.type === "trial" ? "Trial" : "Regular"}</td>
                  <td className="r num">{b.price ? inr(b.price) : "Plan"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ marginTop: 20, display: "flex", gap: 20 }}>
          <Link className="text-link" href="/members">Members</Link>
          <Link className="text-link" href="/bar">Bar tabs</Link>
          <Link className="text-link" href="/shop">Shop</Link>
        </p>
      </section>
    </main>
  );
}
