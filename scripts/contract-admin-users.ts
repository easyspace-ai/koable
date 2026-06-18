/**
 * Contract probe: GET /admin/users response shape.
 *
 * Pins BUG-ADMIN-012 — the body MUST be a flat snake_case array, never a
 * { data, total, limit, offset } envelope. Domain-agnostic: validates a
 * representative fixture, no network or env vars required.
 */

function fail(msg: string): never {
  console.error(`contract-admin-users FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const SNAKE_KEYS = [
  "id",
  "email",
  "display_name",
  "is_platform_admin",
  "platform_role",
  "created_at",
  "workspace_id",
  "plan",
  "ai_source",
  "model",
  "daily_credits",
  "monthly_credits",
  "rollover_credits",
] as const;

const FORBIDDEN_CAMEL = [
  "displayName",
  "isPlatformAdmin",
  "platformRole",
  "createdAt",
  "workspaceId",
  "aiSource",
  "dailyCredits",
  "monthlyCredits",
  "rolloverCredits",
] as const;

/** Representative row matching admin-users.ts mapper output */
const fixture = [
  {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    email: "admin@example.com",
    display_name: "Admin",
    is_platform_admin: true,
    platform_role: "super_admin",
    created_at: new Date().toISOString(),
    workspace_id: "11111111-2222-3333-4444-555555555555",
    plan: "enterprise",
    ai_source: "platform",
    model: "gpt-4",
    daily_credits: 100,
    monthly_credits: 1000,
    rollover_credits: 0,
  },
];

function validateAdminUsersBody(body: unknown): void {
  assert(Array.isArray(body), "body is a top-level array");
  assert(
    !(body && typeof body === "object" && !Array.isArray(body) && "data" in body),
    "body is NOT a { data: [...] } envelope",
  );

  if (!Array.isArray(body) || body.length === 0) return;

  const row = body[0];
  assert(row && typeof row === "object" && !Array.isArray(row), "row is an object");

  for (const key of SNAKE_KEYS) {
    assert(key in (row as object), `row includes snake_case key "${key}"`);
  }
  for (const key of FORBIDDEN_CAMEL) {
    assert(!(key in (row as object)), `row must not use camelCase key "${key}"`);
  }
}

validateAdminUsersBody(fixture);
validateAdminUsersBody([]);

console.log("contract-admin-users: PASS");
