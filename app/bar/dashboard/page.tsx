"use client";
import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";
import type { BarDashboardDTO } from "@/lib/services/bar-stats";

export default function BarDashboard() {
  const today = todayISO();
  const dash = useApi<BarDashboardDTO>(() => api.barStats(today), [today]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const d = dash.data;

  return (
    <main className="wrap page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: 999, border: "1px solid #86efac" }}>
              🍷 BAR OWNER CONSOLE
            </span>
            <span className="muted" style={{ fontSize: 13 }}>Clubhouse Kitchen &amp; Bar</span>
          </div>
          <h1 className="page-title">Bar &amp; Cafeteria Dashboard</h1>
          <p className="sub">Real-time beverage &amp; kitchen takings, live table tabs, and menu performance.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ink" href="/bar" style={{ minHeight: 40, padding: "8px 18px", fontSize: 13 }}>
            🍸 Open Bar Till (POS)
          </Link>
          <Link className="mini-link" href="/dashboard" style={{ minHeight: 40, padding: "8px 14px" }}>
            👑 Club Overview
          </Link>
        </div>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : !d ? (
        <Empty>No bar data available.</Empty>
      ) : (
        <>
          {/* Period selector */}
          <div className="seg" role="group" aria-label="Period" style={{ marginBottom: 18 }}>
            <button aria-pressed={period === "today"} onClick={() => setPeriod("today")}>Today</button>
            <button aria-pressed={period === "week"} onClick={() => setPeriod("week")}>Last 7 days</button>
            <button aria-pressed={period === "month"} onClick={() => setPeriod("month")}>Last 30 days</button>
          </div>

          {/* Revenue Figures */}
          <div className="figures">
            <div className="figure total">
              <p className="f-label">Bar Revenue ({period.toUpperCase()})</p>
              <p className="f-value num">
                <NumberTicker value={d.revenue[period]} />
              </p>
            </div>
            <div className="figure">
              <p className="f-label">Open Tabs Right Now</p>
              <p className="f-value num" style={{ color: d.metrics.openTabsCount > 0 ? "#163021" : "#64748b" }}>
                {d.metrics.openTabsCount} <span style={{ fontSize: 15, fontWeight: 500 }}>({inr(d.metrics.openTabsValue)})</span>
              </p>
            </div>
            <div className="figure">
              <p className="f-label">Tabs Settled Today</p>
              <p className="f-value num">{d.metrics.settledTodayCount}</p>
            </div>
            <div className="figure">
              <p className="f-label">Average Spend / Tab</p>
              <p className="f-value num">{inr(d.metrics.averageTabValue)}</p>
            </div>
          </div>

          {/* Live Table Map & Payment Breakdown Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 24 }}>
            {/* Table occupancy */}
            <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Live Tables Status (T1 - T8)</h3>
                <span className="muted" style={{ fontSize: 12 }}>
                  {d.metrics.activeTables.length} / 8 Occupied
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((tableNum) => {
                  const isOccupied = d.metrics.activeTables.includes(tableNum);
                  return (
                    <div
                      key={tableNum}
                      style={{
                        padding: "12px 8px",
                        textAlign: "center",
                        borderRadius: 12,
                        background: isOccupied ? "#163021" : "#f8fafc",
                        color: isOccupied ? "#dfff45" : "#64748b",
                        border: isOccupied ? "2px solid #163021" : "1px solid #e2e8f0",
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ fontSize: 18 }}>🍽️</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>Table {tableNum}</div>
                      <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                        {isOccupied ? "ACTIVE TAB" : "FREE"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment method split */}
            <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Takings by Payment Method</h3>
                <span className="muted" style={{ fontSize: 12 }}>Today&apos;s settlements</span>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {d.byMethod.map((m) => (
                  <div
                    key={m.method}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: m.method === "ONLINE" ? "#eff6ff" : "var(--surface)",
                      border: m.method === "ONLINE" ? "1px solid #bfdbfe" : "1px solid var(--line)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>
                        {m.method === "ONLINE" ? "🔒" : m.method === "UPI" ? "⚡" : m.method === "CARD" ? "💳" : "💵"}
                      </span>
                      <div>
                        <strong style={{ fontSize: 13, color: m.method === "ONLINE" ? "#1e40af" : "inherit" }}>
                          {m.label}
                        </strong>
                        <span style={{ fontSize: 11, color: "#64748b", display: "block" }}>
                          {m.count} settlement{m.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <span className="num" style={{ fontWeight: 700, fontSize: 15, color: m.method === "ONLINE" ? "#1e40af" : "inherit" }}>
                      {inr(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Selling Menu Items */}
          <section className="block" style={{ marginTop: 28 }}>
            <div className="sec-head">
              <h2>Top Selling Menu Items Today</h2>
              <span className="muted" style={{ fontSize: 13 }}>Ranked by volume &amp; revenue</span>
            </div>
            {d.topItems.length === 0 ? (
              <Empty>No items ordered yet today.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Item Name</th>
                      <th className="r">Quantity Sold</th>
                      <th className="r">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topItems.map((item, idx) => (
                      <tr key={item.productId}>
                        <td style={{ fontWeight: 700, width: 60 }}>#{idx + 1}</td>
                        <td>{item.name}</td>
                        <td className="r num">{item.qty} units</td>
                        <td className="r num" style={{ fontWeight: 700 }}>{inr(item.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Settled Tabs */}
          <section className="block" style={{ marginTop: 28 }}>
            <div className="sec-head">
              <h2>Recently Settled Tabs</h2>
              <Link className="text-link" href="/bar">Go to live till</Link>
            </div>
            {d.recentSettled.length === 0 ? (
              <Empty>No settled tabs recorded.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Tab ID</th>
                      <th>Customer / Guest</th>
                      <th>Table</th>
                      <th className="hide-m">Items</th>
                      <th>Payment</th>
                      <th className="r">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentSettled.map((tab) => (
                      <tr key={tab.id}>
                        <td className="num">#{tab.id}</td>
                        <td><strong>{tab.who}</strong></td>
                        <td>{tab.tableNo ? `Table ${tab.tableNo}` : "Counter"}</td>
                        <td className="hide-m" style={{ fontSize: 12, color: "#555" }}>
                          {tab.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: tab.payMethod === "ONLINE" ? "#dbeafe" : "#f1f5f9",
                              color: tab.payMethod === "ONLINE" ? "#1e40af" : "#334155",
                            }}
                          >
                            {tab.payMethod === "ONLINE" ? "Demo Razorpay" : tab.payMethod || "Cash"}
                          </span>
                        </td>
                        <td className="r num" style={{ fontWeight: 700 }}>{inr(tab.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
