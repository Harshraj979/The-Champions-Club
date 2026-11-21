"use client";
import { useState } from "react";
import { products, inr } from "@/lib/data";
import { useStore } from "@/lib/store";

const gear = products.filter((p) => p.category === "gear");

export default function Shop() {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState("");
  const { addRevenue } = useStore();
  const total = gear.reduce((s, p) => s + (cart[p.id] ?? 0) * p.price, 0);
  const count = gear.reduce((s, p) => s + (cart[p.id] ?? 0), 0);
  const set = (id: number, qty: number, stock: number) =>
    setCart((c) => ({ ...c, [id]: Math.max(0, Math.min(stock, qty)) }));

  function order() {
    if (!total) return;
    addRevenue("shop", total);
    setCart({});
    setMsg(`Order placed, ${inr(total)}. We will keep it at the front desk for pickup.`);
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Club shop</h1>
        <p className="sub">The same shelf as the counter. What is listed here is what is actually in stock.</p>
      </div>
      <div className="rows">
        {gear.map((p) => (
          <div className="row-item" key={p.id}>
            <div className="row-main">
              <p className="row-name">{p.name}</p>
              <p className="muted">
                {p.stock === 0 ? "Out of stock" : p.stock! <= 5 ? `Only ${p.stock} left` : `${p.stock} in stock`}
              </p>
            </div>
            <span className="num" style={{ fontSize: 15 }}>{inr(p.price)}</span>
            <div className="stepper">
              <button aria-label={`One less ${p.name}`} onClick={() => set(p.id, (cart[p.id] ?? 0) - 1, p.stock!)}>−</button>
              <b className="num">{cart[p.id] ?? 0}</b>
              <button aria-label={`One more ${p.name}`} disabled={p.stock === 0} onClick={() => set(p.id, (cart[p.id] ?? 0) + 1, p.stock!)}>+</button>
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="notice ok" role="status">{msg}</div>}
      <div className="summary">
        <p className="s-lines">{count === 0 ? "Nothing picked yet." : <>{count} item{count > 1 ? "s" : ""} · <span className="num s-total">{inr(total)}</span></>}</p>
        <button className="btn btn-ink" disabled={!total} onClick={order}>{total ? `Order for pickup, ${inr(total)}` : "Add something first"}</button>
      </div>
    </main>
  );
}
