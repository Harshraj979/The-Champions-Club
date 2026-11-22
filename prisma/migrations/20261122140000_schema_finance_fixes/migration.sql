-- Schema + finance fixes (round 2): Plan.fee, payMethod on Invoice /
-- Payroll, relations for Invoice.memberId / Payroll.staffId, one open tab
-- per table, date-only Shift.date, and String status/type fields moved to
-- enums. PostgreSQL. Every statement is guarded so it applies cleanly on
-- a fresh database and on one that already has the round-1 fields.
-- Run with: npx prisma migrate deploy

-- 1. Plan.fee — the per-term membership fee renewals and purchases charge.
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "fee" INTEGER NOT NULL DEFAULT 0;
UPDATE "Plan" SET "fee" = CASE "code"
  WHEN 'gold' THEN 1500 WHEN 'silver' THEN 1000 WHEN 'junior' THEN 600
  ELSE "fee" END;

-- 2. Enum types for the status/type columns (created once; the DO block
-- swallows "already exists" so a re-run is safe).
DO $$ BEGIN
  CREATE TYPE "OrderStatus" AS ENUM ('PLACED', 'PACKED', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderPayState" AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "OrderFulfilment" AS ENUM ('PICKUP', 'DELIVERY');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'UNPAID', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ShiftPart" AS ENUM ('MORNING', 'EVENING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookingPayState" AS ENUM ('UNPAID', 'PAID');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. Invoice / Payroll payMethod + relations for the member/staff links.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "payMethod" "PayMethod";
ALTER TABLE "Payroll" ADD COLUMN IF NOT EXISTS "payMethod" "PayMethod";

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_memberId_fkey') THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payroll_staffId_fkey') THEN
    ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_staffId_fkey"
      FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Invoice_memberId_idx" ON "Invoice"("memberId");

-- 4. One open tab per table. (Prisma has no syntax for a partial index,
-- so this lives only in the migration; the schema carries a comment.
-- NOTE: this fails if the database already holds two OPEN tabs on the
-- same table — clear those first.)
CREATE UNIQUE INDEX IF NOT EXISTS "Tab_tableNo_open_key" ON "Tab"("tableNo") WHERE "status" = 'OPEN';

-- 5. Shift.date becomes date-only, like Booking.date.
ALTER TABLE "Shift" ALTER COLUMN "date" TYPE DATE USING "date"::date;

-- 6. String status/type columns become enums. Every value the app ever
-- writes is inside the enum, so the USING cast cannot fail on app data;
-- a stray value fails the migration loudly instead of being mangled.
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::text::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "payState" TYPE "OrderPayState" USING "payState"::text::"OrderPayState";
ALTER TABLE "Order" ALTER COLUMN "fulfilment" TYPE "OrderFulfilment" USING "fulfilment"::text::"OrderFulfilment";
-- The old default marked every order PAID at creation; online orders start PENDING.
ALTER TABLE "Order" ALTER COLUMN "payState" SET DEFAULT 'PENDING';
ALTER TABLE "Invoice" ALTER COLUMN "status" TYPE "InvoiceStatus" USING "status"::text::"InvoiceStatus";
ALTER TABLE "Payroll" ALTER COLUMN "status" TYPE "PayrollStatus" USING "status"::text::"PayrollStatus";
ALTER TABLE "Leave" ALTER COLUMN "type" TYPE "LeaveType" USING "type"::text::"LeaveType";
ALTER TABLE "Leave" ALTER COLUMN "status" TYPE "LeaveStatus" USING "status"::text::"LeaveStatus";
ALTER TABLE "Shift" ALTER COLUMN "part" TYPE "ShiftPart" USING "part"::text::"ShiftPart";
ALTER TABLE "MembershipRenewal" ALTER COLUMN "payMethod" TYPE "PayMethod" USING "payMethod"::text::"PayMethod";
ALTER TABLE "Booking" ALTER COLUMN "payMethod" TYPE "PayMethod" USING "payMethod"::text::"PayMethod";
ALTER TABLE "Booking" ALTER COLUMN "payState" TYPE "BookingPayState" USING "payState"::text::"BookingPayState";
