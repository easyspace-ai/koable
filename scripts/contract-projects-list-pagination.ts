/**
 * Contract probe: GET /projects response pagination envelope.
 *
 * Pins the dashboard/editor consumer shape: { data: Project[], pagination: { total, page, pageSize, totalPages } }.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-projects-list-pagination FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "Demo",
      slug: "demo",
      workspace_id: "11111111-2222-3333-4444-555555555555",
      status: "draft",
      starred: false,
    },
  ],
  pagination: {
    total: 42,
    page: 2,
    pageSize: 20,
    totalPages: 3,
  },
};

function validateProjectsListBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is an object envelope");
  assert("data" in body!, "body has data key");
  assert(Array.isArray((body as { data: unknown }).data), "data is an array");
  assert("pagination" in body!, "body has pagination key");

  const pagination = (body as { pagination: unknown }).pagination;
  assert(pagination && typeof pagination === "object", "pagination is an object");
  const p = pagination as Record<string, unknown>;
  assert(typeof p.total === "number", "pagination.total is number");
  assert(typeof p.page === "number", "pagination.page is number");
  assert(typeof p.pageSize === "number", "pagination.pageSize is number");
  assert(typeof p.totalPages === "number", "pagination.totalPages is number");
}

validateProjectsListBody(fixture);
validateProjectsListBody({
  data: [],
  pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
});

console.log("contract-projects-list-pagination: PASS");
