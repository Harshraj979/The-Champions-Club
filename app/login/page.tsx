"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
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

    try {
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

  return (
    <main className="wrap page" style={{ maxWidth: 520 }}>
      <div className="page-head">
        <h1 className="page-title">Sign in with OTP</h1>
        <p className="sub">Passwordless email verification powered by Resend &amp; Better Auth.</p>
      </div>

      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

      {step === "email" ? (
        <form className="form-grid" onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}>
          <div>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@club.com or owner@club.com"
              autoComplete="email"
              required
            />
          </div>
          <button className="btn btn-ink" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? "Sending code..." : "Send verification code"}
          </button>
        </form>
      ) : (
        <form className="form-grid" onSubmit={handleVerifyOtp}>
          <div>
            <label htmlFor="auth-otp">Verification code (OTP)</label>
            <input
              id="auth-otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit code"
              autoComplete="one-time-code"
              maxLength={10}
              required
            />
          </div>

          {hintOtp && (
            <div style={{ background: "#f3e7de", padding: "10px 14px", borderRadius: "6px", fontSize: "13.5px" }}>
              <span>Dev mode code: <strong>{hintOtp}</strong></span>
              <button
                type="button"
                className="text-link"
                style={{ marginLeft: "12px" }}
                onClick={() => setOtp(hintOtp)}
              >
                Use this code
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: 8 }}>
            <button className="btn btn-ink" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify &amp; Sign in"}
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              disabled={loading}
              onClick={() => { setStep("email"); setOtp(""); }}
            >
              Change email
            </button>
          </div>
        </form>
      )}

      <section className="block" style={{ paddingTop: 36 }}>
        <p className="muted" style={{ marginBottom: 12 }}>One-click demo sign-ins (sends OTP instantly):</p>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button className="btn btn-quiet" type="button" onClick={() => pickDemo("customer@club.com")}>
            Customer (Aarav)
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => pickDemo("employee@club.com")}>
            Employee (Staff)
          </button>
          <button className="btn btn-quiet" type="button" onClick={() => pickDemo("owner@club.com")}>
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
