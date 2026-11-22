"use client";
import { useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import ClubLogo from "@/components/ClubLogo";

type RoleOption = {
  id: "OWNER" | "FRONT_DESK" | "BAR" | "SHOP";
  label: string;
  category: "General" | "Bar & Café" | "Pro Shop";
  icon: string;
};

const ROLES: RoleOption[] = [
  { id: "OWNER", label: "Club Owner", category: "General", icon: "👑" },
  { id: "FRONT_DESK", label: "Club Staff", category: "General", icon: "📋" },
  { id: "BAR", label: "Bar & Cafeteria Staff", category: "Bar & Café", icon: "🍸" },
  { id: "SHOP", label: "Pro Shop Staff", category: "Pro Shop", icon: "🛍️" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleOption["id"]>("OWNER");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Only a same-site relative path is a safe place to land after
  // sign-in: it must start with "/" but not "//" (protocol-relative)
  // and must not contain "://".
  const safeNext = (n: string | null) =>
    n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://") ? n : null;

  function getRedirectUrl(role: string) {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (next) return next;
    if (role === "OWNER") return "/dashboard";
    if (role === "BAR" || role === "BAR_STAFF") return "/bar";
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

  const activeRoleObj = ROLES.find((r) => r.id === selectedRole) || ROLES[0];

  return (
    <main className="auth-page staff-auth-page">
      <aside className="auth-aside">
        <Link className="auth-aside-brand" href="/">
          <ClubLogo size={48} />
          <span>The Champions Club</span>
        </Link>
        <div className="auth-aside-copy">
          <p className="auth-eyebrow">Staff portal</p>
          <h2>Make every club day run smoothly.</h2>
          <p>Manage bookings, members, service, and the team—right where the game happens.</p>
        </div>
        <p className="auth-aside-foot">Courts open daily · 6 AM – 10 PM</p>
      </aside>

      <section className="auth-main">
        <div className="auth-content">
          <div className="auth-mobile-brand"><ClubLogo size={38} variant="light" /></div>
          <div className="auth-heading">
            <p className="auth-eyebrow">Welcome back</p>
            <h1>Staff sign in</h1>
            <p>Choose your role and enter your assigned PIN.</p>
          </div>

      <div className="panel login-card auth-card">
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
                {`${activeRoleObj.label} PIN`}
              </label>
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
              {busy
                ? "Authenticating..."
                : `Sign in as ${activeRoleObj.label}`}
            </button>
          </div>
        </form>
      </div>

      <p className="member-link auth-switch-link">
        A club member? <Link href="/member-login">Member sign in</Link>
      </p>
        </div>
      </section>
    </main>
  );
}
