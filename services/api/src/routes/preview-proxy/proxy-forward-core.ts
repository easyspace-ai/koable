import {
  buildPreviewCsp,
  buildProxyRequestHeaders,
  buildProxyResponseHeaders,
  HOP_BY_HOP_RESPONSE_HEADERS,
} from "./header-forwarding.js";
import { makeInjectionStream } from "./injection-stream.js";
import { getAdapterForProject } from "./preview-auth-gate.js";
import { VISUAL_EDIT_BRIDGE_INLINE } from "../../visual-edit-bridge-inline.js";
import { getTrackingScript } from "../../analytics/tracker.js";
import {
  getStorageNamespaceSnippet,
  ERROR_CAPTURE_SNIPPET,
  CONNECTOR_BRIDGE_SNIPPET,
} from "./injected-scripts.js";

const publicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.CORS_ORIGINS?.split(",")[0]?.replace(/\/$/, "") ??
  `http://localhost:${process.env.API_PORT ?? "4000"}`;

const RELOAD_SCRIPT = `
  if (typeof window !== "undefined") {
    window.location.reload();
  }
`;

export type ProxyForwardInput = {
  method: string;
  fullUrl: string;
  originalPath: string;
  projectId: string;
  reqHeaders: Record<string, string | undefined>;
  body?: unknown;
  hasBody: boolean;
};

export type ProxyForwardResult = Response;

function looksLikeJsPath(originalPath: string): boolean {
  return (
    /\.(m?js|c?js|tsx?|jsx)(\?|$)/.test(originalPath) ||
    originalPath.includes("/@vite/") ||
    originalPath.includes("/@react-refresh") ||
    originalPath.includes("/@id/") ||
    originalPath.includes("/@fs/") ||
    originalPath.includes("/node_modules/")
  );
}

function isJsDepRequest(method: string, originalPath: string): boolean {
  return (
    method === "GET" &&
    (looksLikeJsPath(originalPath) ||
      originalPath.includes("/node_modules/"))
  );
}

/**
 * Forward a preview request to the dev server: fetch with optional 504 retries,
 * header filtering, HTML injection, and framework adapter recovery.
 */
export async function forwardPreviewRequest(input: ProxyForwardInput): Promise<ProxyForwardResult> {
  const { method, fullUrl, originalPath, projectId, reqHeaders, body, hasBody } = input;
  const headers = buildProxyRequestHeaders(reqHeaders);

  const maxRetries = isJsDepRequest(method, originalPath) ? 8 : 0;
  let resp = await fetch(fullUrl, {
    method,
    headers,
    body: hasBody ? body : undefined,
    ...(hasBody ? { duplex: "half" as const } : {}),
  } as RequestInit & { duplex?: "half" });

  for (let attempt = 0; attempt < maxRetries && resp.status === 504; attempt++) {
    await new Promise((r) => setTimeout(r, 250));
    resp = await fetch(fullUrl, { method, headers });
  }

  const responseHeaders = buildProxyResponseHeaders(resp.headers, {
    csp: buildPreviewCsp(),
  });

  if (looksLikeJsPath(originalPath) && resp.ok && resp.body) {
    responseHeaders.set("content-type", "application/javascript; charset=utf-8");
    return new Response(resp.body, { status: resp.status, headers: responseHeaders });
  }

  const contentType = resp.headers.get("content-type") ?? "";
  if (contentType.includes("text/html") && resp.body) {
    const storageNamespaceSnippet = getStorageNamespaceSnippet(projectId);
    const headSnippet =
      `<meta name="doable-project-id" content="${projectId}">` +
      `<script>${getTrackingScript(publicApiUrl)}</script>`;
    const bodySnippet = `<script>${VISUAL_EDIT_BRIDGE_INLINE}</script>`;
    const headBundle = `${CONNECTOR_BRIDGE_SNIPPET}${ERROR_CAPTURE_SNIPPET}${headSnippet}`;

    const injectionStream = makeInjectionStream([
      {
        patterns: [
          { regex: /<head(?:\s[^>]*)?>/i, insertBefore: false },
          { regex: /<body[^>]*>/i, insertBefore: true },
        ],
        snippet: storageNamespaceSnippet,
      },
      {
        patterns: [
          { regex: /<\/head>/i, insertBefore: true },
          { regex: /<body[^>]*>/i, insertBefore: true },
        ],
        snippet: headBundle,
      },
      {
        patterns: [{ regex: /<\/body>/i, insertBefore: true }],
        snippet: bodySnippet,
      },
    ]);

    responseHeaders.set("content-type", "text/html; charset=utf-8");
    return new Response(resp.body.pipeThrough(injectionStream), {
      status: resp.status,
      headers: responseHeaders,
    });
  }

  if (resp.status === 502 || resp.status === 504) {
    const adapter = await getAdapterForProject(projectId);
    if (
      adapter.shouldReloadOnError?.({
        path: originalPath,
        status: resp.status,
        method,
      })
    ) {
      responseHeaders.set("content-type", "application/javascript; charset=utf-8");
      responseHeaders.delete("content-length");
      return new Response(RELOAD_SCRIPT, { status: 200, headers: responseHeaders });
    }
  }

  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

/** Simplified forward for vite dev asset fallback paths (/@vite, /src, etc.). */
export async function forwardViteDevAsset(input: {
  method: string;
  targetUrl: string;
  reqHeaders: Record<string, string | undefined>;
  body?: unknown;
  hasBody: boolean;
}): Promise<ProxyForwardResult> {
  const headers = buildProxyRequestHeaders(input.reqHeaders);
  const resp = await fetch(input.targetUrl, {
    method: input.method,
    headers,
    body: input.hasBody ? input.body : undefined,
    ...(input.hasBody ? { duplex: "half" as const } : {}),
  } as RequestInit & { duplex?: "half" });

  const responseHeaders = new Headers();
  resp.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });
  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(resp.body, { status: resp.status, headers: responseHeaders });
}

export async function reloadScriptOnFetchError(
  projectId: string,
  originalPath: string,
  method: string,
): Promise<Response | null> {
  const adapter = await getAdapterForProject(projectId);
  if (
    adapter.shouldReloadOnError?.({
      path: originalPath,
      status: 502,
      method,
    })
  ) {
    return new Response(RELOAD_SCRIPT, {
      status: 200,
      headers: {
        "content-type": "application/javascript; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
      },
    });
  }
  return null;
}
