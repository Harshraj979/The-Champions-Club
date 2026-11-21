"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox, Empty } from "@/components/States";
import NumberTicker from "@/components/NumberTicker";
import DemoRazorpayModal from "@/components/DemoRazorpayModal";
import type { RolePinDTO, StaffMemberPinDTO } from "@/lib/types";

const typeLabel = { REGULAR: "Regular", FRIDAY_SOCIAL: "Social Play", TRIAL: "Trial" } as const;
const methodLabel = { CASH: "Cash", CARD: "Card", UPI: "UPI", ONLINE: "Demo Razorpay" } as const;

const periods = [
  { code: "today", label: "Today" },
  { code: "week", label: "Last 7 days" },
  { code: "month", label: "Last 30 days" },
] as const;

export default function Dashboard() {
  const today = todayISO();
  const dash = useApi(() => api.dashboard(today), [today]);
  const d = dash.data;
  const [period, setPeriod] = useState<(typeof periods)[number]["code"]>("today");
  const [pins, setPins] = useState<RolePinDTO[]>([]);
  const [staffList, setStaffList] = useState<StaffMemberPinDTO[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [pinInputs, setPinInputs] = useState<Record<number, string>>({});
  const [rateInputs, setRateInputs] = useState<Record<number, string>>({});
  const [editingRate, setEditingRate] = useState<Record<number, boolean>>({});
  const [staffMsg, setStaffMsg] = useState<{ staffId: number; text: string; ok: boolean } | null>(null);
  const [staffBusy, setStaffBusy] = useState<number | null>(null);

  // Demo Razorpay Modal for Salary Payout
  const [salaryModal, setSalaryModal] = useState<{
    isOpen: boolean;
    staff: StaffMemberPinDTO | null;
    amount: number;
  }>({
    isOpen: false,
    staff: null,
    amount: 0,
  });

  async function loadStaffData() {
    try {
      const res = await api.staffPins();
      setPins(res.roles || []);
      setStaffList(res.staff || []);
    } catch {
      // fallback
    }
  }

  useEffect(() => {
    loadStaffData();
  }, []);

  async function handleSaveStaffPin(staffId: number) {
    const val = (pinInputs[staffId] || "").trim();
    if (!/^\d{4,6}$/.test(val)) {
      setStaffMsg({ staffId, text: "Enter 4 to 6 numeric digits", ok: false });
      return;
    }
    setStaffBusy(staffId);
    setStaffMsg(null);
    try {
      const res = await api.updateStaffPin(staffId, val);
      setStaffMsg({ staffId, text: res.message || "PIN updated successfully!", ok: true });
      setPinInputs((prev) => ({ ...prev, [staffId]: "" }));
      await loadStaffData();
    } catch (err: any) {
      setStaffMsg({ staffId, text: err.message || "Failed to update PIN", ok: false });
    } finally {
      setStaffBusy(null);
    }
  }

  async function handleResetStaffPin(staffId: number) {
    setStaffBusy(staffId);
    setStaffMsg(null);
    try {
      const res = await api.resetStaffPin(staffId);
      setStaffMsg({ staffId, text: res.message || "PIN reset to default", ok: true });
      await loadStaffData();
    } catch (err: any) {
      setStaffMsg({ staffId, text: err.message || "Failed to reset PIN", ok: false });
    } finally {
      setStaffBusy(null);
    }
  }

  async function handleSaveRate(staffId: number) {
    const val = Number(rateInputs[staffId]);
    if (!val || val <= 0) {
      setStaffMsg({ staffId, text: "Enter a valid positive hourly rate", ok: false });
      return;
    }
    setStaffBusy(staffId);
    try {
      const res = await api.updateStaffRate(staffId, val);
      setStaffMsg({ staffId, text: res.message || "Wage rate updated!", ok: true });
      setEditingRate((prev) => ({ ...prev, [staffId]: false }));
      await loadStaffData();
    } catch (err: any) {
      setStaffMsg({ staffId, text: err.message || "Failed to update rate", ok: false });
    } finally {
      setStaffBusy(null);
    }
  }

  async function handleToggleClock(staffId: number) {
    setStaffBusy(staffId);
    try {
      const res = await api.toggleStaffClock(staffId);
      setStaffMsg({ staffId, text: res.message, ok: true });
      await loadStaffData();
    } catch (err: any) {
      setStaffMsg({ staffId, text: err.message || "Failed to toggle shift", ok: false });
    } finally {
      setStaffBusy(null);
    }
  }

  async function executeSalaryPayout(paymentRef?: string) {
    if (!salaryModal.staff) return;
    const staff = salaryModal.staff;
    const amount = salaryModal.amount;
    setStaffBusy(staff.id);
    try {
      const res = await api.payStaffSalary({
        staffId: staff.id,
        amount,
        paymentRef,
      });
      setStaffMsg({ staffId: staff.id, text: `✓ Salary paid: ${res.message} (Ref: ${res.paymentRef})`, ok: true });
      setSalaryModal({ isOpen: false, staff: null, amount: 0 });
      await loadStaffData();
      void dash.reload();
    } catch (err: any) {
      setStaffMsg({ staffId: staff.id, text: err.message || "Salary payout failed", ok: false });
    } finally {
      setStaffBusy(null);
    }
  }

  const split = d?.periods[period];
  const figures = split
    ? [
        { label: "Courts", value: split.courts },
        { label: "Shop", value: split.shop },
        { label: "Bar", value: split.bar },
        { label: "Total", value: split.total, total: true },
      ]
    : [];

  return (
    <main className="wrap page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p className="page-eyebrow">The club</p>
          <h1 className="page-title">Owner dashboard</h1>
          <p className="sub">The whole day in one place: courts, shop and bar.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="mini-link" href="/bar/dashboard" style={{ background: "#f0fdf4", borderColor: "#86efac", fontWeight: 700 }}>
            🍷 Bar Owner Dashboard →
          </Link>
          <Link className="mini-link" href="/shop/dashboard" style={{ background: "#fefce8", borderColor: "#fde047", fontWeight: 700 }}>
            🏷️ Shop Owner Dashboard →
          </Link>
        </div>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          <div className="seg" role="group" aria-label="Period" style={{ marginBottom: 18 }}>
            {periods.map((p) => (
              <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
            ))}
          </div>

          <div className="figures">
            {figures.map((f) => (
              <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                <p className="f-label">{f.label}</p>
                <p className="f-value num"><NumberTicker value={f.value} /></p>
              </div>
            ))}
          </div>

          {period === "today" && d!.byMethod.length > 0 && (
            <p className="pay-strip">
              Taken today by{" "}
              {d!.byMethod.map((m, i) => (
                <span key={m.method}>
                  {i > 0 ? " · " : ""}
                  {methodLabel[m.method]} <span className="num">{inr(m.amount)}</span>
                </span>
              ))}{" "}
              at the shop and bar tills. Court money is paid at the desk.
            </p>
          )}

          {d!.lowStock.length > 0 && (
            <div className="notice warn" role="status">
              Running low in the shop: {d!.lowStock.map((p) => `${p.name} (${p.stock} left)`).join(", ")}.
            </div>
          )}

          {period === "today" && d!.expiring.length > 0 && (
            <section className="block">
              <div className="sec-head">
                <h2>Expiring in the next 14 days</h2>
                <Link className="text-link" href="/members">All members</Link>
              </div>
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Member</th><th className="hide-m">Plan</th><th className="hide-m">Phone</th><th>Expires</th><th className="r">Days left</th></tr></thead>
                  <tbody>
                    {d!.expiring.map((m) => (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td className="hide-m">{m.planName}</td>
                        <td className="hide-m num">{m.phone}</td>
                        <td>{m.expiresOn}</td>
                        <td className="r num">{m.daysLeft === 0 ? "Today" : m.daysLeft}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="block">
            <div className="sec-head">
              <h2>On court today</h2>
              <Link className="text-link" href="/bookings">All bookings</Link>
            </div>
            {d!.onCourt.length === 0 ? (
              <Empty>Nothing on court today yet. Bookings made on the Courts page will show up here.</Empty>
            ) : (
              <div className="ledger-wrap">
                <table className="ledger">
                  <thead><tr><th>Time</th><th>Court</th><th>Who</th><th className="hide-m">Type</th><th className="r">Price</th></tr></thead>
                  <tbody>
                    {d!.onCourt.map((b) => (
                      <tr key={b.id}>
                        <td className="num">{fmtTime(b.start)}</td>
                        <td>{b.court}</td>
                        <td>{b.who}</td>
                        <td className="hide-m">{typeLabel[b.type]}</td>
                        <td className="r num">{b.price ? inr(b.price) : "Plan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link className="mini-link" href="/members">Members</Link>
              <Link className="mini-link" href="/bar">Bar tabs</Link>
              <Link className="mini-link" href="/shop">Shop</Link>
              <Link className="mini-link" href="/invoices">Invoices</Link>
              <Link className="mini-link" href="/expenses">Expenses</Link>
              <Link className="mini-link" href="/payroll">Payroll</Link>
              <Link className="mini-link" href="/shifts">Staff rota</Link>
            </p>
          </section>

          <section className="block">
            <div className="sec-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2>Staff Team, Security PINs &amp; Direct Salary Payout</h2>
                <p className="sub" style={{ margin: "4px 0 0" }}>
                  Owner controls: Configure personal security PINs for each staff member by name, track their worked hours, and pay their salary directly via Demo Razorpay.
                </p>
              </div>
            </div>

            {/* Role Filter and Summary Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 14 }}>
              <div className="seg" role="group" aria-label="Filter staff by team role" style={{ margin: 0 }}>
                {[
                  { id: "ALL", label: "All Staff" },
                  { id: "FRONT_DESK", label: "Club Staff" },
                  { id: "BAR", label: "Bar & Café" },
                  { id: "SHOP", label: "Pro Shop" },
                  { id: "OWNER", label: "Management" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={roleFilter === f.id}
                    onClick={() => setRoleFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Summary Stats */}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, fontWeight: 600, color: "var(--pine)" }}>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#f0f4f1", border: "1px solid rgba(22,48,33,0.12)" }}>
                  👥 <b>{staffList.length}</b> Team Profiles
                </span>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#f0f4f1", border: "1px solid rgba(22,48,33,0.12)" }}>
                  ⏱️ <b>{Math.round(staffList.filter((s) => s.role !== "OWNER").reduce((acc, s) => acc + s.hoursWorked, 0) * 10) / 10} hrs</b> Logged
                </span>
                <span style={{ padding: "4px 10px", borderRadius: 999, background: "#dfff45", color: "#163021", border: "1px solid #c2eb24" }}>
                  💰 <b>{inr(staffList.filter((s) => s.role !== "OWNER").reduce((acc, s) => acc + s.salaryDue, 0))}</b> Due for Staff Payout
                </span>
              </div>
            </div>

            {/* Staff Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18, marginTop: 18 }}>
              {staffList
                .filter((s) => {
                  if (roleFilter === "FRONT_DESK") return s.role === "FRONT_DESK" || s.role === "STAFF";
                  if (roleFilter === "BAR") return s.role === "BAR" || s.role === "BAR_OWNER" || s.role === "BAR_STAFF";
                  if (roleFilter === "SHOP") return s.role === "SHOP" || s.role === "SHOP_OWNER" || s.role === "SHOP_STAFF";
                  if (roleFilter === "OWNER") return s.role === "OWNER";
                  return true;
                })
                .map((s) => {
                  const isBusy = staffBusy === s.id;
                  const msg = staffMsg?.staffId === s.id ? staffMsg : null;
                  const isEditingThisRate = editingRate[s.id];
                  const roleIcons: Record<string, string> = {
                    OWNER: "👑",
                    FRONT_DESK: "📋",
                    BAR_OWNER: "🍷",
                    BAR: "🍸",
                    SHOP_OWNER: "🏷️",
                    SHOP: "🛍️",
                  };

                  return (
                    <div
                      key={s.id}
                      className="panel"
                      style={{
                        padding: 20,
                        borderRadius: 16,
                        border: "1px solid rgba(22, 48, 33, 0.14)",
                        background: "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      {/* Top: Name, Role & Status Badges */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 26 }}>{roleIcons[s.role] || "🔑"}</span>
                            <div>
                              <strong style={{ fontSize: 17, display: "block", color: "#163021" }}>{s.name}</strong>
                              <span style={{ fontSize: 12, color: "#617065", fontWeight: 500 }}>
                                {s.roleLabel} · {s.email}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: 999,
                                background: s.hasCustomPin ? "#dcfce7" : "#f1f5f9",
                                color: s.hasCustomPin ? "#166534" : "#475569",
                                border: s.hasCustomPin ? "1px solid #86efac" : "1px solid #cbd5e1",
                                textTransform: "uppercase",
                              }}
                            >
                              {s.hasCustomPin ? "CUSTOM PIN" : `DEFAULT (${s.defaultPin})`}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 999,
                                background: s.role === "OWNER" ? "#ecfdf5" : s.isOnShift ? "#dfff45" : "#f1f5f9",
                                color: s.role === "OWNER" ? "#065f46" : "#163021",
                                border: s.role === "OWNER" ? "1px solid #a7f3d0" : "none",
                              }}
                            >
                              {s.role === "OWNER" ? "👑 Proprietor" : s.isOnShift ? "🟢 On Shift" : "⚪ Off Shift"}
                            </span>
                          </div>
                        </div>

                        {/* PIN Control on Behalf of this Staff Name */}
                        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: "#fbfbfa", border: "1px solid rgba(22,48,33,0.08)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#163021" }}>
                              {s.role === "OWNER" ? "Owner Master PIN" : `Set PIN for ${s.name.split(" ")[0]}`}
                            </label>
                            {s.hasCustomPin && (
                              <button
                                type="button"
                                className="text-link"
                                disabled={isBusy}
                                onClick={() => handleResetStaffPin(s.id)}
                                style={{ fontSize: 10, textDecoration: "underline", color: "#b91c1c" }}
                              >
                                Reset to {s.defaultPin}
                              </button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="New 4-6 digit PIN"
                              value={pinInputs[s.id] || ""}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                setPinInputs((prev) => ({ ...prev, [s.id]: val }));
                              }}
                              style={{
                                flex: 1,
                                minHeight: 34,
                                padding: "4px 10px",
                                fontSize: 14,
                                letterSpacing: 2,
                                borderRadius: 8,
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-ink"
                              disabled={isBusy || !(pinInputs[s.id] && pinInputs[s.id].length >= 4)}
                              onClick={() => handleSaveStaffPin(s.id)}
                              style={{ minHeight: 34, padding: "4px 12px", fontSize: 12, whiteSpace: "nowrap" }}
                            >
                              {isBusy ? "Saving..." : "Save PIN"}
                            </button>
                          </div>
                        </div>

                        {/* Owner is Business Proprietor; only hired staff track hourly shifts */}
                        {s.role === "OWNER" ? (
                          <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                              <span style={{ fontSize: 20 }}>👑</span>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Business Proprietor & Executive Admin</p>
                                <p style={{ fontSize: 11, color: "#15803d", marginTop: 3, lineHeight: 1.4 }}>
                                  Club owner profile · Draws business profits & equity dividends (exempt from employee hourly shift payroll and salary payouts).
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Work & Wage Tracking ("how much the staff has worked") */
                          <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "#f8faf8", border: "1px solid rgba(22,48,33,0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#617065" }}>
                                Work Hours Logged
                              </span>
                              <button
                                type="button"
                                className="text-link"
                                disabled={isBusy}
                                onClick={() => handleToggleClock(s.id)}
                                style={{ fontSize: 11, fontWeight: 600 }}
                              >
                                {s.isOnShift ? "⏱️ Clock Out" : "⏱️ Clock In"}
                              </button>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                              <div>
                                <span style={{ fontSize: 20, fontWeight: 700, color: "#163021" }}>{s.hoursWorked}</span>
                                <span style={{ fontSize: 12, color: "#617065", marginLeft: 4 }}>hours ({s.shiftsCount} shifts)</span>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                {!isEditingThisRate ? (
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#163021" }}>₹{s.hourlyRate}/hr</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingRate((prev) => ({ ...prev, [s.id]: true }));
                                        setRateInputs((prev) => ({ ...prev, [s.id]: String(s.hourlyRate) }));
                                      }}
                                      style={{ fontSize: 10, color: "#2563eb", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                                    >
                                      Edit
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <input
                                      type="number"
                                      value={rateInputs[s.id] || ""}
                                      onChange={(e) => setRateInputs((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                      style={{ width: 64, minHeight: 28, padding: "2px 6px", fontSize: 12, borderRadius: 6 }}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-ink"
                                      onClick={() => handleSaveRate(s.id)}
                                      style={{ minHeight: 28, padding: "2px 8px", fontSize: 11 }}
                                    >
                                      ✓
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom: Direct Salary Payout only for hired staff */}
                      {s.role !== "OWNER" ? (
                        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(22, 48, 33, 0.1)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#617065" }}>
                              Salary Payout
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#163021" }}>
                              {inr(s.salaryDue)}
                            </span>
                          </div>

                          {s.payrollStatus === "PAID" ? (
                            <div
                              style={{
                                padding: "8px 12px",
                                borderRadius: 10,
                                background: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#065f46",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>✓ Salary Paid for Month</span>
                              <span style={{ fontSize: 10, color: "#047857" }}>{s.lastPaidAt ? s.lastPaidAt.slice(0, 10) : "Recent"}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-ink"
                              disabled={isBusy || s.salaryDue <= 0}
                              onClick={() =>
                                setSalaryModal({
                                  isOpen: true,
                                  staff: s,
                                  amount: s.salaryDue,
                                })
                              }
                              style={{
                                width: "100%",
                                minHeight: 40,
                                background: "#0b1a30",
                                color: "#dfff45",
                                border: "1px solid #3395ff",
                                fontWeight: 700,
                                fontSize: 13,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                              }}
                            >
                              <span>💳 Pay Salary with Demo Razorpay</span>
                              <span>({inr(s.salaryDue)})</span>
                            </button>
                          )}

                          {msg && (
                            <div
                              className={`notice ${msg.ok ? "ok" : "err"}`}
                              style={{ marginTop: 10, padding: "6px 10px", fontSize: 12 }}
                            >
                              {msg.text}
                            </div>
                          )}
                        </div>
                      ) : (
                        msg && (
                          <div
                            className={`notice ${msg.ok ? "ok" : "err"}`}
                            style={{ marginTop: 10, padding: "6px 10px", fontSize: 12 }}
                          >
                            {msg.text}
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Salary Payout Demo Razorpay Modal */}
          {salaryModal.staff && (
            <DemoRazorpayModal
              isOpen={salaryModal.isOpen}
              amount={salaryModal.amount}
              title={`Staff Salary Payout — ${salaryModal.staff.name}`}
              description={`Payment for ${salaryModal.staff.hoursWorked} hrs worked as ${salaryModal.staff.roleLabel} (@ ₹${salaryModal.staff.hourlyRate}/hr)`}
              customerName={salaryModal.staff.name}
              onClose={() => setSalaryModal((prev) => ({ ...prev, isOpen: false }))}
              onSuccess={(details) => executeSalaryPayout(details.paymentId)}
            />
          )}
        </>
      )}
    </main>
  );
}
