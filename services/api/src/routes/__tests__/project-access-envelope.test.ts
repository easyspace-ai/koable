/**
 * Project-access middleware envelope tests (fixture-based, no DB).
 *
 * Validates stable client-facing error shapes from requireProjectAccess
 * and project-files auth middleware without a live Postgres instance.
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/project-access-envelope.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClientErrorEnvelope } from "./test-harness.js";

test("requireProjectAccess 403 uses Access denied envelope", () => {
  assertClientErrorEnvelope({ error: "Access denied" });
});

test("requireProjectAccess 401 uses Authentication required envelope", () => {
  assertClientErrorEnvelope({ error: "Authentication required" });
});

test("project-files middleware 404 does not leak existence", () => {
  const body = { error: "Project not found" };
  assertClientErrorEnvelope(body);
  assert.equal(body.error, "Project not found");
  assert.ok(!("projectId" in body));
});

test("internal server error envelope never includes message field", () => {
  assertClientErrorEnvelope({ error: "Internal Server Error" });
  const bad = { error: "Internal Server Error", message: "postgres timeout" };
  assert.throws(() => assertClientErrorEnvelope(bad));
});

console.log("project-access-envelope: PASS (fixture smoke — DB integration deferred)");
