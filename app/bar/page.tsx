"use client";
import { useState } from "react";
import { products, plans, inr } from "@/lib/data";
import { useStore } from "@/lib/store";
import Gate from "@/components/Gate";

const menu = products.filter((p) => p.category === "bar");

export default function Bar() {
  const [tab, setTab] = useState<Record<number, number>>({});
  const [planCode, setPlanCode] = useState<string>("walkin");
  const [msg, setMsg] = useState("");
  const { addRevenue } = useStore();
  const discount = planCode === "walkin" ? 0 : plans.find((p) => p.code === planCode)!.bar;
  const subtotal = menu.reduce((s, p) => s + (tab[p.id] ?? 0) * p.price, 0);
  const off = Math.round((subtotal * discount) / 100);
  const set = (id: number, qty: number) => setTab((t) => ({ ...t, [id]: Math.max(0, qty) }));

  function settle() {
    if (!subtotal) return;
    addRevenue("bar", subtotal - off);
    setTab({});
    setMsg(`Tab settled, ${inr(subtotal - off)} by cash, card or UPI.`);
  }

  return (
    <Gate required="employee">
      <main className="wrap page">
        <div className="page-head">
          <h1 className="page-title">Bar &amp; Café</h1>
          <p className="sub">Open a tab, add as they order, settle before they leave. Pick the member&apos;s plan and the discount applies itself. Staff view.</p>
        </div>

        <div className="seg" role="group" aria-label="Member plan">
          <button aria-pressed={planCode === "walkin"} onClick={() => setPlanCode("walkin")}>Walk-in</button>
          {plans.map((p) => (
            <button key={p.code} aria-pressed={planCode === p.code} onClick={() => setPlanCode(p.code)}>
              {p.name}{p.bar ? `, −${p.bar}%` : ""}
            </button>
          ))}
        </div>

        <div className="rows" style={{ marginTop: 20 }}>
          {menu.map((p) => (
            <div className="row-item" key={p.id}>
              <div className="row-main"><p className="row-name">{p.name}</p></div>
              <span className="num" style={{ fontSize: 15 }}>{inr(p.price)}</span>
              <div className="stepper">
                <button aria-label={`One less ${p.name}`} onClick={() => set(p.id, (tab[p.id] ?? 0) - 1)}>−</button>
                <b className="num">{tab[p.id] ?? 0}</b>
                <button aria-label={`One more ${p.name}`} onClick={() => set(p.id, (tab[p.id] ?? 0) + 1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {msg && <div className="notice ok" role="status">{msg}</div>}
        <div className="summary">
          <p className="s-lines">
            Subtotal <span className="num">{inr(subtotal)}</span>
            {discount > 0 && subtotal > 0 ? <> · plan discount <span className="num">−{inr(off)}</span> · </> : " · "}
            <span className="num s-total">{inr(subtotal - off)}</span>
          </p>
          <button className="btn btn-ink" disabled={!subtotal} onClick={settle}>{subtotal ? `Settle tab, ${inr(subtotal - off)}` : "Tab is empty"}</button>
        </div>
      </main>
    </Gate>
  );
}
