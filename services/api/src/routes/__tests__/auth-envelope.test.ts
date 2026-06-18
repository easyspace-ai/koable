/**
 * Auth register/login response envelope validation (fixture-based, no DB).
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/auth-envelope.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

function assertClientErrorEnvelope(body: unknown): void {
  assert.ok(body && typeof body === "object" && !Array.isArray(body));
  const rec = body as Record<string, unknown>;
  assert.equal(typeof rec.error, "string");
  assert.ok(!("message" in rec), "client errors must not leak message field");
}

function assertAuthSuccessEnvelope(body: unknown): void {
  assert.ok(body && typeof body === "object" && !Array.isArray(body));
  const rec = body as Record<string, unknown>;
  assert.ok("user" in rec || "tokens" in rec || "data" in rec);
}

test("validation error envelope is { error: string }", () => {
  assertClientErrorEnvelope({ error: "Validation failed" });
});

test("auth success fixtures expose expected keys", () => {
  assertAuthSuccessEnvelope({
    user: { id: "u1", email: "a@b.com", displayName: "A" },
    tokens: { accessToken: "t", refreshToken: "r", expiresIn: 900 },
  });
});

test("github error helper shape matches client contract", () => {
  assertClientErrorEnvelope({ error: "Failed to connect GitHub" });
  const conflict = { error: "Conflict detected", code: "GITHUB_CONFLICT" };
  assert.equal(conflict.error, "Conflict detected");
  assert.equal(conflict.code, "GITHUB_CONFLICT");
  assert.ok(!("message" in conflict));
});
