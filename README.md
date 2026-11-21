# The Champions Club

One system for a sports club — courts, gear shop and bar — replacing WhatsApp threads, Excel sheets and paper tabs.

![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Odoo](https://img.shields.io/badge/Odoo%2020-714B67?logo=odoo&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)

## What it does

- **Members** — Gold, Silver and Junior plans. Each plan sets court price and shop/bar discounts. Expiry is tracked automatically.
- **Court booking** — 1-hour sessions on a 30-minute grid. No double-booking, max 2 bookings a day per member, expired members blocked — all enforced on the server. Friday Social Play lets many members share one court.
- **Shop** — one stock for the counter and the website, with low-stock alerts.
- **Bar & café** — point of sale with member tabs. The plan discount applies on its own. Cash, card and UPI.
- **Website** — plans, live court availability, shop, and a free-trial booking form.
- **Owner dashboard** — the day's money from courts, shop and bar, in one place.

## Stack

| Part | Tech |
| --- | --- |
| Website (main) | Next.js, React, TypeScript |
| Business engine | Odoo 20 (headless), one small custom addon |
| Database | PostgreSQL 16 |
| Online payments | Razorpay (test mode) |
| Run | Docker Compose |

Next.js leads the product — every screen and most logic lives there. Python is kept small: booking rules and records inside Odoo.

## Run it

```bash
# backend — Odoo on http://localhost:8069
cp .env.example .env
docker compose up -d
# then install the "Champions Club" app in Odoo

# website — http://localhost:3000
cd web
npm install
npm run dev
```

The website works even before Odoo is up: it falls back to built-in demo data, and goes live the moment Odoo answers.

## Layout

```
addons/champions_club/   Odoo addon — plans, members, courts, booking rules, POS data
web/                     Next.js website — pages, API routes, Odoo client (lib/odoo)
docs/                    Setup notes per module
```

## Status

Built for the Odoo × LPU Hackathon. Backend modules M0–M5 and the full website are done; CRM, online payments and staff modules are in progress.
