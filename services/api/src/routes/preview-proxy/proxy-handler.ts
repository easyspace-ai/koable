import { Hono } from "hono";
import {
  getDevServerInternalUrl,
  getDevServerInternalUrlWhenReady,
  getInstallingPeerDep,
  clearRestartingOverlay,
  startDevServer,
  isRunning,
  touchActivity,
} from "../../projects/dev-server.js";
import { isProjectScaffolded, ensureDependencies } from "../../projects/file-manager.js";
import { RETRY_HTML } from "./injected-scripts.js";
import { isUuid } from "../../lib/uuid.js";
import { WAKE_TIMEOUT_MS, renderInstallingDepHTML } from "./installing-overlay.js";
import {
  mintPreviewConnectorToken,
  resolvePreviewViewerUserId,
} from "./preview-auth-gate.js";
import {
  forwardPreviewRequest,
  forwardViteDevAsset,
  reloadScriptOnFetchError,
} from "./proxy-forward-core.js";

export const previewRoutes = new Hono({ strict: false });

previewRoutes.post("/preview/:projectId/__doable/token", async (c) => {
  const projectId = c.req.param("projectId");
  if (!isUuid(projectId)) {
    return c.json({ error: "Invalid project ID" }, 400);
  }

  const viewerUserId = await resolvePreviewViewerUserId(c, projectId);
  const result = await mintPreviewConnectorToken(projectId, viewerUserId);
  if ("error" in result) {
    return c.json({ error: result.error }, result.status as 400 | 404 | 429);
  }
  return c.json({ token: result.token, expiresIn: result.expiresIn });
});

previewRoutes.all("/preview/:projectId/*", async (c) => {
  const projectId = c.req.param("projectId");

  if (!isUuid(projectId)) {
    return c.text("Not found", 404);
  }

  const isRootHtmlReq =
    c.req.method === "GET" &&
    /^\/preview\/[0-9a-f-]{36}\/?$/i.test(new URL(c.req.url).pathname);
  if (isRootHtmlReq) {
    const installing = getInstallingPeerDep(projectId);
    if (installing) {
      if (installing.pkg === "Restarting preview…") {
        if (isRunning(projectId)) {
          clearRestartingOverlay(projectId);
        } else {
          void startDevServer(projectId).catch(() => {});
          return c.html(renderInstallingDepHTML(installing.pkg), 200, {
            "Cache-Control": "no-store",
          });
        }
      } else {
        return c.html(renderInstallingDepHTML(installing.pkg), 200, {
          "Cache-Control": "no-store",
        });
      }
    }
  }

  const alreadyRunning = isRunning(projectId);

  if (!alreadyRunning && !isProjectScaffolded(projectId)) {
    return c.text("Not found", 404);
  }

  if (!alreadyRunning) {
    try {
      await ensureDependencies(projectId);
      startDevServer(projectId).catch((err) => {
        console.warn(
          `[preview-proxy] startDevServer failed for ${projectId}:`,
          err instanceof Error ? err.message : err,
        );
      });
    } catch (err) {
      console.warn(
        `[preview-proxy] ensureDependencies failed for ${projectId}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const readyOrTimeout = await Promise.race([
    getDevServerInternalUrlWhenReady(projectId),
    new Promise<"__timeout__">((resolve) =>
      setTimeout(() => resolve("__timeout__"), WAKE_TIMEOUT_MS).unref?.(),
    ),
  ]);

  if (readyOrTimeout === "__timeout__" || !readyOrTimeout) {
    const accept = c.req.header("accept") ?? "";
    const wantsJson =
      accept.includes("application/json") || !accept.includes("text/html");
    if (wantsJson) {
      return c.json(
        {
          error: "dev_server_starting",
          projectId,
          etaSeconds: Math.round(WAKE_TIMEOUT_MS / 1000),
        },
        503,
        {
          "Retry-After": "5",
          "Cache-Control": "no-store",
        },
      );
    }
    return c.html(RETRY_HTML, 503, {
      "Retry-After": "5",
      "Cache-Control": "no-store",
    });
  }

  touchActivity(projectId);

  const originalPath = new URL(c.req.url).pathname;
  const targetUrl = `${readyOrTimeout}${originalPath}`;
  const qsIndex = c.req.url.indexOf("?");
  const queryString = qsIndex !== -1 ? c.req.url.slice(qsIndex + 1) : "";
  const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl;
  const hasBody = c.req.method !== "GET" && c.req.method !== "HEAD";

  try {
    return await forwardPreviewRequest({
      method: c.req.method,
      fullUrl,
      originalPath,
      projectId,
      reqHeaders: c.req.header(),
      body: hasBody ? c.req.raw.body : undefined,
      hasBody,
    });
  } catch (err) {
    const reload = await reloadScriptOnFetchError(projectId, originalPath, c.req.method);
    if (reload) return reload;
    console.error(
      `[preview-proxy] fetch failed for ${projectId}:`,
      err instanceof Error ? err.message : err,
    );
    return c.text("Preview proxy error", 502);
  }
});

previewRoutes.all("/preview/:projectId", async (c) => {
  const projectId = c.req.param("projectId");
  return c.redirect(`/preview/${projectId}/`);
});

previewRoutes.all("/@vite/*", viteDevAssetFallback);
previewRoutes.all("/@fs/*", viteDevAssetFallback);
previewRoutes.all("/@id/*", viteDevAssetFallback);
previewRoutes.all("/src/*", viteDevAssetFallback);
previewRoutes.all("/node_modules/*", viteDevAssetFallback);
previewRoutes.all("/__vite_ping", viteDevAssetFallback);

async function viteDevAssetFallback(c: import("hono").Context) {
  const referer = c.req.header("referer") ?? "";
  const match = referer.match(/\/preview\/([0-9a-f-]{36})\//i);
  if (!match?.[1]) return c.text("Not found", 404);

  const projectId = match[1]!;
  if (!isUuid(projectId)) return c.text("Not found", 404);

  const devUrl = getDevServerInternalUrl(projectId);
  if (!devUrl) return c.text("Not found", 404);

  const originalPath = new URL(c.req.url).pathname;
  const qsIndex = c.req.url.indexOf("?");
  const queryString = qsIndex !== -1 ? c.req.url.slice(qsIndex + 1) : "";
  const targetUrl = queryString
    ? `${devUrl}${originalPath}?${queryString}`
    : `${devUrl}${originalPath}`;
  const hasBody = c.req.method !== "GET" && c.req.method !== "HEAD";

  try {
    return await forwardViteDevAsset({
      method: c.req.method,
      targetUrl,
      reqHeaders: c.req.header(),
      body: hasBody ? c.req.raw.body : undefined,
      hasBody,
    });
  } catch {
    return c.text("Bad gateway", 502);
  }
}
