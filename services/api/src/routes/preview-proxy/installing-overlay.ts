export const WAKE_TIMEOUT_MS = 30_000;

/**
 * Standalone HTML page rendered while `npm install <pkg>` is in flight.
 */
export function renderInstallingDepHTML(pkg: string): string {
  const safePkg = pkg.replace(/[&<>"']/g, (c) =>
    c === "&"
      ? "&amp;"
      : c === "<"
        ? "&lt;"
        : c === ">"
          ? "&gt;"
          : c === '"'
            ? "&quot;"
            : "&#39;",
  );
  const isRestart = pkg === "Restarting preview…";
  const headerCopy = isRestart ? "Restarting preview" : "Installing dependency";
  const lineHtml = isRestart
    ? `<code>dev server</code>`
    : `<code>npm install ${safePkg}</code>`;
  const titleCopy = isRestart ? "Restarting preview…" : `Installing ${safePkg}…`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="3">
<title>${titleCopy}</title>
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
    color: #1f2937;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .card {
    background: #fff;
    border-radius: 16px;
    padding: 32px 40px;
    box-shadow: 0 10px 30px rgba(124, 58, 237, 0.15);
    max-width: 420px;
    text-align: center;
  }
  .spinner {
    width: 48px;
    height: 48px;
    margin: 0 auto 20px;
    border: 4px solid #ede9fe;
    border-top-color: #7c3aed;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  h1 { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #4c1d95; }
  code {
    display: inline-block;
    margin-top: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    background: #f5f3ff;
    color: #5b21b6;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
  }
  p { margin: 12px 0 0; color: #6b7280; font-size: 13px; }
</style>
</head>
<body>
<div class="card">
  <div class="spinner" aria-hidden="true"></div>
  <h1>${headerCopy}</h1>
  ${lineHtml}
  <p>This page will refresh automatically.</p>
</div>
</body>
</html>`;
}
