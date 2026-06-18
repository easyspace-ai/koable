"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Search,
  Check,
  AlertTriangle,
  Key,
  Loader2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { getCategoryLabel, type CustomAuthField } from "./use-integration-catalog";
import { IntegrationConfigForm, type ExistingCredentialHint } from "./integration-config-form";
import { PROVIDER_SETUP_GUIDES } from "./provider-setup-guides";

// ─── Types ──────────────────────────────────────────────────

interface CatalogItem {
  id: string;
  displayName: string;
  description: string;
  logoUrl: string;
  category: string;
  authType: "oauth2" | "secret_text" | "custom_auth" | "basic_auth" | "none";
  tier: string;
  connected: boolean;
  actionCount: number;
  customAuthFields?: CustomAuthField[];
}

interface EnabledIntegration {
  id: string;
  workspace_id: string;
  integration_id: string;
  enabled: boolean;
  configured: boolean;
  enabled_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  oauth_app_id: string | null;
  oauth_client_id: string | null;
  env_configured?: boolean;
  env_source?: string | null;
}

interface PlatformCredential {
  integrationId: string;
  authType: string;
  displayHint?: string;
  updatedAt: string;
}

// ─── Preset Stacks ──────────────────────────────────────────
// Curated bundles for one-click "select common stack" workflows. The admin
// still needs to click Enable + Configure — presets only set the selection.
// IDs that aren't in the live catalog are skipped gracefully.

const PRESET_STACKS: ReadonlyArray<{ key: "productivity" | "dev" | "marketing"; ids: readonly string[] }> = [
  {
    key: "productivity",
    ids: ["google_sheets", "gmail", "google_calendar", "notion", "slack"],
  },
  {
    key: "dev",
    ids: ["github", "linear", "sentry", "pagerduty", "jira"],
  },
  {
    key: "marketing",
    ids: ["mailchimp", "hubspot", "stripe", "calendly", "intercom"],
  },
];

// ─── Main Component ─────────────────────────────────────────

interface IntegrationsAdminPanelProps {
  workspaceId?: string;
}

