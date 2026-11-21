"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";

type RoleOption = {
  id: "OWNER" | "FRONT_DESK" | "BAR_OWNER" | "BAR" | "SHOP_OWNER" | "SHOP";
  label: string;
  category: "General" | "Bar & Café" | "Pro Shop";
  icon: string;
  defaultPin: string;
};

const ROLES: RoleOption[] = [
  { id: "OWNER", label: "Club Owner", category: "General", icon: "👑", defaultPin: "1234" },
  { id: "FRONT_DESK", label: "Club Staff", category: "General", icon: "📋", defaultPin: "2222" },
  { id: "BAR_OWNER", label: "Bar Owner", category: "Bar & Café", icon: "🍷", defaultPin: "3001" },
  { id: "BAR", label: "Bar Staff", category: "Bar & Café", icon: "🍸", defaultPin: "3333" },
  { id: "SHOP_OWNER", label: "Shop Owner", category: "Pro Shop", icon: "🏷️", defaultPin: "4001" },
  { id: "SHOP", label: "Shop Staff", category: "Pro Shop", icon: "🛍️", defaultPin: "4444" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleOption["id"]>("OWNER");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function getRedirectUrl(role: string) {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/")) return next;
    if (role === "OWNER") return "/dashboard";
    if (role === "BAR_OWNER") return "/bar/dashboard";
    if (role === "BAR" || role === "BAR_STAFF") return "/bar";
    if (role === "SHOP_OWNER") return "/shop/dashboard";
    if (role === "SHOP" || role === "SHOP_STAFF") return "/shop";
    return "/bookings";
  }

  async function handlePinLogin(role: RoleOption["id"], enteredPin: string) {
    setErr("");
    if (!enteredPin.trim()) {
      setErr("Please enter the PIN for " + (ROLES.find((r) => r.id === role)?.label || role));
      return;
    }
    setBusy(true);
    try {
      const { staff } = await api.pinLogin(role, enteredPin.trim());
      window.location.href = getRedirectUrl(staff.role);
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Incorrect PIN. Try again.");
      setBusy(false);
    }
  }

  async function goDemo(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      const { staff } = await api.login(e, p);
      window.location.href = getRedirectUrl(staff.role);
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Demo sign-in failed. Try again.");
      setBusy(false);
    }
  }

  const activeRoleObj = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  return (
    <main className="wrap page login-main" style={{ maxWidth: 460 }}>
      <div className="page-head" style={{ textAlign: "center" }}>
        <span className="badge-mark" style={{ margin: "0 auto 16px" }}>CC</span>
        <h1 className="page-title">Sign in</h1>
        <p className="sub">Staff & owner access via secure role PIN.</p>
      </div>

      <div className="panel login-card" style={{ padding: "24px 20px" }}>
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--pine)" }}>
            Select your role
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map((r) => {
              const active = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(r.id);
                    setPin("");
                    setErr("");
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: active ? "2px solid #163021" : "1px solid var(--line)",
                    background: active ? "#dfff45" : "var(--surface)",
                    color: "#163021",
                    fontWeight: active ? 700 : 500,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{r.icon}</span>
                  <div>
                    <span style={{ display: "block", lineHeight: 1.2 }}>{r.label}</span>
                    <span style={{ fontSize: 10, color: "#555" }}>{r.category}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinLogin(selectedRole, pin);
          }}
          className="form-grid"
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label htmlFor="l-pin" style={{ fontSize: 13, fontWeight: 600, color: "var(--pine)" }}>
                {activeRoleObj.label} PIN
              </label>
              <span style={{ fontSize: 12, color: "#666" }}>
                Default: <strong style={{ color: "var(--pine)" }}>{activeRoleObj.defaultPin}</strong>
              </span>
            </div>
            <input
              id="l-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              placeholder="••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              autoFocus
              style={{
                fontSize: 22,
                letterSpacing: 6,
                textAlign: "center",
                fontWeight: 700,
              }}
            />
          </div>

          {err && <div className="notice err" role="alert">{err}</div>}

          <div>
            <button
              type="submit"
              className="btn btn-ink"
              disabled={busy || pin.length < 4}
              style={{ width: "100%", justifyContent: "center", minHeight: 46, fontSize: 15 }}
            >
              {busy ? "Authenticating..." : `Sign in as ${activeRoleObj.label}`}
            </button>
          </div>
        </form>

        <div className="demo-box" style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: "#444" }}>
            <strong>Demo accounts</strong> — one tap each.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => goDemo("owner@champions.club", "champions")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              👑 CLUB OWNER
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => goDemo("neha@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              📋 CLUB STAFF
            </button>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => goDemo("barowner@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              🍷 BAR OWNER
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => goDemo("arjun@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              🍸 BAR STAFF
            </button>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => goDemo("shopowner@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              🏷️ SHOP OWNER
            </button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => goDemo("meera@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              🛍️ SHOP STAFF
            </button>
          </div>
          <p className="demo-creds" style={{ fontSize: 11, color: "#777", marginTop: 8 }}>
            One-tap bypass for instant testing & evaluation
          </p>
        </div>
      </div>

      <p className="member-link" style={{ textAlign: "center", marginTop: 20 }}>
        A club member? <a href="/member/login">Member sign in</a>
      </p>
    </main>
  );
}
