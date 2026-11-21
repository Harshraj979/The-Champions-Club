"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import ClubLogo from "@/components/ClubLogo";

// Member sign-in: Email and password, or Google Auth.
export default function MemberLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleHref, setGoogleHref] = useState("/api/v1/auth/google?type=member");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("error") === "google") {
      setErr("Google sign-in could not be completed. Try again or use email & password.");
    } else if (q.get("error") === "gtoken") {
      setErr("Google authorization token exchange failed. Please try again.");
    }
    const next = q.get("next");
    if (next) {
      setGoogleHref(`/api/v1/auth/google?type=member&next=${encodeURIComponent(next)}`);
    }
  }, []);

  async function go(e: string, p: string) {
    setErr("");
    setBusy(true);
    try {
      await api.memberLogin(e, p);
      window.location.href = "/member";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  async function handleGoogleDemo(googleEmail: string, name: string) {
    setErr("");
    setBusy(true);
    try {
      await api.googleDemoLogin({ email: googleEmail, name });
      const next = new URLSearchParams(window.location.search).get("next") ?? "/member";
      window.location.href = next.startsWith("/") ? next : "/member";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Google sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page login-main" style={{ maxWidth: 460 }}>
      <div className="page-head" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <ClubLogo size={52} variant="light" />
        </div>
        <h1 className="page-title">Member sign in</h1>
        <p className="sub">Your plan, bookings and orders in one place.</p>
      </div>

      <div className="panel login-card">
        {/* Google Sign-in */}
        <a className="btn btn-google" href={googleHref} style={{ marginBottom: 4 }}>
          <span className="g-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
            </svg>
          </span>
          Continue with Google
        </a>

        <div className="or-row"><span>or sign in with email</span></div>

        <div className="form-grid">
          <div>
            <label htmlFor="ml-email">Email or phone</label>
            <input id="ml-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="ml-pass">Password</label>
            <input id="ml-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
          </div>
          {err && <div className="notice err" role="alert">{err}</div>}
          <div>
            <button className="btn btn-ink" disabled={busy || !email || !password} onClick={() => go(email.trim(), password)}>
              {busy ? "Signing in..." : "Sign in as Member"}
            </button>
          </div>
        </div>

        <div className="demo-box" style={{ marginTop: 20 }}>
          <p><strong>Instant Google Auth Demo</strong> — one tap simulation:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-quiet"
              style={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}
              disabled={busy}
              onClick={() => handleGoogleDemo("tanish.sarkar@gmail.com", "Tanish Sarkar")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚡</span> Tanish Sarkar
              </span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>tanish.sarkar@gmail.com</span>
            </button>
            <button
              className="btn btn-quiet"
              style={{ width: "100%", justifyContent: "space-between", display: "flex", alignItems: "center" }}
              disabled={busy}
              onClick={() => handleGoogleDemo("aarav.mehta@gmail.com", "Aarav Mehta")}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>⚡</span> Aarav Mehta (Gold)
              </span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>aarav.mehta@gmail.com</span>
            </button>
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: "center", fontSize: 13, borderTop: "1px solid var(--line-soft)", paddingTop: 14 }}>
          Don&apos;t have an account?{" "}
          <Link href="/member-login?tab=signup" style={{ color: "var(--pine)", fontWeight: 700 }}>
            Join the Club / Sign up
          </Link>
        </div>
      </div>

      <p className="member-link">
        Club staff? <Link href="/login">Staff sign in</Link>
      </p>
    </main>
  );
}
