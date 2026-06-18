import type { Context } from "hono";

/** Log server-side detail; return a stable client envelope. */
export function internalServerError(c: Context, label: string, err: unknown, status = 500) {
  console.error(`[${label}]`, err);
  return c.json({ error: "Internal Server Error" }, status as 500);
}

/** Generic failure message without leaking err.message to clients. */
export function operationFailed(c: Context, label: string, err: unknown, userMessage: string, status = 500) {
  console.error(`[${label}]`, err);
  return c.json({ error: userMessage }, status as 500);
}
