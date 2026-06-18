import type { Hono } from "hono";
import { mountAll } from "./route-registry.js";

/**
 * Mount all API route groups. Order is defined by priority in route-registry.ts
 * (sorted at startup). See route-registry.ts and route-registry-order.test.ts
 * for critical ordering rules (chat before auth+rls /projects/*, etc.).
 */
export function mountRoutes(app: Hono): void {
  mountAll(app);
}
