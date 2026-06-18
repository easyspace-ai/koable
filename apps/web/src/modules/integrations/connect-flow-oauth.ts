/**
 * Reusable OAuth popup helpers for the Connect Flow dialog.
 */

import type { IntegrationsTranslateFn } from "./use-integration-catalog";

export type OAuthErrorVariant = "warning" | "error";

/** Open a centered popup, fetch the auth URL, then poll for closure. */
export async function runOAuthPopup(opts: {
  getUrl: () => Promise<string>;
  windowName: string;
  itemName: string;
  t: IntegrationsTranslateFn;
  onDone: () => void;
  onError: (msg: string, variant?: OAuthErrorVariant) => void;
}): Promise<void> {
  const width = 600, height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  const popup = window.open(
    "about:blank",
    opts.windowName,
    `width=${width},height=${height},left=${left},top=${top},popup=1`,
  );

  if (!popup) {
    opts.onError(opts.t("shared.oauthMessages.popupBlocked"));
    return;
  }

  try {
    const url = await opts.getUrl();
    popup.location.href = url;

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer);
        opts.onDone();
      }
    }, 500);
  } catch (err) {
    try { popup.close(); } catch { /* already closed */ }
    const msg = err instanceof Error ? err.message : opts.t("shared.oauthMessages.failedToStartOAuth");
    if (msg.includes("not configured") || msg.includes("CLIENT_ID") || msg.includes("CLIENT_SECRET") || msg.includes("OAuth app")) {
      opts.onError(
        opts.t("shared.oauthMessages.oauthNotSetUp", { name: opts.itemName }),
        "warning",
      );
    } else {
      opts.onError(msg);
    }
  }
}

/** Open an enhanced-auth popup that also listens for postMessage completion. */
export async function runEnhancedAuthPopup(opts: {
  getUrl: () => Promise<string>;
  integrationId: string;
  itemName: string;
  t: IntegrationsTranslateFn;
  onDone: () => void;
  onError: (msg: string, variant?: OAuthErrorVariant) => void;
}): Promise<void> {
  let popup: Window | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let messageHandler: ((ev: MessageEvent) => void) | null = null;
  const cleanup = () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (messageHandler) { window.removeEventListener("message", messageHandler); messageHandler = null; }
  };

  const width = 600, height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  popup = window.open(
    "about:blank",
    "doable-enhanced-auth",
    `width=${width},height=${height},left=${left},top=${top},popup=1`,
  );

  if (!popup) {
    opts.onError(opts.t("shared.oauthMessages.popupBlocked"));
    return;
  }

  try {
    const url = await opts.getUrl();
    popup.location.href = url;

    messageHandler = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== "doable:enhanced-auth-complete") return;
      if (data.integrationId && data.integrationId !== opts.integrationId) return;
      if (data.status === "error" && typeof data.error === "string") {
        opts.onError(
          opts.t("shared.oauthMessages.connectionFailedWithReason", { error: data.error }),
        );
      }
      cleanup();
      try { popup?.close(); } catch { /* may already be closed */ }
      opts.onDone();
    };
    window.addEventListener("message", messageHandler);

    pollTimer = setInterval(() => {
      if (popup!.closed) {
        cleanup();
        opts.onDone();
      }
    }, 500);
  } catch (err) {
    cleanup();
    try { popup?.close(); } catch { /* popup may already be closed */ }
    const msg = err instanceof Error ? err.message : opts.t("shared.oauthMessages.failedToStartEnhancedAuth");
    if (msg.includes("not configured") || msg.includes("CLIENT_ID") || msg.includes("OAuth")) {
      opts.onError(
        opts.t("shared.oauthMessages.enhancedAuthNotSetUp", { name: opts.itemName }),
        "warning",
      );
    } else {
      opts.onError(msg);
    }
  }
}
