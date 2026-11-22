"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import ClubLogo from "@/components/ClubLogo";
import type { StaffMemberPinDTO } from "@/lib/types";

type RoleOption = {
  id: "OWNER" | "FRONT_DESK" | "BAR" | "SHOP";
  label: string;
  category: "General" | "Bar & Café" | "Pro Shop";
  icon: string;
  defaultPin: string;
};

const ROLES: RoleOption[] = [
  { id: "OWNER", label: "Club Owner", category: "General", icon: "👑", defaultPin: "1234" },
  { id: "FRONT_DESK", label: "Club Staff", category: "General", icon: "📋", defaultPin: "2222" },
  { id: "BAR", label: "Bar & Cafeteria Staff", category: "Bar & Café", icon: "🍸", defaultPin: "3333" },
  { id: "SHOP", label: "Pro Shop Staff", category: "Pro Shop", icon: "🛍️", defaultPin: "4444" },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleOption["id"]>("OWNER");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleHref, setGoogleHref] = useState("/api/v1/auth/google");
  const [staffList, setStaffList] = useState<StaffMemberPinDTO[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);

  // Only a same-site relative path is a safe place to land after
  // sign-in: it must start with "/" but not "//" (protocol-relative)
  // and must not contain "://".
  const safeNext = (n: string | null) =>
    n && n.startsWith("/") && !n.startsWith("//") && !n.includes("://") ? n : null;

  useEffect(() => {
    api.staffProfiles().then((res) => {
      setStaffList(res.staff as any || []);
    }).catch(() => {});

    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "notstaff") setErr("That Google account is not a club account.");
    else if (q.get("error") === "gstate") setErr("Google session expired. Try signing in again.");
    else if (q.get("error") === "ginfo" || q.get("error") === "gemail") setErr("Could not retrieve verified email from Google.");
    else if (q.get("error") === "google") setErr("Google sign-in did not work. Try again, or use your PIN.");
    const next = safeNext(q.get("next"));
    if (next) setGoogleHref(`/api/v1/auth/google?next=${encodeURIComponent(next)}`);
  }, []);

  function getRedirectUrl(role: string) {
    const next = safeNext(new URLSearchParams(window.location.search).get("next"));
    if (next) return next;
    if (role === "OWNER") return "/dashboard";
    if (role === "BAR" || role === "BAR_STAFF") return "/bar";
    if (role === "SHOP" || role === "SHOP_STAFF") return "/shop";
    return "/bookings";
  }

  async function handlePinLogin(role: RoleOption["id"], enteredPin: string, staffId?: number | null) {
    setErr("");
    if (!enteredPin.trim()) {
      setErr("Please enter the PIN for " + (ROLES.find((r) => r.id === role)?.label || role));
      return;
    }
    setBusy(true);
    try {
      const { staff } = await api.pinLogin(role, enteredPin.trim(), staffId || undefined);
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

  const roleStaffMembers = staffList.filter((s) => {
    if (selectedRole === "FRONT_DESK") return s.role === "FRONT_DESK" || s.role === "STAFF";
    if (selectedRole === "BAR") return s.role === "BAR";
    if (selectedRole === "SHOP") return s.role === "SHOP";
    if (selectedRole === "OWNER") return s.role === "OWNER";
    return s.role === selectedRole;
  });

  const effectiveStaffId = selectedStaffId && roleStaffMembers.some((s) => s.id === selectedStaffId)
    ? selectedStaffId
    : roleStaffMembers[0]?.id || null;

  const activeStaffMember = roleStaffMembers.find((s) => s.id === effectiveStaffId);

  return (
    <main className="wrap page login-main" style={{ maxWidth: 460 }}>
      <div className="page-head" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <ClubLogo size={52} variant="light" />
        </div>
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

        {roleStaffMembers.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 6, color: "var(--pine)" }}>
              Staff Profile (Name)
            </label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {roleStaffMembers.map((s) => {
                const isSelected = effectiveStaffId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(s.id);
                      setPin("");
                      setErr("");
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: isSelected ? "2px solid #163021" : "1px solid var(--line)",
                      background: isSelected ? "#163021" : "var(--surface)",
                      color: isSelected ? "#dfff45" : "#163021",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>👤 {s.name}</span>
                    {s.hasCustomPin && (
                      <span style={{ fontSize: 9, opacity: 0.85 }}>(PIN Set)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handlePinLogin(selectedRole, pin, effectiveStaffId);
          }}
          className="form-grid"
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label htmlFor="l-pin" style={{ fontSize: 13, fontWeight: 600, color: "var(--pine)" }}>
                {activeStaffMember ? `${activeStaffMember.name}'s PIN` : `${activeRoleObj.label} PIN`}
              </label>
              <span style={{ fontSize: 12, color: "#666" }}>
                {activeStaffMember?.hasCustomPin ? (
                  <span style={{ color: "#166534", fontWeight: 700 }}>Custom PIN</span>
                ) : (
                  <>Default: <strong style={{ color: "var(--pine)" }}>{activeRoleObj.defaultPin}</strong></>
                )}
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
              {busy
                ? "Authenticating..."
                : activeStaffMember
                ? `Sign in as ${activeStaffMember.name}`
                : `Sign in as ${activeRoleObj.label}`}
            </button>
          </div>
        </form>

        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <a
            className="btn btn-google"
            href={googleHref}
            style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}
          >
            <span className="g-mark" aria-hidden="true" style={{ display: "inline-flex" }}>
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.2 35.3 44 30.1 44 24c0-1.3-.1-2.6-.4-3.9z" />
              </svg>
            </span>
            Sign in with Google
          </a>
        </div>

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
              className="btn btn-quiet"
              onClick={() => goDemo("arjun@champions.club", "demo1234")}
              disabled={busy}
              style={{ fontSize: 12, padding: "8px 6px" }}
            >
              🍸 BAR STAFF
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
        A club member? <Link href="/member/login">Member sign in</Link>
      </p>
    </main>
  );
}
