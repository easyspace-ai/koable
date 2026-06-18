import type postgres from "postgres";
import { sql, txAls } from "../../db/index.js";
import { defaultRegistry } from "../../frameworks/registry.js";
import type { FrameworkAdapter } from "../../frameworks/types.js";
import { signProjectJwt } from "../../auth/project-jwt.js";
import { PROJECT_JWT_SECRET } from "../../lib/secrets.js";
import { verifyAccessToken } from "../../lib/jwt.js";
import { requireProjectAccess } from "../projects/helpers.js";
import { isUuid } from "../../lib/uuid.js";

const adapterCache = new Map<string, FrameworkAdapter>();

export async function getAdapterForProject(projectId: string): Promise<FrameworkAdapter> {
  const cached = adapterCache.get(projectId);
  if (cached) return cached;
  const rows = await sql<{ framework_id: string }[]>`
    SELECT framework_id FROM projects WHERE id = ${projectId}
  `;
  const frameworkId = rows[0]?.framework_id ?? "vite-react";
  const adapter = defaultRegistry.getAdapter(frameworkId);
  adapterCache.set(projectId, adapter);
  return adapter;
}

const tokenBuckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Resolve viewer userId from Bearer token or doable_access_token cookie,
 * validating project access inside an RLS context for the candidate user.
 */
export async function resolvePreviewViewerUserId(
  c: {
    req: {
      header: (name: string) => string | undefined;
    };
  },
  projectId: string,
): Promise<string | undefined> {
  let sessionToken: string | undefined;
  const authHeader = c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    sessionToken = authHeader.slice(7).trim();
  }
  if (!sessionToken) {
    const cookieHeader = c.req.header("Cookie") ?? "";
    const m = cookieHeader.match(/(?:^|;\s*)doable_access_token=([^;]+)/);
    if (m?.[1]) {
      try {
        sessionToken = decodeURIComponent(m[1]);
      } catch {
        sessionToken = m[1];
      }
    }
  }
  if (!sessionToken) return undefined;

  try {
    const payload = await verifyAccessToken(sessionToken);
    const candidate = payload.sub;
    if (!candidate || !isUuid(candidate)) return undefined;

    const escaped = candidate.replace(/'/g, "''");
    const access = await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL "doable.current_user_id" = '${escaped}'`);
      return txAls.run(tx as unknown as postgres.Sql, () =>
        requireProjectAccess(candidate, projectId),
      );
    });
    if (access) return candidate;
  } catch {
    // Invalid/expired platform token — fail closed (no userId in minted JWT).
  }
  return undefined;
}

/** Rate-limited connector-proxy JWT for standalone preview mode. */
export async function mintPreviewConnectorToken(
  projectId: string,
  viewerUserId: string | undefined,
): Promise<{ token: string; expiresIn: number } | { error: string; status: number }> {
  const now = Date.now();
  let bucket = tokenBuckets.get(projectId);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + 60_000 };
    tokenBuckets.set(projectId, bucket);
  }
  if (bucket.count >= 10) {
    return { error: "Rate limited", status: 429 };
  }
  bucket.count++;

  const [row] = await sql<{ workspace_id: string }[]>`
    SELECT workspace_id FROM projects WHERE id = ${projectId} LIMIT 1
  `;
  if (!row) {
    return { error: "Project not found", status: 404 };
  }

  const token = await signProjectJwt(
    {
      projectId,
      workspaceId: row.workspace_id,
      ...(viewerUserId ? { userId: viewerUserId } : {}),
      kind: "connector-proxy",
    },
    PROJECT_JWT_SECRET,
  );

  return { token, expiresIn: 15 * 60 };
}
