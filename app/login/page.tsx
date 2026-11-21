"use client";
<<<<<<< HEAD
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || searchParams.get("next") || "/";
=======
import { useState } from "react";
import { api, ApiClientError } from "@/lib/api";
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9

// Staff sign-in. Owners and desk staff use email and password; the till
// uses the 4-digit PIN. Members never sign in: they book by name.
export default function Login() {
  const [mode, setMode] = useState<"password" | "pin">("password");
  const [email, setEmail] = useState("");
<<<<<<< HEAD
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [hintOtp, setHintOtp] = useState<string | null>(null);

  async function handleSendOtp(targetEmail?: string) {
    const toSend = (targetEmail || email).trim().toLowerCase();
    if (!toSend) return setMsg({ ok: false, text: "Please enter your email address." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toSend)) return setMsg({ ok: false, text: "Enter a valid email address." });

    setLoading(true);
    setMsg(null);
    setHintOtp(null);
=======
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9

  async function submit() {
    setErr("");
    setBusy(true);
    try {
<<<<<<< HEAD
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: toSend,
        type: "sign-in",
      });

      if (res.error) {
        setMsg({ ok: false, text: res.error.message || "Failed to send verification code." });
        setLoading(false);
        return;
      }

      setStep("otp");
      setMsg({ ok: true, text: `Verification code sent to ${toSend} via Resend.` });

      // Dev helper for testing without live external mailbox
      try {
        const devRes = await fetch(`/api/auth/otp?email=${encodeURIComponent(toSend)}`);
        const devData = await devRes.json();
        if (devData.otp) setHintOtp(devData.otp);
      } catch {}
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "Failed to connect to authentication server." });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp) return setMsg({ ok: false, text: "Please enter the verification code." });

    setLoading(true);
    setMsg(null);

    try {
      const res = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: cleanOtp,
      });

      if (res.error) {
        setMsg({ ok: false, text: res.error.message || "Invalid or expired verification code." });
        setLoading(false);
        return;
      }

      router.push(from);
      router.refresh();
    } catch (err: any) {
      setMsg({ ok: false, text: err?.message || "Authentication failed." });
      setLoading(false);
    }
  }

  function pickDemo(demoEmail: string) {
    setEmail(demoEmail);
    handleSendOtp(demoEmail);
  }

=======
      if (mode === "password") await api.login(email.trim(), password);
      else await api.loginPin(pin);
      const next = new URLSearchParams(window.location.search).get("next") ?? "/dashboard";
      window.location.href = next.startsWith("/") ? next : "/dashboard";
    } catch (e) {
      setErr(e instanceof ApiClientError ? e.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

>>>>>>> 0e1cb56d75c2e2a4584b2e7f61144820b5b671c9
  return (
    <main className="wrap page" style={{ maxWidth: 440 }}>
      <div className="page-head">
        <span className="badge-mark">CC</span>
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
