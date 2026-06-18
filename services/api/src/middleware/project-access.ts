/**
 * Project access middleware + helper.
 *
 * Verifies the authenticated user can access the project named in the
 * URL parameter (`:id` by default). Access is granted via either:
 *   1. workspace membership (project's workspace contains the user)
 *   2. explicit row in project_collaborators
 *   3. project visibility = 'public' (read-only access only when allowPublic = true)
 *
 * Use as `requireProjectAccess()` middleware OR call `hasProjectAccess()`
 * directly from non-middleware contexts (like the WS room:join handler).
 */

import { createMiddleware } from "hono/factory";
import { sql } from "../db/index.js";
import { projectQueries } from "@doable/db";
import type { AuthEnv } from "./auth.js";

const projects = projectQueries(sql);

export type ProjectAccessRole = "workspace" | "collaborator" | "public";

export interface ProjectAccessResult {
  role: ProjectAccessRole;
  /** Specific role string (owner/admin/editor/viewer) when not "public" */
  detail?: string;
}

/**
 * Check whether userId can access projectId. Returns null when denied.
 *
 * @param allowPublic When true, public projects grant read-only access
 *                    even to non-members. Default: false (membership required).
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string,
  allowPublic = false,
): Promise<ProjectAccessResult | null> {
  if (!userId || !projectId) return null;

  const access = await projects.checkUserAccess(projectId, userId);
  if (!access) return null;

  if (access.workspaceRole) {
    return { role: "workspace", detail: access.workspaceRole };
  }

  if (access.collabRole) {
    return { role: "collaborator", detail: access.collabRole };
  }

  if (allowPublic && access.visibility === "public") {
    return { role: "public" };
  }

  return null;
}

export interface ProjectAccessEnv extends AuthEnv {
  Variables: AuthEnv["Variables"] & {
    projectAccess: ProjectAccessResult;
  };
}

export interface RequireProjectAccessOptions {
  /** URL param name holding the project id. Default: "id" */
  paramName?: string;
  /** Allow public projects to grant access without membership. Default: false */
  allowPublic?: boolean;
}

/**
 * Middleware factory: returns a Hono middleware that verifies the
 * authenticated user has access to the project named in the URL param.
 * Must be placed AFTER authMiddleware in the chain.
 */
export function requireProjectAccess(opts: RequireProjectAccessOptions = {}) {
  const paramName = opts.paramName ?? "id";
  const allowPublic = opts.allowPublic ?? false;

  return createMiddleware<ProjectAccessEnv>(async (c, next) => {
    const userId = c.get("userId");
    if (!userId || userId === "anonymous") {
      return c.json({ error: "Authentication required" }, 401);
    }

    const projectId = c.req.param(paramName);
    if (!projectId) {
      return c.json({ error: "Project id missing from request" }, 400);
    }

    const access = await hasProjectAccess(userId, projectId, allowPublic);
    if (!access) {
      return c.json({ error: "Access denied" }, 403);
    }

    c.set("projectAccess", access);
    await next();
  });
}
