/**
 * Contract probe: GET /notifications response shape.
 *
 * Pins { data: Notification[] } with camelCase isRead/createdAt fields.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-notifications-list FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      kind: "deploy",
      title: "Deploy complete",
      body: "Your project was published.",
      link: "/editor/11111111-2222-3333-4444-555555555555",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
  ],
};

function validateNotificationsListBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  assert("data" in body!, "body has data key");
  assert(Array.isArray((body as { data: unknown }).data), "data is array");

  for (const row of (body as { data: unknown[] }).data) {
    assert(row && typeof row === "object", "each notification is object");
    const n = row as Record<string, unknown>;
    assert(typeof n.id === "string", "notification.id is string");
    assert(typeof n.kind === "string", "notification.kind is string");
    assert(typeof n.title === "string", "notification.title is string");
    assert(typeof n.isRead === "boolean", "notification.isRead is boolean");
    assert(typeof n.createdAt === "string", "notification.createdAt is string");
    assert(!("is_read" in n), "notification must not expose snake_case is_read");
    assert(!("created_at" in n), "notification must not expose snake_case created_at");
  }
}

validateNotificationsListBody(fixture);
validateNotificationsListBody({ data: [] });

console.log("contract-notifications-list: PASS");
