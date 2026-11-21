"use client";
import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";
import type { ShopDashboardDTO } from "@/lib/services/shop-stats";

export default function ShopDashboard() {
  const today = todayISO();
  const dash = useApi<ShopDashboardDTO>(() => api.shopStats(today), [today]);
  const [period, setPeriod] = useState<"today" | "week" | "month">("today");

  const d = dash.data;

  return (
    <main className="wrap page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#854d0e", padding: "3px 8px", borderRadius: 999, border: "1px solid #fde047" }}>
              🛍️ PRO SHOP ANALYTICS
            </span>
            <span className="muted" style={{ fontSize: 13 }}>Gear, Rackets &amp; Turf Apparel</span>
          </div>
          <h1 className="page-title">Pro Shop Dashboard</h1>
          <p className="sub">Equipment turnover, real-time inventory health, and online/counter sales performance.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn-ink" href="/shop" style={{ minHeight: 40, padding: "8px 18px", fontSize: 13 }}>
            🛍️ Open Shop Counter (POS)
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
        <Empty>No shop data available.</Empty>
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
              <p className="f-label">Gear Sales ({period.toUpperCase()})</p>
              <p className="f-value num">
                <NumberTicker value={d.revenue[period]} />
              </p>
            </div>
            <div className="figure">
              <p className="f-label">Orders Placed Today</p>
              <p className="f-value num">{d.metrics.ordersCount}</p>
            </div>
            <div className="figure">
              <p className="f-label">Average Order Size</p>
              <p className="f-value num">{inr(d.metrics.averageOrderValue)}</p>
            </div>
            <div className="figure">
              <p className="f-label">Total Inventory Valuation</p>
              <p className="f-value num">{inr(d.metrics.inventoryTotalValuation)}</p>
            </div>
          </div>

          {/* Low Stock Warning Banner if applicable */}
          {d.inventorySummary.lowStockItems.length > 0 && (
            <div className="notice warn" role="status" style={{ marginTop: 18 }}>
              ⚠️ Stock alerts ({d.inventorySummary.lowStockCount} low, {d.inventorySummary.outOfStockCount} out):{" "}
              {d.inventorySummary.lowStockItems.map((p) => `${p.name} (${p.stock === 0 ? "OUT OF STOCK" : `${p.stock} left`})`).join(", ")}.
            </div>
          )}

          {/* Fulfilment & Payment Split */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginTop: 24 }}>
            {/* Fulfilment Split */}
            <div className="panel" style={{ padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Fulfilment Breakdown</h3>
                <span className="muted" style={{ fontSize: 12 }}>Today&apos;s orders</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>🏬</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{d.metrics.pickupCount}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Desk Pickup</div>
                </div>
                <div style={{ padding: 14, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", textAlign: "center" }}>
                  <div style={{ fontSize: 24 }}>🚚</div>
                  <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>{d.metrics.deliveryCount}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Home Delivery</div>
                </div>
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
                          {m.count} order{m.count !== 1 ? "s" : ""}
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

          {/* Top Selling Products */}
          <section className="block" style={{ marginTop: 28 }}>
            <div className="sec-head">
              <h2>Top Equipment Sold Today</h2>
              <span className="muted" style={{ fontSize: 13 }}>Ranked by volume</span>
            </div>
            {d.topProducts.length === 0 ? (
              <Empty>No gear sold yet today.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Product Name</th>
                      <th className="r">Units Sold</th>
                      <th className="r">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topProducts.map((p, idx) => (
                      <tr key={p.productId}>
                        <td style={{ fontWeight: 700, width: 60 }}>#{idx + 1}</td>
                        <td>{p.name}</td>
                        <td className="r num">{p.qty} units</td>
                        <td className="r num" style={{ fontWeight: 700 }}>{inr(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent Orders */}
          <section className="block" style={{ marginTop: 28 }}>
            <div className="sec-head">
              <h2>Recent Orders</h2>
              <Link className="text-link" href="/shop">Go to shop POS</Link>
            </div>
            {d.recentOrders.length === 0 ? (
              <Empty>No orders recorded.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Buyer Name</th>
                      <th>Fulfilment</th>
                      <th className="hide-m">Items</th>
                      <th>Payment</th>
                      <th className="r">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="num">#{o.id}</td>
                        <td><strong>{o.name}</strong></td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: o.fulfilment === "DELIVERY" ? "#fef3c7" : "#f1f5f9",
                              color: o.fulfilment === "DELIVERY" ? "#92400e" : "#334155",
                            }}
                          >
                            {o.fulfilment === "DELIVERY" ? "🚚 Delivery" : "🏬 Pickup"}
                          </span>
                        </td>
                        <td className="hide-m" style={{ fontSize: 12, color: "#555" }}>
                          {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: 6,
                              background: o.payMethod === "ONLINE" ? "#dbeafe" : "#f1f5f9",
                              color: o.payMethod === "ONLINE" ? "#1e40af" : "#334155",
                            }}
                          >
                            {o.payMethod === "ONLINE" ? "Demo Razorpay" : o.payMethod}
                          </span>
                        </td>
                        <td className="r num" style={{ fontWeight: 700 }}>{inr(o.total)}</td>
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
