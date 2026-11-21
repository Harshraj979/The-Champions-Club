"use client";
<<<<<<< HEAD
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { Role } from "@/lib/rbac";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";
  const forbidden = searchParams.get("error") === "forbidden";
  const required = searchParams.get("required");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState(
    forbidden
      ? `Access denied. You need an account with ${required || "elevated"} permissions.`
      : ""
  );
  const [loading, setLoading] = useState(false);
  const { setAuth } = useStore();

  async function handleLogin(e?: React.FormEvent, creds?: { email: string; pass: string }) {
    if (e) e.preventDefault();
    const targetEmail = creds ? creds.email : email;
    const targetPass = creds ? creds.pass : password;

    if (!targetEmail.trim()) return setErr("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail.trim())) return setErr("Enter a valid email address.");
    if (!targetPass) return setErr("Password is required.");

    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      setAuth(data.token, data.user);
      router.push(from);
      router.refresh();
    } catch {
      setErr("Failed to connect to authentication service.");
      setLoading(false);
    }
  }

  function demoLogin(role: Role) {
    const creds = {
      customer: { email: "customer@club.com", pass: "password123" },
      employee: { email: "employee@club.com", pass: "password123" },
      owner: { email: "owner@club.com", pass: "password123" },
    }[role];
    setEmail(creds.email);
    setPassword(creds.pass);
    handleLogin(undefined, creds);
  }

  return (
    <main className="wrap page" style={{ maxWidth: 540 }}>
      <div className="page-head">
        <h1 className="page-title">Sign in</h1>
        <p className="sub">Access club tools, bookings, and owner analytics.</p>
      </div>

      {err && <div className="notice err" role="alert">{err}</div>}

      <form className="form-grid" onSubmit={(e) => handleLogin(e)}>
        <div>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. owner@club.com"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="auth-password">Password</label>
          <input
            id="auth-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>
        <button className="btn btn-ink" type="submit" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? "Authenticating..." : "Sign in"}
        </button>
      </form>

      <section className="block" style={{ paddingTop: 36 }}>
        <p className="muted" style={{ marginBottom: 12 }}>One-click demo accounts (preconfigured roles):</p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-quiet" type="button" onClick={() => demoLogin("customer")}>
            Customer (Aarav)
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => demoLogin("employee")}>
            Employee (Dev)
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => demoLogin("owner")}>
            Owner (Vikram)
          </button>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="wrap page"><p className="muted">Loading sign in...</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
=======
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";

// Staff sign-in. Owners and desk staff use email and password; the till
// uses the 4-digit PIN. Members never sign in: they book by name.
export default function Login() {
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr("");
    setBusy(true);
    try {
      if (mode === "password") await api.login(email.trim(), password);
      else await api.loginPin(pin);
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      window.location.href = next.startsWith("/") ? next : "/dashboard";
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="wrap page" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <h1 className="page-title">Staff sign-in</h1>
        <p className="sub">Dashboard, bookings, members and the bar till live behind this.</p>
      </div>

      <div className="seg" role="group" aria-label="Sign-in method" style={{ marginBottom: 20 }}>
        <button aria-pressed={mode === "password"} onClick={() => setMode("password")}>Email &amp; password</button>
        <button aria-pressed={mode === "pin"} onClick={() => setMode("pin")}>Till PIN</button>
      </div>

      <div className="form-grid">
        {mode === "password" ? (
          <>
            <div>
              <label htmlFor="l-email">Email</label>
              <input id="l-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label htmlFor="l-pass">Password</label>
              <input id="l-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="l-pin">4-digit PIN</label>
            <input
              id="l-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••"
            />
          </div>
        )}
        {err && <div className="notice err" role="alert">{err}</div>}
        <div>
          <button
            className="btn btn-ink"
            disabled={busy || (mode === "password" ? !email || !password : pin.length !== 4)}
            onClick={submit}
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}
>>>>>>> 7509cadebf15daa1026aa672220ccc99f6d7cfda
