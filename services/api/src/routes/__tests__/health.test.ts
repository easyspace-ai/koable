/**
 * Health route smoke test — no DB required.
 *
 * Run: pnpm exec tsx --test services/api/src/routes/__tests__/health.test.ts
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { healthRoutes } from "../health.js";

const app = new Hono();
app.route("/health", healthRoutes);

test("GET /health returns healthy or degraded status", async () => {
  const res = await app.request("/health");
  assert.ok(res.status === 200 || res.status === 503);
  const body = (await res.json()) as { status: string };
  assert.ok(body.status === "healthy" || body.status === "degraded");
});

test("GET /health/ready returns ready or degraded envelope", async () => {
  const res = await app.request("/health/ready");
  assert.ok(res.status === 200 || res.status === 503);
  const body = (await res.json()) as { status: string };
  assert.ok(typeof body.status === "string");
});
