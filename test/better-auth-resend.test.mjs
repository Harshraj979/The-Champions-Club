import assert from "node:assert/strict";
import { resend, sendOTPEmail, lastDevOTP } from "../lib/resend.ts";
import { auth, resolveRole } from "../lib/auth.ts";

async function testBetterAuthAndResend() {
  console.log("Testing Resend and Better Auth integration...");

  // 1. Test Resend client initialization
  assert.ok(resend, "Resend client initialized");
  const emailRes = await sendOTPEmail({ email: "test@club.com", otp: "123456" });
  assert.equal(emailRes.ok, true, "sendOTPEmail returns ok");
  assert.equal(lastDevOTP.email, "test@club.com");
  assert.equal(lastDevOTP.otp, "123456");

  // 2. Test role resolution helper
  assert.equal(resolveRole("owner@club.com"), "owner");
  assert.equal(resolveRole("employee@club.com"), "employee");
  assert.equal(resolveRole("staff@club.com"), "employee");
  assert.equal(resolveRole("member@club.com"), "customer");

  // 3. Test Better Auth instance
  assert.ok(auth, "Better Auth instance initialized");
  assert.ok(auth.api, "Better Auth API exposed");
  assert.ok(auth.api.signInEmailOTP, "emailOTP plugin action registered");
  assert.ok(auth.api.sendVerificationOTP, "sendVerificationOTP registered");

  console.log("All Resend and Better Auth integration tests passed!");
}

testBetterAuthAndResend().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
