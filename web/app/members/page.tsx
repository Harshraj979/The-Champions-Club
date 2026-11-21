"use client";
import { useState } from "react";
import { members as demoMembers, plans } from "@/lib/demo";
import { useApi } from "@/lib/useApi";
import { useStore } from "@/lib/store";

type M = typeof demoMembers[number];
export default function Members() {
  const [q, setQ] = useState("");
  const url = q ? `/api/members/search?q=${encodeURIComponent(q)}` : null;
  const { data: found, demo } = useApi<M[]>(url, (j) => j.members, []);
  const { store, addMember } = useStore();
  const added: M[] = store.members.map((m) => ({
    id: m.id, name: m.name, club_plan_id: [0, m.plan] as any, membership_state: "active",
  }));
  const [form, setForm] = useState({ name: "", phone: "", plan: "silver" });
  const [msg, setMsg] = useState("");
  const list = [...added, ...(q ? found : demoMembers)];

  async function add() {
    const plan = plans.find((p) => p.code === form.plan)!;
    try {
      const r = await fetch("/api/members/create", { method: "POST",
        body: JSON.stringify({ name: form.name, phone: form.phone, planCode: form.plan }) });
      if (!r.ok) throw new Error();
    } catch { /* demo */ }
    addMember({ name: form.name, plan: plan.name });
    setMsg(`${form.name} added on ${plan.name}.`); setForm({ name: "", phone: "", plan: "silver" });
  }

  return (
    <main className="wrap page">
      <h2 className="title">Members</h2>
      <p className="sub">Find any member in seconds, see their plan and status. <span className="tag grey">Staff view</span></p>
      {demo && q && <div className="notice demo">Odoo offline — searching demo members.</div>}
      <div className="row">
        <div><label>Search members</label><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone" /></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table><thead><tr><th>Name</th><th>Plan</th><th>Status</th></tr></thead>
          <tbody>{list.filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase())).map((m) => (
            <tr key={m.id}><td>{m.name}</td><td>{m.club_plan_id?.[1] ?? "—"}</td>
              <td>{m.membership_state === "active" ? <span className="tag">Active</span>
                : m.membership_state === "expiring" ? <span className="tag grey">Expiring soon</span>
                : <span className="tag red">Expired</span>}</td></tr>))}
          </tbody></table>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Add a member</h3>
        <div className="row" style={{ marginTop: 10 }}>
          <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Plan</label>
            <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
              {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select></div>
          <button className="pill black" disabled={!form.name} onClick={add}>Add member</button>
        </div>
        {msg && <div className="notice ok">{msg}</div>}
      </div>
    </main>
  );
}
