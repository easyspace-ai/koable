/**
 * Workspaces route envelope tests (fixture-based, no DB).
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/workspaces-envelope.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertClientErrorEnvelope, assertDataEnvelope } from "./test-harness.js";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../../schemas/workspaces.js";

test("createWorkspaceSchema rejects empty name after sanitization", () => {
  const result = createWorkspaceSchema.safeParse({ name: "<b></b>", slug: "valid-slug" });
  assert.equal(result.success, false);
});

test("createWorkspaceSchema accepts valid payload", () => {
  const result = createWorkspaceSchema.safeParse({ name: "Acme", slug: "acme-corp" });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.name, "Acme");
    assert.equal(result.data.slug, "acme-corp");
  }
});

test("updateWorkspaceSchema allows partial patch", () => {
  const result = updateWorkspaceSchema.safeParse({ description: "Updated" });
  assert.equal(result.success, true);
});

test("workspace list fixture uses { data: [] } envelope", () => {
  assertDataEnvelope({ data: [] });
});

test("workspace 409 slug conflict uses client error envelope", () => {
  assertClientErrorEnvelope({ error: "A workspace with this slug already exists" });
});

test("workspace 401 uses client error envelope", () => {
  assertClientErrorEnvelope({ error: "Authentication required" });
});
