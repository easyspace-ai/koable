import type { Hono } from "hono";
import { authMiddleware, type AuthEnv } from "./auth.js";
import { platformAdminMiddleware } from "./platform-admin.js";

/**
 * Apply auth + platform-admin guards to all routes on a sub-router.
 * Used by standalone admin mounts (/admin/mfa, /admin signups, /setup).
 */
export function usePlatformAdminGuards(app: Hono<AuthEnv>): void {
  app.use("*", authMiddleware);
  app.use("*", platformAdminMiddleware);
}
