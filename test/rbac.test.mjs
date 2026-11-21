import assert from "node:assert/strict";
import { canAccess } from "../lib/rbac.ts";

// customer permissions
assert.equal(canAccess("customer", "customer"), true, "customer should access customer");
assert.equal(canAccess("customer", "employee"), false, "customer cannot access employee");
assert.equal(canAccess("customer", "owner"), false, "customer cannot access owner");

// employee permissions
assert.equal(canAccess("employee", "customer"), true, "employee should access customer");
assert.equal(canAccess("employee", "employee"), true, "employee should access employee");
assert.equal(canAccess("employee", "owner"), false, "employee cannot access owner");

// owner permissions
assert.equal(canAccess("owner", "customer"), true, "owner should access customer");
assert.equal(canAccess("owner", "employee"), true, "owner should access employee");
assert.equal(canAccess("owner", "owner"), true, "owner should access owner");

console.log("RBAC assertions passed!");
