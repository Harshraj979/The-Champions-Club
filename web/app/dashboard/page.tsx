import Link from "next/link";
import { todayBookings, fmtTime, inr } from "@/lib/demo";

const stats = [
  { label: "Courts today", value: 13400 }, { label: "Shop today", value: 10399 },
  { label: "Bar today", value: 6680 }, { label: "Total today", value: 30479 },
];
export default function Dashboard() {
  return (
    <main className="wrap page">
      <h2 className="title">Owner dashboard</h2>
      <p className="sub">One place for the whole day — courts, shop and bar. <span className="tag grey">Staff view</span></p>
      <div className="grid c4">
        {stats.map((s) => (
          <div className="card" key={s.label}><p className="muted">{s.label}</p><div className="big">{inr(s.value)}</div></div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>On court today</h3>
        <table><thead><tr><th>Time</th><th>Court</th><th>Who</th><th>Type</th><th>Price</th></tr></thead>
          <tbody>{todayBookings.map((b) => (
            <tr key={b.id}><td>{fmtTime(b.time)}</td><td>{b.court}</td><td>{b.who}</td>
              <td>{b.type === "friday_social" ? "Social Play" : "Regular"}</td><td>{inr(b.price)}</td></tr>))}
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
