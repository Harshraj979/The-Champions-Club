"use client";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { allStarts, fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import DemoRazorpayModal from "@/components/DemoRazorpayModal";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;
const starts = allStarts();

// "22 Nov 2026" instead of a raw YYYY-MM-DD string.
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export default function Bookings() {
  const today = todayISO();
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "BOOKED" | "CANCELLED">("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showDeskBook, setShowDeskBook] = useState(false);
  const [busy, setBusy] = useState(false);

  // Desk Booking Form state
  const [bookCourtId, setBookCourtId] = useState(1);
  const [bookDate, setBookDate] = useState(today);
  const [bookSlot, setBookSlot] = useState(starts[4] || 480); // 8:00 AM default
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custParentName, setCustParentName] = useState("");
  const [custParentPhone, setCustParentPhone] = useState("");
  const [availPlan, setAvailPlan] = useState<string>("none");

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
  const bookings = useApi(() => api.bookings(date || undefined), [date]);
  const courts = useApi(() => api.courts());
  const plans = useApi(() => api.plans());

  const rows = bookings.data ?? [];
  const shown = statusFilter === "all" ? rows : rows.filter((b) => b.state === statusFilter);

  async function cancel(b: { id: number; who: string; court: string; date: string }) {
    if (!window.confirm(`Cancel ${b.who}'s booking on ${b.court}, ${fmtDate(b.date)}? The slot will be free again.`)) return;
    setMsg(null);
    setBusyId(b.id);
    try {
      await api.cancelBooking(b.id);
      setMsg({ ok: true, text: "Booking cancelled. The court slot is now free." });
      void bookings.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Cancelling failed. Try again." });
    } finally {
      setBusyId(null);
    }
  }

  async function executeDeskBooking(paidOnline = false) {
    if (!custName.trim()) {
      setMsg({ ok: false, text: "Please enter the customer name." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      // 1. If membership plan selected, avail it first for this email
      if (availPlan !== "none" && custEmail.trim()) {
        await api.availMembership({
          email: custEmail.trim(),
          name: custName.trim() || undefined,
          phone: custPhone.trim() || undefined,
          planCode: availPlan,
          parentName: availPlan === "junior" ? custParentName.trim() || undefined : undefined,
          parentPhone: availPlan === "junior" ? custParentPhone.trim() || undefined : undefined,
        });
      }

      // 2. Book court with email attached
      const b = await api.createBooking({
        courtId: bookCourtId,
        date: bookDate,
        start: bookSlot,
        name: custName.trim(),
        email: custEmail.trim() || undefined,
        phone: custPhone.trim() || undefined,
        type: "REGULAR",
      });

      const courtObj = courts.data?.find((c) => c.id === bookCourtId);
      setMsg({
        ok: true,
        text: `Court booked! ${courtObj?.name || "Court"} on ${bookDate} at ${fmtTime(bookSlot)}${
          paidOnline ? " · Paid online via Demo Razorpay" : b.price ? ` · ${inr(b.price)} at the desk` : " · Covered by plan"
        }.${
          custEmail.trim()
            ? ` Linked to ${custEmail.trim()} — customer can log in to the Member Portal with this email to see this booking and membership.`
            : ""
        }`,
      });
      setCustName("");
      setCustEmail("");
      setCustPhone("");
      setAvailPlan("none");
      setShowDeskBook(false);
      void bookings.reload();
    } catch (e: any) {
      setMsg({ ok: false, text: e instanceof ApiClientError ? e.message : e.message || "Booking failed. Try again." });
    } finally {
      setBusy(false);
    }
  }

  // Calculate preview price
  const courtSelected = courts.data?.find((c) => c.id === bookCourtId);
  const planSelected = plans.data?.find((p) => p.code === availPlan);
  const previewPrice =
    planSelected && courtSelected
      ? courtSelected.sport === "Cricket"
        ? planSelected.cricketPrice
        : planSelected.tennisPrice
      : courtSelected?.walkinPrice ?? 500;

  return (
    <main className="wrap page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p className="page-eyebrow">Front desk</p>
          <h1 className="page-title">Bookings</h1>
          <p className="sub">Every booking on the books from today on. Book for walk-ins or avail memberships by email.</p>
        </div>
        <button
          type="button"
          className="btn btn-ink"
          onClick={() => setShowDeskBook(!showDeskBook)}
          style={{ alignSelf: "center" }}
        >
          {showDeskBook ? "✕ Close Booking Form" : "+ Book Court at Desk"}
        </button>
      </div>

      {/* Desk Booking & Member Avail Plan Panel */}
      {showDeskBook && (
        <section className="panel panel-main" style={{ marginBottom: 24, border: "2px solid var(--volt)" }}>
          <div className="sec-head">
            <h2>Book Court &amp; Avail Membership (Front Desk)</h2>
          </div>
          <p className="text-xs text-[#617065]" style={{ marginBottom: 16 }}>
            Enter customer details. If you provide an <strong>email</strong>, their account is automatically created or linked so they can log in later and see this booking &amp; active membership on their portal dashboard!
          </p>

          <div className="form-grid">
            <div className="field-row">
              <div>
                <label htmlFor="db-court">Court</label>
                <select id="db-court" value={bookCourtId} onChange={(e) => setBookCourtId(Number(e.target.value))}>
                  {(courts.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sport} · Walk-in {inr(c.walkinPrice)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="db-date">Date</label>
                <input id="db-date" type="date" min={today} value={bookDate} onChange={(e) => setBookDate(e.target.value)} />
              </div>
            </div>

            <div className="field-row">
              <div>
                <label htmlFor="db-slot">Time Slot (60 min)</label>
                <select id="db-slot" value={bookSlot} onChange={(e) => setBookSlot(Number(e.target.value))}>
                  {starts.map((s) => (
                    <option key={s} value={s}>
                      {fmtTime(s)} – {fmtTime(s + 60)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="db-plan">Avail Membership Plan (Optional)</label>
                <select id="db-plan" value={availPlan} onChange={(e) => setAvailPlan(e.target.value)}>
                  <option value="none">None (Regular Walk-in rate)</option>
                  <option value="gold">Gold Plan (₹1,500/mo · Tennis ₹300, Cricket ₹500)</option>
                  <option value="silver">Silver Plan (₹1,000/mo · Tennis ₹400, Cricket ₹650)</option>
                  <option value="junior">Junior Plan (₹600/mo · Under 18)</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div>
                <label htmlFor="db-name">Customer Name *</label>
                <input
                  id="db-name"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
              <div>
                <label htmlFor="db-email">Customer Email (Links to Member Portal) *</label>
                <input
                  id="db-email"
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="rahul@example.com"
                />
              </div>
            </div>

            <div className="field-row">
              <div>
                <label htmlFor="db-phone">Phone Number (Initial password for login)</label>
                <input
                  id="db-phone"
                  type="tel"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="9811000001"
                />
              </div>
            </div>

            {availPlan === "junior" && (
              <div style={{ padding: "12px", borderRadius: "10px", background: "#f7f9f6", border: "1px solid rgba(22, 48, 33, 0.15)", marginBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#163021", marginBottom: "8px" }}>
                  🛡️ Parent / Guardian Details (Minor Required)
                </div>
                <div className="field-row">
                  <div>
                    <label htmlFor="db-pname">Parent / Guardian Name *</label>
                    <input
                      id="db-pname"
                      value={custParentName}
                      onChange={(e) => setCustParentName(e.target.value)}
                      placeholder="e.g. Meera Patel"
                    />
                  </div>
                  <div>
                    <label htmlFor="db-pphone">Parent Phone Number *</label>
                    <input
                      id="db-pphone"
                      value={custParentPhone}
                      onChange={(e) => setCustParentPhone(e.target.value)}
                      placeholder="e.g. 9811000003"
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => executeDeskBooking(false)}
                disabled={busy || !custName.trim()}
              >
                  {busy ? "Booking..." : `Confirm Booking (${inr(previewPrice)} at desk)`}
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() =>
                    setRazorpayModal({
                      isOpen: true,
                      amount: previewPrice,
                      title: `Court Booking - ${courtSelected?.name || "Court"}`,
                      description: `${bookDate} at ${fmtTime(bookSlot)} for ${custName || "Customer"}`,
                    })
                  }
                  disabled={busy || !custName.trim()}
                  style={{ background: "#0b1a30", color: "#dfff45", border: "1px solid #3395ff", fontWeight: 700 }}
                >
                  💳 Pay Online ({inr(previewPrice)})
                </button>
              </div>
            </div>
        </section>
      )}

      <div className="toolbar">
        <div style={{ width: 260, maxWidth: "100%" }}>
          <label htmlFor="b-date">Show one day</label>
          <input id="b-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {date && (
            <button className="text-link" style={{ marginTop: 6 }} onClick={() => setDate("")}>
              Show all upcoming days
            </button>
          )}
        </div>
        <div className="seg" role="group" aria-label="Filter by status">
          {(["all", "BOOKED", "CANCELLED"] as const).map((s) => (
            <button key={s} aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
              {s === "all" ? "All" : s === "BOOKED" ? "Booked" : "Cancelled"}
            </button>
          ))}
        </div>
        {!bookings.loading && !bookings.error && (
          <p className="count-line"><b>{shown.length}</b> {shown.length === 1 ? "booking" : "bookings"}{date ? " that day" : ""}</p>
        )}
      </div>

      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}
      {bookings.loading ? (
        <Loading />
      ) : bookings.error ? (
        <ErrorBox message={bookings.error} onRetry={bookings.reload} />
      ) : shown.length === 0 ? (
        <Empty>{statusFilter === "CANCELLED" ? "No cancelled bookings." : "No bookings standing. The courts are free."}</Empty>
      ) : (
        <div className="ledger-wrap">
          <table className="ledger">
            <thead><tr><th>Date</th><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="hide-m">Price</th><th>Status</th><th /></tr></thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : ""}>
                  <td className="num" style={{ whiteSpace: "nowrap" }}>{fmtDate(b.date)}</td>
                  <td className="num">{fmtTime(b.start)}</td>
                  <td>{b.court}</td>
                  <td>{b.who}{b.type === "TRIAL" && b.phone ? <span className="muted"> · {b.phone}</span> : null}</td>
                  <td className="hide-m">{typeLabel[b.type]}</td>
                  <td className="num hide-m">{b.price ? inr(b.price) : "Plan"}</td>
                  <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                  <td className="r">{b.state === "BOOKED" && <button className="text-link" disabled={busyId === b.id} onClick={() => cancel(b)}>{busyId === b.id ? "Cancelling..." : "Cancel"}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Demo Razorpay modal */}
      <DemoRazorpayModal
        isOpen={razorpayModal.isOpen}
        amount={razorpayModal.amount}
        title={razorpayModal.title}
        description={razorpayModal.description}
        onClose={() => setRazorpayModal((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => {
          setRazorpayModal((prev) => ({ ...prev, isOpen: false }));
          void executeDeskBooking(true);
        }}
      />
    </main>
  );
}
