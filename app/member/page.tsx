import { redirect } from "next/navigation";
import { currentMember } from "@/lib/auth";
import { memberHome } from "@/lib/services/members";
import { fmtTime, inr } from "@/lib/format";
import MemberBar from "@/components/MemberBar";
import MemberActions from "@/components/MemberActions";

// The member's own page: plan and expiry up top, then their bookings,
// shop orders and bar tabs. Reads are server-rendered off the member
// record; booking and ordering post back to the member routes.
export default async function MemberHome() {
  const session = await currentMember();
  if (!session) redirect("/member/login");
  const home = await memberHome(session.id);
  const m = home.member;

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">My club</h1>
        <p className="sub">Your plan, your bookings, your orders.</p>
      </div>
      <MemberBar name={m.name} plan={m.plan} />

      <section className="panel panel-main" aria-label="My plan">
        <div className="figures" style={{ marginTop: 0, gridTemplateColumns: "repeat(3, 1fr)" }}>
          <div className="figure">
            <div className="f-label">{m.plan} plan</div>
            <div className="f-value">{m.state === "expired" ? "Expired" : m.state === "expiring" ? "Expiring soon" : "Active"}</div>
          </div>
          <div className="figure">
            <div className="f-label">{m.state === "expired" ? "Expired on" : "Runs until"}</div>
            <div className="f-value">{m.expiresOn}</div>
          </div>
          <div className="figure">
            <div className="f-label">Bookings standing</div>
            <div className="f-value">{home.bookings.filter((b) => b.state === "BOOKED").length}</div>
          </div>
        </div>
        {m.state !== "active" && (
          <p className="notice" style={{ marginTop: 14 }}>
            {m.state === "expired"
              ? "Your plan has expired — the front desk can renew it in a minute, and bookings open up again straight away."
              : "Your plan runs out soon — a quick word with the front desk keeps everything running."}
          </p>
        )}

        {(m.planCode === "junior" || m.parentName) && (
          <div style={{ marginTop: 16, padding: "16px", borderRadius: "16px", background: "#f7f9f6", border: "1px solid rgba(22, 48, 33, 0.12)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: "18px" }}>🛡️</span>
                <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#163021" }}>
                  Parent / Guardian Details (Junior Minor Account)
                </span>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "3px 10px", borderRadius: "999px", background: "#dfff45", color: "#163021" }}>
                Junior Member
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginTop: "14px" }}>
              <div>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#617065" }}>Guardian Name</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#163021" }}>{m.parentName || "—"}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#617065" }}>Guardian Contact</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#163021" }}>{m.parentPhone || "—"}</span>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#617065" }}>Guardian Email</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#163021" }}>{m.parentEmail || "—"}</span>
              </div>
              {m.dateOfBirth && (
                <div>
                  <span style={{ display: "block", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#617065" }}>Date of Birth</span>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#163021" }}>{m.dateOfBirth}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <MemberActions />

      <section style={{ marginTop: 30 }} aria-label="My bookings">
        <div className="sec-head"><h2>My bookings</h2></div>
        {home.bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Date</th><th>Time</th><th>Court</th><th className="r">Price</th><th>Status</th></tr></thead>
              <tbody>
                {home.bookings.map((b) => (
                  <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : undefined}>
                    <td>{b.date}</td>
                    <td>{fmtTime(b.start)}</td>
                    <td>{b.court}</td>
                    <td className="r">{b.price === 0 ? "Free" : inr(b.price)}</td>
                    <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 30 }} aria-label="My shop orders">
        <div className="sec-head"><h2>My shop orders</h2></div>
        {home.orders.length === 0 ? (
          <p className="empty">No orders yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Order</th><th>Date</th><th className="hide-m">Paid by</th><th className="r">Total</th></tr></thead>
              <tbody>
                {home.orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}{o.fulfilment === "DELIVERY" ? " · Delivery" : ""}</td>
                    <td>{o.createdAt.slice(0, 10)}</td>
                    <td className="hide-m">{o.payMethod === "ONLINE" ? `Online · ${o.payState === "PAID" ? "paid" : "pending"}` : o.payMethod}</td>
                    <td className="r">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 30 }} aria-label={m.planCode === "junior" ? "My cafeteria tabs" : "My bar tabs"}>
        <div className="sec-head"><h2>{m.planCode === "junior" ? "My cafeteria tabs" : "My bar tabs"}</h2></div>
        {m.planCode === "junior" && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#617065" }}>
            ☕ <strong>Cafeteria access only:</strong> As a Junior member (minor), your account has cafeteria food &amp; beverage access. Bar &amp; alcohol services are restricted.
          </p>
        )}
        {home.tabs.length === 0 ? (
          <p className="empty">{m.planCode === "junior" ? "No cafeteria tabs yet." : "No bar tabs yet."}</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Tab</th><th className="r">Total</th><th>Status</th></tr></thead>
              <tbody>
                {home.tabs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.items.length ? t.items.map((i) => `${i.name} ×${i.qty}`).join(", ") : "Nothing added yet"}</td>
                    <td className="r">{inr(t.total)}</td>
                    <td><span className={`status ${t.status === "OPEN" ? "booked" : ""}`}>{t.status === "OPEN" ? "Open" : `Settled · ${t.payMethod}`}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
