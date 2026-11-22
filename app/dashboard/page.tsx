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
import type { BarDashboardDTO } from "@/lib/services/bar-stats";
import type { ShopDashboardDTO } from "@/lib/services/shop-stats";

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
  const barDash = useApi<BarDashboardDTO>(() => api.barStats(today), [today]);
  const shopDash = useApi<ShopDashboardDTO>(() => api.shopStats(today), [today]);
  const d = dash.data;
  const [period, setPeriod] = useState<(typeof periods)[number]["code"]>("today");
  const [viewTab, setViewTab] = useState<"overview" | "bar" | "shop" | "staff">("overview");
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

  // Add Staff Modal State
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffForm, setNewStaffForm] = useState({
    name: "",
    email: "",
    role: "FRONT_DESK",
    hourlyRate: "250",
    pin: "",
  });
  const [addStaffSubmitting, setAddStaffSubmitting] = useState(false);
  const [addStaffError, setAddStaffError] = useState<string | null>(null);

  // Delete Staff Confirmation Modal State
  const [staffToDelete, setStaffToDelete] = useState<StaffMemberPinDTO | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [staffBannerMsg, setStaffBannerMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function loadStaffData() {
    try {
      const res = await api.staffPins();
      setPins(res.roles || []);
      setStaffList(res.staff || []);
    } catch {
      // fallback
    }
  }

  async function handleAddStaff(e: React.FormEvent) {
    e.preventDefault();
    setAddStaffError(null);
    if (!newStaffForm.name.trim() || newStaffForm.name.trim().length < 2) {
      setAddStaffError("Please provide a valid staff name (at least 2 letters)");
      return;
    }
    if (!newStaffForm.email.trim() || !newStaffForm.email.includes("@")) {
      setAddStaffError("Please enter a valid work email address");
      return;
    }
    const rate = Number(newStaffForm.hourlyRate);
    if (isNaN(rate) || rate < 50) {
      setAddStaffError("Hourly wage rate must be at least ₹50/hr");
      return;
    }
    if (newStaffForm.pin.trim() && !/^\d{4,6}$/.test(newStaffForm.pin.trim())) {
      setAddStaffError("Security PIN must be 4 to 6 numeric digits (or left blank for role default)");
      return;
    }

    setAddStaffSubmitting(true);
    try {
      const res = await api.addStaff({
        name: newStaffForm.name.trim(),
        email: newStaffForm.email.trim(),
        role: newStaffForm.role,
        hourlyRate: rate,
        pin: newStaffForm.pin.trim() || undefined,
      });
      setShowAddStaffModal(false);
      setNewStaffForm({
        name: "",
        email: "",
        role: "FRONT_DESK",
        hourlyRate: "250",
        pin: "",
      });
      setStaffBannerMsg({ text: res.message || `Added ${newStaffForm.name} to team roster!`, ok: true });
      await loadStaffData();
    } catch (err: any) {
      setAddStaffError(err.message || "Failed to add staff member");
    } finally {
      setAddStaffSubmitting(false);
    }
  }

  async function handleConfirmDeleteStaff() {
    if (!staffToDelete) return;
    setDeleteSubmitting(true);
    try {
      const res = await api.removeStaff(staffToDelete.id);
      setStaffBannerMsg({ text: res.message || `Removed ${staffToDelete.name}`, ok: true });
      setStaffToDelete(null);
      await loadStaffData();
    } catch (err: any) {
      setStaffBannerMsg({ text: err.message || "Failed to remove staff member", ok: false });
    } finally {
      setDeleteSubmitting(false);
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

  // Download the numbers on screen as a CSV file (client-side, no endpoint).
  function exportCsv() {
    if (!d || !split) return;
    const lines: string[][] = [];
    lines.push(["The Champions Club — dashboard", `Period: ${period}`, `Date: ${today}`]);
    lines.push([]);
    lines.push(["Figures", "Amount (Rs)"]);
    lines.push(["Courts", String(split.courts)]);
    lines.push(["Shop", String(split.shop)]);
    lines.push(["Bar", String(split.bar)]);
    lines.push(["Total", String(split.total)]);
    lines.push([]);
    lines.push(["Taken today by method", "Amount (Rs)"]);
    d.byMethod.forEach((m) => lines.push([methodLabel[m.method], String(m.amount)]));
    lines.push([]);
    lines.push(["Low stock", "Stock left"]);
    d.lowStock.forEach((p) => lines.push([p.name, String(p.stock)]));
    const csv = lines.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `champions-dashboard-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="wrap page">
      <div className="page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <p className="page-eyebrow">The club</p>
          <h1 className="page-title">Owner Executive Dashboard</h1>
          <p className="sub">Executive club management: court revenue, live bar takings, pro shop turnover, and staff payroll.</p>
        </div>
        <div className="dashboard-tabs" role="group" aria-label="Dashboard sections">
          <button
            type="button"
            className="dashboard-tab"
            aria-pressed={viewTab === "overview"}
            onClick={() => setViewTab("overview")}
          >
            🏛️ Club Overview
          </button>
          <button
            type="button"
            className="dashboard-tab"
            aria-pressed={viewTab === "bar"}
            onClick={() => setViewTab("bar")}
          >
            🍷 Bar &amp; Cafeteria Stats
          </button>
          <button
            type="button"
            className="dashboard-tab"
            aria-pressed={viewTab === "shop"}
            onClick={() => setViewTab("shop")}
          >
            🛍️ Pro Shop Stats
          </button>
          <button
            type="button"
            className="dashboard-tab"
            aria-pressed={viewTab === "staff"}
            onClick={() => setViewTab("staff")}
          >
            👥 Staff &amp; Payroll
          </button>
        </div>
      </div>

      {dash.loading ? (
        <Loading />
      ) : dash.error ? (
        <ErrorBox message={dash.error} onRetry={dash.reload} />
      ) : (
        <>
          {/* VIEW: BAR & CAFETERIA DETAILED STATS */}
          {viewTab === "bar" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>🍷 Clubhouse Kitchen, Bar &amp; Cafeteria Analytics</h2>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Live beverage &amp; kitchen takings, active table tabs, and till metrics.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link className="btn btn-ink" href="/bar" style={{ padding: "8px 16px", fontSize: 13 }}>
                    🍸 Open Bar Till (POS)
                  </Link>
                  <button type="button" className="mini-link" onClick={() => setViewTab("overview")}>
                    ← Back to Overview
                  </button>
                </div>
              </div>

              {/* Period selector */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div className="seg" role="group" aria-label="Period">
                  {periods.map((p) => (
                    <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
                  ))}
                </div>
                <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
              </div>

              {/* Revenue Figures */}
              <div className="figures">
                <div className="figure total">
                  <p className="f-label">Bar &amp; Café Revenue ({period.toUpperCase()})</p>
                  <p className="f-value num">
                    <NumberTicker value={barDash.data?.revenue?.[period] ?? split?.bar ?? 0} />
                  </p>
                </div>
                <div className="figure">
                  <p className="f-label">Open Tabs Right Now</p>
                  <p className="f-value num">
                    {barDash.data?.metrics?.openTabsCount ?? 0}{" "}
                    <span style={{ fontSize: 15, fontWeight: 500 }}>({inr(barDash.data?.metrics?.openTabsValue ?? 0)})</span>
                  </p>
                </div>
                <div className="figure">
                  <p className="f-label">Tabs Settled Today</p>
                  <p className="f-value num">{barDash.data?.metrics?.settledTodayCount ?? 0}</p>
                </div>
                <div className="figure">
                  <p className="f-label">Average Spend / Tab</p>
                  <p className="f-value num">{inr(barDash.data?.metrics?.averageTabValue ?? 0)}</p>
                </div>
              </div>

              {/* Table Status Grid */}
              <div className="panel" style={{ padding: 20, borderRadius: 16, marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Live Tables Status (T1 - T8)</h3>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {barDash.data?.metrics?.activeTables?.length ?? 0} / 8 Tables Occupied
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((tableNum) => {
                    const isOccupied = barDash.data?.metrics?.activeTables?.includes(tableNum);
                    return (
                      <div
                        key={tableNum}
                        style={{
                          padding: "12px 8px",
                          textAlign: "center",
                          borderRadius: 12,
                          background: isOccupied ? "#ecfdf5" : "#f8fafc",
                          border: isOccupied ? "2px solid #10b981" : "1px solid #e2e8f0",
                        }}
                      >
                        <div style={{ fontSize: 15, fontWeight: 800, color: isOccupied ? "#065f46" : "#64748b" }}>
                          Table {tableNum}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, color: isOccupied ? "#059669" : "#94a3b8" }}>
                          {isOccupied ? "🟢 OCCUPIED" : "⚪ AVAILABLE"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PRO SHOP DETAILED STATS */}
          {viewTab === "shop" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 20 }}>🛍️ Pro Shop Gear &amp; Inventory Analytics</h2>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Equipment turnover, real-time stock valuation, and counter sales.</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link className="btn btn-ink" href="/shop" style={{ padding: "8px 16px", fontSize: 13 }}>
                    🛍️ Open Shop Counter (POS)
                  </Link>
                  <button type="button" className="mini-link" onClick={() => setViewTab("overview")}>
                    ← Back to Overview
                  </button>
                </div>
              </div>

              {/* Period selector */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div className="seg" role="group" aria-label="Period">
                  {periods.map((p) => (
                    <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
                  ))}
                </div>
                <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
              </div>

              {/* Revenue Figures */}
              <div className="figures">
                <div className="figure total">
                  <p className="f-label">Gear Sales ({period.toUpperCase()})</p>
                  <p className="f-value num">
                    <NumberTicker value={shopDash.data?.revenue?.[period] ?? split?.shop ?? 0} />
                  </p>
                </div>
                <div className="figure">
                  <p className="f-label">Orders Placed Today</p>
                  <p className="f-value num">{shopDash.data?.metrics?.ordersCount ?? 0}</p>
                </div>
                <div className="figure">
                  <p className="f-label">Average Order Size</p>
                  <p className="f-value num">{inr(shopDash.data?.metrics?.averageOrderValue ?? 0)}</p>
                </div>
                <div className="figure">
                  <p className="f-label">Total Inventory Valuation</p>
                  <p className="f-value num">{inr(shopDash.data?.metrics?.inventoryTotalValuation ?? 0)}</p>
                </div>
              </div>

              {/* Low Stock Warning Banner */}
              {(shopDash.data?.inventorySummary?.lowStockItems?.length ?? 0) > 0 && (
                <div className="notice warn" role="status" style={{ marginTop: 18 }}>
                  ⚠️ Stock alerts ({shopDash.data?.inventorySummary?.lowStockCount} low, {shopDash.data?.inventorySummary?.outOfStockCount} out):{" "}
                  {shopDash.data?.inventorySummary?.lowStockItems?.map((p) => `${p.name} (${p.stock === 0 ? "OUT OF STOCK" : `${p.stock} left`})`).join(", ")}.
                </div>
              )}

              {/* Fulfilment Split */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 20 }}>
                <div className="panel" style={{ padding: 18, borderRadius: 16 }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Desk Pickup Orders</h3>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{shopDash.data?.metrics?.pickupCount ?? 0}</div>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>Collected directly at the clubhouse counter</p>
                </div>
                <div className="panel" style={{ padding: 18, borderRadius: 16 }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>Door Delivery Orders</h3>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{shopDash.data?.metrics?.deliveryCount ?? 0}</div>
                  <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>Delivered to members&apos; registered addresses</p>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CLUB OVERVIEW */}
          {viewTab === "overview" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                <div className="seg" role="group" aria-label="Period">
                  {periods.map((p) => (
                    <button key={p.code} aria-pressed={period === p.code} onClick={() => setPeriod(p.code)}>{p.label}</button>
                  ))}
                </div>
                <button className="btn btn-quiet" onClick={exportCsv}>Export CSV</button>
              </div>

              <div className="figures">
                {figures.map((f) => (
                  <div className={`figure${f.total ? " total" : ""}`} key={f.label}>
                    <p className="f-label">{f.label}</p>
                    <p className="f-value num"><NumberTicker value={f.value} /></p>
                  </div>
                ))}
              </div>

              {/* Executive Department Summary Cards for Bar and Shop */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, margin: "20px 0" }}>
                {/* Bar Executive Card */}
                <div className="panel" style={{ padding: 20, borderRadius: 16, borderLeft: "4px solid #10b981", background: "#fbfdfc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🍷</span>
                      <strong style={{ fontSize: 16 }}>Bar &amp; Cafeteria Live Stats</strong>
                    </div>
                    <button
                      type="button"
                      className="mini-link"
                      onClick={() => setViewTab("bar")}
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      Deep Stats →
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
                    <div style={{ padding: "8px 6px", background: "#f0fdf4", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Today Takings</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>{inr(barDash.data?.revenue?.today ?? split?.bar ?? 0)}</div>
                    </div>
                    <div style={{ padding: "8px 6px", background: "#f0fdf4", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Open Tabs</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>{barDash.data?.metrics?.openTabsCount ?? 0} ({inr(barDash.data?.metrics?.openTabsValue ?? 0)})</div>
                    </div>
                    <div style={{ padding: "8px 6px", background: "#f0fdf4", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Active Tables</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#166534" }}>{barDash.data?.metrics?.activeTables?.length ?? 0} / 8</div>
                    </div>
                  </div>
                </div>

                {/* Pro Shop Executive Card */}
                <div className="panel" style={{ padding: 20, borderRadius: 16, borderLeft: "4px solid #f59e0b", background: "#fdfdfb" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>🛍️</span>
                      <strong style={{ fontSize: 16 }}>Pro Shop Live Stats</strong>
                    </div>
                    <button
                      type="button"
                      className="mini-link"
                      onClick={() => setViewTab("shop")}
                      style={{ fontSize: 12, padding: "4px 10px" }}
                    >
                      Deep Stats →
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, textAlign: "center" }}>
                    <div style={{ padding: "8px 6px", background: "#fefce8", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Today Sales</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#854d0e" }}>{inr(shopDash.data?.revenue?.today ?? split?.shop ?? 0)}</div>
                    </div>
                    <div style={{ padding: "8px 6px", background: "#fefce8", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Orders Placed</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#854d0e" }}>{shopDash.data?.metrics?.ordersCount ?? 0}</div>
                    </div>
                    <div style={{ padding: "8px 6px", background: "#fefce8", borderRadius: 8 }}>
                      <div className="muted" style={{ fontSize: 11 }}>Inventory Value</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#854d0e" }}>{inr(shopDash.data?.metrics?.inventoryTotalValuation ?? 0)}</div>
                    </div>
                  </div>
                </div>
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
            </>
          )}

          {/* VIEW: STAFF & PAYROLL (Shown when on overview or staff tab) */}
          {(viewTab === "overview" || viewTab === "staff") && (
          <section className="block">
            <div className="sec-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2>Staff Team, Security PINs &amp; Direct Salary Payout</h2>
                <p className="sub" style={{ margin: "4px 0 0" }}>
                  Owner controls: Configure personal security PINs for each staff member by name, track their worked hours, and pay their salary directly via Demo Razorpay.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => {
                  setAddStaffError(null);
                  setShowAddStaffModal(true);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  background: "#163021",
                  color: "#dfff45",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                <span style={{ fontSize: 16 }}>➕</span>
                <span>Add Staff Member</span>
              </button>
            </div>

            {/* Notification / Toast Banner */}
            {staffBannerMsg && (
              <div
                className={`notice ${staffBannerMsg.ok ? "ok" : "err"}`}
                style={{ margin: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span>{staffBannerMsg.text}</span>
                <button
                  type="button"
                  onClick={() => setStaffBannerMsg(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            )}

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
                  if (roleFilter === "BAR") return s.role === "BAR";
                  if (roleFilter === "SHOP") return s.role === "SHOP";
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
                    BAR: "🍸",
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
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
                              {s.role !== "OWNER" && (
                                <button
                                  type="button"
                                  title={`Remove ${s.name} from staff roster`}
                                  onClick={() => setStaffToDelete(s)}
                                  style={{
                                    border: "1px solid #fee2e2",
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    fontSize: 11,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 3,
                                    fontWeight: 600,
                                  }}
                                >
                                  <span>🗑️</span>
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
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
                                padding: "10px 14px",
                                borderRadius: 12,
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
                              <span style={{ fontSize: 11, color: "#047857", fontWeight: 700 }}>{s.lastPaidAt ? s.lastPaidAt.slice(0, 10) : "Recent"}</span>
                            </div>
                          ) : (
                            <button
                              type="button"
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
                                minHeight: 44,
                                padding: "8px 14px",
                                background: "#0b1a30",
                                color: "#dfff45",
                                border: "1px solid #3395ff",
                                borderRadius: 12,
                                fontWeight: 700,
                                fontSize: 12.5,
                                textTransform: "none",
                                letterSpacing: "0.01em",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                cursor: isBusy || s.salaryDue <= 0 ? "not-allowed" : "pointer",
                                opacity: isBusy || s.salaryDue <= 0 ? 0.5 : 1,
                                transition: "all 0.15s ease",
                                boxShadow: "0 2px 8px rgba(11, 26, 48, 0.2)",
                              }}
                            >
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 14 }}>💳</span>
                                <span>Pay via Demo Razorpay</span>
                              </span>
                              <span
                                style={{
                                  background: "#dfff45",
                                  color: "#0b1a30",
                                  padding: "3px 8px",
                                  borderRadius: 6,
                                  fontWeight: 800,
                                  fontSize: 12,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {inr(s.salaryDue)}
                              </span>
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
        )}

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

          {/* Add Staff Modal */}
          {showAddStaffModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(11, 26, 48, 0.65)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !addStaffSubmitting) setShowAddStaffModal(false);
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 480,
                  background: "#ffffff",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg, #163021 0%, #0b1a30 100%)",
                    color: "#ffffff",
                    padding: "20px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#dfff45" }}>
                      ➕ Add New Staff Member
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
                      Create a club employee profile with role, wage rate, and security PIN
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={addStaffSubmitting}
                    onClick={() => setShowAddStaffModal(false)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "none",
                      color: "#fff",
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      fontSize: 16,
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleAddStaff} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
                  {addStaffError && (
                    <div className="notice err" style={{ margin: 0, padding: "8px 12px", fontSize: 13 }}>
                      {addStaffError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#163021", marginBottom: 6 }}>
                      Staff Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={newStaffForm.name}
                      onChange={(e) => setNewStaffForm((prev) => ({ ...prev, name: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#163021", marginBottom: 6 }}>
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@champions.club"
                      value={newStaffForm.email}
                      onChange={(e) => setNewStaffForm((prev) => ({ ...prev, email: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#163021", marginBottom: 6 }}>
                        Department Role *
                      </label>
                      <select
                        value={newStaffForm.role}
                        onChange={(e) => setNewStaffForm((prev) => ({ ...prev, role: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, background: "#fff" }}
                      >
                        <option value="FRONT_DESK">📋 Club Staff (Front Desk)</option>
                        <option value="BAR">🍸 Bar &amp; Cafeteria Staff</option>
                        <option value="SHOP">🛍️ Pro Shop Staff</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#163021", marginBottom: 6 }}>
                        Hourly Wage (₹/hr) *
                      </label>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        required
                        value={newStaffForm.hourlyRate}
                        onChange={(e) => setNewStaffForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#163021" }}>
                        Initial Security PIN (Optional)
                      </label>
                      <span style={{ fontSize: 11, color: "#64748b" }}>
                        Default: {newStaffForm.role === "BAR" ? "3333" : newStaffForm.role === "SHOP" ? "4444" : "2222"}
                      </span>
                    </div>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Leave blank for default, or 4-6 digits"
                      value={newStaffForm.pin}
                      onChange={(e) => setNewStaffForm((prev) => ({ ...prev, pin: e.target.value.replace(/\D/g, "") }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, letterSpacing: 2 }}
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={addStaffSubmitting}
                      onClick={() => setShowAddStaffModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-ink"
                      disabled={addStaffSubmitting}
                      style={{ background: "#163021", color: "#dfff45", fontWeight: 700 }}
                    >
                      {addStaffSubmitting ? "Creating Staff..." : "➕ Add Staff Member"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Staff Confirmation Modal */}
          {staffToDelete && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(11, 26, 48, 0.65)",
                backdropFilter: "blur(6px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget && !deleteSubmitting) setStaffToDelete(null);
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 440,
                  background: "#ffffff",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                  padding: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "#fee2e2",
                      color: "#b91c1c",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 22,
                    }}
                  >
                    🗑️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#163021" }}>
                      Remove Staff Member
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
                      Terminate employee access and roster assignment
                    </p>
                  </div>
                </div>

                <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.5, margin: "14px 0" }}>
                  Are you sure you want to remove <strong>{staffToDelete.name}</strong> ({staffToDelete.roleLabel})?
                </p>

                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#475569", marginBottom: 18 }}>
                  <div style={{ marginBottom: 4 }}>• Assigned shifts, shift work logs, and leave requests will be removed.</div>
                  <div>• Past payroll payout history is retained for financial audit and tax compliance.</div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={deleteSubmitting}
                    onClick={() => setStaffToDelete(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteSubmitting}
                    onClick={handleConfirmDeleteStaff}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: deleteSubmitting ? "not-allowed" : "pointer",
                      opacity: deleteSubmitting ? 0.6 : 1,
                    }}
                  >
                    {deleteSubmitting ? "Removing..." : "Yes, Remove Staff"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
