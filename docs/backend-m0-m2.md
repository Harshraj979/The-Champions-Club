# Backend M0-M2 - what is scaffolded and how to run it

## Run (M0)
1. `cp .env.example .env`
2. `docker compose up -d` - Odoo on http://localhost:8069, addon `champions_club` installs on first boot.
3. Web layer: `cd web && cp .env.example .env.local && npm install && npm run dev`

## M1 - access (configured in Odoo UI after install)
- Groups (created by the addon): Champions Club / Owner, Front Desk, Bar Staff, Shop Staff. Owner implies Front Desk, Front Desk implies Bar + Shop.
- Assign each staff user exactly one group. Front Desk gets no Accounting access - that is native Odoo: do not add them to Accounting groups.
- POS PIN: in Point of Sale, set a PIN on each Bar/Shop staff user (Users > Preferences). PIN is native Odoo, no code.
- Plans are read-only for Front Desk / Bar / Shop (see ir.model.access.csv); only Owner can edit prices/discounts.
- Members have no login. Ever. They are res.partner records only.

## M2 - members and plans
- Plans seeded: Gold (court free, 15%/15%), Silver (Rs 300/hr, 10%/10%), Junior (Rs 200/hr, 5%/0%). Demo values - owner edits in Champions Club > Membership Plans.
- A partner is a member when club_plan_id is set and expiry is not past. membership_state: none / active / expiring (<= 7 days) / expired - computed, stored.
- Daily cron refreshes states and creates a renewal activity for expiring members.
- API: GET /api/members/search?q=<name-or-phone>, POST /api/members/create, getMemberHistory(partnerId) in web/lib/odoo/members.ts.

## Not yet built
M3 booking (club.court / club.booking + hard rules) is next. No booking model exists yet on purpose.
