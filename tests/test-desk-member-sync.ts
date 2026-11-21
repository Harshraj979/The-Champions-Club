import "dotenv/config";
import { db } from "../lib/db";
import bcrypt from "bcryptjs";

const BASE_URL = "http://localhost:3000";

async function testDeskMemberSync() {
  console.log("=== Testing Front Desk Booking & Membership Sync by Email ===");

  // 1. Staff PIN Login as Front Desk
  const staffRes = await fetch(`${BASE_URL}/api/v1/auth/pin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "FRONT_DESK", pin: "2222" }),
  });
  if (!staffRes.ok) throw new Error(`Staff login failed: ${staffRes.status}`);
  const staffCookie = staffRes.headers.get("set-cookie")?.split(";")[0] || "";
  console.log("✓ Front Desk staff logged in with PIN 2222");

  // 2. Staff avails Gold Membership for new user by email
  const testEmail = `test.desk.${Date.now()}@example.com`;
  const testPhone = "9811998877";
  const testName = "Desk Test Member";

  const availRes = await fetch(`${BASE_URL}/api/v1/members/avail-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staffCookie,
    },
    body: JSON.stringify({
      email: testEmail,
      name: testName,
      phone: testPhone,
      planCode: "gold",
    }),
  });
  const availData = await availRes.json();
  if (!availRes.ok) throw new Error(`Avail plan failed: ${JSON.stringify(availData)}`);
  console.log(`✓ Front Desk availed Gold plan for ${testEmail}:`, availData.name, availData.plan, availData.expiresOn);

  // 3. Staff books a court for this member using their email
  const futureDate = new Date(Date.now() + 86400000 * Math.floor(10 + Math.random() * 20)).toISOString().slice(0, 10);
  const bookRes = await fetch(`${BASE_URL}/api/v1/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: staffCookie,
    },
    body: JSON.stringify({
      courtId: 1,
      date: futureDate,
      start: 540, // 9:00 AM
      name: testName,
      email: testEmail,
      phone: testPhone,
      type: "REGULAR",
    }),
  });
  const bookData = await bookRes.json();
  if (!bookRes.ok) throw new Error(`Desk booking failed: ${JSON.stringify(bookData)}`);
  console.log(`✓ Front Desk booked court for ${testEmail}: Booking ID ${bookData.id}, Court ${bookData.court}, Price ₹${bookData.price}`);

  // 4. Customer logs in using their email and phone as initial password
  const memberLoginRes = await fetch(`${BASE_URL}/api/v1/auth/member/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      password: testPhone,
    }),
  });
  const memberLoginData = await memberLoginRes.json();
  if (!memberLoginRes.ok) throw new Error(`Member login with email failed: ${JSON.stringify(memberLoginData)}`);
  const memberCookie = memberLoginRes.headers.get("set-cookie")?.split(";")[0] || "";
  console.log(`✓ Member successfully logged in with email ${testEmail}! Member name: ${memberLoginData.member.name}`);

  // 5. Customer fetches their portal data
  const meRes = await fetch(`${BASE_URL}/api/v1/auth/member/me`, {
    headers: { Cookie: memberCookie },
  });
  const meData = await meRes.json();
  console.log(`✓ Member session verified:`, meData.member.name, "Plan:", meData.member.plan?.name, "State:", meData.member.state);

  // Check bookings in DB for this member
  const memberRecord = await db.member.findUnique({
    where: { email: testEmail },
    include: { plan: true },
  });
  const bookingsInDb = await db.booking.findMany({
    where: { memberId: memberRecord!.id },
  });
  console.log(`✓ DB Verification: Member ID ${memberRecord!.id} has ${bookingsInDb.length} booking(s) associated.`);

  if (memberRecord?.plan?.code !== "gold") {
    throw new Error(`Expected plan gold, got ${memberRecord?.plan?.code}`);
  }
  if (bookingsInDb.length === 0) {
    throw new Error(`Expected at least 1 booking associated with memberId ${memberRecord?.id}`);
  }

  // 6. Test demo1234 password fallback for member login
  const memberLoginDemoRes = await fetch(`${BASE_URL}/api/v1/auth/member/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: testEmail,
      password: "demo1234",
    }),
  });
  if (!memberLoginDemoRes.ok) throw new Error("Member login with demo1234 fallback failed");
  console.log("✓ Member login also succeeds with demo1234 fallback!");

  console.log("\n ALL FRONT DESK EMAIL BOOKING & MEMBERSHIP SYNC TESTS PASSED!");
}

testDeskMemberSync()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
