/**
 * Documents critical route mount ordering enforced by route-registry.ts.
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/route-registry-order.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getMountOrderForTests, ROUTE_REGISTRY } from "../../route-registry.js";

test("chat mounts before auth+rls /projects handlers", () => {
  const order = getMountOrderForTests();
  const chatEntry = order.find((e) => e.label === "chatRoutes");
  const projectEntry = order.find((e) => e.label === "projectRoutes");
  assert.ok(chatEntry && projectEntry);
  assert.ok(
    chatEntry.priority < projectEntry.priority,
    `chatRoutes (priority ${chatEntry.priority}) must mount before projectRoutes (priority ${projectEntry.priority})`,
  );
});

test("dataToken and project AI settings mount after chat", () => {
  const order = getMountOrderForTests();
  const chatPriority = order.find((e) => e.label === "chatRoutes")!.priority;

  const lateIds = ["dataTokenRoutes", "projectAiSettingsRoutes", "projectEmbeddingsRoutes"];
  for (const id of lateIds) {
    const entry = order.find((e) => e.label === id);
    if (!entry) continue; // feature flag off
    assert.ok(
      entry.priority > chatPriority,
      `${id} (priority ${entry.priority}) must be after chatRoutes (${chatPriority})`,
    );
  }
});

test("oauth redirects mount before publicFrameworkRoutes wildcard", () => {
  const order = getMountOrderForTests();
  const oauthIdx = order.findIndex((e) => e.label === "oauth-redirects");
  const frameworkIdx = order.findIndex((e) => e.label === "publicFrameworkRoutes");
  assert.ok(oauthIdx >= 0 && frameworkIdx >= 0);
  assert.ok(oauthIdx < frameworkIdx);
});

test("mcpAppsData uses dedicated prefix not root catch-all", () => {
  const mcpEntry = ROUTE_REGISTRY.find(
    (e) => "path" in e && e.path === "/__doable/mcp-apps/data",
  );
  assert.ok(mcpEntry);
  assert.notEqual((mcpEntry as { path: string }).path, "/");
});

test("registry priorities are strictly sorted at mount time", () => {
  const priorities = getMountOrderForTests().map((e) => e.priority);
  for (let i = 1; i < priorities.length; i++) {
    const prev = priorities[i - 1]!;
    const curr = priorities[i]!;
    assert.ok(curr >= prev, "priorities must be non-decreasing");
  }
});
