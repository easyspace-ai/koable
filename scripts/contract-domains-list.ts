/**
 * Contract probe: GET /domains/project/:projectId response shape.
 *
 * Pins { data: CustomDomain[] } list envelope.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-domains-list FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      project_id: "11111111-2222-3333-4444-555555555555",
      domain: "app.example.com",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ],
};

function validateDomainsListBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  assert("data" in body!, "body has data key");
  assert(Array.isArray((body as { data: unknown }).data), "data is array");

  for (const row of (body as { data: unknown[] }).data) {
    assert(row && typeof row === "object", "each domain is object");
    const d = row as Record<string, unknown>;
    assert(typeof d.id === "string", "domain.id is string");
    assert(typeof d.domain === "string", "domain.domain is string");
  }
}

validateDomainsListBody(fixture);
validateDomainsListBody({ data: [] });

console.log("contract-domains-list: PASS");
