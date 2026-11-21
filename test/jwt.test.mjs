import assert from "node:assert/strict";
import { signJWT, verifyJWT } from "../lib/jwt.ts";
import { validateLoginInput, authenticate } from "../lib/users.ts";
import { canAccess } from "../lib/rbac.ts";

async function runTests() {
  console.log("Starting validation and JWT authentication tests...");

  // 1. Validation tests
  assert.ok(validateLoginInput(null).error, "rejects null body");
  assert.ok(validateLoginInput({}).error, "rejects empty body");
  assert.ok(validateLoginInput({ email: "invalid", password: "password123" }).error, "rejects bad email");
  assert.ok(validateLoginInput({ email: "test@club.com", password: "123" }).error, "rejects short password");
  const valid = validateLoginInput({ email: "  owner@club.com  ", password: "password123" });
  assert.equal(valid.error, undefined, "accepts valid trimmed input");
  assert.equal(valid.email, "owner@club.com");

  // 2. Authentication tests
  const user = authenticate("owner@club.com", "password123");
  assert.ok(user, "authenticates valid user");
  assert.equal(user.role, "owner");
  assert.equal(authenticate("owner@club.com", "wrongpass"), null, "rejects bad password");
  assert.equal(authenticate("unknown@club.com", "password123"), null, "rejects unknown email");

  // 3. JWT Signing & Verification
  const token = await signJWT({ sub: "3", email: "owner@club.com", name: "Vikram Owner", role: "owner" });
  assert.equal(typeof token, "string");
  const parts = token.split(".");
  assert.equal(parts.length, 3, "JWT has 3 parts");

  const verified = await verifyJWT(token);
  assert.ok(verified, "JWT verifies successfully");
  assert.equal(verified.sub, "3");
  assert.equal(verified.role, "owner");

  // 4. JWT Tampering & Expiry
  const tamperedPayload = `${parts[0]}.${Buffer.from(JSON.stringify({ sub: "3", role: "owner" })).toString("base64url")}.${parts[2]}`;
  assert.equal(await verifyJWT(tamperedPayload), null, "tampered payload rejected");

  const tamperedSignature = `${parts[0]}.${parts[1]}.fakeSig12345`;
  assert.equal(await verifyJWT(tamperedSignature), null, "tampered signature rejected");

  const expiredToken = await signJWT({ sub: "1", email: "test@club.com", name: "Test", role: "customer" }, -10);
  assert.equal(await verifyJWT(expiredToken), null, "expired token rejected");

  // 5. Authorization
  assert.equal(canAccess("customer", "employee"), false);
  assert.equal(canAccess("employee", "owner"), false);
  assert.equal(canAccess("owner", "owner"), true);

  console.log("All validation, JWT authentication, and authorization tests passed!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
