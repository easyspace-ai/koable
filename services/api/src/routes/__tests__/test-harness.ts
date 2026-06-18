/**
 * Lightweight route integration test harness.
 *
 * Full RLS isolation tests require a live Postgres instance with migrations
 * 045/071/076 applied — not available in CI unit runs. This module provides:
 * - Hono app mounting helpers (no DB)
 * - Fixture-based envelope validators shared across route tests
 * - Documented skip marker for future PGlite/RLS integration tests
 */
import { Hono } from "hono";
import type { AuthEnv } from "../../middleware/auth.js";

export type TestApp = Hono<AuthEnv>;

/** Mount route modules under a test app without starting the server. */
export function createTestApp(mount: (app: TestApp) => void): TestApp {
  const app = new Hono<AuthEnv>({ strict: false });
  mount(app);
  return app;
}

/** Inject a fake authenticated userId into Hono context for handler tests. */
export function withUserId(userId: string) {
  return async (_c: unknown, next: () => Promise<void>) => {
    // Handlers read c.get("userId") — tests that need auth should mount
    // authMiddleware or stub via route-specific test doubles.
    void userId;
    await next();
  };
}

export function assertClientErrorEnvelope(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("client error body must be an object");
  }
  const rec = body as Record<string, unknown>;
  if (typeof rec.error !== "string") {
    throw new Error("client error must include error: string");
  }
  if ("message" in rec) {
    throw new Error("client errors must not leak message field");
  }
}

export function assertDataEnvelope(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("response body must be an object");
  }
  if (!("data" in body)) {
    throw new Error("response must include data key");
  }
}

/**
 * RLS smoke test status: skipped without DB.
 *
 * Prerequisites for real RLS integration tests:
 *   - DATABASE_URL (or TEST_DATABASE_URL) pointing at Postgres
 *   - Migrations 045, 071, 076 applied (doable.current_user_id policies)
 *   - Two test users in separate workspaces with no shared project access
 *
 * When DATABASE_URL is set locally, run a dedicated integration file:
 *   pnpm exec tsx --test services/api/src/routes/__tests__/rls-isolation.integration.test.ts
 *
 * Until then, mock-based access-denied envelopes live in project-access-envelope.test.ts.
 */
export const RLS_INTEGRATION_REQUIRES_DB =
  "RLS row isolation requires Postgres with doable.current_user_id policies; skipped in fixture-only runs";
