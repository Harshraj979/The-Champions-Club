"use client";
import { useState } from "react";
import { members, plans } from "@/lib/data";
import { useStore } from "@/lib/store";

const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired" } as const;

export default function Members() {
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", plan: "silver" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { store, addMember } = useStore();
  const added = store.members.map((m) => ({ id: m.id, name: m.name, plan: m.plan, state: "active" as const }));
  const list = [...added, ...members].filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()));

  function add() {
    if (!form.name.trim()) return setMsg({ ok: false, text: "The member needs a name." });
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) return setMsg({ ok: false, text: "That phone number looks short. Check it and try again." });
    const plan = plans.find((p) => p.code === form.plan)!;
    addMember({ name: form.name.trim(), plan: plan.name });
    setMsg({ ok: true, text: `${form.name.trim()} added on ${plan.name}. The plan runs ${plan.days} days from today.` });
    setForm({ name: "", phone: "", plan: "silver" });
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <h1 className="page-title">Members</h1>
        <p className="sub">Find any member in seconds, and see their plan and where it stands. Staff view.</p>
      </div>

      <div style={{ maxWidth: 420 }}>
        <label htmlFor="m-search">Search members</label>
        <input id="m-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" />
      </div>

      {list.length === 0 ? (
        <div className="empty" style={{ marginTop: 20 }}>No member matches &ldquo;{q}&rdquo;. Check the spelling, or add them below.</div>
      ) : (
        <table className="ledger" style={{ marginTop: 12 }}>
          <thead><tr><th>Name</th><th>Plan</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 500 }}>{m.name}</td>
                <td>{m.plan}</td>
                <td><span className={`status ${m.state}`}>{stateLabel[m.state]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="block">
        <div className="sec-head"><h2>Add a member</h2></div>
        <div className="panel" style={{ maxWidth: 760 }}>
          <div className="field-row">
            <div>
              <label htmlFor="m-name">Name</label>
              <input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="m-phone">Phone</label>
              <input id="m-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
            <div>
              <label htmlFor="m-plan">Plan</label>
              <select id="m-plan" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div><button className="btn btn-ink" onClick={add}>Add member</button></div>
          </div>
          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
        </div>
      </section>
    </main>
  );
}
