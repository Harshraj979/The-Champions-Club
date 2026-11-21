"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";

export default function MemberAuth() {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [planCode, setPlanCode] = useState("gold");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("tab") === "signup") setTab("signup");
    const p = q.get("plan");
    if (p && ["gold", "silver", "junior", "none"].includes(p)) {
      setPlanCode(p);
    }
  }, []);

  async function handleLogin(e?: React.FormEvent, customIdent?: string, customPass?: string) {
    if (e) e.preventDefault();
    setErr("");
    setBusy(true);
    const idVal = customIdent ?? identifier.trim();
    const passVal = customPass ?? password;
    try {
      await api.memberLogin({ identifier: idVal, password: passVal });
      const next = new URLSearchParams(window.location.search).get("next") ?? "/courts";
      window.location.href = next.startsWith("/") ? next : "/courts";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Sign-in failed. Check your details.");
      setBusy(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!name.trim()) return setErr("Please enter your name.");
    if (!email.trim() || !email.includes("@")) return setErr("Please enter a valid email address.");
    if (phone.replace(/\D/g, "").length < 10) return setErr("Please enter a 10-digit phone number.");
    if (password.length < 4) return setErr("Password should be at least 4 characters.");

    setBusy(true);
    try {
      await api.memberSignup({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        planCode: planCode === "none" ? undefined : planCode,
      });
      const next = new URLSearchParams(window.location.search).get("next") ?? "/courts";
      window.location.href = next.startsWith("/") ? next : "/courts";
    } catch (ex) {
      setErr(ex instanceof ApiClientError ? ex.message : "Registration failed. Try again.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[500px] px-5 py-12 sm:py-20">
      <div className="mb-3 flex items-center gap-3">
        <span className="h-px w-8 bg-[#163021]" />
        <span className="text-[10px] font-bold uppercase tracking-[.25em] text-[#163021]">
          Member Portal
        </span>
      </div>
      <h1 className="font-display text-5xl font-bold uppercase tracking-tight text-[#163021] sm:text-6xl">
        {tab === "login" ? "Member sign-in" : "Join the club"}
      </h1>
      <p className="mt-3 text-sm text-[#617065] leading-relaxed">
        {tab === "login"
          ? "Log in to check live turf availability, manage your bookings, and access member rates."
          : "Create your membership account to reserve courts, get gear discounts, and play."}
      </p>

      <div className="mt-8 rounded-3xl border border-[#163021]/15 bg-white p-6 shadow-sm sm:p-8">
        <div className="seg mb-6 flex w-full" role="group" aria-label="Sign-in or register">
          <button
            type="button"
            className="flex-1 text-xs uppercase tracking-wider"
            aria-pressed={tab === "login"}
            onClick={() => { setTab("login"); setErr(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className="flex-1 text-xs uppercase tracking-wider"
            aria-pressed={tab === "signup"}
            onClick={() => { setTab("signup"); setErr(""); }}
          >
            Create Account
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="form-grid">
            <div>
              <label htmlFor="m-ident" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Email or phone number
              </label>
              <input
                id="m-ident"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                placeholder="aarav@example.com or 9811000001"
                required
              />
            </div>
            <div>
              <label htmlFor="m-pass" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Password
              </label>
              <input
                id="m-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </div>

            {err && <div className="notice err" role="alert">{err}</div>}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-full bg-[#dfff45] py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-[#163021] hover:text-white disabled:opacity-40"
                disabled={busy || !identifier || !password}
              >
                {busy ? "Signing in..." : "Sign in as Member"}
              </button>
            </div>

            <div className="mt-6 pt-5 border-t border-[#163021]/10 text-center">
              <p className="text-xs text-[#617065] font-semibold">Test with a demo member account:</p>
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-full border border-[#163021]/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#163021] hover:bg-[#dfff45] transition text-left flex justify-between items-center"
                  onClick={() => handleLogin(undefined, "aarav@example.com", "demo1234")}
                >
                  <span>⚡ Aarav Mehta</span>
                  <span className="text-[10px] text-[#2e7d32]">Active Gold Plan</span>
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[#163021]/15 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#163021] hover:bg-[#dfff45] transition text-left flex justify-between items-center"
                  onClick={() => handleLogin(undefined, "rahul@example.com", "demo1234")}
                >
                  <span>⚡ Rahul Verma</span>
                  <span className="text-[10px] text-[#b45309]">No Plan Yet (Free)</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="form-grid">
            <div>
              <label htmlFor="reg-name" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Full Name
              </label>
              <input
                id="reg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rohan Patel"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-email" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rohan@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-phone" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                10-Digit Phone
              </label>
              <input
                id="reg-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                required
              />
            </div>
            <div>
              <label htmlFor="reg-pass" className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Create Password
              </label>
              <input
                id="reg-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 4 characters"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#163021]">
                Choose Membership Tier
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { code: "gold", name: "Gold Plan", perk: "₹300/hr tennis" },
                  { code: "silver", name: "Silver Plan", perk: "₹400/hr tennis" },
                  { code: "junior", name: "Junior Plan", perk: "Under 18" },
                  { code: "none", name: "Decide Later", perk: "No plan initially" },
                ].map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setPlanCode(p.code)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      planCode === p.code
                        ? "border-[#163021] bg-[#163021] text-white"
                        : "border-[#163021]/15 bg-white text-[#163021] hover:border-[#163021]"
                    }`}
                  >
                    <p className="font-bold text-xs uppercase">{p.name}</p>
                    <p className={`text-[10px] mt-0.5 ${planCode === p.code ? "text-[#dfff45]" : "text-[#617065]"}`}>
                      {p.perk}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {err && <div className="notice err" role="alert">{err}</div>}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-full bg-[#dfff45] py-4 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-[#163021] hover:text-white disabled:opacity-40"
                disabled={busy}
              >
                {busy ? "Creating account..." : "Join Champions Club"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-[#617065]">
        Club staff or till operator?{" "}
        <Link href="/login" className="font-semibold text-[#163021] underline hover:text-black">
          Staff sign-in here
        </Link>
      </div>
    </main>
  );
}
