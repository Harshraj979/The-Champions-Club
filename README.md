# The Champions Club

One system for a sports club: courts, gear shop and bar, replacing WhatsApp threads, Excel sheets and paper tabs.

## What it does

- **Courts**: one-hour bookings on a 30-minute grid, 6 AM to 10 PM. No double-booking (enforced in a database transaction, so two requests racing for one slot cannot both win), two bookings a day per person, expired plans paused. Members pay their plan price, walk-ins pay the court rate.
- **Membership**: Gold, Silver and Junior. The plan sets court prices and shop and bar discounts, applied everywhere at once. Plan state (active, expiring, expired) is worked out from the expiry date, never stored.
- **Shop**: one stock list for the counter and the website. A sale checks stock and takes it off in the same transaction, with low-stock flags on the dashboard.
- **Bar & Café**: tabs with the member's plan discount applied at settle. Cash, card and UPI, split out on the dashboard.
- **Free trial**: one hour on court, booked from the website, no card. The desk sees the guest's phone number in Bookings to follow up.
- **Owner dashboard**: the day's money from courts, shop and bar, how it was paid, who is on court, and what is running low.
- **Staff sign-in**: dashboard, bookings, members and the bar till sit behind a login. Email and password for the desk, a 4-digit PIN at the till. Members have no login; they book by name.

## Stack

| Part | Tech |
| --- | --- |
| App | Next.js 15 (App Router), React 19, TypeScript strict |
| Database | PostgreSQL, Prisma ORM (schema, migrations, seed in `prisma/`) |
| API | REST under `/api/v1`, JSON in and out. Business rules live in `lib/services`, so the same endpoints can serve a future mobile app unchanged |
| Auth | Staff sessions as signed tokens (httpOnly cookie on web, Bearer token for mobile), passwords and PINs hashed with bcrypt |
| Styling | One CSS file, no framework, no component library |

## Run it

You need Node 20+ and a PostgreSQL database. The quick way is Docker:

```bash
docker compose up -d          # starts PostgreSQL matching the example .env
cp .env.example .env
npm install
npm run db:migrate            # creates the tables
npm run db:seed               # plans, courts, products, members, first staff account
npm run dev                   # http://localhost:3000
```

Seed staff login (change before any real use): `owner@champions.club` / `champions`, till PIN `2468`. Override with `SEED_STAFF_PASSWORD` and `SEED_STAFF_PIN` when seeding.

## Layout

```
app/            Pages: home, courts, trial, shop, bar, dashboard, bookings, members, login
app/api/v1/     REST endpoints (thin handlers over the services)
components/     Shared pieces (Nav, page states)
lib/services/   All business logic: bookings, members, catalog, sales, dashboard
lib/            db client, auth, validation, API client, formatting, shared types
prisma/         Schema, migrations, seed
middleware.ts   Sends signed-out visitors away from staff pages
```

## Status

Built at a 24-hour hackathon at LPU. The full product runs on the database end to end: book a court on the site and it lands in Bookings and on the owner's dashboard, with every club rule enforced by the server.
