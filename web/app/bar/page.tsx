"use client";
import { useState } from "react";
import { products, plans, inr } from "@/lib/demo";
import { useStore } from "@/lib/store";

const menu = products.filter((p) => p.categ_id[1] === "Bar and Cafe");
export default function Bar() {
  const [tab, setTab] = useState<Record<number, number>>({});
  const [plan, setPlan] = useState("walkin");
  const { addRevenue } = useStore();
  const discount = plan === "walkin" ? 0 : plans.find((p) => p.code === plan)!.bar;
  const subtotal = menu.reduce((s, p) => s + (tab[p.id] ?? 0) * p.list_price, 0);
  const off = Math.round((subtotal * discount) / 100);
  return (
    <main className="wrap page">
      <h2 className="title">Bar &amp; Café — tab</h2>
      <p className="sub">Open a tab, add as they order, settle before they leave. Pick the member's plan and the discount applies itself. <span className="tag grey">Staff view</span></p>
      <div className="row">
        <div style={{ maxWidth: 260 }}><label>Member plan (walk-in pays full)</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="walkin">Walk-in</option>
            {plans.map((p) => <option key={p.code} value={p.code}>{p.name} — bar −{p.bar}%</option>)}
          </select></div>
      </div>
      <div className="grid c4" style={{ marginTop: 16 }}>
        {menu.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3><div className="big">{inr(p.list_price)}</div>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="pill ghost" onClick={() => setTab((t) => ({ ...t, [p.id]: Math.max(0, (t[p.id] ?? 0) - 1) }))}>−</button>
              <b>{tab[p.id] ?? 0}</b>
              <button className="pill ghost" onClick={() => setTab((t) => ({ ...t, [p.id]: (t[p.id] ?? 0) + 1 }))}>+</button>
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16, maxWidth: 420 }}>
        <p className="muted">Subtotal {inr(subtotal)}{discount ? ` · plan discount −${inr(off)}` : ""}</p>
        <div className="big">Tab total: {inr(subtotal - off)}</div>
        <button className="pill black" style={{ marginTop: 12 }} disabled={!subtotal}
          onClick={() => { addRevenue("bar", subtotal - off); setTab({}); }}>{subtotal ? "Settle tab (cash / card / UPI)" : "Tab is empty"}</button>
      </div>
    </main>
  );
}
