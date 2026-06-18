import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "./auth.js";
import { sql } from "../db/index.js";
import { workspaceQueries } from "@doable/db";
import { WORKSPACE_ROLES, type WorkspaceRole } from "@doable/shared";
import { isUuid } from "../lib/uuid.js";

const workspaces = workspaceQueries(sql);

/**
 * Role hierarchy for workspace access.
 * Lower index = higher privilege.
 */
const ROLE_HIERARCHY: WorkspaceRole[] = [...WORKSPACE_ROLES].reverse();

/**
 * Factory that returns a Hono middleware requiring the authenticated user
 * to hold at least `minRole` on the workspace identified by a path param.
 *
 * Must be used AFTER authMiddleware.
 *
 * @param minRole   - minimum role required (viewer/member/admin/owner).
 * @param paramName - which Hono path param holds the workspace id.
 *                    Defaults to `"id"` for the canonical
 *                    `/workspaces/:id/...` mount; pass `"wid"` for routers
 *                    that capture the workspace under a different name
 *                    (e.g. `workspaceContextRoutes` mounted at
 *                    `/workspaces/:wid/context`, BUG-CORPUS-CTX-001).
 *
 * Usage:
 *   workspaceRoutes.patch("/:id/members/:userId", requireRole("owner"), handler)
 *   workspaceContextRoutes.use("*", requireRole("viewer", "wid"))
 */
export function requireRole(minRole: WorkspaceRole, paramName: string = "id") {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId");
    const workspaceId = c.req.param(paramName);

    if (!userId || userId === "anonymous") {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!workspaceId) {
      return c.json({ error: "Workspace ID required" }, 400);
    }

    if (!isUuid(workspaceId)) {
      return c.json({ error: "Invalid workspace id" }, 400);
    }

    const role = await workspaces.getMemberRole(workspaceId, userId);

    if (!role) {
      return c.json({ error: "Not a member of this workspace" }, 403);
    }

    const userLevel = ROLE_HIERARCHY.indexOf(role);
    const requiredLevel = ROLE_HIERARCHY.indexOf(minRole);

    if (userLevel > requiredLevel) {
      return c.json(
        { error: `Requires ${minRole} role or higher` },
        403
      );
    }

    await next();
  });
}
