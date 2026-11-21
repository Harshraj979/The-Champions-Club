"use client";
import Link from "next/link";
import { todayBookings, fmtTime, inr } from "@/lib/demo";
import { useApi } from "@/lib/useApi";

type Dash = {
  courts: number; shop: number; bar: number; total: number;
  bookings: { id: number; court: string; who: string; time: number; type: string; price: number }[];
};
const fallback: Dash = {
  courts: 13400, shop: 10399, bar: 6680, total: 30479,
  bookings: todayBookings.map((b) => ({ id: b.id, court: b.court, who: b.who, time: b.time, type: b.type, price: b.price })),
};

export default function Dashboard() {
  const { data, demo } = useApi<Dash>("/api/dashboard", (j) => j, fallback);
  const stats = [
    { label: "Courts today", value: data.courts }, { label: "Shop today", value: data.shop },
    { label: "Bar today", value: data.bar }, { label: "Total today", value: data.total },
  ];
  return (
    <main className="wrap page">
      <h2 className="title">Owner dashboard</h2>
      <p className="sub">One place for the whole day — courts, shop and bar, totalled by the website from live Odoo records. <span className="tag grey">Staff view</span></p>
      {demo && <div className="notice demo">Showing demo figures — Odoo is offline.</div>}
      <div className="grid c4">
        {stats.map((s) => (
          <div className="card" key={s.label}><p className="muted">{s.label}</p><div className="big">{inr(s.value)}</div></div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>On court today</h3>
        <table><thead><tr><th>Time</th><th>Court</th><th>Who</th><th>Type</th><th>Price</th></tr></thead>
          <tbody>{data.bookings.map((b) => (
            <tr key={b.id}><td>{fmtTime(b.time)}</td><td>{b.court}</td><td>{b.who}</td>
              <td>{b.type === "friday_social" ? "Social Play" : b.type === "trial" ? "Trial" : "Regular"}</td><td>{inr(b.price)}</td></tr>))}
          </tbody></table>
        <p style={{ marginTop: 14, display: "flex", gap: 10 }}>
          <Link href="/bookings"><button className="pill ghost">All bookings</button></Link>
          <Link href="/members"><button className="pill ghost">Members</button></Link>
          <Link href="/bar"><button className="pill ghost">Bar tabs</button></Link>
        </p>
      </div>
    </main>
  );
}
