# The Champions Club

One system for a sports club: tennis and cricket courts, a gear shop, and a
bar & café. It replaces bookings on WhatsApp, member lists in Excel, and bar
tabs on paper.

Built with Next.js (App Router) and TypeScript, backed by PostgreSQL through
Prisma. The pages and a versioned REST API run in one app, and every club
rule is enforced on the server, so the same API can later power a mobile app
without rebuilding the backend.

## Run it locally

You need Node 18.18+ and a PostgreSQL database. The quickest database is the
one in `docker-compose.yml`:

```bash
docker compose up -d        # PostgreSQL on localhost:5432 (club / club)
cp .env.example .env        # then set AUTH_SECRET to a long random string
npm install
npm run db:migrate          # creates the tables
npm run db:seed             # plans, courts, products, members, staff
npm run dev                 # http://localhost:3000
```

Seed staff login (change before any real use): `owner@champions.club` /
`champions`, or till PIN `2468`. Override with `SEED_STAFF_PASSWORD` and
`SEED_STAFF_PIN` in `.env` before seeding.

## Deploy on Vercel

1. Import this repository in Vercel. Framework preset: Next.js. No build
   settings to change: the build script runs `prisma generate` first.
2. Add a PostgreSQL database (Vercel Postgres, Neon, or Supabase) and set
   two environment variables in the project:
   - `DATABASE_URL`: the database connection string (pooled string if the
     provider offers one, with `?sslmode=require` if it asks for it).
   - `AUTH_SECRET`: a long random string.
3. Deploy.
4. Once, against the production database, create the tables and seed data.
   From your machine with the production `DATABASE_URL` in `.env`:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Sign in and change the seed staff password and PIN before real use.

## How the club works (the workflow)

### Visitors and members (no login)

- The home page shows today's live court sheet, the membership plans, and
  the courts, all read from the database.
- **Book a court:** pick a court, a date, and a free slot, and book under
  your name. Slots are one hour, start every 30 minutes, 6 AM to 9 PM.
  Members are recognised by their registered name and pay their plan price
  (Gold pays nothing for courts); everyone else pays the court's walk-in
  price.
- **Free trial:** first-timers book a free session with a name and a
  10-digit phone number.
- **Shop:** add gear to an order and pay at the counter (Cash, Card, or
  UPI). Typing a member's name applies their plan's shop discount. Stock is
  checked and reduced the moment the order is placed, so the same stock
  serves the counter and the website.
- **Membership page:** the three plans with prices and discounts, straight
  from the database.

### The club rules (all enforced on the server)

- No double-booking, including partial overlaps. The check runs inside a
  database transaction that locks the court row, so two people booking the
  same slot at the same moment cannot both get it (verified: one succeeds,
  the other gets a clear "already booked" error).
- At most 2 bookings per person per day. Friday Social Play does not count.
- A member whose plan has expired (worked out from the plan end date) is
  paused and cannot book until they renew.
- Member prices and discounts always come from the member's plan in the
  database, never from the browser.
- Trials are free and never count toward the 2-a-day limit.

### Staff (sign-in required)

Staff sign in with email and password, or with a 4-digit till PIN at the
counter. Roles: OWNER and STAFF. Members have no login.

- **Owner dashboard:** today's money in one place: courts, shop, and bar
  totals, a combined total, the shop and bar split by payment method, who
  is on court today, and low-stock warnings.
- **Bookings:** the day's bookings with date filter and cancel. Cancelling
  frees the slot at once.
- **Members:** search the register (search runs on the server), see plan
  end dates and status, and add new members.
- **Bar & Café:** open a tab under a name, add items, settle with Cash,
  Card, or UPI. The member's bar discount is applied at settle time and
  stored on the tab.

### How a request flows through the code

```
Page (app/*/page.tsx)
  → lib/api.ts          browser client for the API
  → app/api/v1/*        thin route handlers: parse, validate, respond
  → lib/services/*      all business rules live here, no UI code
  → lib/db.ts           Prisma client
  → PostgreSQL          the single source of truth
```

Every input is validated in `lib/validate.ts` (zod), every error comes back
in one shape (`{ "error": "..." }` with a proper status code), and the data
contract between the API and any client is `lib/types.ts`: dates as
`YYYY-MM-DD`, times as minutes from midnight, money as whole rupees. A
future React Native app can consume the same `/api/v1` routes and the same
session token (sent as a cookie, or as a Bearer token for mobile).

## API (v1)

| Route | What it does |
| --- | --- |
| `GET /api/v1/plans` | Membership plans |
| `GET /api/v1/courts` | Courts and walk-in prices |
| `GET /api/v1/products` | Shop and bar products, with stock |
| `GET /api/v1/schedule?date=` | Public court sheet for a day |
| `GET /api/v1/availability?courtId=&date=` | Taken slots for one court |
| `POST /api/v1/bookings` | Book a court or a free trial |
| `POST /api/v1/bookings/:id/cancel` | Cancel a booking (staff) |
| `GET /api/v1/members?q=` | Search members (staff) |
| `POST /api/v1/members` | Add a member (staff) |
| `GET /api/v1/members/lookup?name=` | Member and plan status for a name |
| `POST /api/v1/orders` | Place a shop order (stock-checked) |
| `GET /api/v1/tabs` · `POST /api/v1/tabs` | Bar tabs: list, open, add items, settle (staff) |
| `GET /api/v1/dashboard?date=` | Daily totals, payment split, on-court, low stock (staff) |
| `POST /api/v1/auth/login` · `POST /api/v1/auth/pin` | Staff sign-in |
| `POST /api/v1/auth/logout` · `GET /api/v1/auth/me` | Sign out, current staff member |

## Project layout

```
app/            pages and API routes (App Router)
components/     shared UI pieces (nav, loading / error / empty states)
lib/            db, auth, validation, errors, API client
lib/services/   business logic: bookings, members, catalog, sales, dashboard
prisma/         schema, migrations, seed
public/         static files (hero photo)
middleware.ts   keeps staff pages behind sign-in
```

## What is done

- PostgreSQL database with Prisma schema, migrations, and seed data
  (3 plans, 3 courts, 9 products, 4 members, 1 staff account).
- Court booking with every club rule enforced on the server, including the
  double-booking race, plus free trial booking.
- Shop ordering with live stock control and member discounts.
- Bar tabs with plan discounts and Cash / Card / UPI settlement.
- Staff sign-in (password or till PIN), roles, and protected staff pages.
- Owner dashboard: one day's courts + shop + bar money, payment split,
  on-court list, low-stock warnings.
- Member register with server-side search and add member.
- All nine pages on the real API, each with loading, error, and empty
  states. No placeholder or fake data anywhere: every screen reads
  PostgreSQL.
- Verified end to end: 23 API checks and 18 browser click-through checks
  pass; typecheck and production build are clean; ready to deploy on
  Vercel.

## Not built yet

- Online payments (Razorpay test mode) for memberships and shop orders.
- A mobile app (the API is ready for it).
- An automated test suite in the repo (verification so far was scripted
  end-to-end checks).
