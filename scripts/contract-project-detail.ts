/**
 * Contract probe: GET /projects/:id response shape.
 *
 * Pins { data: Project & { starred: boolean } } detail envelope.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-project-detail FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: {
    id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    name: "Demo Project",
    slug: "demo-project",
    workspace_id: "11111111-2222-3333-4444-555555555555",
    status: "draft",
    visibility: "private",
    description: null,
    starred: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
};

function validateProjectDetailBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  assert("data" in body!, "body has data key");

  const project = (body as { data: unknown }).data;
  assert(project && typeof project === "object" && !Array.isArray(project), "data is project object");
  const p = project as Record<string, unknown>;
  assert(typeof p.id === "string", "project.id is string");
  assert(typeof p.name === "string", "project.name is string");
  assert(typeof p.workspace_id === "string", "project.workspace_id is string");
  assert(typeof p.starred === "boolean", "project.starred is boolean");
  assert(!("userRole" in p), "project detail must not include list-only userRole");
}

validateProjectDetailBody(fixture);
validateProjectDetailBody({ data: { ...fixture.data, starred: true } });

console.log("contract-project-detail: PASS");
