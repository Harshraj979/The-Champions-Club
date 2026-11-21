"use client";
import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/api";

// Staff sign-in: email and password, or Google for staff accounts.
// Members never sign in, they book by name. The demo buttons sign in
// as each role's demo account in one tap.
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleHref, setGoogleHref] = useState("/api/v1/auth/google");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "notstaff") setErr("That Google account is not a staff account.");
    else if (q.get("error") === "google") setErr("Google sign-in did not work. Try again, or use your password.");
    const next = q.get("next");
    if (next) setGoogleHref(`/api/v1/auth/google?next=${encodeURIComponent(next)}`);
  }, []);

  async function go(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      const { staff } = await api.login(e, p);
      const next = new URLSearchParams(window.location.search).get("next");
      // Land each role on a page it can actually use; an explicit
      // "next" from a guarded page always wins.
      const home = staff.role === "OWNER" ? "/dashboard"
        : staff.role === "BAR" ? "/bar"
        : staff.role === "SHOP" ? "/shop"
        : "/bookings";
      window.location.href = next && next.startsWith("/") ? next : home;
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <span className="badge-mark">CC</span>
        <h1 className="page-title">Staff sign-in</h1>
        <p className="sub">Dashboard, bookings, members and the bar till live behind this.</p>
      </div>

      <a className="btn btn-google" href={googleHref}>
        <span className="g-mark">G</span> Continue with Google
      </a>
      <div className="or-row"><span>or</span></div>

      <div className="form-grid">
        <div>
          <label htmlFor="l-email">Email</label>
          <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label htmlFor="l-pass">Password</label>
          <input id="l-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {err && <div className="notice err" role="alert">{err}</div>}
        <div>
          <button className="btn btn-ink" disabled={busy || !email || !password} onClick={() => go(email.trim(), password)}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>

      <div className="demo-box">
        <p><strong>Demo accounts.</strong> One tap, no typing — each button signs you in as that role.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button className="btn btn-primary" onClick={() => go("owner@champions.club", "champions")} disabled={busy}>Owner</button>
          <button className="btn btn-quiet" onClick={() => go("neha@champions.club", "demo1234")} disabled={busy}>Front desk</button>
          <button className="btn btn-quiet" onClick={() => go("arjun@champions.club", "demo1234")} disabled={busy}>Bar</button>
          <button className="btn btn-quiet" onClick={() => go("meera@champions.club", "demo1234")} disabled={busy}>Shop</button>
        </div>
        <p className="demo-creds">owner@champions.club · champions — the rest use demo1234</p>
      </div>
    </main>
  );
}
