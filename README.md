# The Champions Club

One system for a sports club: courts, gear shop and bar, replacing WhatsApp threads, Excel sheets and paper tabs.

## What it does

- **Courts**: one-hour bookings on a 30-minute grid, 6 AM to 10 PM. No double-booking, two bookings a day per person, expired plans paused. Members pay their plan price, walk-ins pay the court rate.
- **Membership**: Gold, Silver and Junior. The plan sets court prices and shop and bar discounts, applied everywhere at once.
- **Shop**: one stock list for the counter and the website, with low-stock flags.
- **Bar & Café**: tabs with the member's plan discount applied at settle. Cash, card and UPI.
- **Free trial**: one hour on court, booked from the website, no card.
- **Owner dashboard**: the day's money from courts, shop and bar, and who is on court.

## Stack

| Part | Tech |
| --- | --- |
| Website | Next.js 15, React 19, TypeScript |
| Styling | One CSS file, no framework, no component library |
| Data | `lib/data.ts` for club data, `lib/store.ts` for session state (browser localStorage) |

React only for now. A backend will be connected later; `lib/data.ts` is the shape its responses will take.

## Run it

```bash
npm install
npm run dev   # http://localhost:3000
```

## Layout

```
app/          Pages: home, courts, trial, shop, bar, dashboard, bookings, members
app/layout.tsx, app/globals.css   Shell and the design system
components/   Shared pieces (Nav)
lib/data.ts   Plans, courts, products, members, today's bookings
lib/store.ts  Shared session state: bookings, members, shop and bar takings
public/       Images
```

## Status

Built at a 24-hour hackathon at LPU. The frontend is complete and self-contained; backend integration comes next.
