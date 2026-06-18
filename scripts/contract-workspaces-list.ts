/**
 * Contract probe: GET /workspaces response envelope + enriched fields.
 *
 * Pins the sidebar/dashboard consumer shape: { data: Workspace[] } where each
 * workspace includes userRole, memberCount, and camelCase credits summary.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-workspaces-list FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "Acme",
      slug: "acme",
      description: null,
      owner_id: "11111111-2222-3333-4444-555555555555",
      plan: "pro",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      userRole: "owner",
      memberCount: 3,
      credits: {
        dailyRemaining: 50,
        dailyTotal: 100,
        monthlyRemaining: 500,
        rolloverCredits: 10,
      },
    },
    {
      id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      name: "Beta",
      slug: "beta",
      description: "Team workspace",
      owner_id: "22222222-3333-4444-5555-666666666666",
      plan: "free",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      userRole: "member",
      memberCount: 1,
      credits: null,
    },
  ],
};

function validateWorkspacesListBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is an object envelope");
  assert("data" in body!, "body has data key");
  assert(Array.isArray((body as { data: unknown }).data), "data is an array");

  const rows = (body as { data: unknown[] }).data;
  for (const row of rows) {
    assert(row && typeof row === "object", "each workspace is an object");
    const ws = row as Record<string, unknown>;
    assert(typeof ws.id === "string", "workspace.id is string");
    assert(typeof ws.userRole === "string", "workspace.userRole is string");
    assert(typeof ws.memberCount === "number", "workspace.memberCount is number");
    assert(
      ws.credits === null ||
        (typeof ws.credits === "object" &&
          ws.credits !== null &&
          typeof (ws.credits as Record<string, unknown>).dailyRemaining === "number"),
      "workspace.credits is null or camelCase summary",
    );
    assert(!("daily_remaining" in ws), "workspace must not expose snake_case credits at top level");
  }
}

validateWorkspacesListBody(fixture);
validateWorkspacesListBody({ data: [] });

console.log("contract-workspaces-list: PASS");
