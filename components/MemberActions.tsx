"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { addDaysISO, allStarts, fmtTime, inr, istMinutesNow, todayISO } from "@/lib/format";
import { payOnlineWithRazorpay } from "@/lib/pay-online";
import type { BookingDTO } from "@/lib/types";

// "22 Nov 2026" instead of a raw YYYY-MM-DD string, like /bookings.
const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

// Book a court and order from the shop, as the signed-in member.
// Both post to the member routes, which run the same services (and
// the same rules) as the desk flows.
export default function MemberActions({
  bookings,
  planCode,
  planState,
}: {
  bookings: BookingDTO[];
  planCode: string;
  planState: string;
}) {
  const router = useRouter();
  const today = todayISO();
  const courts = useApi(() => api.courts(), []);
  const products = useApi(() => api.products("GEAR"), []);
  const payCfg = useApi(() => api.payConfig(), []);
  const plans = useApi(() => api.plans(), []);
  const me = useApi(() => api.memberMe(), []);

  const [courtId, setCourtId] = useState(1);
  const [date, setDate] = useState(today);
  const [social, setSocial] = useState(false);
  const [slot, setSlot] = useState<number | null>(null);
  const avail = useApi(() => api.availability(courtId, date), [courtId, date]);
  const taken = avail.data?.taken ?? [];
  // Friday Social shares the court, so social bookings do not block a
  // social pick the way regular bookings do.
  const free = (t: number) =>
    !taken.some((b) => Math.abs(b.start - t) < 60 && (social || b.type !== "FRIDAY_SOCIAL")) &&
    (date !== today || t + 60 > istMinutesNow());
  const freeSlots = allStarts().filter(free);
  const isFriday = new Date(`${date}T00:00:00.000Z`).getUTCDay() === 5;
  useEffect(() => {
    if (freeSlots.length && (slot === null || !freeSlots.includes(slot))) setSlot(freeSlots[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avail.data]);
  const court = courts.data?.find((c) => c.id === courtId);
  const memberPlan = me.data?.member?.plan ?? null;
  const bookPrice =
    slot === null || !court
      ? null
      : memberPlan
      ? court.sport === "Cricket"
        ? memberPlan.cricketPrice
        : memberPlan.tennisPrice
      : court.walkinPrice;
  const [bookMsg, setBookMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [bookBusy, setBookBusy] = useState(false);

  async function book() {
    if (slot === null || !court) return;
    setBookBusy(true);
    setBookMsg(null);
    try {
      if (social) {
        const res = await fetch("/api/v1/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courtId, date, start: slot, name: me.data?.member?.name ?? "", type: "FRIDAY_SOCIAL" }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string; price?: number } | null;
        if (!res.ok) throw new Error(data?.error ?? "Booking failed. Try again.");
        setBookMsg({
          ok: true,
          text: `Friday Social Play booked. ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)} — shared court, does not count toward daily limit${data?.price ? `, ${inr(data.price)} at the desk` : ", covered by your plan"}.`,
        });
      } else {
        const b = await api.memberBook({ courtId, date, start: slot });
        setBookMsg({ ok: true, text: `Booked — ${court.name}, ${date === today ? "today" : date} at ${fmtTime(slot)}, ${b.price ? `${inr(b.price)} at the desk` : "covered by your plan"}.` });
      }
      void avail.reload();
      router.refresh();
    } catch (e) {
      setBookMsg({ ok: false, text: e instanceof ApiClientError || e instanceof Error ? e.message : "Booking failed. Try again." });
      void avail.reload();
    } finally {
      setBookBusy(false);
    }
  }

  // --- Cancel one of my bookings (confirm first) ---
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelMsg, setCancelMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function cancelBooking(b: BookingDTO) {
    if (!window.confirm(`Cancel your booking on ${b.court}, ${fmtDate(b.date)} at ${fmtTime(b.start)}? The slot will be free again.`)) return;
    setCancellingId(b.id);
    setCancelMsg(null);
    try {
      await api.cancelMyBooking(b.id);
      setCancelMsg({ ok: true, text: "Booking cancelled. The court slot is now free." });
      router.refresh();
    } catch (e) {
      setCancelMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Cancelling failed. Try again." });
    } finally {
      setCancellingId(null);
    }
  }

  // --- Renew my plan: cost shown first, confirm, then real Razorpay ---
  const renewPlan = plans.data?.find((pl) => pl.code === planCode);
  const renewFee = (renewPlan as any)?.fee as number | undefined;
  const renewCostLabel = renewPlan
    ? renewFee
      ? `${inr(renewFee)} for ${renewPlan.termDays} days`
      : `${inr(renewPlan.tennisPrice)} per term`
    : "";
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [renewBusy, setRenewBusy] = useState(false);
  const [renewMsg, setRenewMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function renew() {
    setRenewBusy(true);
    setRenewMsg(null);
    try {
      const first = (await api.memberRenew()) as unknown as
        | { id: number; plan: string; expiresOn: string }
        | { razorpayOrderId: string; amount: number };
      if ("razorpayOrderId" in first) {
        const cfg = await api.payConfig();
        if (!cfg.keyId) throw new Error("Online payment isn't switched on yet — ask the front desk.");
        const proof = await api.openRazorpayCheckout({
          keyId: cfg.keyId,
          orderId: first.razorpayOrderId,
          amount: first.amount,
          description: "Membership renewal",
        });
        if (!proof) {
          setRenewMsg({ ok: false, text: "Payment not completed — your plan was not renewed." });
          return;
        }
        const updated = (await api.memberRenew(proof)) as unknown as { expiresOn: string };
        setRenewMsg({ ok: true, text: `Renewed — your plan now runs until ${updated.expiresOn}.` });
      } else {
        setRenewMsg({ ok: true, text: `Renewed — your plan now runs until ${first.expiresOn}.` });
      }
      setConfirmRenew(false);
      router.refresh();
    } catch (e) {
      setRenewMsg({ ok: false, text: e instanceof ApiClientError || e instanceof Error ? e.message : "Renewal failed. Try again." });
    } finally {
      setRenewBusy(false);
    }
  }

  // --- Past renewals: a 404 means "no history yet" — render nothing ---
  const renewals = useApi(
    () =>
      api.myRenewals().catch((e) => {
        if (e instanceof ApiClientError && e.status === 404) return [];
        throw e;
      }),
    [],
  );

  const [cart, setCart] = useState<Record<number, number>>({});
  const [pay, setPay] = useState<"CASH" | "CARD" | "UPI">("UPI");
  const [fulfilment, setFulfilment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState("");
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, q]) => ({ productId: Number(id), qty: q }));
  const subtotal = items.reduce((s, i) => s + (products.data?.find((p) => p.id === i.productId)?.price ?? 0) * i.qty, 0);
  const [orderMsg, setOrderMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);

  async function order(payOnline = false) {
    const keyId = payCfg.data?.keyId;
    if (payOnline && !keyId) {
      setOrderMsg({ ok: false, text: "Online payment isn't switched on yet — pay at the counter instead." });
      return;
    }
    setOrderBusy(true);
    setOrderMsg(null);
    try {
      const o = await api.memberOrder({ items, payMethod: pay, fulfilment, address: fulfilment === "DELIVERY" ? address.trim() : undefined, payOnline });
      if (payOnline) {
        const outcome = await payOnlineWithRazorpay(o, keyId!);
        setOrderMsg(outcome === "paid"
          ? { ok: true, text: `Paid online — ${inr(o.total)}${o.discount ? `, you saved ${inr(o.discount)}` : ""}. ${fulfilment === "DELIVERY" ? "We will deliver it to your address." : "Pick it up at the shop counter."}` }
          : { ok: false, text: "Payment window closed before paying. The order is saved as pending — the desk can take payment at the counter." });
      } else {
        setOrderMsg({ ok: true, text: `Order placed — ${inr(o.total)}${o.discount ? `, you saved ${inr(o.discount)}` : ""}. ${fulfilment === "DELIVERY" ? "We will deliver it to your address." : "Pick it up at the shop counter."}` });
      }
      setCart({});
      router.refresh();
    } catch (e) {
      setOrderMsg({ ok: false, text: e instanceof ApiClientError ? e.message : "Order failed. Try again." });
    } finally {
      setOrderBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 30, display: "grid", gap: 30 }}>
      <section aria-label="Book a court">
        <div className="sec-head"><h2>Book a court</h2></div>
        <div className="panel panel-main">
        <div className="form-grid">
          <div>
            <label>Court</label>
            <div className="seg" role="group" aria-label="Court">
              {(courts.data ?? []).map((c) => (
                <button key={c.id} aria-pressed={courtId === c.id} onClick={() => setCourtId(c.id)}>{c.name}</button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="mb-date">Date</label>
            <input id="mb-date" type="date" value={date} min={today} max={addDaysISO(today, 30)} onChange={(e) => setDate(e.target.value)} />
          </div>
          {isFriday && (
            <div>
              <button className="btn btn-quiet" aria-pressed={social} onClick={() => setSocial(!social)}>
                {social ? "Friday Social Play on — shared court" : "Friday Social Play — share the court"}
              </button>
              <p className="muted" style={{ marginTop: 6, maxWidth: 520 }}>
                Fridays only: many members share one court, and social play does not count toward the 2-a-day limit.
              </p>
            </div>
          )}
          <div>
            <label>Start time — one hour</label>
            <div className="slots" role="group" aria-label="Start times">
              {allStarts().map((t) => (
                <button key={t} className={`slot num${date === today && t + 60 <= istMinutesNow() ? " past" : ""}`} disabled={!free(t)} aria-pressed={slot === t} onClick={() => setSlot(t)}>
                  {fmtTime(t)}
                </button>
              ))}
            </div>
          </div>
          {bookMsg && <div className={`notice ${bookMsg.ok ? "ok" : "err"}`} role="status">{bookMsg.text}</div>}
          <p className="muted" role="status">
            {slot === null || !court
              ? "Pick a slot first."
              : `${court.name} at ${fmtTime(slot)} — ${bookPrice === 0 ? "Covered by your plan" : `${inr(bookPrice ?? 0)} at the desk`}`}
          </p>
          <div>
            <button className="btn btn-ink" disabled={bookBusy || slot === null} onClick={book}>
              {bookBusy ? "Booking..." : social ? "Book Social Play" : "Book this court"}
            </button>
          </div>
        </div>
        </div>
      </section>

      <section aria-label="Renew my plan">
        <div className="sec-head"><h2>Renew my plan</h2></div>
        <div className="panel panel-main">
          {renewPlan ? (
            <p style={{ margin: 0 }}>
              Renewal: <strong className="num">{renewCostLabel}</strong>
              {planState === "expired" ? " — your plan has expired, renewing starts a fresh term today." : ""}
            </p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Renewal cost loads with the plan list.</p>
          )}
          <p className="muted" style={{ marginTop: 8 }}>Renews from the later of today and your current end date — you never lose days.</p>
          {renewMsg && <div className={`notice ${renewMsg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 12 }}>{renewMsg.text}</div>}
          {confirmRenew ? (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button className="btn btn-ink" disabled={renewBusy || !renewPlan} onClick={renew}>
                {renewBusy ? "Renewing..." : `Confirm renewal — ${renewCostLabel}`}
              </button>
              <button className="btn btn-quiet" disabled={renewBusy} onClick={() => setConfirmRenew(false)}>Keep my current plan</button>
            </div>
          ) : (
            <button className="btn btn-ink" style={{ marginTop: 14 }} disabled={!renewPlan} onClick={() => setConfirmRenew(true)}>
              Renew my plan
            </button>
          )}
        </div>
      </section>

      <section aria-label="My bookings">
        <div className="sec-head"><h2>My bookings</h2></div>
        {cancelMsg && <div className={`notice ${cancelMsg.ok ? "ok" : "err"}`} role="status" style={{ marginBottom: 12 }}>{cancelMsg.text}</div>}
        {bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Date</th><th>Time</th><th>Court</th><th className="r">Price</th><th>Status</th><th /></tr></thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={b.state === "CANCELLED" ? "row-off" : undefined}>
                    <td>{fmtDate(b.date)}</td>
                    <td>{fmtTime(b.start)}</td>
                    <td>{b.court}</td>
                    <td className="r">{b.price === 0 ? (b.type === "TRIAL" ? "Free trial" : "Covered by plan") : inr(b.price)}</td>
                    <td><span className={`status ${b.state === "BOOKED" ? "booked" : "cancelled"}`}>{b.state === "BOOKED" ? "Booked" : "Cancelled"}</span></td>
                    <td className="r">{b.state === "BOOKED" && <button className="text-link" disabled={cancellingId === b.id} onClick={() => void cancelBooking(b)}>{cancellingId === b.id ? "Cancelling..." : "Cancel"}</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {renewals.data && renewals.data.length > 0 && (
        <section aria-label="Past renewals">
          <div className="sec-head"><h2>Past renewals</h2></div>
          <div className="ledger-wrap">
            <table className="ledger">
              <thead><tr><th>Date</th><th>Plan</th><th className="r">Amount</th><th>Paid by</th></tr></thead>
              <tbody>
                {renewals.data.map((r: any, i: number) => (
                  <tr key={r.id ?? i}>
                    <td>{r.renewedTo || r.createdAt ? fmtDate(r.renewedTo ?? r.createdAt) : "—"}</td>
                    <td>{r.planName ?? r.plan ?? "—"}</td>
                    <td className="r">{r.amount != null ? inr(r.amount) : "—"}</td>
                    <td>{r.payMethod ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section aria-label="Order from the shop">
        <div className="sec-head"><h2>Order from the shop</h2></div>
        <div className="panel panel-main">
        <div style={{ display: "grid", gap: 10 }}>
          {(products.data ?? []).map((p) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span>
                {p.name} · <span className="num">{inr(p.price)}</span>
                {p.stock !== null && <span className="muted"> · {p.stock === 0 ? "out of stock" : `${p.stock} in stock`}</span>}
              </span>
              <span className="stepper">
                <button aria-label={`One less ${p.name}`} disabled={!(cart[p.id] ?? 0)} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) - 1 })}>−</button>
                <b className="num">{cart[p.id] ?? 0}</b>
                <button aria-label={`One more ${p.name}`} disabled={p.stock === 0 || (p.stock !== null && (cart[p.id] ?? 0) >= p.stock)} onClick={() => setCart({ ...cart, [p.id]: (cart[p.id] ?? 0) + 1 })}>+</button>
              </span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <label>Pickup or delivery</label>
          <div className="seg" role="group" aria-label="Pickup or delivery">
            <button aria-pressed={fulfilment === "PICKUP"} onClick={() => setFulfilment("PICKUP")}>Pickup</button>
            <button aria-pressed={fulfilment === "DELIVERY"} onClick={() => setFulfilment("DELIVERY")}>Delivery</button>
          </div>
        </div>
        {fulfilment === "DELIVERY" && (
          <div style={{ marginTop: 14 }}>
            <label htmlFor="mo-address">Delivery address</label>
            <input id="mo-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, street, landmark" />
          </div>
        )}
        <div style={{ marginTop: 16 }}>
          <label>{fulfilment === "DELIVERY" ? "Paying by" : "Pay at pickup"}</label>
          <div className="seg" role="group" aria-label="Pay method">
            {(["CASH", "CARD", "UPI"] as const).map((m) => (
              <button key={m} aria-pressed={pay === m} onClick={() => setPay(m)}>{m === "UPI" ? "UPI" : m.charAt(0) + m.slice(1).toLowerCase()}</button>
            ))}
          </div>
        </div>
        {orderMsg && <div className={`notice ${orderMsg.ok ? "ok" : "err"}`} role="status" style={{ marginTop: 14 }}>{orderMsg.text}</div>}
        <button className="btn btn-ink" style={{ marginTop: 16 }} disabled={orderBusy || items.length === 0 || (fulfilment === "DELIVERY" && address.trim().length < 10)} onClick={() => order(false)}>
          {orderBusy ? "Placing..." : items.length ? `Place order · ${inr(subtotal)} before discount` : "Place order"}
        </button>
        {payCfg.data?.enabled && (
          <button className="btn btn-quiet" style={{ marginTop: 10 }} disabled={orderBusy || items.length === 0 || (fulfilment === "DELIVERY" && address.trim().length < 10)} onClick={() => order(true)}>
            Pay online
          </button>
        )}
        </div>
      </section>
    </div>
  );
}
