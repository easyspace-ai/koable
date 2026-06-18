/**
 * Internal-only routes — gated by INTERNAL_SECRET header.
 * Used by sister services (e.g. ws) that need to call into the API
 * without holding a user JWT.
 */

import { Hono } from "hono";
import { hasProjectAccess } from "../middleware/project-access.js";
import { INTERNAL_SECRET } from "../lib/secrets.js";
import { isUuid } from "../lib/uuid.js";

export const internalRoutes = new Hono({ strict: false });

internalRoutes.use("*", async (c, next) => {
  const secret = c.req.header("x-internal-secret");
  if (secret !== INTERNAL_SECRET) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});

/**
 * GET /internal/project-access?userId=&projectId=
 * Returns 200 { allowed: true, role: "..." } when granted, 403 when denied.
 * Used by ws to gate room:join.
 */
internalRoutes.get("/project-access", async (c) => {
  const userId = c.req.query("userId");
  const projectId = c.req.query("projectId");
  if (!userId || !projectId) {
    return c.json({ allowed: false, error: "userId and projectId required" }, 400);
  }
  if (!isUuid(userId) || !isUuid(projectId)) {
    return c.json({ allowed: false, error: "userId and projectId must be UUIDs" }, 400);
  }
  try {
    const access = await hasProjectAccess(userId, projectId, false);
    if (!access) {
      return c.json({ allowed: false }, 403);
    }
    return c.json({ allowed: true, role: access.role, detail: access.detail });
  } catch (err) {
    console.error("[internal/project-access] lookup failed:", err);
    return c.json({ allowed: false, error: "lookup failed" }, 500);
  }
});
