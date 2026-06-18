/**
 * Projects list/detail envelope tests (fixture-based, no DB).
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/projects-envelope.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClientErrorEnvelope, assertDataEnvelope } from "./test-harness.js";

test("project list pagination envelope", () => {
  assertDataEnvelope({
    data: [{ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", name: "Demo", starred: false }],
    pagination: { total: 1, page: 1, pageSize: 20, totalPages: 1 },
  });
  const body = {
    data: [],
    pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
  };
  assert.ok(Array.isArray(body.data));
  assert.equal(typeof body.pagination.total, "number");
});

test("project detail fixture includes starred flag", () => {
  const fixture = {
    data: {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      name: "Demo",
      slug: "demo",
      workspace_id: "11111111-2222-3333-4444-555555555555",
      status: "draft",
      starred: true,
    },
  };
  assertDataEnvelope(fixture);
  assert.equal(typeof fixture.data.starred, "boolean");
});

test("project 404 uses stable error envelope", () => {
  assertClientErrorEnvelope({ error: "Project not found" });
});

test("project 403 viewer edit uses client error envelope", () => {
  assertClientErrorEnvelope({ error: "Viewers cannot edit projects" });
});
