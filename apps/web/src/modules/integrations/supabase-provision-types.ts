/**
 * Shared types and constants for the Supabase provision dialog.
 */

import type { IntegrationsTranslateFn } from "./use-integration-catalog";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const SUPABASE_REGION_VALUES = [
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "ap-south-1",
  "sa-east-1",
] as const;

/** @deprecated Use SUPABASE_REGION_VALUES with translated labels from integrations.shared.supabaseRegions */
export const SUPABASE_REGIONS: Array<{ value: string; label: string }> = SUPABASE_REGION_VALUES.map(
  (value) => ({ value, label: value }),
);

export interface SupabaseOrganization {
  id: string;
  name: string;
}

export interface ExistingSupabaseProject {
  id: string;
  name: string;
  description?: string;
  meta?: {
    region?: string;
    organizationId?: string;
    projectRef?: string;
  };
}

export interface ProvisionPhase {
  phase: string;
  message: string;
}

export type DialogMode = "existing" | "new";

export interface SupabaseProvisionDialogProps {
  open: boolean;
  workspaceId: string;
  projectId: string;
  defaultName?: string;
  reason?: string;
  onClose: (done: boolean) => void;
}

export async function getAccessToken(): Promise<string | undefined> {
  const { getStoredTokens } = await import("@/lib/api");
  return getStoredTokens().accessToken ?? undefined;
}

/**
 * Run a Supabase OAuth popup and wait for the completion signal via
 * postMessage, localStorage, or popup-close fallback.
 */
export function openSupabaseOAuthPopup(
  authorizationUrl: string,
  fetchOrgs: () => Promise<boolean>,
  t: IntegrationsTranslateFn,
): Promise<void> {
  const popup = window.open(
    authorizationUrl,
    "supabase-oauth",
    "width=540,height=720,scrollbars=yes,resizable=yes",
  );
  if (!popup) {
    return Promise.reject(new Error(t("shared.supabaseOauthMessages.popupBlocked")));
  }

  try {
    localStorage.removeItem("doable_enhanced_auth_complete");
  } catch { /* storage may be blocked */ }

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
      clearInterval(poll);
    };
    const markSuccess = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const markCancel = (msg: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(msg));
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as { type?: string; integrationId?: string; status?: string } | null;
      if (!data || data.type !== "doable:enhanced-auth-complete") return;
      if (data.integrationId !== "supabase") return;
      if (data.status === "success") markSuccess();
      else markCancel(t("shared.supabaseOauthMessages.signInCancelled"));
    };
    window.addEventListener("message", onMessage);

    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== "doable_enhanced_auth_complete" || !ev.newValue) return;
      try {
        const parsed = JSON.parse(ev.newValue) as { integrationId?: string; status?: string };
        if (parsed.integrationId !== "supabase") return;
        if (parsed.status === "success") markSuccess();
        else markCancel(t("shared.supabaseOauthMessages.signInCancelled"));
      } catch { /* ignore malformed */ }
    };
    window.addEventListener("storage", onStorage);

    const startedAt = Date.now();
    const poll = setInterval(() => {
      try {
        if (popup.closed && !settled) {
          clearInterval(poll);
          setTimeout(async () => {
            if (settled) return;
            const ok = await fetchOrgs();
            if (settled) return;
            if (ok) markSuccess();
            else markCancel(t("shared.supabaseOauthMessages.windowClosed"));
          }, 600);
        }
      } catch { /* cross-origin while on provider's domain */ }
      if (Date.now() - startedAt > 120_000) {
        markCancel(t("shared.supabaseOauthMessages.timedOut"));
      }
    }, 500);
  });
}
