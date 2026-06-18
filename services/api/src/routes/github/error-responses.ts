import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Log server-side detail and return a client-safe { error } envelope. */
export function githubErrorResponse(
  c: Context,
  error: string,
  err: unknown,
  status: ContentfulStatusCode = 500,
): Response {
  console.error(`[GitHub] ${error}:`, err instanceof Error ? err.message : err);
  return c.json({ error }, status);
}
