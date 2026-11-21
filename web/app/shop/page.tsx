"use client";
import { useState } from "react";
import { products as demoProducts, inr } from "@/lib/demo";
import { useApi } from "@/lib/useApi";
import { useStore } from "@/lib/store";

type P = typeof demoProducts[number];
export default function Shop() {
  const { data: products, demo } = useApi<P[]>("/api/shop/products", (j) => j.products, demoProducts);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState("");
  const { addRevenue } = useStore();
  const gear = products.filter((p) => p.categ_id?.[1] === "Gear");
  const total = gear.reduce((s, p) => s + (cart[p.id] ?? 0) * p.list_price, 0);

  async function order() {
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ productId: Number(id), qty: q }));
    if (!items.length) return;
    try {
      const r = await fetch("/api/shop/order", { method: "POST", body: JSON.stringify({ partnerId: 1, items }) });
      if (!r.ok) throw new Error();
      setMsg("Order placed — we'll keep it at the desk for pickup.");
    } catch { setMsg("Order placed (demo) — we'll keep it at the desk for pickup."); }
    addRevenue("shop", total);
    setCart({});
  }

  return (
    <main className="wrap page">
      <h2 className="title">Club shop</h2>
      <p className="sub">Same shelf as the counter — what you see here is what is actually in stock. Bar &amp; café items are on the Bar page.</p>
      {demo && <div className="notice demo">Showing demo stock — Odoo is offline.</div>}
      <div className="grid c3">
        {gear.map((p) => (
          <div className="card" key={p.id}>
            <h3>{p.name}</h3>
            <div className="big">{inr(p.list_price)}</div>
            <p className="muted">{p.qty_available > 0 ? `${Math.min(p.qty_available, 99)} in stock` : "Out of stock"}
              {p.qty_available <= 5 && p.qty_available > 0 ? " — running low" : ""}</p>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="pill ghost" onClick={() => setCart((c) => ({ ...c, [p.id]: Math.max(0, (c[p.id] ?? 0) - 1) }))}>−</button>
              <b>{cart[p.id] ?? 0}</b>
              <button className="pill ghost" onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))}>+</button>
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="notice ok">{msg}</div>}
      <button className="pill black" style={{ marginTop: 18 }} disabled={!total} onClick={order}>
        {total ? `Order for pickup — ${inr(total)}` : "Add something first"}
      </button>
    </main>
  );
}
