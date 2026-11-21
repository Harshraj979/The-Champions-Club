"use client";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { allStarts, fmtTime, inr, todayISO } from "@/lib/format";
import { Loading, ErrorBox } from "@/components/States";
import Marquee from "@/components/Marquee";
import BlurText from "@/components/BlurText";
import Reveal from "@/components/Reveal";
import Spotlight from "@/components/Spotlight";

const ticker = ["Tennis", "Cricket", "Friday Social Play", "Gear Shop", "Bar & Café", "Open 6 AM to 10 PM", "First trial is free"];
const starts = allStarts();

export default function Home() {
  const today = todayISO();
  const plans = useApi(() => api.plans());
  const courts = useApi(() => api.courts());
  const products = useApi(() => api.products());
  const schedule = useApi(() => api.schedule(today), [today]);

  const gear = products.data?.filter((p) => p.category === "GEAR") ?? [];
  const bar = products.data?.filter((p) => p.category === "BAR") ?? [];
  const sheet = schedule.data ?? [];

  // first start today where this court is free for a full hour
  const nextFree = (courtId: number) => {
    const taken = sheet.filter((b) => b.courtId === courtId).map((b) => b.start);
    return starts.find((t) => !taken.some((b) => Math.abs(b - t) < 60)) ?? null;
  };

  return (
    <main>
      <section className="hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero.jpg" alt="The club ground, seen from above" width={2744} height={1568} fetchPriority="high" />
        <div className="hero-shade" />
        <div className="hero-in">
          <div className="hero-text">
            <h1><BlurText text="First serve at six. Last over by dusk." /></h1>
            <p>Two tennis courts, a cricket pitch, a gear shop and a bar that knows your name. Booked in seconds, not WhatsApp threads.</p>
            <div className="hero-actions">
              <Link className="btn btn-paper" href="/trial">Book a free trial</Link>
              <Link className="btn btn-ghost-light" href="/courts">See court times</Link>
            </div>

            <div className="today-card">
              <div className="today-head">
                <b>Today at the club</b>
                <span>Live sheet</span>
              </div>
              {schedule.loading ? (
                <p className="today-note">Reading today's sheet...</p>
              ) : schedule.error ? (
                <p className="today-note">The live sheet is not loading. <Link className="text-link" href="/courts" style={{ color: "#fff" }}>See court times</Link></p>
              ) : (
                <>
                  <div className="today-stats">
                    <div>
                      <p className="ts-v">{sheet.length}</p>
                      <p className="ts-l">Bookings today</p>
                    </div>
                    <div>
                      <p className="ts-v">{courts.data?.length ?? 3} <em>courts</em></p>
                      <p className="ts-l">Tennis + cricket</p>
                    </div>
                    <div>
                      <p className="ts-v">6 AM</p>
                      <p className="ts-l">First slot, daily</p>
                    </div>
                  </div>
                  {sheet.length > 0 ? (
                    <div className="today-rows">
                      {sheet.slice(0, 3).map((b) => (
                        <div className="today-row" key={b.id}>
                          <span className="tr-t num">{fmtTime(b.start)}</span>
                          <span className="tr-c">{b.court}</span>
                          <span className="tr-w">{b.who}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="today-note">Nothing booked yet today. The first slot is 6 AM.</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <Marquee items={ticker} />

      <div className="wrap">
        <Reveal>
          <section className="block">
            <div className="sec-head">
              <h2>On court today</h2>
              <Link className="text-link" href="/courts">Book a court</Link>
            </div>
            {schedule.loading ? (
              <Loading />
            ) : schedule.error ? (
              <ErrorBox message={schedule.error} onRetry={schedule.reload} />
            ) : sheet.length === 0 ? (
              <p className="muted">Nothing on court yet today. The first slot is 6 AM.</p>
            ) : (
              <div className="fixtures">
                {sheet.map((b) => (
                  <div className="fixture" key={b.id}>
                    <span className="fx-t">{fmtTime(b.start)}</span>
                    <span className="fx-c">{b.court}</span>
                    <span className="fx-w">{b.who}</span>
                    <span className="fx-p num">{b.price ? inr(b.price) : "Plan"}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ marginTop: 12 }}>One hour a booking, a new slot every half hour. A court is never double-booked.</p>
          </section>
        </Reveal>

        <Reveal>
          <section className="block" id="plans">
            <div className="sec-head">
              <h2>Membership</h2>
              <Link className="text-link" href="/trial">Start with a trial</Link>
            </div>
            {plans.loading ? (
              <Loading rows={3} />
            ) : plans.error ? (
              <ErrorBox message={plans.error} onRetry={plans.reload} />
            ) : (
              <div className="plan-grid">
                {plans.data!.map((p) => (
                  <Spotlight key={p.code} className={`plan-card${p.code === "gold" ? " hot" : ""}`}>
                    {p.code === "gold" && <span className="plan-tag">Most picked</span>}
                    <p className="plan-name">{p.name}</p>
                    <p className="plan-price">
                      {p.courtPrice === 0 ? "Included" : <>{inr(p.courtPrice)}<small> / court hour</small></>}
                    </p>
                    <div className="plan-feats">
                      <div><span>Shop discount</span><b>{p.shopDiscount}% off</b></div>
                      <div><span>Bar discount</span><b>{p.barDiscount ? `${p.barDiscount}% off` : "Full price"}</b></div>
                      <div><span>Term</span><b>{p.termDays} days</b></div>
                    </div>
                    <div className="plan-cta">
                      <Link className="btn btn-ink" href="/trial">Start with a free trial</Link>
                    </div>
                  </Spotlight>
                ))}
              </div>
            )}
            <p className="muted" style={{ marginTop: 12 }}>Your plan sets your prices everywhere at once: courts, shop and bar. Two court bookings a day at most, on every plan.</p>
          </section>
        </Reveal>

        <Reveal>
          <section className="block">
            <div className="sec-head">
              <h2>Courts</h2>
              <Link className="text-link" href="/courts">See free slots</Link>
            </div>
            {courts.loading ? (
              <Loading rows={3} />
            ) : courts.error ? (
              <ErrorBox message={courts.error} onRetry={courts.reload} />
            ) : (
              <div className="court-grid">
                {courts.data!.map((c) => {
                  const free = schedule.data ? nextFree(c.id) : undefined;
                  return (
                    <Spotlight key={c.id} className="court-card">
                      <p className="court-name">{c.name}</p>
                      <p className="muted">{c.sport} · walk-in <span className="num">{inr(c.walkinPrice)}</span> an hour</p>
                      <p className="court-next">
                        {free === undefined ? "Reading today's sheet..." : free === null ? "Fully booked today." : <>Next free today: <b>{fmtTime(free)}</b></>}
                      </p>
                      <div className="court-cta">
                        <Link className="btn btn-quiet" href="/courts">Book {c.name}</Link>
                      </div>
                    </Spotlight>
                  );
                })}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal>
          <section className="block" style={{ paddingBottom: 16 }}>
            <div className="sec-head">
              <h2>The club</h2>
            </div>
            <div className="bento">
              <Spotlight className="tile wide dark">
                <h3>Friday Social Play</h3>
                <p className="t-big">Fridays, 7 PM</p>
                <p>Shared courts, rotating players, no booking maths. The one session where the 2-a-day rule does not apply.</p>
                <p className="t-link"><Link className="text-link" href="/courts">Get on court</Link></p>
              </Spotlight>
              <Spotlight className="tile">
                <h3>Club shop</h3>
                <p className="t-big">{gear.length} lines</p>
                <p>{gear.length ? <>From {inr(Math.min(...gear.map((p) => p.price)))}. </> : ""}What is listed is what is in stock.</p>
                <p className="t-link"><Link className="text-link" href="/shop">Shop</Link></p>
              </Spotlight>
              <Spotlight className="tile">
                <h3>Bar &amp; Café</h3>
                <p className="t-big">11 AM to 11 PM</p>
                <p>{bar.length ? bar.map((p) => p.name.toLowerCase()).join(", ") : "Cold coffee, beer, sandwiches."}. Member plans take their discount at the till.</p>
                <p className="t-link"><Link className="text-link" href="/bar">Bar &amp; Café</Link></p>
              </Spotlight>
              <Spotlight className="tile wide volt">
                <h3>Never played here?</h3>
                <p className="t-big">First session is free</p>
                <p>One hour on court, rackets and balls on us. Book it in under a minute, no card, no calls.</p>
                <p className="t-link"><Link className="text-link" href="/trial">Book a free trial</Link></p>
              </Spotlight>
              <Spotlight className="tile wide">
                <h3>Visit</h3>
                <p>Courts 6 AM to 10 PM · Shop 8 AM to 9 PM · Bar &amp; Café 11 AM to 11 PM, every day.</p>
                <p>Front desk: +91 98765 43210</p>
                <p className="t-link"><Link className="text-link" href="/courts">See court times</Link></p>
              </Spotlight>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
