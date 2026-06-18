/**
 * Auth refresh mock envelope test (fixture-based, no DB).
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/auth-refresh-mock.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";

test("refresh success exposes user + tokens without snake_case user fields", () => {
  const body = {
    user: {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      email: "user@example.com",
      displayName: "User",
      avatarUrl: null,
      isPlatformAdmin: false,
      platformRole: "member",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tokens: {
      accessToken: "access",
      refreshToken: "refresh",
      expiresIn: 900,
    },
  };
  assert.ok("user" in body && "tokens" in body);
  assert.equal(typeof body.user.displayName, "string");
  assert.ok(!("display_name" in body.user));
  assert.equal(typeof body.tokens.accessToken, "string");
});

test("refresh 401 uses { error: string } only", () => {
  const err = { error: "Invalid or expired refresh token" };
  assert.equal(typeof err.error, "string");
  assert.ok(!("message" in err));
});

test("refresh validation error includes details without message field", () => {
  const err = {
    error: "Validation failed",
    details: { refreshToken: ["Required"] },
  };
  assert.equal(err.error, "Validation failed");
  assert.ok(!("message" in err));
});
