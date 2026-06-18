/**
 * Hop-by-hop headers stripped before proxy fetch (RFC 7230 §6.1).
 */
export const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
]);

/** Copy inbound request headers, stripping host and hop-by-hop. */
export function buildProxyRequestHeaders(
  reqHeaders: Record<string, string | undefined>,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(reqHeaders)) {
    const k = key.toLowerCase();
    if (k === "host" || HOP_BY_HOP_REQUEST_HEADERS.has(k) || !value) {
      continue;
    }
    headers.set(key, value);
  }
  return headers;
}

/** Copy upstream response headers, stripping hop-by-hop and stale compression headers. */
export function buildProxyResponseHeaders(
  upstream: Headers,
  opts?: { csp?: string },
): Headers {
  const responseHeaders = new Headers();
  upstream.forEach((value, key) => {
    if (!HOP_BY_HOP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  responseHeaders.set("Access-Control-Allow-Origin", "*");
  responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  responseHeaders.set("Access-Control-Allow-Headers", "*");
  responseHeaders.set("Cache-Control", "no-store, no-cache, must-revalidate");
  responseHeaders.delete("etag");
  responseHeaders.delete("last-modified");
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  if (opts?.csp) {
    responseHeaders.set("Content-Security-Policy", opts.csp);
  }

  return responseHeaders;
}

export function buildPreviewCsp(): string {
  const domain = process.env.DOABLE_DOMAIN ?? "doable.me";
  return [
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://esm.sh",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
    "img-src * data: blob:",
    "connect-src *",
    "media-src * data: blob:",
    `frame-ancestors 'self' https://${domain} https://*.${domain} http://localhost:* http://127.0.0.1:*`,
    "object-src 'none'",
  ].join("; ");
}
