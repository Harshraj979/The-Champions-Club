import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// The club as it opens on day one: the same plans, courts, products and
// members the site has always shown, now owned by the database. Seeding
// only fills empty tables, so restarts never duplicate or wipe real data.
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const dayMs = 24 * 60 * 60 * 1000;
const dateOnly = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

async function main() {
  if ((await db.plan.count()) === 0) {
    await db.plan.createMany({
      data: [
        { code: "gold", name: "Gold", courtPrice: 0, shopDiscount: 15, barDiscount: 15, termDays: 365 },
        { code: "silver", name: "Silver", courtPrice: 300, shopDiscount: 10, barDiscount: 10, termDays: 365 },
        { code: "junior", name: "Junior", courtPrice: 200, shopDiscount: 5, barDiscount: 0, termDays: 365 },
      ],
    });
  }
  if ((await db.court.count()) === 0) {
    await db.court.createMany({
      data: [
        { name: "Tennis 1", sport: "Tennis", walkinPrice: 500 },
        { name: "Tennis 2", sport: "Tennis", walkinPrice: 500 },
        { name: "Cricket 1", sport: "Cricket", walkinPrice: 800 },
      ],
    });
  }
  if ((await db.product.count()) === 0) {
    await db.product.createMany({
      data: [
        { name: "Tennis racket", price: 4999, stock: 12, category: "GEAR" },
        { name: "Tennis balls, can of 3", price: 549, stock: 60, category: "GEAR" },
        { name: "Cricket bat", price: 3499, stock: 8, category: "GEAR" },
        { name: "Sports shoes", price: 2999, stock: 15, category: "GEAR" },
        { name: "Club t-shirt", price: 999, stock: 40, category: "GEAR" },
        { name: "Cold coffee", price: 250, category: "BAR" },
        { name: "Draught beer", price: 280, category: "BAR" },
        { name: "Veg sandwich", price: 180, category: "BAR" },
        { name: "Fries", price: 150, category: "BAR" },
      ],
    });
  }
  if ((await db.member.count()) === 0) {
    const plans = await db.plan.findMany();
    const byName = (n: string) => plans.find((p) => p.name === n)!;
    const now = Date.now();
    const member = (name: string, plan: string, joinedAgo: number, termDays: number) => ({
      name,
      planId: byName(plan).id,
      joinedOn: dateOnly(new Date(now - joinedAgo * dayMs)),
      expiresOn: dateOnly(new Date(now - joinedAgo * dayMs + termDays * dayMs)),
    });
    await db.member.createMany({
      data: [
        member("Aarav Sharma", "Gold", 40, 365), // active
        member("K. Singh", "Silver", 100, 365), // active
        member("Rohan Verma", "Junior", 400, 365), // expired 35 days ago
        member("Meera Iyer", "Gold", 350, 365), // expires in 15 days: expiring soon
      ],
    });
  }
  if ((await db.booking.count()) === 0) {
    const today = dateOnly(new Date());
    const members = await db.member.findMany();
    const byName = (n: string) => members.find((m) => m.name === n);
    await db.booking.createMany({
      data: [
        { courtId: 1, memberId: byName("Aarav Sharma")?.id, who: "Aarav Sharma", date: today, start: 600, type: "REGULAR", price: 0 },
        { courtId: 1, memberId: byName("K. Singh")?.id, who: "K. Singh", date: today, start: 1080, type: "REGULAR", price: 300 },
        { courtId: 3, who: "Walk-in: Imran", date: today, start: 1020, type: "REGULAR", price: 800 },
        { courtId: 2, who: "Friday Social Play (8 members)", date: today, start: 1140, type: "FRIDAY_SOCIAL", price: 0 },
      ],
    });
  }
  if ((await db.staff.count()) === 0) {
    // Dev seed login. Change the password and PIN before any real use;
    // both can be overridden with SEED_STAFF_PASSWORD and SEED_STAFF_PIN.
    await db.staff.create({
      data: {
        name: "Club Owner",
        email: "owner@champions.club",
        passwordHash: await bcrypt.hash(process.env.SEED_STAFF_PASSWORD ?? "champions", 10),
        pinHash: await bcrypt.hash(process.env.SEED_STAFF_PIN ?? "2468", 10),
        role: "OWNER",
      },
    });
  }
  console.log("[seed] club data ready");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