export function IntegrationsAdminPanel({ workspaceId: propWorkspaceId }: IntegrationsAdminPanelProps) {
  const t = useTranslations("integrations");
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(propWorkspaceId || "");

  // Load workspaces if none provided
  useEffect(() => {
    if (propWorkspaceId) {
      setSelectedWorkspaceId(propWorkspaceId);
      return;
    }
    apiFetch<{ data: Array<{ id: string; name: string }> }>("/workspaces")
      .then((res) => {
        setWorkspaces(res.data);
        const first = res.data[0];
        if (first && !selectedWorkspaceId) {
          setSelectedWorkspaceId(first.id);
        }
      })
      .catch(() => {});
  }, [propWorkspaceId]);

  const workspaceId = selectedWorkspaceId;
  const isPlatformMode = !propWorkspaceId; // Platform admin mode (global)
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [enabledMap, setEnabledMap] = useState<Map<string, EnabledIntegration>>(new Map());
  const [platformCredsMap, setPlatformCredsMap] = useState<Map<string, PlatformCredential>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "enabled" | "unconfigured" | "env">("all");
  const [envConfiguredMap, setEnvConfiguredMap] = useState<Map<string, { source: string; clientId?: string }>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState<{ kind: "enable" | "disable"; done: number; total: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Platform mode: use global endpoints; Workspace mode: use workspace-scoped endpoints
      const catalogUrl = workspaceId
        ? `/integrations/catalog?workspaceId=${workspaceId}&showAll=true`
        : `/integrations/catalog?showAll=true`;
      const enabledUrl = isPlatformMode
        ? `/integrations/admin/platform-enabled`
        : `/integrations/admin/enabled?workspaceId=${workspaceId}`;

      const [catalogRes, enabledRes, platformCredsRes] = await Promise.all([
        apiFetch<{ data: CatalogItem[]; categories: string[] }>(catalogUrl),
        apiFetch<{ data: EnabledIntegration[]; envConfigured?: Array<{ integration_id: string; env_configured: boolean; env_source: string; oauth_client_id?: string }> }>(enabledUrl),
        // Platform credentials list (only meaningful in platform mode; falls back to empty in workspace mode)
        isPlatformMode
          ? apiFetch<{ data: PlatformCredential[] }>("/integrations/admin/credentials").catch(() => ({ data: [] as PlatformCredential[] }))
          : Promise.resolve({ data: [] as PlatformCredential[] }),
      ]);
      setCatalog(catalogRes.data);
      setCategories(catalogRes.categories);
      const map = new Map<string, EnabledIntegration>();
      for (const row of enabledRes.data) {
        map.set(row.integration_id, row);
      }
      // Merge env-configured integrations (from platform endpoint)
      const envMap = new Map<string, { source: string; clientId?: string }>();
      if (enabledRes.envConfigured) {
        for (const env of enabledRes.envConfigured) {
          envMap.set(env.integration_id, { source: env.env_source, clientId: env.oauth_client_id ?? undefined });
        }
      }
      // Also check env_configured flag on regular rows
      for (const row of enabledRes.data) {
        if (row.env_configured && row.env_source) {
          envMap.set(row.integration_id, { source: row.env_source });
        }
      }
      setEnvConfiguredMap(envMap);
      setEnabledMap(map);
      // Platform credentials for non-OAuth integrations
      const credsMap = new Map<string, PlatformCredential>();
      for (const cred of platformCredsRes.data) {
        credsMap.set(cred.integrationId, cred);
      }
      setPlatformCredsMap(credsMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminPanel.errors.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, isPlatformMode, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleIntegration = async (integrationId: string, enable: boolean) => {
    setSaving(integrationId);
    try {
      if (isPlatformMode) {
        // Global platform-level enablement
        if (enable) {
          await apiFetch("/integrations/admin/platform-enabled", {
            method: "POST",
            body: JSON.stringify({ integrationId, enabled: true }),
          });
        } else {
          await apiFetch(`/integrations/admin/platform-enabled/${integrationId}`, {
            method: "DELETE",
          });
        }
      } else {
        // Workspace-level enablement
        if (enable) {
          await apiFetch("/integrations/admin/enabled", {
            method: "POST",
            body: JSON.stringify({ workspaceId, integrationId, enabled: true }),
          });
        } else {
          await apiFetch(`/integrations/admin/enabled/${integrationId}?workspaceId=${workspaceId}`, {
            method: "DELETE",
          });
        }
      }
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("adminPanel.errors.failedToUpdate"));
    } finally {
      setSaving(null);
    }
  };

  const handleConfigSaved = useCallback(async () => {
    setExpandedId(null);
    await fetchData();
  }, [fetchData]);

  // ─── Bulk ops ────────────────────────────────────────────

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const deselectAllVisible = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const runBulk = useCallback(async (kind: "enable" | "disable") => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkBusy({ kind, done: 0, total: ids.length });
    setError(null);
    let done = 0;
    let failures = 0;
    for (const integrationId of ids) {
      try {
        if (kind === "enable") {
          if (isPlatformMode) {
            await apiFetch("/integrations/admin/platform-enabled", {
              method: "POST",
              body: JSON.stringify({ integrationId, enabled: true }),
            });
          } else {
            await apiFetch("/integrations/admin/enabled", {
              method: "POST",
              body: JSON.stringify({ workspaceId, integrationId, enabled: true }),
            });
          }
        } else {
          if (isPlatformMode) {
            await apiFetch(`/integrations/admin/platform-enabled/${integrationId}`, { method: "DELETE" });
          } else {
            await apiFetch(`/integrations/admin/enabled/${integrationId}?workspaceId=${workspaceId}`, { method: "DELETE" });
          }
        }
      } catch {
        failures++;
      }
      done++;
      setBulkBusy({ kind, done, total: ids.length });
    }
    setBulkBusy(null);
    if (failures > 0) {
      setError(
        t("adminPanel.bulk.partialFailure", {
          failures,
          total: ids.length,
          kind: kind === "enable" ? t("adminPanel.bulk.enabling") : t("adminPanel.bulk.disabling"),
        }),
      );
    }
    clearSelection();
    await fetchData();
  }, [selectedIds, isPlatformMode, workspaceId, fetchData, clearSelection, t]);

  const applyPreset = useCallback((presetIds: readonly string[]) => {
    // Only select IDs that actually exist in the current catalog
    const available = new Set(catalog.map((i) => i.id));
    const matching = presetIds.filter((id) => available.has(id));
    if (matching.length === 0) {
      setError(t("adminPanel.presets.noneInCatalog"));
      return;
    }
    setError(null);
    setSelectedIds(new Set(matching));
  }, [catalog, t]);

  // Filter and search
  const filtered = catalog.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.displayName.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (category && item.category !== category) return false;
    if (filterMode === "enabled" && !enabledMap.has(item.id)) return false;
    if (filterMode === "unconfigured") {
      const entry = enabledMap.get(item.id);
      const hasAny = (entry?.configured ?? false) || platformCredsMap.has(item.id) || envConfiguredMap.has(item.id);
      if (!entry || hasAny) return false;
    }
    if (filterMode === "env" && !envConfiguredMap.has(item.id)) return false;
    return true;
  });

  // Group by category
  const grouped = filtered.reduce<Record<string, CatalogItem[]>>((acc, item) => {
    const cat = item.category || "other";
    (acc[cat] ??= []).push(item);
    return acc;
  }, {});

  const enabledCount = enabledMap.size;
  const unconfiguredCount = useMemo(
    () => [...enabledMap.entries()].filter(([id, e]) =>
      !e.configured && !platformCredsMap.has(id) && !envConfiguredMap.has(id),
    ).length,
    [enabledMap, platformCredsMap, envConfiguredMap],
  );
  const envConfiguredCount = envConfiguredMap.size;
  const platformConfiguredCount = platformCredsMap.size;
  const oauthIntegrations = catalog.filter((i) => i.authType === "oauth2");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Platform mode info */}
      {isPlatformMode && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <ExternalLink className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            {t("adminPanel.platformModeBanner")}
          </div>
        </div>
      )}
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border p-3 bg-background">
          <div className="text-2xl font-bold text-foreground">{enabledCount}</div>
          <div className="text-xs text-muted-foreground">{t("adminPanel.summary.enabled")}</div>
        </div>
        <div className={cn("rounded-lg border p-3 bg-background", platformConfiguredCount > 0 && "border-green-500/50")}>
          <div className={cn("text-2xl font-bold", platformConfiguredCount > 0 ? "text-green-600" : "text-foreground")}>
            {platformConfiguredCount}
          </div>
          <div className="text-xs text-muted-foreground">{t("adminPanel.summary.configuredDb")}</div>
        </div>
        <div className={cn("rounded-lg border p-3 bg-background", envConfiguredCount > 0 && "border-blue-500/50")}>
          <div className={cn("text-2xl font-bold", envConfiguredCount > 0 ? "text-blue-600" : "text-foreground")}>
            {envConfiguredCount}
          </div>
          <div className="text-xs text-muted-foreground">{t("adminPanel.summary.viaEnvVars")}</div>
        </div>
        <div className={cn("rounded-lg border p-3 bg-background", unconfiguredCount > 0 && "border-yellow-500/50")}>
          <div className={cn("text-2xl font-bold", unconfiguredCount > 0 ? "text-yellow-600" : "text-foreground")}>
            {unconfiguredCount}
          </div>
          <div className="text-xs text-muted-foreground">{t("adminPanel.summary.needsConfig")}</div>
        </div>
      </div>

      {unconfiguredCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <div className="text-sm text-yellow-700 dark:text-yellow-400">
            {t("adminPanel.warnings.unconfigured", { count: unconfiguredCount })}
          </div>
        </div>
      )}

      {envConfiguredCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
          <Key className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700 dark:text-blue-400">
            {t("adminPanel.warnings.envConfigured", { count: envConfiguredCount })}
          </div>
        </div>
      )}

      {/* Preset stacks — one-click select-a-common-bundle */}
      {isPlatformMode && (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mt-1.5 mr-1">{t("adminPanel.presets.quickStart")}</span>
          {PRESET_STACKS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.ids)}
              className="rounded-md border border-dashed border-input bg-background px-2.5 py-1 text-xs hover:bg-muted transition-colors"
              title={t(`adminPanel.presets.${preset.key}.description`)}
            >
              {t(`adminPanel.presets.${preset.key}.label`)}
            </button>
          ))}
        </div>
      )}

      {/* Bulk action bar — appears when one or more rows are selected */}
      {selectedIds.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 p-3 shadow-sm">
          <div className="text-sm font-medium text-foreground">
            {t("adminPanel.bulk.selected", { count: selectedIds.size })}
            {bulkBusy && (
              <span className="ml-2 text-xs text-muted-foreground">
                {t("adminPanel.bulk.progress", {
                  kind: bulkBusy.kind === "enable"
                    ? t("adminPanel.bulk.enabling")
                    : t("adminPanel.bulk.disabling"),
                  done: bulkBusy.done,
                  total: bulkBusy.total,
                })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void runBulk("enable")}
              disabled={!!bulkBusy}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {bulkBusy?.kind === "enable" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("adminPanel.bulk.enableSelected")
              )}
            </button>
            <button
              onClick={() => void runBulk("disable")}
              disabled={!!bulkBusy}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {bulkBusy?.kind === "disable" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("adminPanel.bulk.disableSelected")
              )}
            </button>
            <button
              onClick={clearSelection}
              disabled={!!bulkBusy}
              className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("adminPanel.bulk.clear")}
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="integration-catalog-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("adminPanel.filters.searchPlaceholder")}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
            data-1p-ignore
            data-lpignore="true"
            data-form-type="other"
            className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={category || ""}
          onChange={(e) => setCategory(e.target.value || null)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t("adminPanel.filters.allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {getCategoryLabel(t, cat)}
            </option>
          ))}
        </select>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(["all", "enabled", "env", "unconfigured"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={cn(
                "px-3 py-2 text-xs font-medium transition-colors",
                filterMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "all"
                ? t("adminPanel.filters.all")
                : mode === "enabled"
                  ? t("adminPanel.filters.enabled")
                  : mode === "env"
                    ? t("adminPanel.filters.envVars")
                    : t("adminPanel.filters.needsConfig")}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Integration list grouped by category */}
      <div className="space-y-4">
        {Object.entries(grouped)
          .sort(([a], [b]) => getCategoryLabel(t, a).localeCompare(getCategoryLabel(t, b)))
          .map(([cat, items]) => {
            const categoryIds = items.map((i) => i.id);
            const allSelectedInCategory = categoryIds.length > 0 && categoryIds.every((id) => selectedIds.has(id));
            const someSelectedInCategory = categoryIds.some((id) => selectedIds.has(id));
            return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={allSelectedInCategory}
                  ref={(el) => { if (el) el.indeterminate = !allSelectedInCategory && someSelectedInCategory; }}
                  onChange={(e) => {
                    if (e.target.checked) selectAllVisible(categoryIds);
                    else deselectAllVisible(categoryIds);
                  }}
                  className="h-3.5 w-3.5 rounded border-input cursor-pointer"
                  aria-label={t("adminPanel.list.selectAllInCategory", {
                    category: getCategoryLabel(t, cat),
                  })}
                />
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {getCategoryLabel(t, cat)} ({items.length})
                </h3>
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const entry = enabledMap.get(item.id);
                  const isEnabled = !!entry;
                  const isOAuth = item.authType === "oauth2";
                  const hasPlatformCred = platformCredsMap.has(item.id);
                  const isExpanded = expandedId === item.id;
                  const isSaving = saving === item.id;
                  const envInfo = envConfiguredMap.get(item.id);
                  const isEnvConfigured = !!envInfo;
                  // Effective "configured" state: enabled row's flag OR a platform credential exists OR env vars provide credentials
                  const isConfigured = (entry?.configured ?? false) || hasPlatformCred || isEnvConfigured;
                  const needsConfig = isEnabled && !isConfigured && item.authType !== "none";
                  const canConfigure = item.authType !== "none";

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "rounded-lg border transition-colors",
                        isEnvConfigured && !isEnabled && "border-blue-500/30 bg-blue-500/5",
                        needsConfig && "border-yellow-500/40",
                        isEnabled && isConfigured && "border-green-500/30",
                        !isEnabled && !isEnvConfigured && "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Bulk select checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelected(item.id)}
                          className="h-3.5 w-3.5 rounded border-input cursor-pointer shrink-0"
                          aria-label={t("adminPanel.list.selectIntegration", { name: item.displayName })}
                        />
                        {/* Logo */}
                        <img
                          src={item.logoUrl}
                          alt={item.displayName}
                          className="h-8 w-8 rounded-md object-contain bg-white p-0.5"
                        />
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.displayName}</span>
                            <StatusChip authType={item.authType} />
                            {isEnvConfigured && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                                title={t("adminPanel.list.envBadgeTitle", { source: envInfo!.source })}
                              >
                                {t("adminPanel.list.envBadge")}
                              </span>
                            )}
                            {hasPlatformCred && !isEnvConfigured && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                                title={t("adminPanel.list.dbBadgeTitle")}
                              >
                                {t("adminPanel.list.dbBadge")}
                              </span>
                            )}
                            {isEnabled && isConfigured && (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            )}
                            {needsConfig && (
                              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {isEnvConfigured && (
                              <span className="text-blue-600 dark:text-blue-400">[{envInfo!.source}] </span>
                            )}
                            {item.description}
                          </p>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {canConfigure && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                                needsConfig
                                  ? "border-yellow-500/40 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/10"
                                  : isConfigured
                                    ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                                    : "border-input bg-background text-foreground hover:bg-muted"
                              )}
                              title={
                                isConfigured
                                  ? t("adminPanel.list.updateTitle")
                                  : t("adminPanel.list.configureTitle")
                              }
                            >
                              <Settings2 className="h-3 w-3" />
                              {isConfigured
                                ? t("adminPanel.list.update")
                                : t("adminPanel.list.configure")}
                              {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                          )}
                          <button
                            onClick={() => toggleIntegration(item.id, !isEnabled)}
                            disabled={!!isSaving}
                            className={cn(
                              "px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-w-[68px]",
                              isEnabled
                                ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-400"
                                : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                            )}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            ) : isEnabled ? (
                              t("adminPanel.list.enabled")
                            ) : (
                              t("adminPanel.list.enable")
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Polymorphic Config Form (expanded) */}
                      {isExpanded && canConfigure && (
                        <div className="border-t p-4 bg-muted/30">
                          <IntegrationConfigForm
                            item={{
                              id: item.id,
                              displayName: item.displayName,
                              description: item.description,
                              authType: item.authType,
                              customAuthFields: item.customAuthFields,
                            }}
                            isPlatformMode={isPlatformMode}
                            workspaceId={workspaceId || undefined}
                            existing={buildExistingHint({ entry, platformCred: platformCredsMap.get(item.id), envInfo })}
                            setupGuide={PROVIDER_SETUP_GUIDES[item.id]}
                            onSaved={handleConfigSaved}
                            onCancel={() => setExpandedId(null)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("adminPanel.empty")}
        </div>
      )}
    </div>
  );
}

