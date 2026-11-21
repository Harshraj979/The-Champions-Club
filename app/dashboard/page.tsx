"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";
import type { RolePinDTO } from "@/lib/types";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;
const methodLabel = { CASH: "Cash", CARD: "Card", UPI: "UPI", ONLINE: "Online" } as const;

const periods = [
  { code: "today", label: "Today" },
  { code: "week", label: "Last 7 days" },
  { code: "month", label: "Last 30 days" },
] as const;

export default function Dashboard() {
  const today = todayISO();
  const dash = useApi(() => api.dashboard(today), [today]);
  const d = dash.data;
  const [period, setPeriod] = useState<(typeof periods)[number]["code"]>("today");
  const [pins, setPins] = useState<RolePinDTO[]>([]);
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [pinMsg, setPinMsg] = useState<{ role: string; text: string; ok: boolean } | null>(null);
  const [pinBusy, setPinBusy] = useState<string | null>(null);

  useEffect(() => {
    api.staffPins().then((res) => setPins(res.roles)).catch(() => {});
  }, []);

  async function handleSavePin(role: string) {
    const val = (pinInputs[role] || "").trim();
    if (!/^\d{4,6}$/.test(val)) {
      setPinMsg({ role, text: "Enter 4 to 6 numeric digits", ok: false });
      return;
    }
    setPinBusy(role);
    setPinMsg(null);
    try {
      const res = await api.updateRolePin(role, val);
      setPinMsg({ role, text: res.message || "PIN updated successfully!", ok: true });
      setPinInputs((prev) => ({ ...prev, [role]: "" }));
      const updated = await api.staffPins();
      setPins(updated.roles);
    } catch (err: any) {
      setPinMsg({ role, text: err.message || "Failed to update PIN", ok: false });
    } finally {
      setPinBusy(null);
    }
  }

  async function handleResetPin(role: string) {
    setPinBusy(role);
    setPinMsg(null);
    try {
      const res = await api.resetRolePin(role);
      setPinMsg({ role, text: res.message || "PIN reset to default", ok: true });
      const updated = await api.staffPins();
      setPins(updated.roles);
    } catch (err: any) {
      setPinMsg({ role, text: err.message || "Failed to reset PIN", ok: false });
    } finally {
      setPinBusy(null);
    }
  }

  const split = d?.periods[period];
  const figures = split
    ? [
        { label: "Courts", value: split.courts },
        { label: "Shop", value: split.shop },
        { label: "Bar", value: split.bar },
        { label: "Total", value: split.total, total: true },
      ]
    : [];

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">The club</p>
        <h1 className="page-title">Owner dashboard</h1>
        <p className="sub">The whole day in one place: courts, shop and bar.</p>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          <div className="seg" role="group" aria-label="Period" style={{ marginBottom: 18 }}>
            {periods.map((p) => (
              <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
            ))}
          </div>

          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num"><NumberTicker value={f.value} /></p>
              </div>
            ))}
          </div>

          {period === "today" && d!.byMethod.length > 0 && (
            <p className="pay-strip">
              Taken today by{" "}
              {d!.byMethod.map((m, i) => (
                <span key={m.method}>
                  {i > 0 ? " · " : ""}
                  {methodLabel[m.method]} <span className="num">{inr(m.amount)}</span>
                </span>
              ))}{" "}
              at the shop and bar tills. Court money is paid at the desk.
            </p>
          )}

          {d!.lowStock.length > 0 && (
            <div className="notice warn" role="status">
              Running low in the shop: {d!.lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}.
            </div>
          )}

          {period === "today" && d!.expiring.length > 0 && (
            <section className="block">
              <div className="sec-head">
                <h2>Expiring in the next 14 days</h2>
                <Link className="text-link" href="/members">All members</Link>
              </div>
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Member</th><th className="hide-m">Plan</th><th className="hide-m">Phone</th><th>Expires</th><th className="r">Days left</th></tr></thead>
                  <tbody>
                    {d!.expiring.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td className="hide-m">{m.planName}</td>
                        <td className="hide-m num">{m.phone}</td>
                        <td>{m.expiresOn}</td>
                        <td className="r num">{m.daysLeft === 0 ? "Today" : m.daysLeft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="block">
            <div className="sec-head">
              <h2>On court today</h2>
              <Link className="text-link" href="/bookings">All bookings</Link>
            </div>
            {d!.onCourt.length === 0 ? (
              <Empty>Nothing on court today yet. Bookings made on the Courts page will show up here.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="r">Price</th></tr></thead>
                  <tbody>
                    {d!.onCourt.map((b) => (
                      <tr key={b.id}>
                        <td className="num">{fmtTime(b.start)}</td>
                        <td>{b.court}</td>
                        <td>{b.who}</td>
                        <td className="hide-m">{typeLabel[b.type]}</td>
                        <td className="r num">{b.price ? inr(b.price) : "Plan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="mini-link" href="/members">Members</Link>
              <Link className="mini-link" href="/bar">Bar tabs</Link>
              <Link className="mini-link" href="/shop">Shop</Link>
              <Link className="mini-link" href="/invoices">Invoices</Link>
              <Link className="mini-link" href="/expenses">Expenses</Link>
              <Link className="mini-link" href="/payroll">Payroll</Link>
              <Link className="mini-link" href="/shifts">Staff rota</Link>
            </p>
          </section>

          <section className="block">
            <div className="sec-head">
              <div>
                <h2>Staff Role Access PINs</h2>
                <p className="sub" style={{ margin: "4px 0 0" }}>
                  Owner controls: configure security PINs for staff and till terminals.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {pins.map((p) => {
                const isBusy = pinBusy === p.role;
                const msg = pinMsg?.role === p.role ? pinMsg : null;
                const roleIcons: Record<string, string> = {
                  OWNER: "👑",
                  FRONT_DESK: "📋",
                  BAR: "🍸",
                  SHOP: "🛍️",
                };
                return (
                  <div key={p.role} className="panel" style={{ padding: 18, borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{roleIcons[p.role] || "🔑"}</span>
                        <div>
                          <strong style={{ fontSize: 16, display: "block" }}>{p.label}</strong>
                          <span style={{ fontSize: 12, color: "#666" }}>Role: {p.role}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: p.hasCustomPin ? "#dcfce7" : "#f1f5f9",
                          color: p.hasCustomPin ? "#166534" : "#475569",
                          border: p.hasCustomPin ? "1px solid #86efac" : "1px solid #cbd5e1",
                        }}
                      >
                        {p.hasCustomPin ? "CUSTOM PIN" : `DEFAULT (${p.defaultPin})`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="New PIN (4-6 digits)"
                        value={pinInputs[p.role] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setPinInputs((prev) => ({ ...prev, [p.role]: val }));
                        }}
                        style={{
                          flex: 1,
                          minHeight: 38,
                          padding: "6px 12px",
                          fontSize: 15,
                          letterSpacing: 2,
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ink"
                        disabled={isBusy || !(pinInputs[p.role] && pinInputs[p.role].length >= 4)}
                        onClick={() => handleSavePin(p.role)}
                        style={{ minHeight: 38, padding: "6px 14px", fontSize: 13, whiteSpace: "nowrap" }}
                      >
                        {isBusy ? "Saving..." : "Save PIN"}
                      </button>
                    </div>

                    {p.hasCustomPin && (
                      <div style={{ marginTop: 8, textAlign: "right" }}>
                        <button
                          type="button"
                          className="mini-link"
                          disabled={isBusy}
                          onClick={() => handleResetPin(p.role)}
                          style={{ fontSize: 11, padding: "2px 8px", minHeight: 24, cursor: "pointer" }}
                        >
                          Reset to default ({p.defaultPin})
                        </button>
                      </div>
                    )}

                    {msg && (
                      <div
                        className={`notice ${msg.ok ? "ok" : "err"}`}
                        style={{ marginTop: 10, padding: "6px 10px", fontSize: 12 }}
                      >
                        {msg.text}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
