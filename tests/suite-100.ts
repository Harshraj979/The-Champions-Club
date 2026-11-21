/**
 * Comprehensive 100-Test-Case Automated Quality, Security & Business Logic Suite
 * Tests Champions Club Member Flow, Gating, Pricing, Inventory, Tabs, Concurrency & RBAC.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const BASE_URL = "http://localhost:3000";

type TestResult = {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  details: string;
  loopholeFound?: string;
};

const results: TestResult[] = [];

function record(
  id: string,
  category: string,
  name: string,
  passed: boolean,
  details: string,
  loopholeFound?: string,
) {
  results.push({ id, category, name, passed, details, loopholeFound });
  const status = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`${status} [${id}] ${name} - ${details}`);
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {}
  return { res, json, status: res.status, headers: res.headers };
}

// Helper to get future date (YYYY-MM-DD)
function getFutureDate(daysAhead = 1): string {
  const d = new Date(Date.now() + daysAhead * 86400000);
  return d.toISOString().slice(0, 10);
}

function getPastDate(daysBehind = 1): string {
  const d = new Date(Date.now() - daysBehind * 86400000);
  return d.toISOString().slice(0, 10);
}

async function runAllTests() {
  console.log("================================================================================");
  console.log("RUNNING CHAMPIONS CLUB 100-TEST-CASE SUITE & LOOPHOLE AUDIT");
  console.log("================================================================================\n");

  const testEmailPrefix = `test_${Date.now()}`;
  let goldUserCookie = "";
  let goldUserPhone = "";
  let silverUserCookie = "";
  let juniorUserCookie = "";
  let freeUserCookie = "";
  let expiredUserCookie = "";
  let staffOwnerCookie = "";
  let staffDeskCookie = "";

  // Reset clean test baseline
  const testNames = [
    "Test Gold User",
    "Test Silver User",
    "Test Junior User",
    "Trial Visitor",
    "Gated Member",
    "Anonymous User",
    "Bulk Buyer",
    "Stock Checker",
    "Payment Tester",
    "Walk-in Guest",
    "Walk-in Buyer",
  ];
  await db.booking.deleteMany({
    where: {
      OR: [
        { who: { in: testNames } },
        { who: { startsWith: "Test " } },
      ],
    },
  });
  await db.tabItem.deleteMany({
    where: { tab: { who: { in: [...testNames, "Ananya Iyer"] } } },
  });
  await db.tab.deleteMany({
    where: {
      OR: [
        { who: { in: [...testNames, "Ananya Iyer"] } },
        { who: { startsWith: "Test " } },
      ],
    },
  });
  await db.orderItem.deleteMany({
    where: { order: { name: { in: testNames } } },
  });
  await db.order.deleteMany({
    where: {
      OR: [
        { name: { in: testNames } },
        { name: { startsWith: "Test " } },
      ],
    },
  });
  await db.enquiry.deleteMany({
    where: {
      OR: [
        { name: { in: ["Enquiry Tester", "Trial Visitor", "No Contact"] } },
        { contact: { contains: "enquiry@test.com" } },
      ],
    },
  });
  await db.member.deleteMany({
    where: {
      OR: [
        { email: { contains: "test_" } },
        { name: { startsWith: "Test " } },
        { name: "Gated Member" },
      ],
    },
  });
  await db.product.updateMany({
    where: { name: { contains: "Tennis Racket" } },
    data: { stock: 12 },
  });
  await db.product.updateMany({
    where: { name: { contains: "Tennis Balls" } },
    data: { stock: 40 },
  });
  await db.product.updateMany({
    where: { name: { contains: "Water Bottle" } },
    data: { stock: 0 },
  });

  // -----------------------------------------------------------------------------------------
  // CATEGORY 1: Member Authentication & Registration (TC001 - TC015)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 1: Member Authentication & Registration ---");

  // TC001
  try {
    const email = `${testEmailPrefix}_gold@test.com`;
    goldUserPhone = "98" + Math.floor(10000000 + Math.random() * 90000000);
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Gold User",
        email,
        phone: goldUserPhone,
        password: "password123",
        planCode: "gold",
      }),
    });
    const setCookie = r.headers.get("set-cookie") || "";
    goldUserCookie = setCookie;
    const ok = r.status === 200 && r.json?.member?.plan?.code === "gold";
    record("TC001", "Member Auth", "Register member with Gold plan", ok, `Status ${r.status}, Plan: ${r.json?.member?.plan?.name}`);
  } catch (e: any) {
    record("TC001", "Member Auth", "Register member with Gold plan", false, e.message);
  }

  // TC002
  try {
    const email = `${testEmailPrefix}_silver@test.com`;
    const phone = "98" + Math.floor(10000000 + Math.random() * 90000000);
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Silver User",
        email,
        phone,
        password: "password123",
        planCode: "silver",
      }),
    });
    silverUserCookie = r.headers.get("set-cookie") || "";
    const ok = r.status === 200 && r.json?.member?.plan?.code === "silver";
    record("TC002", "Member Auth", "Register member with Silver plan", ok, `Status ${r.status}, Plan: ${r.json?.member?.plan?.name}`);
  } catch (e: any) {
    record("TC002", "Member Auth", "Register member with Silver plan", false, e.message);
  }

  // TC003
  try {
    const email = `${testEmailPrefix}_junior@test.com`;
    const phone = "98" + Math.floor(10000000 + Math.random() * 90000000);
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Junior User",
        email,
        phone,
        password: "password123",
        planCode: "junior",
      }),
    });
    juniorUserCookie = r.headers.get("set-cookie") || "";
    const ok = r.status === 200 && r.json?.member?.plan?.code === "junior";
    record("TC003", "Member Auth", "Register member with Junior plan", ok, `Status ${r.status}, Plan: ${r.json?.member?.plan?.name}`);
  } catch (e: any) {
    record("TC003", "Member Auth", "Register member with Junior plan", false, e.message);
  }

  // TC004
  try {
    const email = `${testEmailPrefix}_none@test.com`;
    const phone = "98" + Math.floor(10000000 + Math.random() * 90000000);
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Free User",
        email,
        phone,
        password: "password123",
        planCode: "none",
      }),
    });
    freeUserCookie = r.headers.get("set-cookie") || "";
    const ok = r.status === 200 && r.json?.member?.plan === null;
    record("TC004", "Member Auth", "Register member with no plan (none)", ok, `Status ${r.status}, Plan: ${r.json?.member?.plan}`);
  } catch (e: any) {
    record("TC004", "Member Auth", "Register member with no plan (none)", false, e.message);
  }

  // TC005
  try {
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "   ",
        email: `${testEmailPrefix}_noname@test.com`,
        phone: "9876543210",
        password: "password123",
      }),
    });
    const ok = r.status === 400;
    record("TC005", "Member Auth", "Reject registration with empty name", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC005", "Member Auth", "Reject registration with empty name", false, e.message);
  }

  // TC006
  try {
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Bad Email",
        email: "notanemail",
        phone: "9876543210",
        password: "password123",
      }),
    });
    const ok = r.status === 400;
    record("TC006", "Member Auth", "Reject registration with invalid email", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC006", "Member Auth", "Reject registration with invalid email", false, e.message);
  }

  // TC007
  try {
    const email = `${testEmailPrefix}_gold@test.com`;
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Duplicate User",
        email: email.toUpperCase(), // Case-insensitive duplicate test
        phone: "98" + Math.floor(10000000 + Math.random() * 90000000),
        password: "password123",
      }),
    });
    const ok = r.status === 400 && r.json?.error?.includes("already exists");
    record("TC007", "Member Auth", "Reject registration with duplicate email", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC007", "Member Auth", "Reject registration with duplicate email", false, e.message);
  }

  // TC008
  try {
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Short Phone",
        email: `${testEmailPrefix}_shortphone@test.com`,
        phone: "12345",
        password: "password123",
      }),
    });
    const ok = r.status === 400;
    record("TC008", "Member Auth", "Reject registration with short phone (<10 digits)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC008", "Member Auth", "Reject registration with short phone (<10 digits)", false, e.message);
  }

  // TC009
  try {
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Short Pass",
        email: `${testEmailPrefix}_shortpass@test.com`,
        phone: "9876543210",
        password: "12",
      }),
    });
    const ok = r.status === 400;
    record("TC009", "Member Auth", "Reject registration with short password (<4 chars)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC009", "Member Auth", "Reject registration with short password (<4 chars)", false, e.message);
  }

  // TC010
  try {
    const email = `${testEmailPrefix}_gold@test.com`;
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "password123" }),
    });
    const ok = r.status === 200 && r.json?.ok === true && r.json?.member?.name === "Test Gold User";
    record("TC010", "Member Auth", "Login with valid email and password", ok, `Status ${r.status}, Name: ${r.json?.member?.name}`);
  } catch (e: any) {
    record("TC010", "Member Auth", "Login with valid email and password", false, e.message);
  }

  // TC011
  try {
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: goldUserPhone, password: "password123" }),
    });
    const ok = r.status === 200 && r.json?.member?.name === "Test Gold User";
    record("TC011", "Member Auth", "Login with registered phone number", ok, `Status ${r.status}, Phone match`);
  } catch (e: any) {
    record("TC011", "Member Auth", "Login with registered phone number", false, e.message);
  }

  // TC012
  try {
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: "Test Gold User", password: "password123" }),
    });
    const ok = r.status === 200 && r.json?.member?.name === "Test Gold User";
    record("TC012", "Member Auth", "Login with member name", ok, `Status ${r.status}, Name match`);
  } catch (e: any) {
    record("TC012", "Member Auth", "Login with member name", false, e.message);
  }

  // TC013
  try {
    const email = `${testEmailPrefix}_gold@test.com`.toUpperCase();
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "password123" }),
    });
    const ok = r.status === 200 && r.json?.ok === true;
    record("TC013", "Member Auth", "Login case-insensitivity check (UPPERCASE email)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC013", "Member Auth", "Login case-insensitivity check (UPPERCASE email)", false, e.message);
  }

  // TC014
  try {
    const email = `${testEmailPrefix}_gold@test.com`;
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: email, password: "wrongpassword" }),
    });
    const ok = r.status === 401;
    record("TC014", "Member Auth", "Reject login with wrong password", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC014", "Member Auth", "Reject login with wrong password", false, e.message);
  }

  // TC015
  try {
    const r = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: "nonexistent@user.com", password: "password123" }),
    });
    const ok = r.status === 401;
    record("TC015", "Member Auth", "Reject login with non-existent identifier", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC015", "Member Auth", "Reject login with non-existent identifier", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 2: Session Management & Security (TC016 - TC030)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 2: Session Management & Security ---");

  // TC016
  const hasCookie = goldUserCookie.includes("cc_member_session=");
  record("TC016", "Session Security", "Member login sets cc_member_session cookie", hasCookie, `Cookie present: ${hasCookie}`);

  // TC017
  const isHttpOnly = goldUserCookie.toLowerCase().includes("httponly");
  record("TC017", "Session Security", "Member cookie has HttpOnly flag set", isHttpOnly, `HttpOnly: ${isHttpOnly}`);

  // TC018
  const hasPath = goldUserCookie.toLowerCase().includes("path=/");
  record("TC018", "Session Security", "Member cookie has Path=/ set", hasPath, `Path=/: ${hasPath}`);

  // TC019
  try {
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: goldUserCookie },
    });
    const ok = r.status === 200 && r.json?.member?.name === "Test Gold User";
    record("TC019", "Session Security", "GET /api/v1/auth/member/me returns authenticated member", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC019", "Session Security", "GET /api/v1/auth/member/me returns authenticated member", false, e.message);
  }

  // TC020
  try {
    const r = await request("/api/v1/auth/member/me");
    const ok = r.json?.member === null;
    record("TC020", "Session Security", "GET /api/v1/auth/member/me without cookie returns member: null", ok, `Member: ${r.json?.member}`);
  } catch (e: any) {
    record("TC020", "Session Security", "GET /api/v1/auth/member/me without cookie returns member: null", false, e.message);
  }

  // TC021
  try {
    const forgedToken = "cc_member_session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMDAifQ.invalidSignature";
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: forgedToken },
    });
    const ok = r.json?.member === null;
    record("TC021", "Session Security", "Reject forged/tampered JWT cookie", ok, `Member: ${r.json?.member}`);
  } catch (e: any) {
    record("TC021", "Session Security", "Reject forged/tampered JWT cookie", false, e.message);
  }

  // TC022
  try {
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: "cc_member_session=garbage_string_12345" },
    });
    const ok = r.json?.member === null;
    record("TC022", "Session Security", "Reject garbage/malformed session cookie", ok, `Member: ${r.json?.member}`);
  } catch (e: any) {
    record("TC022", "Session Security", "Reject garbage/malformed session cookie", false, e.message);
  }

  // TC023
  let logoutCookie = "";
  try {
    const r = await request("/api/v1/auth/member/logout", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
    });
    logoutCookie = r.headers.get("set-cookie") || "";
    const ok = r.status === 200 && (logoutCookie.toLowerCase().includes("max-age=0") || logoutCookie.toLowerCase().includes("expires="));
    record("TC023", "Session Security", "Member logout endpoint clears session cookie", ok, `Set-Cookie: ${logoutCookie.slice(0, 40)}`);
  } catch (e: any) {
    record("TC023", "Session Security", "Member logout endpoint clears session cookie", false, e.message);
  }

  // TC024
  try {
    // Re-login gold member to maintain session for later tests
    const relogin = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: `${testEmailPrefix}_gold@test.com`, password: "password123" }),
    });
    goldUserCookie = relogin.headers.get("set-cookie") || "";
    record("TC024", "Session Security", "Session re-authentication after logout succeeds", relogin.status === 200, `Re-auth status: ${relogin.status}`);
  } catch (e: any) {
    record("TC024", "Session Security", "Session re-authentication after logout succeeds", false, e.message);
  }

  // TC025
  try {
    const staffLogin = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "vikram@champions.club", password: "owner" }),
    });
    staffOwnerCookie = staffLogin.headers.get("set-cookie") || "";
    const hasMemberCookie = staffOwnerCookie.includes("cc_member_session=");
    record("TC025", "Session Security", "Staff login does NOT set cc_member_session cookie", !hasMemberCookie, `Clean staff cookie separation`);
  } catch (e: any) {
    record("TC025", "Session Security", "Staff login does NOT set cc_member_session cookie", false, e.message);
  }

  // TC026
  try {
    const r = await request("/api/v1/auth/me", {
      headers: { Cookie: goldUserCookie },
    });
    const ok = !r.json?.staff;
    record("TC026", "Session Security", "Member session does NOT grant staff session", ok, `Staff session: ${r.json?.staff}`);
  } catch (e: any) {
    record("TC026", "Session Security", "Member session does NOT grant staff session", false, e.message);
  }

  // TC027
  try {
    const secret = new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-change-me");
    const expiredToken = await new SignJWT({ sub: "1", type: "member" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 50000)
      .sign(secret);
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: `cc_member_session=${expiredToken}` },
    });
    const ok = r.json?.member === null;
    record("TC027", "Session Security", "Reject expired JWT token", ok, `Member: ${r.json?.member}`);
  } catch (e: any) {
    record("TC027", "Session Security", "Reject expired JWT token", false, e.message);
  }

  // TC028
  try {
    const wrongSecret = new TextEncoder().encode("completely_wrong_secret_key");
    const badToken = await new SignJWT({ sub: "1", type: "member" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(wrongSecret);
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: `cc_member_session=${badToken}` },
    });
    const ok = r.json?.member === null;
    record("TC028", "Session Security", "Reject token signed with wrong secret key", ok, `Member: ${r.json?.member}`);
  } catch (e: any) {
    record("TC028", "Session Security", "Reject token signed with wrong secret key", false, e.message);
  }

  // TC029
  try {
    const r = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Auto Auth User",
        email: `${testEmailPrefix}_autoauth@test.com`,
        phone: "98" + Math.floor(10000000 + Math.random() * 90000000),
        password: "password123",
      }),
    });
    const hasCookie = (r.headers.get("set-cookie") || "").includes("cc_member_session=");
    const ok = r.status === 200 && hasCookie && r.json?.member?.id;
    record("TC029", "Session Security", "Signup automatically sets session cookie and returns member DTO", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC029", "Session Security", "Signup automatically sets session cookie and returns member DTO", false, e.message);
  }

  // TC030
  try {
    const r = await request("/api/v1/auth/member/me", {
      headers: { Cookie: goldUserCookie },
    });
    const hasValidSub = typeof r.json?.member?.id === "number" && r.json?.member?.id > 0;
    record("TC030", "Session Security", "Token payload verified with valid member ID", hasValidSub, `Member ID: ${r.json?.member?.id}`);
  } catch (e: any) {
    record("TC030", "Session Security", "Token payload verified with valid member ID", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 3: Membership Tiers, Pricing & Upgrades (TC031 - TC045)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 3: Membership Tiers, Pricing & Upgrades ---");

  const goldPlan = await db.plan.findUnique({ where: { code: "gold" } });
  const silverPlan = await db.plan.findUnique({ where: { code: "silver" } });
  const juniorPlan = await db.plan.findUnique({ where: { code: "junior" } });

  record("TC031", "Tier Pricing", "Gold member tennis court price is ₹300/hr", goldPlan?.tennisPrice === 300, `Tennis: ₹${goldPlan?.tennisPrice}`);
  record("TC032", "Tier Pricing", "Gold member cricket turf price is ₹500/hr", goldPlan?.cricketPrice === 500, `Cricket: ₹${goldPlan?.cricketPrice}`);
  record("TC033", "Tier Pricing", "Gold member shop discount is 15%", goldPlan?.shopDiscount === 15, `Shop discount: ${goldPlan?.shopDiscount}%`);
  record("TC034", "Tier Pricing", "Gold member bar discount is 20%", goldPlan?.barDiscount === 20, `Bar discount: ${goldPlan?.barDiscount}%`);

  record("TC035", "Tier Pricing", "Silver member tennis court price is ₹400/hr", silverPlan?.tennisPrice === 400, `Tennis: ₹${silverPlan?.tennisPrice}`);
  record("TC036", "Tier Pricing", "Silver member cricket turf price is ₹650/hr", silverPlan?.cricketPrice === 650, `Cricket: ₹${silverPlan?.cricketPrice}`);
  record("TC037", "Tier Pricing", "Silver member shop discount is 10%", silverPlan?.shopDiscount === 10, `Shop discount: ${silverPlan?.shopDiscount}%`);
  record("TC038", "Tier Pricing", "Silver member bar discount is 10%", silverPlan?.barDiscount === 10, `Bar discount: ${silverPlan?.barDiscount}%`);

  record("TC039", "Tier Pricing", "Junior member tennis court price is ₹250/hr", juniorPlan?.tennisPrice === 250, `Tennis: ₹${juniorPlan?.tennisPrice}`);
  record("TC040", "Tier Pricing", "Junior member cricket turf price is ₹400/hr", juniorPlan?.cricketPrice === 400, `Cricket: ₹${juniorPlan?.cricketPrice}`);
  record("TC041", "Tier Pricing", "Junior member shop discount is 5%", juniorPlan?.shopDiscount === 5, `Shop discount: ${juniorPlan?.shopDiscount}%`);
  record("TC042", "Tier Pricing", "Junior member bar discount is 0%", juniorPlan?.barDiscount === 0, `Bar discount: ${juniorPlan?.barDiscount}%`);

  // TC043
  try {
    const r = await request("/api/v1/auth/member/me", { headers: { Cookie: freeUserCookie } });
    const ok = r.json?.member?.plan === null;
    record("TC043", "Tier Pricing", "Free member has plan: null (pays walk-in baseline rates)", ok, `Plan: ${r.json?.member?.plan}`);
  } catch (e: any) {
    record("TC043", "Tier Pricing", "Free member has plan: null", false, e.message);
  }

  // TC044
  try {
    const r = await request("/api/v1/members/buy-plan", {
      method: "POST",
      headers: { Cookie: freeUserCookie },
      body: JSON.stringify({ planCode: "gold" }),
    });
    const check = await request("/api/v1/auth/member/me", { headers: { Cookie: freeUserCookie } });
    const ok = r.status === 200 && check.json?.member?.plan?.code === "gold" && check.json?.member?.state === "active";
    record("TC044", "Tier Pricing", "Upgrade member from 'none' to 'gold' activates plan and dates", ok, `Plan: ${check.json?.member?.plan?.name}, State: ${check.json?.member?.state}`);
  } catch (e: any) {
    record("TC044", "Tier Pricing", "Upgrade member from 'none' to 'gold' activates plan and dates", false, e.message);
  }

  // TC045
  try {
    const r = await request("/api/v1/members/buy-plan", {
      method: "POST",
      headers: { Cookie: freeUserCookie },
      body: JSON.stringify({ planCode: "platinum_nonexistent" }),
    });
    const ok = r.status === 400 || r.status === 404;
    record("TC045", "Tier Pricing", "Reject buy-plan with invalid plan code", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC045", "Tier Pricing", "Reject buy-plan with invalid plan code", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 4: Court Booking Validation & Edge Cases (TC046 - TC065)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 4: Court Booking Validation & Edge Cases ---");

  const futureDate1 = getFutureDate(3);
  const futureDate2 = getFutureDate(4);

  // TC046
  let bookedCourtId = 1;
  let bookedSlot = 480; // 8:00 AM
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: bookedCourtId,
        date: futureDate1,
        start: bookedSlot,
        name: "Test Gold User",
        phone: goldUserPhone,
        type: "REGULAR",
      }),
    });
    const ok = r.status === 201 && r.json?.price === 300;
    record("TC046", "Court Booking", "Successful court booking by active Gold member at ₹300 rate", ok, `Status ${r.status}, Price: ₹${r.json?.price}`);
  } catch (e: any) {
    record("TC046", "Court Booking", "Successful court booking by active Gold member", false, e.message);
  }

  // TC047
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: silverUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: futureDate1,
        start: 480,
        name: "Test Silver User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 201 && r.json?.price === 400;
    record("TC047", "Court Booking", "Successful court booking by active Silver member at ₹400 rate", ok, `Status ${r.status}, Price: ₹${r.json?.price}`);
  } catch (e: any) {
    record("TC047", "Court Booking", "Successful court booking by active Silver member", false, e.message);
  }

  // TC048
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: juniorUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: futureDate1,
        start: 540, // 9:00 AM
        name: "Test Junior User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 201 && r.json?.price === 250;
    record("TC048", "Court Booking", "Successful court booking by active Junior member at ₹250 rate", ok, `Status ${r.status}, Price: ₹${r.json?.price}`);
  } catch (e: any) {
    record("TC048", "Court Booking", "Successful court booking by active Junior member", false, e.message);
  }

  // TC049
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        courtId: 1,
        date: futureDate1,
        start: 600,
        name: "Anonymous User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 401;
    record("TC049", "Court Booking", "Regular booking by unauthenticated visitor rejected with 401", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC049", "Court Booking", "Regular booking by unauthenticated visitor rejected with 401", false, e.message);
  }

  // TC050: Create fresh member with no plan to test gating
  try {
    const rSignup = await request("/api/v1/auth/member/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Gated Member",
        email: `${testEmailPrefix}_gated@test.com`,
        phone: "98" + Math.floor(10000000 + Math.random() * 90000000),
        password: "password123",
        planCode: "none",
      }),
    });
    const gatedCookie = rSignup.headers.get("set-cookie") || "";
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: gatedCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate1,
        start: 600,
        name: "Gated Member",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 403;
    record("TC050", "Court Booking", "Regular booking by member without plan rejected with 403", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC050", "Court Booking", "Regular booking by member without plan rejected with 403", false, e.message);
  }

  // TC051: Test with seeded expired member Ananya Iyer
  try {
    const rLogin = await request("/api/v1/auth/member/login", {
      method: "POST",
      body: JSON.stringify({ identifier: "ananya@example.com", password: "demo1234" }),
    });
    expiredUserCookie = rLogin.headers.get("set-cookie") || "";
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: expiredUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate1,
        start: 600,
        name: "Ananya Iyer",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 403;
    record("TC051", "Court Booking", "Regular booking by member with expired plan rejected with 403", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC051", "Court Booking", "Regular booking by member with expired plan rejected with 403", false, e.message);
  }

  // TC052: Double booking prevention (same court, date, exact start time)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: bookedCourtId,
        date: futureDate1,
        start: bookedSlot, // Already booked in TC046
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 409;
    record("TC052", "Court Booking", "Double booking prevention (same start time rejected with 409)", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC052", "Court Booking", "Double booking prevention", false, e.message);
  }

  // TC053: Overlapping booking prevention (starts 30 min after 60-min booking)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: bookedCourtId,
        date: futureDate1,
        start: bookedSlot + 30, // 8:30 AM conflicts with 8:00-9:00 AM
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 409;
    record("TC053", "Court Booking", "Overlapping booking prevention (slot +30 min rejected with 409)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC053", "Court Booking", "Overlapping booking prevention", false, e.message);
  }

  // TC054: Booking in the past date
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: getPastDate(2),
        start: 600,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC054", "Court Booking", "Booking past date rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC054", "Court Booking", "Booking past date rejected with 400", false, e.message);
  }

  // TC055: Booking past time today
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: new Date().toISOString().slice(0, 10),
        start: 360, // 6:00 AM (already past at 11:30 PM)
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC055", "Court Booking", "Booking past time slot today rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC055", "Court Booking", "Booking past time slot today rejected with 400", false, e.message);
  }

  // TC056: Booking before opening time (5:30 AM = 330 mins)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 330,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC056", "Court Booking", "Booking before opening time (5:30 AM) rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC056", "Court Booking", "Booking before opening time rejected with 400", false, e.message);
  }

  // TC057: Booking after closing/last start (10:00 PM = 1320 mins)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 1320,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC057", "Court Booking", "Booking after last start time (10:00 PM) rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC057", "Court Booking", "Booking after last start time rejected with 400", false, e.message);
  }

  // TC058: Booking non-30-minute aligned start (e.g. 8:15 AM = 495 mins)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 495,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC058", "Court Booking", "Booking non-30-min start (8:15 AM) rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC058", "Court Booking", "Booking non-30-min start rejected with 400", false, e.message);
  }

  // TC059: Non-existent court ID (99999)
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 99999,
        date: futureDate2,
        start: 600,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 404;
    record("TC059", "Court Booking", "Booking non-existent court ID (99999) rejected with 404", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC059", "Court Booking", "Booking non-existent court ID rejected with 404", false, e.message);
  }

  // TC060: Invalid date string format
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: "tomorrow",
        start: 600,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 400;
    record("TC060", "Court Booking", "Invalid date format string rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC060", "Court Booking", "Invalid date format string rejected with 400", false, e.message);
  }

  // TC061: Tier-based daily limit (Silver: 2 bookings/day max) enforced
  try {
    // 2nd booking for Test Silver User on futureDate1 (already has 1 from TC047)
    await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: silverUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: futureDate1,
        start: 600,
        name: "Test Silver User",
        type: "REGULAR",
      }),
    });
    // Attempt 3rd booking for Test Silver User on same day (rejected with 409)
    const r3 = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: silverUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: futureDate1,
        start: 720,
        name: "Test Silver User",
        type: "REGULAR",
      }),
    });
    const ok = r3.status === 409 && (r3.json?.error?.toLowerCase().includes("two bookings") || r3.json?.error?.includes("2 bookings") || r3.json?.error?.includes("2 slots"));
    record("TC061", "Court Booking", "Daily limit of 2 bookings per person enforced (3rd rejected with 409)", ok, `Status ${r3.status}, Error: ${r3.json?.error}`);
  } catch (e: any) {
    record("TC061", "Court Booking", "Daily limit of 2 bookings per person enforced", false, e.message);
  }

  // TC062: Free trial booking price = 0
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 660,
        name: "Trial Visitor",
        phone: "9876543210",
        type: "TRIAL",
      }),
    });
    const ok = r.status === 201 && r.json?.price === 0;
    record("TC062", "Court Booking", "Trial booking is free (price = 0)", ok, `Status ${r.status}, Price: ₹${r.json?.price}`);
  } catch (e: any) {
    record("TC062", "Court Booking", "Trial booking is free", false, e.message);
  }

  // TC063: Trial booking requires valid 10-digit phone
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 720,
        name: "Trial Visitor",
        phone: "123",
        type: "TRIAL",
      }),
    });
    const ok = r.status === 400;
    record("TC063", "Court Booking", "Trial booking without 10-digit phone rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC063", "Court Booking", "Trial booking without 10-digit phone rejected with 400", false, e.message);
  }

  // TC064: Cricket turf price for Gold member (Court ID 3) is ₹500
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 3,
        date: futureDate2,
        start: 780,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const ok = r.status === 201 && r.json?.price === 500;
    record("TC064", "Court Booking", "Cricket turf booking at Gold rate ₹500/hr (vs ₹800 walk-in)", ok, `Status ${r.status}, Price: ₹${r.json?.price}`);
  } catch (e: any) {
    record("TC064", "Court Booking", "Cricket turf booking at Gold rate ₹500/hr", false, e.message);
  }

  // TC065: Member cannot impersonate another member's name
  try {
    const r = await request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: silverUserCookie },
      body: JSON.stringify({
        courtId: 1,
        date: futureDate2,
        start: 840,
        name: "Aarav Mehta", // Attempting to book under Aarav's name using Silver user's cookie
        type: "REGULAR",
      }),
    });
    // Server enforces input.name = memberUser.name
    const bookedWho = r.json?.who;
    const ok = r.status === 201 && bookedWho === "Test Silver User";
    record("TC065", "Court Booking", "Member impersonation blocked: booking forced to authenticated member's name", ok, `Booked name: ${bookedWho}`);
  } catch (e: any) {
    record("TC065", "Court Booking", "Member impersonation blocked", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 5: Pro Shop Ordering & Inventory Logic (TC066 - TC077)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 5: Pro Shop Ordering & Inventory Logic ---");

  // Racket price is ₹4,500
  const racket = await db.product.findFirst({ where: { name: { contains: "Racket" } } });
  const racketId = racket?.id || 1;

  // TC066: Walk-in shop order 0% discount
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Walk-in Buyer",
        phone: "9876543210",
        payMethod: "UPI",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const ok = r.status === 201 && r.json?.discount === 0 && r.json?.total === 4500;
    record("TC066", "Shop & Stock", "Walk-in shop order receives 0% discount", ok, `Subtotal: ₹${r.json?.subtotal}, Discount: ₹${r.json?.discount}, Total: ₹${r.json?.total}`);
  } catch (e: any) {
    record("TC066", "Shop & Stock", "Walk-in shop order receives 0% discount", false, e.message);
  }

  // TC067: Gold member shop order 15% discount
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Gold User",
        phone: goldUserPhone,
        payMethod: "CARD",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const expectedDiscount = Math.round(4500 * 0.15); // 675
    const ok = r.status === 201 && r.json?.discount === expectedDiscount && r.json?.total === 4500 - 675;
    record("TC067", "Shop & Stock", "Gold member receives 15% discount on shop order", ok, `Discount: ₹${r.json?.discount} (expected ₹675), Total: ₹${r.json?.total}`);
  } catch (e: any) {
    record("TC067", "Shop & Stock", "Gold member receives 15% discount on shop order", false, e.message);
  }

  // TC068: Silver member shop order 10% discount
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Silver User",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const expectedDiscount = Math.round(4500 * 0.10); // 450
    const ok = r.status === 201 && r.json?.discount === expectedDiscount;
    record("TC068", "Shop & Stock", "Silver member receives 10% discount on shop order", ok, `Discount: ₹${r.json?.discount} (expected ₹450)`);
  } catch (e: any) {
    record("TC068", "Shop & Stock", "Silver member receives 10% discount on shop order", false, e.message);
  }

  // TC069: Junior member shop order 5% discount
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Junior User",
        phone: "9876543210",
        payMethod: "UPI",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const expectedDiscount = Math.round(4500 * 0.05); // 225
    const ok = r.status === 201 && r.json?.discount === expectedDiscount;
    record("TC069", "Shop & Stock", "Junior member receives 5% discount on shop order", ok, `Discount: ₹${r.json?.discount} (expected ₹225)`);
  } catch (e: any) {
    record("TC069", "Shop & Stock", "Junior member receives 5% discount on shop order", false, e.message);
  }

  // TC070: Expired member gets 0% discount on shop order
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Ananya Iyer",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const ok = r.status === 201 && r.json?.discount === 0;
    record("TC070", "Shop & Stock", "Expired member gets 0% discount on shop order", ok, `Discount: ₹${r.json?.discount}`);
  } catch (e: any) {
    record("TC070", "Shop & Stock", "Expired member gets 0% discount on shop order", false, e.message);
  }

  // TC071: Out of stock product rejected (Water Bottle stock = 0)
  try {
    const bottle = await db.product.findFirst({ where: { name: { contains: "Water Bottle" } } });
    const bottleId = bottle?.id || 10;
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Walk-in",
        phone: "9876543210",
        payMethod: "UPI",
        items: [{ productId: bottleId, qty: 1 }],
      }),
    });
    const ok = r.status === 409 && r.json?.error?.includes("out of stock");
    record("TC071", "Shop & Stock", "Ordering out-of-stock item (stock=0) rejected with 409", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC071", "Shop & Stock", "Ordering out-of-stock item rejected with 409", false, e.message);
  }

  // TC072: Ordering quantity exceeding available stock rejected
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Bulk Buyer",
        phone: "9876543210",
        payMethod: "UPI",
        items: [{ productId: racketId, qty: 25 }],
      }),
    });
    const ok = r.status === 409 && r.json?.error?.includes("Only");
    record("TC072", "Shop & Stock", "Ordering quantity exceeding stock rejected with 409", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC072", "Shop & Stock", "Ordering quantity exceeding stock rejected with 409", false, e.message);
  }

  // TC073: Invalid payment method rejected
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Buyer",
        phone: "9876543210",
        payMethod: "BITCOIN",
        items: [{ productId: racketId, qty: 1 }],
      }),
    });
    const ok = r.status === 400;
    record("TC073", "Shop & Stock", "Invalid payment method rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC073", "Shop & Stock", "Invalid payment method rejected with 400", false, e.message);
  }

  // TC074: Bar product in shop order rejected
  try {
    const coffee = await db.product.findFirst({ where: { category: "BAR" } });
    const coffeeId = coffee?.id || 11;
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Buyer",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: coffeeId, qty: 1 }],
      }),
    });
    const ok = r.status === 400 && r.json?.error?.includes("not sold here");
    record("TC074", "Shop & Stock", "Category mismatch: Bar item ordered via shop rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC074", "Shop & Stock", "Category mismatch: Bar item ordered via shop rejected with 400", false, e.message);
  }

  // TC075: Non-existent product ID rejected
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Buyer",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: 99999, qty: 1 }],
      }),
    });
    const ok = r.status === 400 && r.json?.error?.includes("does not exist");
    record("TC075", "Shop & Stock", "Order with non-existent product ID rejected with 400", ok, `Status ${r.status}, Error: ${r.json?.error}`);
  } catch (e: any) {
    record("TC075", "Shop & Stock", "Order with non-existent product ID rejected with 400", false, e.message);
  }

  // TC076: Negative or zero quantity rejected
  try {
    const r = await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Buyer",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: racketId, qty: -2 }],
      }),
    });
    const ok = r.status === 400;
    record("TC076", "Shop & Stock", "Order with negative quantity rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC076", "Shop & Stock", "Order with negative quantity rejected with 400", false, e.message);
  }

  // TC077: Stock deduction verified on order completion
  try {
    const ball = await db.product.findFirst({ where: { name: { contains: "Tennis Balls" } } });
    const startStock = ball?.stock || 0;
    await request("/api/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        name: "Stock Checker",
        phone: "9876543210",
        payMethod: "CASH",
        items: [{ productId: ball!.id, qty: 2 }],
      }),
    });
    const updated = await db.product.findUnique({ where: { id: ball!.id } });
    const ok = updated?.stock === startStock - 2;
    record("TC077", "Shop & Stock", "Inventory decrement verified after order", ok, `Stock: ${startStock} -> ${updated?.stock}`);
  } catch (e: any) {
    record("TC077", "Shop & Stock", "Inventory decrement verified after order", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 6: Clubhouse Bar Tabs, POS & Settlement (TC078 - TC090)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 6: Clubhouse Bar Tabs & Settlement ---");

  // Log in as Owner/Staff to operate the bar POS
  const staffRes = await request("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@champions.club", password: "champions" }),
  });
  staffOwnerCookie = staffRes.headers.get("set-cookie") || "";

  const coffee = await db.product.findFirst({ where: { category: "BAR", name: { contains: "Coffee" } } });
  const coffeeId = coffee?.id || 11;
  const sandwich = await db.product.findFirst({ where: { category: "BAR", name: { contains: "Sandwich" } } });
  const sandwichId = sandwich?.id || 13;

  // TC078: Open tab for member
  let goldTabId = 0;
  try {
    const r = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Test Gold User", tableNo: 5 }),
    });
    goldTabId = r.json?.id;
    const ok = r.status === 201 && r.json?.status === "OPEN" && r.json?.tableNo === 5;
    record("TC078", "Bar & POS", "Open bar tab for member on Table 5", ok, `Tab ID: ${goldTabId}, Status: ${r.json?.status}`);
  } catch (e: any) {
    record("TC078", "Bar & POS", "Open bar tab for member", false, e.message);
  }

  // TC079: Open tab for walk-in
  let walkinTabId = 0;
  try {
    const r = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Walk-in Guest", tableNo: 2 }),
    });
    walkinTabId = r.json?.id;
    const ok = r.status === 201 && r.json?.status === "OPEN";
    record("TC079", "Bar & POS", "Open bar tab for walk-in guest on Table 2", ok, `Tab ID: ${walkinTabId}`);
  } catch (e: any) {
    record("TC079", "Bar & POS", "Open bar tab for walk-in guest", false, e.message);
  }

  // TC080: Add items to open tab
  try {
    const r = await request(`/api/v1/tabs/${goldTabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 2 }] }), // 180 * 2 = 360
    });
    const ok = r.status === 200 && r.json?.subtotal === 360;
    record("TC080", "Bar & POS", "Add bar items to open tab updates subtotal correctly", ok, `Subtotal: ₹${r.json?.subtotal}`);
  } catch (e: any) {
    record("TC080", "Bar & POS", "Add bar items to open tab updates subtotal", false, e.message);
  }

  // TC081: Gear item added to bar tab rejected
  try {
    const r = await request(`/api/v1/tabs/${goldTabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: racketId, qty: 1 }] }),
    });
    const ok = r.status === 400 && r.json?.error?.includes("not sold here");
    record("TC081", "Bar & POS", "Category mismatch: Gear item added to bar tab rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC081", "Bar & POS", "Category mismatch: Gear item added to bar tab rejected with 400", false, e.message);
  }

  // TC082: Settle bar tab for walk-in: 0% discount
  try {
    await request(`/api/v1/tabs/${walkinTabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 1 }] }), // 180
    });
    const r = await request(`/api/v1/tabs/${walkinTabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "UPI" }),
    });
    const ok = r.status === 200 && r.json?.status === "SETTLED" && r.json?.discountPct === 0 && r.json?.total === 180;
    record("TC082", "Bar & POS", "Settle walk-in tab applies 0% discount", ok, `Discount: ${r.json?.discountPct}%, Total: ₹${r.json?.total}`);
  } catch (e: any) {
    record("TC082", "Bar & POS", "Settle walk-in tab applies 0% discount", false, e.message);
  }

  // TC083: Settle bar tab for Gold member: 20% discount
  try {
    const r = await request(`/api/v1/tabs/${goldTabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CARD" }),
    });
    // Subtotal was 360, 20% discount = 72, total = 288
    const ok = r.status === 200 && r.json?.status === "SETTLED" && r.json?.discountPct === 20 && r.json?.total === 288;
    record("TC083", "Bar & POS", "Settle Gold member tab applies 20% discount automatically", ok, `Discount: ${r.json?.discountPct}%, Total: ₹${r.json?.total} (expected ₹288)`);
  } catch (e: any) {
    record("TC083", "Bar & POS", "Settle Gold member tab applies 20% discount", false, e.message);
  }

  // TC084: Settle bar tab for Silver member: 10% discount
  try {
    const openRes = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Test Silver User", tableNo: 7 }),
    });
    const tabId = openRes.json?.id;
    await request(`/api/v1/tabs/${tabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 1 }] }), // 180
    });
    const r = await request(`/api/v1/tabs/${tabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CASH" }),
    });
    const ok = r.status === 200 && r.json?.discountPct === 10;
    record("TC084", "Bar & POS", "Settle Silver member tab applies 10% discount automatically", ok, `Discount: ${r.json?.discountPct}%`);
  } catch (e: any) {
    record("TC084", "Bar & POS", "Settle Silver member tab applies 10% discount", false, e.message);
  }

  // TC085: Settle bar tab for Junior member: 0% discount
  try {
    const openRes = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Test Junior User", tableNo: 8 }),
    });
    const tabId = openRes.json?.id;
    await request(`/api/v1/tabs/${tabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 1 }] }),
    });
    const r = await request(`/api/v1/tabs/${tabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "UPI" }),
    });
    const ok = r.status === 200 && r.json?.discountPct === 0;
    record("TC085", "Bar & POS", "Settle Junior member tab applies 0% bar discount", ok, `Discount: ${r.json?.discountPct}%`);
  } catch (e: any) {
    record("TC085", "Bar & POS", "Settle Junior member tab applies 0% bar discount", false, e.message);
  }

  // TC086: Settle bar tab for expired member: 0% discount
  try {
    const openRes = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Ananya Iyer", tableNo: 6 }),
    });
    const tabId = openRes.json?.id;
    await request(`/api/v1/tabs/${tabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 1 }] }),
    });
    const r = await request(`/api/v1/tabs/${tabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CASH" }),
    });
    const ok = r.status === 200 && r.json?.discountPct === 0;
    record("TC086", "Bar & POS", "Settle expired member tab applies 0% discount", ok, `Discount: ${r.json?.discountPct}%`);
  } catch (e: any) {
    record("TC086", "Bar & POS", "Settle expired member tab applies 0% discount", false, e.message);
  }

  // TC087: Adding items to an already settled tab rejected
  try {
    const r = await request(`/api/v1/tabs/${goldTabId}/items`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ items: [{ productId: coffeeId, qty: 1 }] }),
    });
    const ok = r.status === 409 && r.json?.error?.includes("already settled");
    record("TC087", "Bar & POS", "Adding items to an already settled tab rejected with 409", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC087", "Bar & POS", "Adding items to an already settled tab rejected with 409", false, e.message);
  }

  // TC088: Settling an already settled tab rejected
  try {
    const r = await request(`/api/v1/tabs/${goldTabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CASH" }),
    });
    const ok = r.status === 409 && r.json?.error?.includes("already settled");
    record("TC088", "Bar & POS", "Settling an already settled tab rejected with 409", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC088", "Bar & POS", "Settling an already settled tab rejected with 409", false, e.message);
  }

  // TC089: Settling tab with invalid payment method rejected
  try {
    const openRes = await request("/api/v1/tabs", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ who: "Payment Tester" }),
    });
    const tabId = openRes.json?.id;
    const r = await request(`/api/v1/tabs/${tabId}/settle`, {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CRYPTO" }),
    });
    const ok = r.status === 400;
    record("TC089", "Bar & POS", "Settling tab with invalid payment method rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC089", "Bar & POS", "Settling tab with invalid payment method rejected with 400", false, e.message);
  }

  // TC090: Settling non-existent tab ID (99999) rejected
  try {
    const r = await request("/api/v1/tabs/99999/settle", {
      method: "POST",
      headers: { Cookie: staffOwnerCookie },
      body: JSON.stringify({ payMethod: "CASH" }),
    });
    const ok = r.status === 404;
    record("TC090", "Bar & POS", "Settling non-existent tab ID (99999) rejected with 404", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC090", "Bar & POS", "Settling non-existent tab ID rejected with 404", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // CATEGORY 7: Staff RBAC, Isolation & Loopholes (TC091 - TC100)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Category 7: Staff RBAC, Isolation & Loopholes ---");

  // TC091: Member cookie cannot access GET /api/v1/bookings
  try {
    const r = await request("/api/v1/bookings", {
      headers: { Cookie: goldUserCookie },
    });
    const ok = r.status === 401 || r.status === 403;
    record("TC091", "RBAC Security", "Member cookie blocked from staff bookings endpoint (GET /bookings)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC091", "RBAC Security", "Member cookie blocked from staff bookings endpoint", false, e.message);
  }

  // TC092: Member cookie cannot access GET /api/v1/dashboard
  try {
    const r = await request("/api/v1/dashboard", {
      headers: { Cookie: goldUserCookie },
    });
    const ok = r.status === 401 || r.status === 403;
    record("TC092", "RBAC Security", "Member cookie blocked from owner dashboard (GET /dashboard)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC092", "RBAC Security", "Member cookie blocked from owner dashboard", false, e.message);
  }

  // TC093: Member cookie cannot create members via staff API
  try {
    const r = await request("/api/v1/members", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({ name: "Hacked", phone: "9876543210", planCode: "gold" }),
    });
    const ok = r.status === 401 || r.status === 403;
    record("TC093", "RBAC Security", "Member cookie blocked from staff member creation (POST /members)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC093", "RBAC Security", "Member cookie blocked from staff member creation", false, e.message);
  }

  // TC094: Front desk staff cannot access Owner dashboard
  try {
    const deskLogin = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "neha@champions.club", password: "demo1234" }),
    });
    staffDeskCookie = deskLogin.headers.get("set-cookie") || "";
    const r = await request("/api/v1/dashboard", {
      headers: { Cookie: staffDeskCookie },
    });
    const ok = r.status === 403;
    record("TC094", "RBAC Security", "Front desk staff blocked from owner dashboard (403)", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC094", "RBAC Security", "Front desk staff blocked from owner dashboard", false, e.message);
  }

  // TC095: Unauthenticated access to staff endpoints rejected
  try {
    const r = await request("/api/v1/dashboard");
    const ok = r.status === 401;
    record("TC095", "RBAC Security", "Unauthenticated request to owner dashboard rejected with 401", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC095", "RBAC Security", "Unauthenticated request to owner dashboard rejected with 401", false, e.message);
  }

  // TC096: Member lookup endpoint does NOT leak password hash or email
  try {
    const r = await request("/api/v1/members/lookup?name=Aarav Mehta");
    const hasHash = r.json?.member?.passwordHash !== undefined;
    const hasEmail = r.json?.member?.email !== undefined;
    const ok = r.status === 200 && !hasHash && !hasEmail;
    record("TC096", "Data Privacy", "Member lookup endpoint does NOT leak password hashes or email addresses", ok, `Hash exposed: ${hasHash}, Email exposed: ${hasEmail}`);
  } catch (e: any) {
    record("TC096", "Data Privacy", "Member lookup endpoint does NOT leak password hashes or email addresses", false, e.message);
  }

  // TC097: Member lookup endpoint returns correct plan rates
  try {
    const r = await request("/api/v1/members/lookup?name=Aarav Mehta");
    const ok = r.status === 200 && r.json?.member?.plan === "Gold" && r.json?.member?.tennisPrice === 300;
    record("TC097", "Data Privacy", "Member lookup returns accurate member plan name and rate", ok, `Plan: ${r.json?.member?.plan}, Tennis: ₹${r.json?.member?.tennisPrice}`);
  } catch (e: any) {
    record("TC097", "Data Privacy", "Member lookup returns accurate member plan name and rate", false, e.message);
  }

  // TC098: Enquiries submission creates enquiry successfully
  try {
    const r = await request("/api/v1/enquiries", {
      method: "POST",
      body: JSON.stringify({
        name: "Enquiry Tester",
        contact: "enquiry@test.com",
        interest: "Membership",
        message: "Tell me more about Gold tier",
      }),
    });
    const ok = r.status === 201 && r.json?.status === "NEW";
    record("TC098", "Enquiries", "Website enquiries creation succeeds with status NEW", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC098", "Enquiries", "Website enquiries creation succeeds", false, e.message);
  }

  // TC099: Enquiries submission requires contact
  try {
    const r = await request("/api/v1/enquiries", {
      method: "POST",
      body: JSON.stringify({
        name: "No Contact",
        contact: "",
        interest: "Membership",
      }),
    });
    const ok = r.status === 400;
    record("TC099", "Enquiries", "Enquiries submission without contact rejected with 400", ok, `Status ${r.status}`);
  } catch (e: any) {
    record("TC099", "Enquiries", "Enquiries submission without contact rejected with 400", false, e.message);
  }

  // TC100: Concurrency Race Condition Stress Test
  // Two concurrent booking requests firing at the exact same millisecond for the exact same slot
  try {
    const raceSlot = 900; // 3:00 PM
    const raceDate = getFutureDate(5);
    const req1 = request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: goldUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: raceDate,
        start: raceSlot,
        name: "Test Gold User",
        type: "REGULAR",
      }),
    });
    const req2 = request("/api/v1/bookings", {
      method: "POST",
      headers: { Cookie: silverUserCookie },
      body: JSON.stringify({
        courtId: 2,
        date: raceDate,
        start: raceSlot,
        name: "Test Silver User",
        type: "REGULAR",
      }),
    });

    const [res1, res2] = await Promise.all([req1, req2]);
    const statuses = [res1.status, res2.status].sort();
    // Exactly one must succeed (201) and exactly one must fail with conflict (409)
    const raceHandledCleanly = statuses[0] === 201 && statuses[1] === 409;
    record(
      "TC100",
      "Concurrency & Transactions",
      "Concurrent double-booking race condition: exactly 1 wins, 1 receives 409",
      raceHandledCleanly,
      `Statuses: ${res1.status} and ${res2.status}`,
      raceHandledCleanly ? undefined : "Race condition loophole: both succeeded or unexpected error",
    );
  } catch (e: any) {
    record("TC100", "Concurrency & Transactions", "Concurrent double-booking race condition", false, e.message);
  }

  // -----------------------------------------------------------------------------------------
  // FINAL SUMMARY & AUDIT REPORT
  // -----------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;
  const loopholes = results.filter((r) => !r.passed || r.loopholeFound);

  console.log(`TOTAL TESTCASES: ${total}`);
  console.log(`PASSED: ${passedCount}`);
  console.log(`FAILED: ${failedCount}`);
  console.log("================================================================================");

  if (loopholes.length > 0) {
    console.log("\n⚠️ LOOPHOLES / ISSUES IDENTIFIED:");
    for (const l of loopholes) {
      console.log(`  - [${l.id}] ${l.name}: ${l.loopholeFound || l.details}`);
    }
  } else {
    console.log("\n🎉 ZERO LOOPHOLES DETECTED! All 100 test cases passed with strict integrity.");
  }

  return { total, passedCount, failedCount, loopholes, results };
}

runAllTests()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
