"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X, Ban, Loader2, MailX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { useToasts } from "@/hooks/use-toasts";
import { ToastContainer } from "@/components/ui/toast-container";
import { useTranslation } from "@/lib/i18n";

interface SignupApprovalConfig {
  enabled: boolean;
  pending_message: string;
}

interface PendingSignupRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  approval_status: "approved" | "pending" | "rejected";
  has_password: boolean;
  has_github: boolean;
  has_google: boolean;
  created_at: string;
}

interface BlockedEmailRow {
  email: string;
  reason: string | null;
  blocked_at: string;
  blocked_by: string | null;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export function SignupsPanel() {
  const { t } = useTranslation("admin");
  const { toasts, addToast, dismissToast } = useToasts();
  const [config, setConfig] = useState<SignupApprovalConfig | null>(null);
  const [pending, setPending] = useState<PendingSignupRow[]>([]);
  const [recentlyDecided, setRecentlyDecided] = useState<PendingSignupRow[]>([]);
  const [blocked, setBlocked] = useState<BlockedEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  function providerBadge(row: PendingSignupRow): string {
    const parts: string[] = [];
    if (row.has_password) parts.push(t("signups.provider.email"));
    if (row.has_github) parts.push(t("signups.provider.github"));
    if (row.has_google) parts.push(t("signups.provider.google"));
    return parts.join(" · ") || "—";
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queue, blockedRes] = await Promise.all([
        apiFetch<{ pending: PendingSignupRow[]; recentlyDecided: PendingSignupRow[]; config: SignupApprovalConfig }>("/admin/signups"),
        apiFetch<{ blocked: BlockedEmailRow[] }>("/admin/signups/blocked"),
      ]);
      setPending(queue.pending);
      setRecentlyDecided(queue.recentlyDecided);
      setConfig(queue.config);
      setDraftEnabled(queue.config.enabled);
      setDraftMessage(queue.config.pending_message);
      setBlocked(blockedRes.blocked);
    } catch (err) {
      console.error("Failed to load signups:", err);
      addToast("error", t("signups.toast.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => { void load(); }, [load]);

  async function saveConfig() {
    setSavingConfig(true);
    try {
      const next = await apiFetch<SignupApprovalConfig>("/admin/signups/config", {
        method: "PUT",
        body: JSON.stringify({ enabled: draftEnabled, pending_message: draftMessage }),
      });
      setConfig(next);
      setDraftEnabled(next.enabled);
      setDraftMessage(next.pending_message);
      addToast("success", next.enabled ? t("signups.toast.enabled") : t("signups.toast.disabled"));
    } catch {
      addToast("error", t("signups.toast.saveFailed"));
    } finally {
      setSavingConfig(false);
    }
  }

  async function decide(userId: string, action: "approve" | "deny" | "block", email: string) {
    if (action === "block") {
      const confirmed = window.confirm(t("signups.confirm.block", { email }));
      if (!confirmed) return;
    } else if (action === "deny") {
      const confirmed = window.confirm(t("signups.confirm.deny", { email }));
      if (!confirmed) return;
    }
    setBusyUserId(userId);
    try {
      await apiFetch(`/admin/signups/${userId}/${action}`, { method: "POST", body: JSON.stringify({}) });
      const toastKey =
        action === "approve"
          ? "signups.toast.approved"
          : action === "deny"
            ? "signups.toast.denied"
            : "signups.toast.blocked";
      addToast("success", t(toastKey, { email }));
      await load();
    } catch {
      const actionLabel =
        action === "approve"
          ? t("signups.actions.approve")
          : action === "deny"
            ? t("signups.actions.deny")
            : t("signups.actions.block");
      addToast("error", t("signups.toast.actionFailed", { action: actionLabel, email }));
    } finally {
      setBusyUserId(null);
    }
  }

  async function unblock(email: string) {
    if (!window.confirm(t("signups.confirm.unblock", { email }))) return;
    try {
      await apiFetch(`/admin/signups/blocked/${encodeURIComponent(email)}`, { method: "DELETE" });
      addToast("success", t("signups.toast.unblocked", { email }));
      await load();
    } catch {
      addToast("error", t("signups.toast.unblockFailed", { email }));
    }
  }

  const configDirty = config !== null && (config.enabled !== draftEnabled || config.pending_message !== draftMessage);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">{t("signups.settings.title")}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("signups.settings.description")}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="approvalsEnabled"
            type="checkbox"
            checked={draftEnabled}
            onChange={(e) => setDraftEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-transparent text-brand-700 focus:ring-brand-700 focus:ring-offset-0"
          />
          <label htmlFor="approvalsEnabled" className="text-sm text-foreground cursor-pointer select-none">
            {t("signups.settings.requireApproval")}
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <Label htmlFor="pendingMessage" className="text-xs">
            {t("signups.settings.pendingMessageLabel")}
          </Label>
          <textarea
            id="pendingMessage"
            value={draftMessage}
            onChange={(e) => setDraftMessage(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            placeholder={t("signups.settings.pendingMessagePlaceholder")}
          />
          <p className="text-[11px] text-muted-foreground">
            {t("signups.settings.pendingMessageHint")}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {configDirty && (
            <button
              type="button"
              onClick={() => { if (config) { setDraftEnabled(config.enabled); setDraftMessage(config.pending_message); } }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("signups.settings.discardChanges")}
            </button>
          )}
          <Button onClick={saveConfig} disabled={savingConfig || !configDirty} className="bg-brand-600 text-white hover:bg-brand-500">
            {savingConfig ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />{t("signups.settings.saving")}</> : t("signups.settings.saveSettings")}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {t("signups.pending.title")}
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-600/20 px-2 py-0.5 text-xs text-brand-300">
                {pending.length}
              </span>
            )}
          </h3>
          <button onClick={() => load()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            {t("signups.pending.refresh")}
          </button>
        </div>

        {pending.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground py-8">
            {t("signups.pending.empty")}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {pending.map((row) => {
              const busy = busyUserId === row.id;
              return (
                <div key={row.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {row.display_name || row.email.split("@")[0]}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {t("signups.provider.signedUp", { providers: providerBadge(row), date: formatDate(row.created_at) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" disabled={busy} onClick={() => decide(row.id, "approve", row.email)} className="bg-green-600 text-white hover:bg-green-500 h-8 px-2.5 text-xs">
                      <Check className="h-3.5 w-3.5 mr-1" />{t("signups.actions.approve")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(row.id, "deny", row.email)} className="h-8 px-2.5 text-xs">
                      <X className="h-3.5 w-3.5 mr-1" />{t("signups.actions.deny")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => decide(row.id, "block", row.email)} className="h-8 px-2.5 text-xs text-red-500 hover:text-red-400">
                      <Ban className="h-3.5 w-3.5 mr-1" />{t("signups.actions.block")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {recentlyDecided.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">{t("signups.recentlyDenied.title")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("signups.recentlyDenied.description")}
          </p>
          <div className="mt-4 space-y-2">
            {recentlyDecided.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{row.display_name || row.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => decide(row.id, "approve", row.email)} className="h-8 px-2.5 text-xs">
                  <Check className="h-3.5 w-3.5 mr-1" />{t("signups.actions.approve")}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <MailX className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t("signups.blocked.title")}</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("signups.blocked.description")}
        </p>

        {blocked.length === 0 ? (
          <p className="mt-6 text-center text-sm text-muted-foreground py-4">
            {t("signups.blocked.empty")}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {blocked.map((row) => (
              <div key={row.email} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{row.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t("signups.blocked.blockedAt", { date: formatDate(row.blocked_at) })}{row.reason ? ` · ${row.reason}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => unblock(row.email)} className="h-8 px-2.5 text-xs">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />{t("signups.actions.unblock")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