// ─── Status / Auth-Type Chip ─────────────────────────────────

function StatusChip({ authType }: { authType: CatalogItem["authType"] }) {
  const t = useTranslations("integrations");
  if (authType === "none") return null;
  const label =
    authType === "oauth2" ? t("adminPanel.statusChip.oauth")
    : authType === "secret_text" ? t("adminPanel.statusChip.apiKey")
    : authType === "basic_auth" ? t("adminPanel.statusChip.userPass")
    : t("adminPanel.statusChip.custom");
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
      {label}
    </span>
  );
}

// ─── Existing Credential Hint Builder ───────────────────────

function buildExistingHint({
  entry,
  platformCred,
  envInfo,
}: {
  entry: EnabledIntegration | undefined;
  platformCred: PlatformCredential | undefined;
  envInfo: { source: string; clientId?: string } | undefined;
}): ExistingCredentialHint | undefined {
  // Resolution priority for the "existing" badge shown in the form:
  // 1. Env-var fallback (read-only, can be overridden by saving a DB credential)
  // 2. Workspace/platform oauth_app row (has oauth_client_id)
  // 3. Platform non-OAuth credential (has displayHint)
  if (envInfo) {
    return { source: "env", envSource: envInfo.source, displayHint: envInfo.clientId?.slice(-4) };
  }
  if (entry?.oauth_client_id) {
    return { source: "oauth_apps", displayHint: entry.oauth_client_id.slice(-4) };
  }
  if (platformCred?.displayHint) {
    return { source: "platform_credentials", displayHint: platformCred.displayHint };
  }
  if (platformCred) {
    return { source: "platform_credentials" };
  }
  return undefined;
}

// ─── Workspace Selector ─────────────────────────────────────

function WorkspaceSelector({
  workspaces,
  selected,
  onChange,
}: {
  workspaces: Array<{ id: string; name: string }>;
  selected: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("integrations");
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-muted-foreground">
        {t("adminPanel.workspaceSelector.label")}
      </label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
          </option>
        ))}
      </select>
    </div>
  );
}
