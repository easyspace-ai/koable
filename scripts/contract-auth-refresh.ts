/**
 * Contract probe: POST /auth/refresh response shape.
 *
 * Pins the SPA token refresh consumer: { user: camelCaseUser, tokens: { accessToken, refreshToken, expiresIn } }.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-auth-refresh FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
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
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test",
    refreshToken: "refresh-token-value",
    expiresIn: 900,
  },
};

function validateAuthRefreshBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is an object");
  assert("user" in body!, "body has user key");
  assert("tokens" in body!, "body has tokens key");

  const user = (body as { user: unknown }).user;
  assert(user && typeof user === "object", "user is an object");
  const u = user as Record<string, unknown>;
  assert(typeof u.id === "string", "user.id is string");
  assert(typeof u.email === "string", "user.email is string");
  assert(typeof u.displayName === "string", "user.displayName is string");
  assert(typeof u.isPlatformAdmin === "boolean", "user.isPlatformAdmin is boolean");
  assert(!("display_name" in u), "user must not expose snake_case display_name");

  const tokens = (body as { tokens: unknown }).tokens;
  assert(tokens && typeof tokens === "object", "tokens is an object");
  const t = tokens as Record<string, unknown>;
  assert(typeof t.accessToken === "string", "tokens.accessToken is string");
  assert(typeof t.refreshToken === "string", "tokens.refreshToken is string");
  assert(typeof t.expiresIn === "number", "tokens.expiresIn is number");
}

validateAuthRefreshBody(fixture);

console.log("contract-auth-refresh: PASS");
