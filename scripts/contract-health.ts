/**
 * Contract probe: GET /health response shape.
 *
 * Pins health check envelope for load balancers and monitoring.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-health FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const healthyFixture = {
  status: "healthy",
  timestamp: new Date().toISOString(),
  version: "0.1.0",
  uptime: 123.45,
  checks: {
    database: { status: "up", latencyMs: 2 },
    memory: { rssBytes: 1000, heapUsedBytes: 500, heapTotalBytes: 800 },
    devServers: { active: 0 },
  },
};

function validateHealthBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object");
  const rec = body as Record<string, unknown>;
  assert(rec.status === "healthy" || rec.status === "degraded", "status is healthy or degraded");
  assert(typeof rec.timestamp === "string", "timestamp is string");
  assert(rec.checks && typeof rec.checks === "object", "checks is object");
  const db = (rec.checks as Record<string, unknown>).database as Record<string, unknown>;
  assert(db && (db.status === "up" || db.status === "down"), "database.status is up or down");
}

validateHealthBody(healthyFixture);
validateHealthBody({ ...healthyFixture, status: "degraded", checks: { ...healthyFixture.checks, database: { status: "down", latencyMs: 0 } } });

console.log("contract-health: PASS");
