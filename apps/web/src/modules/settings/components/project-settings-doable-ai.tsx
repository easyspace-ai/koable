"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Brain,
  Download,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import { SectionCard } from "./project-settings-shared";
import { ProjectChatModelPicker } from "./project-chat-model-picker";

type Visibility = "auto" | "always-show" | "hide";

interface DoableAiSettings {
  enabled: boolean;
  systemPrompt: string | null;
  systemPromptOverride: string | null;
  thinkingVisibility: Visibility;
  chatModelOverride: string | null;
  embeddingModelOverride: string | null;
  defaultModel: string | null;
  embeddingModel: string | null;
  embeddingProviderId: string | null;
}

interface AiUsage {
  period: string;
  totals: { tokens: number; requests: number; costUsd: number };
  byMode: Record<string, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    requestCount: number;
    costUsd: number;
  }>;
  topModels: Array<{ model: string; requestCount: number; totalTokens: number }>;
}

interface EmbeddingsStats {
  mode: string;
  tables: Array<{ table: string; column: string; rows: number }>;
  totalRows: number;
}

const SYSTEM_PROMPT_MAX = 4_096;

interface Props {
  projectId: string;
  workspaceId: string;
  addToast: (kind: "success" | "error", msg: string) => void;
}

export function DoableAiTab({ projectId, workspaceId, addToast }: Props) {
  const t = useTranslations("settings");
  const [settings, setSettings] = useState<DoableAiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState("");
  const [pendingChatModel, setPendingChatModel] = useState<string | null>(null);
  const [pendingVisibility, setPendingVisibility] = useState<Visibility>("auto");
  const [pendingEnabled, setPendingEnabled] = useState(true);

  // ── Usage card ──
  const [period, setPeriod] = useState<"today" | "7d" | "30d" | "all">("30d");
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // ── Destructive embedding modal ──
  const [embedModalOpen, setEmbedModalOpen] = useState(false);
  const [embedStats, setEmbedStats] = useState<EmbeddingsStats | null>(null);
  const [embedConfirm, setEmbedConfirm] = useState("");
  const [embedNewModel, setEmbedNewModel] = useState("");
  const [embedBusy, setEmbedBusy] = useState(false);

  const refreshSettings = useCallback(() => {
    setLoading(true);
    apiFetch<{ data: DoableAiSettings }>(`/projects/${projectId}/ai-settings`)
      .then(({ data }) => {
        setSettings(data);
        setPendingPrompt(data.systemPromptOverride ?? "");
        setPendingChatModel(data.chatModelOverride);
        setPendingVisibility(data.thinkingVisibility ?? "auto");
        setPendingEnabled(data.enabled);
      })
      .catch((err) => addToast("error", err instanceof Error ? err.message : t("doableAi.errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [projectId, addToast, t]);

  const refreshUsage = useCallback(() => {
    setUsageLoading(true);
    apiFetch<{ data: AiUsage }>(`/projects/${projectId}/ai-usage?period=${period}`)
      .then(({ data }) => setUsage(data))
      .catch(() => setUsage(null))
      .finally(() => setUsageLoading(false));
  }, [projectId, period]);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);
  useEffect(() => { refreshUsage(); }, [refreshUsage]);

  const dirty = useMemo(() => {
    if (!settings) return false;
    return (
      pendingPrompt !== (settings.systemPromptOverride ?? "") ||
      pendingChatModel !== settings.chatModelOverride ||
      pendingVisibility !== (settings.thinkingVisibility ?? "auto") ||
      pendingEnabled !== settings.enabled
    );
  }, [settings, pendingPrompt, pendingChatModel, pendingVisibility, pendingEnabled]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch(`/projects/${projectId}/ai-settings`, {
        method: "PUT",
        body: JSON.stringify({
          enabled: pendingEnabled,
          thinkingVisibility: pendingVisibility,
          systemPromptOverride: pendingPrompt.trim().length === 0 ? null : pendingPrompt.trim(),
          chatModelOverride: pendingChatModel,
        }),
      });
      addToast("success", t("doableAi.toasts.saved"));
      refreshSettings();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : t("doableAi.errors.saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [projectId, pendingEnabled, pendingVisibility, pendingPrompt, pendingChatModel, addToast, refreshSettings, t]);

  const openEmbedModal = useCallback(async () => {
    setEmbedModalOpen(true);
    setEmbedConfirm("");
    setEmbedNewModel(settings?.embeddingModelOverride ?? settings?.embeddingModel ?? "");
    try {
      const r = await apiFetch<{ data: EmbeddingsStats }>(`/projects/${projectId}/embeddings/stats`);
      setEmbedStats(r.data);
    } catch {
      setEmbedStats({ mode: "unknown", tables: [], totalRows: 0 });
    }
  }, [projectId, settings]);

  const eraseEmbeddings = useCallback(async () => {
    if (embedConfirm !== "ERASE") {
      addToast("error", t("doableAi.errors.eraseConfirm"));
      return;
    }
    setEmbedBusy(true);
    try {
      const r = await apiFetch<{ ok: boolean; mode: string; tables: Array<{ table: string; deleted: number }> }>(
        `/projects/${projectId}/embeddings`,
        { method: "DELETE", body: JSON.stringify({ confirm: "ERASE" }) },
      );
      // After erasing, also persist the new embedding model override.
      if (embedNewModel.trim().length > 0) {
        await apiFetch(`/projects/${projectId}/ai-settings`, {
          method: "PUT",
          body: JSON.stringify({
            embeddingModelOverride: embedNewModel.trim(),
            // Required because PUT replaces NULL-able fields too.
            thinkingVisibility: pendingVisibility,
            systemPromptOverride: pendingPrompt.trim().length === 0 ? null : pendingPrompt.trim(),
            chatModelOverride: pendingChatModel,
            enabled: pendingEnabled,
          }),
        });
      }
      const deleted = r.tables.reduce((acc, t) => acc + t.deleted, 0);
      addToast("success", t("doableAi.toasts.erased", { deleted, tables: r.tables.length, mode: r.mode }));
      setEmbedModalOpen(false);
      setEmbedConfirm("");
      refreshSettings();
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : t("doableAi.errors.eraseFailed"));
    } finally {
      setEmbedBusy(false);
    }
  }, [projectId, embedConfirm, embedNewModel, addToast, refreshSettings, pendingVisibility, pendingPrompt, pendingChatModel, pendingEnabled, t]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const effectivePrompt = (pendingPrompt ?? "").length;
  const promptPct = Math.min(100, Math.round((effectivePrompt / SYSTEM_PROMPT_MAX) * 100));

  return (
    <div className="space-y-6" data-doable-ai-tab>
      {/* ── Master toggle ── */}
      <SectionCard
        title={t("doableAi.masterToggle.title")}
        description={t("doableAi.masterToggle.description")}
      >
        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={pendingEnabled}
              onChange={(e) => setPendingEnabled(e.target.checked)}
              className="h-4 w-4"
              data-testid="ai-enabled-toggle"
            />
            <span className="text-sm font-medium">
              {pendingEnabled ? t("doableAi.masterToggle.enabled") : t("doableAi.masterToggle.disabled")}
            </span>
          </label>
        </div>
      </SectionCard>

      {/* ── Thinking visibility ── */}
      <SectionCard
        title={t("doableAi.thinkingVisibility.title")}
        description={t("doableAi.thinkingVisibility.description")}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {(["auto", "always-show", "hide"] as const).map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                pendingVisibility === v
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <input
                type="radio"
                name="thinking-visibility"
                value={v}
                checked={pendingVisibility === v}
                onChange={() => setPendingVisibility(v)}
                className="sr-only"
                data-testid={`thinking-visibility-${v}`}
              />
              <div className="flex items-center gap-2 text-sm font-medium">
                <Brain className="h-4 w-4" />
                {v === "auto" && t("doableAi.thinkingVisibility.auto.label")}
                {v === "always-show" && t("doableAi.thinkingVisibility.alwaysShow.label")}
                {v === "hide" && t("doableAi.thinkingVisibility.hide.label")}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {v === "auto" && t("doableAi.thinkingVisibility.auto.description")}
                {v === "always-show" && t("doableAi.thinkingVisibility.alwaysShow.description")}
                {v === "hide" && t("doableAi.thinkingVisibility.hide.description")}
              </p>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* ── System prompt override ── */}
      <SectionCard
        title={t("doableAi.systemPrompt.title")}
        description={t("doableAi.systemPrompt.description")}
      >
        <div className="space-y-2">
          <textarea
            value={pendingPrompt}
            onChange={(e) => setPendingPrompt(e.target.value.slice(0, SYSTEM_PROMPT_MAX))}
            rows={6}
            placeholder={t("doableAi.systemPrompt.placeholder")}
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
            data-testid="system-prompt-override"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t("doableAi.systemPrompt.charCount", {
                current: effectivePrompt,
                max: SYSTEM_PROMPT_MAX,
                percent: promptPct,
              })}
            </span>
            <button
              type="button"
              onClick={() => setPendingPrompt("")}
              className="text-xs underline-offset-2 hover:underline"
            >
              {t("doableAi.systemPrompt.reset")}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* ── Chat model override ── */}
      <SectionCard
        title={t("doableAi.chatModel.title")}
        description={t("doableAi.chatModel.description")}
      >
        <ProjectChatModelPicker
          workspaceId={workspaceId}
          value={pendingChatModel}
          defaultModel={settings.defaultModel}
          onChange={setPendingChatModel}
        />
      </SectionCard>

      {/* ── Embedding model override (destructive) ── */}
      <SectionCard
        title={t("doableAi.embeddingModel.title")}
        description={t("doableAi.embeddingModel.description")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm">
              {t("doableAi.embeddingModel.current", {
                model: settings.embeddingModelOverride ?? settings.embeddingModel ?? t("doableAi.embeddingModel.currentDefault"),
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("doableAi.embeddingModel.hint")}
            </p>
          </div>
          <button
            type="button"
            onClick={openEmbedModal}
            className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-950"
            data-testid="open-embed-modal"
          >
            <Trash2 className="h-4 w-4" />
            {t("doableAi.embeddingModel.changeButton")}
          </button>
        </div>
      </SectionCard>

      {/* ── Token usage ── */}
      <SectionCard
        title={t("doableAi.usage.title")}
        description={t("doableAi.usage.description")}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border bg-muted/40 p-1">
            {(["today", "7d", "30d", "all"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`usage-period-${p}`}
              >
                {p === "today"
                  ? t("doableAi.usage.periods.today")
                  : p === "all"
                    ? t("doableAi.usage.periods.all")
                    : t(`doableAi.usage.periods.${p}` as "7d" | "30d")}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshUsage}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${usageLoading ? "animate-spin" : ""}`} />
              {t("doableAi.usage.refresh")}
            </button>
            <a
              href={`/api/projects/${projectId}/ai-usage.csv?period=${period}`}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              data-testid="usage-csv-link"
            >
              <Download className="h-3.5 w-3.5" />
              {t("doableAi.usage.csv")}
            </a>
          </div>
        </div>

        {usage ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="usage-totals">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{t("doableAi.usage.totalTokens")}</p>
                <p className="mt-1 text-2xl font-semibold">{usage.totals.tokens.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{t("doableAi.usage.requests")}</p>
                <p className="mt-1 text-2xl font-semibold">{usage.totals.requests.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">{t("doableAi.usage.estimatedCost")}</p>
                <p className="mt-1 text-2xl font-semibold">
                  {usage.totals.costUsd > 0 ? `$${usage.totals.costUsd.toFixed(4)}` : (
                    <span className="text-sm font-normal text-muted-foreground">{t("doableAi.usage.pricingNotConfigured")}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">{t("doableAi.usage.table.mode")}</th>
                    <th className="px-3 py-2 text-right">{t("doableAi.usage.table.prompt")}</th>
                    <th className="px-3 py-2 text-right">{t("doableAi.usage.table.completion")}</th>
                    <th className="px-3 py-2 text-right">{t("doableAi.usage.table.total")}</th>
                    <th className="px-3 py-2 text-right">{t("doableAi.usage.table.requests")}</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(usage.byMode).length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">{t("doableAi.usage.noUsageYet")}</td></tr>
                  )}
                  {Object.entries(usage.byMode).map(([mode, row]) => (
                    <tr key={mode} className="border-t">
                      <td className="px-3 py-2 font-mono">{mode}</td>
                      <td className="px-3 py-2 text-right">{row.promptTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{row.completionTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{row.totalTokens.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">{row.requestCount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {usage.topModels.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">{t("doableAi.usage.topModels")}</p>
                <ul className="space-y-1 text-sm">
                  {usage.topModels.map((m) => (
                    <li key={m.model} className="flex justify-between gap-2 text-muted-foreground">
                      <span className="font-mono truncate">{m.model}</span>
                      <span>{t("doableAi.usage.modelStats", { requests: m.requestCount, tokens: m.totalTokens.toLocaleString() })}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("doableAi.usage.noData")}</p>
        )}
      </SectionCard>

      {/* ── Sticky save bar ── */}
      <div className="flex items-center justify-end gap-3 rounded-xl border bg-card p-3">
        {dirty && (
          <p className="mr-auto text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mr-1 inline h-3 w-3" />
            {t("doableAi.saveBar.unsaved")}
          </p>
        )}
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => {
            refreshSettings();
          }}
          className="rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {t("doableAi.saveBar.discard")}
        </button>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={save}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          data-testid="save-doable-ai"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("doableAi.saveBar.save")}
        </button>
      </div>

      {/* ── Embedding erase modal ── */}
      {embedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="embed-erase-modal">
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" /> {t("doableAi.eraseModal.title")}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("doableAi.eraseModal.description", {
                model: settings.embeddingModelOverride ?? settings.embeddingModel ?? t("doableAi.embeddingModel.currentDefault"),
                rows: embedStats?.totalRows.toLocaleString() ?? "?",
                tables: embedStats?.tables.length ?? 0,
              })}
            </p>
            {embedStats && embedStats.tables.length > 0 && (
              <ul className="mt-2 max-h-32 overflow-auto rounded border bg-muted/30 p-2 text-xs font-mono">
                {embedStats.tables.map((row) => (
                  <li key={row.table}>
                    {t("doableAi.eraseModal.tableRows", { table: row.table, rows: row.rows.toLocaleString() })}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium">{t("doableAi.eraseModal.newModelLabel")}</label>
              <input
                type="text"
                value={embedNewModel}
                onChange={(e) => setEmbedNewModel(e.target.value)}
                placeholder={t("doableAi.eraseModal.newModelPlaceholder")}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                data-testid="embed-new-model"
              />
              <label className="block text-sm font-medium">
                {t("doableAi.eraseModal.confirmLabel")}
              </label>
              <input
                type="text"
                value={embedConfirm}
                onChange={(e) => setEmbedConfirm(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                placeholder={t("doableAi.eraseModal.confirmPlaceholder")}
                data-testid="embed-confirm-input"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmbedModalOpen(false)}
                disabled={embedBusy}
                className="rounded-md border px-3 py-2 text-sm"
              >
                {t("doableAi.eraseModal.cancel")}
              </button>
              <button
                type="button"
                onClick={eraseEmbeddings}
                disabled={embedConfirm !== "ERASE" || embedBusy}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                data-testid="embed-erase-confirm"
              >
                {embedBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t("doableAi.eraseModal.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
