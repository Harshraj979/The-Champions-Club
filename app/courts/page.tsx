"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { addDaysISO, allStarts, fmtTime, inr, istMinutesNow, todayISO } from "@/lib/format";
import { Loading, ErrorBox } from "@/components/States";
import type { MemberSessionDTO, StaffDTO } from "@/lib/types";

const starts = allStarts();

export default function Courts() {
  const today = todayISO();
  const [courtId, setCourtId] = useState<number | null>(null);
  const [social, setSocial] = useState(false);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [staffAvailPlan, setStaffAvailPlan] = useState<string>("none");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [buyingPlan, setBuyingPlan] = useState(false);

  const courts = useApi(() => api.courts());
  const plans = useApi(() => api.plans());
  const avail = useApi(() => (courtId === null ? Promise.resolve({ taken: [] }) : api.availability(courtId, date)), [courtId, date]);
  const [staff, setStaff] = useState<StaffDTO | null>(null);
  const [member, setMember] = useState<MemberSessionDTO | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  async function refreshAuth() {
    try {
      const [sRes, mRes] = await Promise.allSettled([api.me(), api.memberMe()]);
      if (sRes.status === "fulfilled" && sRes.value.staff) setStaff(sRes.value.staff);
      else setStaff(null);

      if (mRes.status === "fulfilled" && mRes.value.member) {
        setMember(mRes.value.member);
        setName(mRes.value.member.name);
      } else {
        setMember(null);
      }
    } finally {
      setAuthChecked(true);
    }
  }

  useEffect(() => {
    refreshAuth();
  }, []);

  const lookup = useApi(
    () => (!member && name.trim().length >= 3 ? api.lookupMember(name.trim()) : Promise.resolve({ member: null })),
    [name, member],
  );
  const lookedUpMember = lookup.data?.member ?? null;

  // Default to the first court that actually loaded, not a hard-coded id.
  useEffect(() => {
    if (courtId === null && courts.data && courts.data.length > 0) setCourtId(courts.data[0].id);
  }, [courts.data, courtId]);

  // Friday Social Play: many members share one court on Fridays.
  const isFriday = new Date(`${date}T00:00:00.000Z`).getUTCDay() === 5;
  const todays = useApi(() => api.bookings(date), [date]);

  const court = courts.data?.find((c) => c.id === courtId);
  const isStaff = !!staff && (staff.role === "OWNER" || staff.role === "FRONT_DESK" || staff.role === "STAFF");
  const isMemberActive = (!!member && (member.state === "active" || member.state === "expiring") && !!member.plan) || (!!lookedUpMember && lookedUpMember.state === "active");
  const canBook = isStaff || isMemberActive;

  // A booking runs a full hour, so it blocks starts within 60 mins
  const taken = avail.data?.taken ?? [];
  const free = (t: number) =>
    !taken.some((b: any) => {
      const bStart = typeof b === "number" ? b : b.start;
      const bType = typeof b === "object" && b ? b.type : "REGULAR";
      return Math.abs(bStart - t) < 60 && (social || bType !== "FRIDAY_SOCIAL");
    }) &&
    (date !== today || t + 60 > istMinutesNow());

  const memberPrice =
    court
      ? court.sport === "Cricket"
        ? (member?.plan?.cricketPrice ?? lookedUpMember?.cricketPrice ?? null)
        : (member?.plan?.tennisPrice ?? lookedUpMember?.tennisPrice ?? null)
      : null;

  const price =
    slot === null || !court
      ? null
      : isMemberActive && memberPrice !== null
      ? memberPrice
      : court.walkinPrice;

  const todaysCount =
    (member?.name || name.trim().length >= 3)
      ? (todays.data ?? []).filter(
          (b) =>
            b.date === date &&
            b.state === "BOOKED" &&
            b.type === "REGULAR" &&
            b.who.toLowerCase() === (member?.name ?? name.trim()).toLowerCase(),
        ).length
      : 0;

  useEffect(() => {
    setSlot(null);
    setSocial(false);
  }, [courtId, date]);

  async function book() {
    const bookerName = member?.name ?? name.trim();
    if (slot === null || !bookerName || !court || courtId === null) return;
    setBusy(true);
    setMsg(null);
    try {
      if (social) {
        const res = await fetch("/api/v1/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courtId, date, start: slot, name: bookerName, type: "FRIDAY_SOCIAL" }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string; price?: number } | null;
        if (!res.ok) throw new Error(data?.error ?? "Booking failed. Try again.");
        setMsg({
          ok: true,
          text: `Friday Social Play booked. ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)} — shared court, does not count toward daily limit${data?.price ? `, ${inr(data.price)} at the desk` : ", covered by your plan"}.`,
        });
      } else {
        if (isStaff && staffAvailPlan !== "none" && email.trim()) {
          await api.availMembership({
            email: email.trim(),
            name: name.trim() || undefined,
            phone: phone.trim() || undefined,
            planCode: staffAvailPlan,
          });
        }
        const b = await api.createBooking({
          courtId,
          date,
          start: slot,
          name: bookerName,
          email: isStaff ? (email.trim() || undefined) : undefined,
          phone: member?.phone ?? (phone.trim() || undefined),
          type: "REGULAR",
        });
        setMsg({
          ok: true,
          text: `Court booked! ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)}${
            b.price
              ? `, ${inr(b.price)} at the desk`
              : ", covered by plan"
          }.${
            isStaff && email.trim()
              ? ` Linked to ${email.trim()} — the customer can sign in with this email to view bookings & active membership.`
              : ""
          }`,
        });
      }
      setSlot(null);
      void avail.reload();
      void todays.reload();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof ApiClientError || e instanceof Error ? e.message : "Booking failed. Try again." });
      void avail.reload();
    } finally {
      setBusy(false);
    }
  }

  // A plan is only granted after a real Razorpay payment: the server
  // returns an order, the real checkout runs, and the signed proof is
  // confirmed with a second call. A dismissed checkout activates nothing.
  async function executeBuyPlan(planCode: string) {
    setBuyingPlan(true);
    setMsg(null);
    try {
      const first = (await api.buyPlan(planCode)) as unknown as
        | { ok: boolean; member: unknown }
        | { razorpayOrderId: string; amount: number };
      if (!("ok" in first)) {
        const cfg = await api.payConfig();
        if (!cfg.keyId) throw new Error("Online payment isn't switched on yet — ask the front desk.");
        const proof = await api.openRazorpayCheckout({
          keyId: cfg.keyId,
          orderId: first.razorpayOrderId,
          amount: first.amount,
          description: `${planCode} membership`,
        });
        if (!proof) {
          setMsg({ ok: false, text: "Payment not completed — your plan was not activated." });
          return;
        }
        await api.buyPlan(planCode, proof);
      }
      await refreshAuth();
      setMsg({ ok: true, text: "Plan activated! You can now pick a slot and book your court directly." });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Failed to activate plan" });
    } finally {
      setBuyingPlan(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mb-8 max-w-2xl">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px w-8 bg-[#163021]" />
          <span className="text-[10px] font-bold uppercase tracking-[.25em] text-[#163021]">
            Championship Courts &amp; Turf
          </span>
        </div>
        <h1 className="font-display text-5xl font-bold uppercase tracking-tight text-[#163021] sm:text-6xl">
          Court availability
        </h1>
        <p className="mt-3 text-sm text-[#617065] sm:text-base leading-relaxed">
          Real-time court and turf schedule. Active club members book directly at special member rates.
          Visitors can view availability here; booking is for members, or at the front desk.
        </p>
      </div>

      {authChecked && (
        <div className="mb-8 rounded-2xl border border-[#163021]/15 bg-white p-5 shadow-sm">
          {!member && !staff ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-sm text-[#163021]">Are you a club member?</p>
                <p className="text-xs text-[#617065]">
                  Sign in to your member account to unlock direct court bookings and plan rates.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href="/member-login?next=/courts"
                  className="rounded-full bg-[#163021] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-[#dfff45] hover:text-[#163021]"
                >
                  Member Sign In
                </Link>
                <Link
                  href="/member-login?tab=signup&next=/courts"
                  className="rounded-full bg-[#dfff45] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#163021] transition hover:bg-white border border-[#163021]/20"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          ) : member ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#163021]">Signed in as {member.name}</span>
                  {isMemberActive ? (
                    <span className="rounded-full bg-[#2e7d32]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#2e7d32]">
                      {member.plan?.name} Member
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#b45309]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#b45309]">
                      {member.state === "expired" ? "Membership Expired" : "No Active Membership"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#617065] mt-1">
                  {isMemberActive
                    ? `Your membership is active with special rates (${member.expiresOn ? `valid until ${member.expiresOn}` : ""}).`
                    : "You need an active plan to reserve court slots."}
                </p>
              </div>
              <button
                onClick={async () => {
                  await api.memberLogout();
                  window.location.reload();
                }}
                className="text-xs text-[#617065] hover:text-[#163021] underline"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#163021]">Staff Mode: {staff?.name} ({staff?.role})</span>
              <span className="text-[10px] uppercase text-[#2e7d32] font-semibold">Front Desk Booking Active</span>
            </div>
          )}
        </div>
      )}

      {courts.loading ? (
        <Loading rows={2} />
      ) : courts.error ? (
        <ErrorBox message={courts.error} onRetry={courts.reload} />
      ) : (
        <div className="panel panel-main">
          <div className="step">
            <div className="step-head">
              <span className="step-n">1</span>
              <h3>Pick a court / turf</h3>
              <span className="step-hint">Walk-in rate shown; member rates apply on sign-in</span>
            </div>
            <div className="seg" role="group" aria-label="Court">
              {courts.data!.map((c) => (
                <button key={c.id} aria-pressed={courtId === c.id} onClick={() => setCourtId(c.id)}>
                  <span>{c.name}</span>
                  <span className="num seg-price">{inr(c.walkinPrice)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="step">
            <div className="step-head">
              <span className="step-n">2</span>
              <h3>Date and time</h3>
              <span className="step-hint">
                60-minute slots (at most 2 bookings a day, every plan); crossed-out slots are taken
              </span>
            </div>
            <div style={{ maxWidth: 300 }}>
              <label htmlFor="date">Date</label>
              <input id="date" type="date" value={date} min={today} max={addDaysISO(today, 30)} onChange={(e) => setDate(e.target.value)} />
            </div>
            {isFriday && (
              <div style={{ marginTop: 14 }}>
                <button className="btn btn-quiet" aria-pressed={social} onClick={() => setSocial(!social)}>
                  {social ? "Friday Social Play on — shared court" : "Friday Social Play — share the court"}
                </button>
                <p className="muted" style={{ marginTop: 6, maxWidth: 520 }}>
                  Fridays only: many members share one court, and social play does not count toward the 2-a-day limit.
                </p>
              </div>
            )}
            {avail.loading ? (
              <div style={{ marginTop: 12 }}><Loading rows={3} /></div>
            ) : avail.error ? (
              <ErrorBox message={avail.error} onRetry={avail.reload} />
            ) : (
              <div className="slots" role="group" aria-label="Start times">
                {starts.map((t) => (
                  <button key={t} className={`slot num${date === today && t + 60 <= istMinutesNow() ? " past" : ""}`} disabled={!free(t)} aria-pressed={slot === t} onClick={() => setSlot(t)}>
                    {fmtTime(t)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="step">
            <div className="step-head">
              <span className="step-n">3</span>
              <h3>Confirmation &amp; Booking</h3>
              <span className="step-hint">
                {isMemberActive ? "Member rate applied" : "Active membership required"}
              </span>
            </div>

            {/* Gating check */}
            {!authChecked ? null : !member && !staff ? (
              <div className="rounded-2xl border border-[#163021]/15 bg-[#fbf9f4] p-6 text-center">
                <p className="font-display text-2xl font-bold uppercase text-[#163021]">Member Login Required</p>
                <p className="mt-2 text-xs text-[#617065] max-w-md mx-auto leading-relaxed">
                  To book courts, please sign in to your member account or register. If you are new, you can also book a one-time free session.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/member-login?next=/courts"
                    className="rounded-full bg-[#163021] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#dfff45] hover:text-[#163021] transition"
                  >
                    Member Sign In
                  </Link>
                  <Link
                    href="/member-login?tab=signup&next=/courts"
                    className="rounded-full bg-[#dfff45] px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#163021] hover:bg-white transition border border-[#163021]/20"
                  >
                    Create Account
                  </Link>
                  <Link
                    href="/trial"
                    className="rounded-full border border-[#163021]/25 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#163021] hover:bg-white transition"
                  >
                    Book a Free Trial
                  </Link>
                </div>
              </div>
            ) : member && !isMemberActive ? (
              <div className="rounded-2xl border border-[#b45309]/30 bg-[#fffdfa] p-6">
                <div className="flex items-center gap-2 text-[#b45309]">
                  <span className="font-bold text-sm uppercase tracking-wider">⚡ Membership Plan Required</span>
                </div>
                <p className="mt-2 text-xs text-[#617065] leading-relaxed">
                  Hi <strong>{member.name}</strong>, your account does not have an active membership plan. You need an active membership to reserve club courts. Select a plan below — payment is taken securely online before it activates:
                </p>

                {plans.loading ? (
                  <p className="muted" style={{ marginTop: 16 }}>Loading plans…</p>
                ) : plans.error || !plans.data?.length ? (
                  <p className="muted" style={{ marginTop: 16 }}>
                    Membership prices are live from the club —{" "}
                    <Link className="text-link" href="/plans">see the current plans</Link>.
                  </p>
                ) : (
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  {plans.data.map((p) => {
                    const fee = (p as any).fee as number | undefined;
                    return (
                      <div key={p.code} className="rounded-xl border p-4 flex flex-col justify-between border-[#163021]/15 bg-white shadow-sm">
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="font-display text-xl font-bold uppercase text-[#163021]">{p.name}</p>
                            {fee && <span className="text-xs font-bold text-[#163021] bg-[#163021]/10 px-2 py-0.5 rounded-full">{inr(fee)}</span>}
                          </div>
                          <p className="text-xs font-semibold text-[#163021] mt-1.5">Tennis {inr(p.tennisPrice)}/hr · Cricket {inr(p.cricketPrice)}/hr</p>
                          <p className="text-[11px] text-[#617065] mt-1">{p.shopDiscount}% shop · {p.barDiscount}% bar · {p.termDays} days</p>
                          {!fee && <p className="text-[11px] text-[#617065] mt-1">From {inr(Math.min(p.tennisPrice, p.cricketPrice))} a session</p>}
                        </div>
                        <button
                          onClick={() => void executeBuyPlan(p.code)}
                          disabled={buyingPlan}
                          className="mt-4 w-full rounded-full bg-[#dfff45] py-2.5 text-xs font-bold uppercase tracking-wider text-[#163021] hover:bg-[#163021] hover:text-white transition disabled:opacity-40"
                        >
                          {buyingPlan ? "Activating..." : `Activate ${p.name}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
                )}
              </div>
            ) : (
              <div>
                {member ? (
                  <div className="mb-4 text-sm text-[#163021]">
                    Booking as <strong>{member.name}</strong> ({member.plan?.name} Member).
                  </div>
                ) : isStaff ? (
                  <div className="mb-5 rounded-2xl border border-[#163021]/15 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#163021] mb-3">
                      Front Desk Booking &amp; Member Account Sync
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="staff-name" className="text-xs font-semibold text-[#163021]">
                          Customer / Member Name *
                        </label>
                        <input
                          id="staff-name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-email" className="text-xs font-semibold text-[#163021]">
                          Customer Email (Syncs to Member Dashboard)
                        </label>
                        <input
                          id="staff-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rahul@example.com"
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-phone" className="text-xs font-semibold text-[#163021]">
                          Phone Number (Initial password for login)
                        </label>
                        <input
                          id="staff-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9811000001"
                        />
                      </div>
                      <div>
                        <label htmlFor="staff-plan" className="text-xs font-semibold text-[#163021]">
                          Avail Membership Plan (Optional)
                        </label>
                        <select
                          id="staff-plan"
                          value={staffAvailPlan}
                          onChange={(e) => setStaffAvailPlan(e.target.value)}
                        >
                          <option value="none">None (Regular Walk-in rate)</option>
                          {(plans.data ?? []).map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name} — Tennis {inr(p.tennisPrice)}/hr · Cricket {inr(p.cricketPrice)}/hr
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#617065] mt-2">
                      💡 When booked with an email, the customer can later log in using that email to view this booking and active membership in their portal.
                    </p>
                  </div>
                ) : (
                  <div style={{ maxWidth: 420 }}>
                    <label htmlFor="name">Your name</label>
                    <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Members: your registered name" />
                  </div>
                )}
                {lookedUpMember && (
                  <p className={`member-strip${lookedUpMember.state === "expired" ? " warn" : ""}`} role="status">
                    {lookedUpMember.state === "expired"
                      ? `${lookedUpMember.name}, ${lookedUpMember.plan} plan, expired. Bookings are paused until it is renewed.`
                      : `${lookedUpMember.name}, ${lookedUpMember.plan} plan, this court at ${inr(court?.sport === "Cricket" ? lookedUpMember.cricketPrice : lookedUpMember.tennisPrice)} an hour.`}
                  </p>
                )}
                {name.trim().length >= 3 && !lookup.loading && !lookedUpMember && !member && (
                  <p className="muted" style={{ marginTop: 8 }} role="status">
                    No member found under that name. Walk-in rate applies.
                  </p>
                )}
                {(member || name.trim().length >= 3) && todays.data && (
                  <p className="muted" style={{ marginTop: 8 }} role="status">
                    {todaysCount === 0
                      ? `${member?.name ?? name.trim()} has no bookings on ${date === today ? "today" : date} yet.`
                      : `${member?.name ?? name.trim()} already has ${todaysCount} booking${todaysCount > 1 ? "s" : ""} on ${date === today ? "today" : date}.`}
                  </p>
                )}

                {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</div>}

                <div className="summary">
                  <p className="s-lines">
                    {slot === null || !court ? (
                      "No slot picked yet."
                    ) : (
                      <>
                        {court.name} at <span className="num">{fmtTime(slot)}</span> ·{" "}
                        <span className="num s-total" style={{ fontSize: 16 }}>
                          {price === 0 ? "Covered by your plan" : inr(price ?? 0)}
                        </span>
                      </>
                    )}
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                    <button
                      className="btn btn-ink"
                      disabled={!canBook || slot === null || (!member && !name.trim()) || busy}
                      onClick={() => book()}
                    >
                      {busy ? "Booking..." : slot === null || !court ? "Pick a slot first" : social ? `Book Social Play (${price ? `${inr(price)} at desk` : "Covered by plan"})` : `Book (${price ? `${inr(price)} at desk` : "Covered by plan"})`}
                    </button>

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="muted" style={{ marginTop: 28, maxWidth: 680 }}>
        Court guidelines: Every slot is 60 minutes (1 hour) — booking 6:00 PM covers until 7:00 PM, and 6:30 PM covers until 7:30 PM. Every plan allows at most 2 bookings a day. Friday Social Play is open shared play all Friday. Visitors can view availability here; booking is for members, or at the front desk.
      </p>

    </main>
  );
}
