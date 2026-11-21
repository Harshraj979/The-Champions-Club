"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { Loading, ErrorBox, Empty } from "@/components/States";
import DemoRazorpayModal from "@/components/DemoRazorpayModal";
import { inr } from "@/lib/format";
import type { MemberDTO } from "@/lib/types";

const stateLabel = { active: "Active", expiring: "Expiring soon", expired: "Expired" } as const;

export default function Members() {
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | "active" | "expiring" | "expired">("all");
  const [form, setForm] = useState({ name: "", phone: "", email: "", planCode: "gold" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Demo Razorpay Modal
  const [razorpayModal, setRazorpayModal] = useState<{
    isOpen: boolean;
    amount: number;
    title: string;
    description: string;
  }>({
    isOpen: false,
    amount: 0,
    title: "",
    description: "",
  });

  const members = useApi(() => api.members(q || undefined), [q]);
  const plans = useApi(() => api.plans());
  const all = members.data ?? [];
  const list = stateFilter === "all" ? all : all.filter((m) => m.state === stateFilter);

  const selectedPlanObj = plans.data?.find((p) => p.code === form.planCode);
  const planFee = form.planCode === "gold" ? 1500 : form.planCode === "silver" ? 1000 : 600;

  async function add(paidOnline = false) {
    if (!form.name.trim() && !form.email.trim()) {
      return setMsg({ ok: false, text: "Enter at least the member name or email." });
    }
    if (form.phone && form.phone.replace(/\D/g, "").length < 10) {
      return setMsg({ ok: false, text: "Phone number looks short. Provide at least 10 digits." });
    }
    setBusy(true);
    setMsg(null);
    try {
      const m = await api.createMember({
        name: form.name.trim() || form.email.split("@")[0],
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        planCode: form.planCode,
      });
      const plan = plans.data?.find((p) => p.code === form.planCode);
      setMsg({
        ok: true,
        text: `✓ Membership plan activated for ${m.name}! ${m.plan} active for ${plan?.termDays ?? 365} days${
          paidOnline ? " (Paid online via Demo Razorpay)" : " (Paid at desk)"
        }.${
          m.email
            ? ` When logging in with ${m.email}, they will immediately see their active ${m.plan} plan on their portal dashboard.`
            : ""
        }`,
      });
      setForm({ name: "", phone: "", email: "", planCode: "gold" });
      void members.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Availing membership failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  function openAvailFor(m: MemberDTO) {
    setForm({
      name: m.name,
      phone: m.phone || "",
      email: m.email || "",
      planCode: m.planCode !== "none" ? m.planCode : "gold",
    });
    setMsg({
      ok: true,
      text: `Loaded details for ${m.name}. Pick a membership tier below to avail or renew their plan.`,
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  return (
    <main className="wrap page">
      <div className="page-head">
        <p className="page-eyebrow">Front desk</p>
        <h1 className="page-title">Members</h1>
        <p className="sub">Find any member in seconds, or avail/renew membership plans linked to their email.</p>
      </div>

      <div className="toolbar">
        <div style={{ width: 420, maxWidth: "100%" }}>
          <label htmlFor="m-search">Search members</label>
          <input id="m-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or email" />
        </div>
        {!members.loading && !members.error && all.length > 0 && (
          <p className="count-line"><b>{list.length}</b> {list.length === 1 ? "member" : "members"}{q ? " found" : ""} · {all.filter((m) => m.state === "active").length} active</p>
        )}
      </div>

      {!members.loading && !members.error && all.length > 0 && (
        <div className="seg" role="group" aria-label="Filter by plan state" style={{ marginTop: 16 }}>
          <button aria-pressed={stateFilter === "all"} onClick={() => setStateFilter("all")}>All</button>
          <button aria-pressed={stateFilter === "active"} onClick={() => setStateFilter("active")}>Active</button>
          <button aria-pressed={stateFilter === "expiring"} onClick={() => setStateFilter("expiring")}>Expiring soon</button>
          <button aria-pressed={stateFilter === "expired"} onClick={() => setStateFilter("expired")}>Expired</button>
        </div>
      )}

      {members.loading ? (
        <div style={{ marginTop: 20 }}><Loading /></div>
      ) : members.error ? (
        <ErrorBox message={members.error} onRetry={members.reload} />
      ) : list.length === 0 ? (
        <div style={{ marginTop: 20 }}>
          <Empty>{q ? <>No member matches &ldquo;{q}&rdquo;. Check spelling or avail membership below.</> : all.length > 0 ? "No members in this state right now." : "No members yet. Add the first one below."}</Empty>
        </div>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th className="hide-m">Email</th>
                <th className="hide-m">Phone</th>
                <th className="hide-m">Plan ends</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className={m.state === "expired" ? "row-off" : ""}>
                  <td style={{ fontWeight: 500 }}>{m.name}</td>
                  <td><strong>{m.plan}</strong></td>
                  <td className="hide-m">{m.email || <span className="muted">—</span>}</td>
                  <td className="num hide-m">{m.phone}</td>
                  <td className="num hide-m">{m.expiresOn || <span className="muted">—</span>}</td>
                  <td><span className={`status ${m.state}`}>{stateLabel[m.state]}</span></td>
                  <td>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => openAvailFor(m)}
                    >
                      ⚡ Avail / Renew Plan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <section className="block">
        <div className="sec-head">
          <h2>Avail or Upgrade Membership (Front Desk)</h2>
        </div>
        <div className="panel panel-main" style={{ maxWidth: 780 }}>
          <p className="text-xs text-[#617065]" style={{ marginBottom: 16 }}>
            Avail a membership plan for an existing member or a new visitor. With their <strong>email</strong>, their account is instantly linked so that upon logging into their Member Portal, they see their active plan tier with member benefits!
          </p>

          <div className="field-row">
            <div>
              <label htmlFor="m-name">Member Name *</label>
              <input id="m-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vikas Gupta" />
            </div>
            <div>
              <label htmlFor="m-email">Email (Syncs with Member Portal Login) *</label>
              <input id="m-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vikas@example.com" />
            </div>
          </div>
          <div className="field-row" style={{ marginTop: 16, alignItems: "end" }}>
            <div>
              <label htmlFor="m-phone">Phone (Initial login password)</label>
              <input id="m-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} inputMode="tel" placeholder="9811000002" />
            </div>
            <div>
              <label htmlFor="m-plan">Membership Plan</label>
              <select id="m-plan" value={form.planCode} onChange={(e) => setForm({ ...form, planCode: e.target.value })}>
                {(plans.data ?? []).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name} ({p.code === "gold" ? "₹1,500/mo" : p.code === "silver" ? "₹1,000/mo" : "₹600/mo"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              className="btn btn-ink"
              onClick={() => add(false)}
              disabled={busy || (!form.name.trim() && !form.email.trim())}
            >
              {busy ? "Availing..." : `Avail ${selectedPlanObj?.name || "Membership"} (${inr(planFee)} at desk)`}
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() =>
                setRazorpayModal({
                  isOpen: true,
                  amount: planFee,
                  title: `${selectedPlanObj?.name || "Membership"} Plan`,
                  description: `Avail for ${form.name || form.email || "Member"} (1 Month)`,
                })
              }
              disabled={busy || (!form.name.trim() && !form.email.trim())}
              style={{ background: "#0b1a30", color: "#dfff45", border: "1px solid #3395ff", fontWeight: 700 }}
            >
              💳 Pay Online ({inr(planFee)})
            </button>
          </div>

          {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{msg.text}</div>}
        </div>
      </section>

      {/* Demo Razorpay modal */}
      <DemoRazorpayModal
        isOpen={razorpayModal.isOpen}
        amount={razorpayModal.amount}
        title={razorpayModal.title}
        description={razorpayModal.description}
        onClose={() => setRazorpayModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setRazorpayModal((prev) => ({ ...prev, isOpen: false }));
          void add(true);
        }}
      />
    </main>
  );
}
