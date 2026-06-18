"use client";

import { useState } from "react";
import {
  Bot, Zap, Crown, Check, X, Loader2, RotateCcw, ChevronDown,
  Search, Shield, Sparkles, Users as UsersIcon, Plus,
} from "lucide-react";
import {
  WORKSPACE_PLANS,
  WORKSPACE_ROLES,
  PLAN_LABELS,
  ROLE_LABELS,
} from "@doable/shared";
import type { ApiGitHubCopilotAccount, ApiAiProvider } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

// Server-side caps (keep in sync with services/api/src/routes/admin-users.ts)
const CREDIT_CAPS = {
  daily: 100_000,
  monthly: 1_000_000,
  rollover: 1_000_000,
} as const;

type CreditFieldErrors = Partial<Record<"dailyCredits" | "monthlyCredits" | "rolloverCredits", string>>;

function extractFieldErrors(err: unknown): { fieldErrors: CreditFieldErrors; formError: string | null } | null {
  if (!(err instanceof ApiError) || err.status !== 400) return null;
  // Server returns { error: { formErrors: [], fieldErrors: { dailyCredits: [...] } } }
  const raw = (err.body as unknown as { error?: unknown }).error;
  if (!raw || typeof raw !== "object") return null;
  const flat = raw as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
  if (!flat.fieldErrors && !flat.formErrors) return null;
  const fe: CreditFieldErrors = {};
  for (const k of ["dailyCredits", "monthlyCredits", "rolloverCredits"] as const) {
    const msgs = flat.fieldErrors?.[k];
    if (msgs && msgs.length > 0) fe[k] = msgs[0];
  }
  const formError = flat.formErrors && flat.formErrors.length > 0 ? (flat.formErrors[0] ?? null) : null;
  return { fieldErrors: fe, formError };
}
import {
  useCopilotModels,
  useProviderModels,
  FALLBACK_MODELS,
} from "@/modules/ai-settings/components/model-config-hooks";
import {
  type UserAiAllocation,
  rowActiveSide,
  rowActiveModel,
  rowHasAllocation,
  getEffectiveModel,
  getCreditSummary,
  ROLE_COLORS,
  PLAN_COLORS,
} from "./admin-shared";

// ─── Effective Model Badge ───────────────────────────────

function getSourceDetail(
  row: UserAiAllocation,
  source: "enforced" | "user" | "workspace" | "none",
  t: ReturnType<typeof useTranslation>["t"],
): { label: string; via: string } {
  if (source === "enforced") return { label: t("userManagement.badgeEnforced"), via: t("userManagement.badgeEnforcedVia") };
  if (source === "user") {
    const side = rowActiveSide(row);
    if (side === "copilot") return { label: t("userManagement.badgeUserCopilot"), via: row.copilot_account_label ?? "Copilot" };
    if (side === "custom") return { label: t("userManagement.badgeUserCustom"), via: row.provider_label ?? row.provider_type ?? "Custom provider" };
    return { label: t("userManagement.badgeUserOverride"), via: t("userManagement.badgeUserOverrideVia") };
  }
  if (source === "workspace") {
    const wsSrc = row.default_source;
    if (wsSrc === "copilot") return { label: t("userManagement.badgeWsCopilot"), via: t("userManagement.badgeWsCopilotVia") };
    if (wsSrc === "custom") return { label: t("userManagement.badgeWsCustom"), via: t("userManagement.badgeWsCustomVia") };
    return { label: t("userManagement.badgeWsDefault"), via: t("userManagement.badgeWsDefaultVia") };
  }
  return { label: t("userManagement.badgeAuto"), via: t("userManagement.badgeAutoVia") };
}

function EffectiveModelBadge({ row }: { row: UserAiAllocation }) {
  const { t } = useTranslation("admin");
  const { model, source } = getEffectiveModel(row);
  const { label } = getSourceDetail(row, source, t);
  if (!model) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border bg-secondary text-muted-foreground border-border">
        <span className="font-medium">{t("userManagement.autoSelect")}</span>
        <span className="opacity-50">{t("userManagementExtra.noOverrideBadge")}</span>
      </span>
    );
  }
  const colors = {
    enforced: "bg-red-600/15 text-red-400 border-red-600/30",
    user: "bg-emerald-600/15 text-emerald-400 border-emerald-600/30",
    workspace: "bg-blue-600/15 text-blue-400 border-blue-600/30",
    none: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${colors[source]}`}>
      <span className="font-medium">{label}</span>
      <span className="opacity-70">·</span>
      <span className="truncate max-w-[140px]">{model}</span>
    </span>
  );
}

// ─── Credit Mini Bar ─────────────────────────────────────

function CreditMiniBar({ row }: { row: UserAiAllocation }) {
  const { t } = useTranslation("admin");
  const c = getCreditSummary(row);
  if (c.dailyTotal === 0 && c.monthlyTotal === 0) {
    return <span className="text-[10px] text-muted-foreground">{t("userManagement.noCredits")}</span>;
  }
  const pct = c.dailyTotal > 0 ? Math.round((c.dailyRemaining / c.dailyTotal) * 100) : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
        {c.dailyRemaining}/{c.dailyTotal}
      </span>
    </div>
  );
}

// ─── Source Badge ────────────────────────────────────────

function SourceBadge({ row }: { row: UserAiAllocation }) {
  const { t } = useTranslation("admin");
  const side = rowActiveSide(row);
  if (!rowHasAllocation(row)) {
    if (row.default_source === "copilot") {
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t("userManagement.wsDefaultCopilot")}</span>;
    }
    if (row.default_source === "custom") {
      return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t("userManagement.wsDefaultCustom")}</span>;
    }
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{t("userManagement.noSourceSet")}</span>;
  }
  if (side === "copilot") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600/15 text-emerald-400">
        {t("userManagement.copilotAccount", { account: row.copilot_account_label ?? t("userManagementExtra.defaultAccount") })}
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-600/15 text-blue-400">
      {t("userManagement.customProvider", { provider: row.provider_label ?? row.provider_type ?? "provider" })}
    </span>
  );
}

// ─── User Detail Modal ──────────────────────────────────

function UserDetailModal({
  user,
  workspaceId,
  accounts,
  providers,
  onClose,
  onAllocate,
  onReset,
  onSetCredits,
  onChangeRole,
  onChangePlan,
}: {
  user: UserAiAllocation;
  workspaceId: string | null;
  accounts: ApiGitHubCopilotAccount[];
  providers: ApiAiProvider[];
  onClose: () => void;
  onAllocate: (userId: string, data: {
    source?: "copilot" | "custom";
    copilotAccountId?: string | null;
    copilotModel?: string | null;
    providerId?: string | null;
    providerModel?: string | null;
  }) => Promise<void>;
  onReset: (userId: string) => Promise<void>;
  onSetCredits: (userId: string, data: { dailyCredits?: number; monthlyCredits?: number; rolloverCredits?: number; resetUsage?: boolean }) => Promise<void>;
  onChangeRole: (userId: string, role: string) => void;
  onChangePlan: (userId: string, plan: string) => void;
}) {
  const { t } = useTranslation("admin");
  const [tab, setTab] = useState<"model" | "credits">("model");
  const [source, setSource] = useState<"copilot" | "custom">(rowActiveSide(user) ?? "copilot");
  const [copilotAccountId, setCopilotAccountId] = useState(user.copilot_account_id ?? "");
  const [copilotModel, setCopilotModel] = useState(user.copilot_model ?? "");
  const [providerId, setProviderId] = useState(user.provider_id ?? "");
  const [providerModel, setProviderModel] = useState(user.provider_model ?? "");
  const [saving, setSaving] = useState(false);

  const c = getCreditSummary(user);
  const [creditDaily, setCreditDaily] = useState(c.dailyTotal);
  const [creditMonthly, setCreditMonthly] = useState(c.monthlyTotal);
  const [creditRollover, setCreditRollover] = useState(c.rollover);
  const [creditSaving, setCreditSaving] = useState(false);
  const [creditErrors, setCreditErrors] = useState<CreditFieldErrors>({});
  const [creditFormError, setCreditFormError] = useState<string | null>(null);

  function validateCredits(): CreditFieldErrors {
    const errs: CreditFieldErrors = {};
    const check = (key: "dailyCredits" | "monthlyCredits" | "rolloverCredits", val: number, max: number) => {
      if (!Number.isFinite(val) || Number.isNaN(val)) errs[key] = t("userManagement.validationMustBeNumber");
      else if (!Number.isInteger(val)) errs[key] = t("userManagement.validationWholeNumber");
      else if (val < 0) errs[key] = t("userManagement.validationMinZero");
      else if (val > max) errs[key] = t("userManagement.validationMax", { max: max.toLocaleString() });
    };
    check("dailyCredits", creditDaily, CREDIT_CAPS.daily);
    check("monthlyCredits", creditMonthly, CREDIT_CAPS.monthly);
    check("rolloverCredits", creditRollover, CREDIT_CAPS.rollover);
    return errs;
  }

  const eff = getEffectiveModel(user);
  const validAccounts = accounts.filter(a => a.is_valid);
  const validProviders = providers.filter(p => p.is_valid);

  // Dynamic model lists — Copilot models depend on account; provider models
  // require workspaceId + providerId. When data isn't available we fall back
  // to the curated FALLBACK_MODELS list so admins are never stuck with a
  // free-text field.
  const { models: copilotModels, loadingModels: loadingCopilot } =
    useCopilotModels(copilotAccountId || undefined);
  const { models: providerModelList, loading: loadingProviderModels } =
    useProviderModels(workspaceId, providerId);

  async function saveModel() {
    setSaving(true);
    try {
      await onAllocate(user.user_id, {
        source,
        copilotAccountId: copilotAccountId || null,
        copilotModel: copilotModel || null,
        providerId: providerId || null,
        providerModel: providerModel || null,
      });
      onClose();
    } finally { setSaving(false); }
  }

  async function saveCredits(resetUsage = false) {
    const clientErrs = validateCredits();
    if (Object.keys(clientErrs).length > 0) {
      setCreditErrors(clientErrs);
      setCreditFormError(null);
      return;
    }
    setCreditErrors({});
    setCreditFormError(null);
    setCreditSaving(true);
    try {
      await onSetCredits(user.user_id, {
        dailyCredits: creditDaily,
        monthlyCredits: creditMonthly,
        rolloverCredits: creditRollover,
        resetUsage,
      });
      if (!resetUsage) onClose();
    } catch (err) {
      const parsed = extractFieldErrors(err);
      if (parsed) {
        setCreditErrors(parsed.fieldErrors);
        setCreditFormError(parsed.formError);
        return;
      }
      // Unknown error — surface as a form-level message instead of crashing the page
      setCreditFormError(err instanceof Error ? err.message : t("userManagement.failedSaveCredits"));
    } finally { setCreditSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
            {(user.display_name ?? user.email)[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground truncate">{user.display_name ?? user.email.split("@")[0]}</h3>
              {user.is_platform_admin && <Crown className="h-3.5 w-3.5 text-amber-400" />}
            </div>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Role & Plan row */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">{t("userManagement.role")}</label>
            <select
              value={user.platform_role ?? "member"}
              onChange={e => onChangeRole(user.user_id, e.target.value)}
              className={`rounded-md bg-background border border-input text-xs font-medium px-2 py-1 outline-none focus:border-brand-500 ${ROLE_COLORS[user.platform_role ?? "member"] ?? "text-foreground"}`}
            >
              {WORKSPACE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">{t("userManagement.plan")}</label>
            <select
              value={user.workspace_plan ?? "free"}
              onChange={e => onChangePlan(user.user_id, e.target.value)}
              className={`rounded-md bg-background border border-input text-xs font-medium px-2 py-1 outline-none focus:border-brand-500 ${PLAN_COLORS[user.workspace_plan ?? "free"] ?? "text-foreground"}`}
            >
              {WORKSPACE_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
            </select>
          </div>
          <div className="flex-1" />
          {/* Effective model display */}
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{t("userManagement.activeModel")}</div>
            <EffectiveModelBadge row={user} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button onClick={() => setTab("model")} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${tab === "model" ? "text-foreground border-b-2 border-brand-500" : "text-muted-foreground hover:text-foreground"}`}>
            <Bot className="h-3.5 w-3.5" /> {t("userManagement.tabModelSource")}
          </button>
          <button onClick={() => setTab("credits")} className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${tab === "credits" ? "text-foreground border-b-2 border-brand-500" : "text-muted-foreground hover:text-foreground"}`}>
            <Zap className="h-3.5 w-3.5" /> {t("userManagement.tabCredits")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="px-6 py-5">
          {tab === "model" && (
            <div className="space-y-4">
              {/* Current active state */}
              <div className="rounded-lg border border-border bg-muted px-4 py-3 space-y-2">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{t("userManagement.currentlyActive")}</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">{t("userManagement.model")}</span>
                  <span className="text-foreground font-medium">{eff.model ?? t("userManagement.autoSelectNoModel")}</span>
                  <span className="text-muted-foreground">{t("userManagement.source")}</span>
                  <span className={`${
                    eff.source === "enforced" ? "text-red-400" :
                    eff.source === "user" ? "text-emerald-400" :
                    eff.source === "workspace" ? "text-blue-400" : "text-muted-foreground"
                  }`}>{getSourceDetail(user, eff.source, t).via}</span>
                  <span className="text-muted-foreground">{t("userManagement.subscription")}</span>
                  <span className="text-foreground">{(() => {
                    const side = rowActiveSide(user);
                    if (side === "copilot") return user.copilot_account_label
                      ? t("userManagement.githubCopilotNamed", { account: user.copilot_account_label })
                      : t("userManagement.githubCopilot");
                    if (side === "custom") return user.provider_label
                      ? t("userManagement.customProviderNamed", { provider: user.provider_label })
                      : t("userManagement.customProviderNamed", { provider: user.provider_type ?? "Custom" });
                    if (user.default_source === "copilot") return t("userManagement.githubCopilotWsDefault");
                    if (user.default_source === "custom") return t("userManagement.customProviderWsDefault");
                    return t("userManagement.noneConfigured");
                  })()}</span>
                </div>
                {user.enforce_ai && (
                  <p className="text-[11px] text-red-400 mt-1">
                    {t("userManagement.enforcementOn")}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {t("userManagement.resolutionOrder")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">{t("userManagement.setOverrideSource")}</label>
                <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                  <button onClick={() => setSource("copilot")} className={`px-4 py-2 text-sm font-medium transition-colors ${source === "copilot" ? "bg-brand-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {t("userManagement.githubCopilot")}
                  </button>
                  <button onClick={() => setSource("custom")} className={`px-4 py-2 text-sm font-medium transition-colors ${source === "custom" ? "bg-brand-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {t("userManagement.customProviderLabel")}
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {source === "copilot" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.copilotAccountLabel")}</label>
                      <select value={copilotAccountId} onChange={e => setCopilotAccountId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                        <option value="">{t("userManagement.noSpecificAccount")}</option>
                        {validAccounts.map(a => <option key={a.id} value={a.id}>{a.label} (@{a.github_login})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        {t("userManagement.model")} {loadingCopilot && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                      </label>
                      <select
                        value={copilotModel}
                        onChange={e => setCopilotModel(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                      >
                        {copilotModels.map(m => (
                          <option key={m.id} value={m.id}>{m.label}</option>
                        ))}
                        {copilotModel && !copilotModels.some(m => m.id === copilotModel) && (
                          <option value={copilotModel}>{copilotModel} {t("userManagementExtra.customSuffix")}</option>
                        )}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.provider")}</label>
                      <select value={providerId} onChange={e => setProviderId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                        <option value="">{t("userManagement.selectProvider")}</option>
                        {validProviders.map(p => <option key={p.id} value={p.id}>{p.label} ({p.provider_type})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        {t("userManagement.model")} {loadingProviderModels && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                      </label>
                      {providerId && providerModelList.length > 0 ? (
                        <select
                          value={providerModel}
                          onChange={e => setProviderModel(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                        >
                          <option value="">{t("userManagement.autoProviderDefault")}</option>
                          {providerModelList.map(m => (
                            <option key={m.id} value={m.id}>{m.name ?? m.id}</option>
                          ))}
                          {providerModel && !providerModelList.some(m => m.id === providerModel) && (
                            <option value={providerModel}>{providerModel} {t("userManagementExtra.customSuffix")}</option>
                          )}
                        </select>
                      ) : (
                        <select
                          value={providerModel}
                          onChange={e => setProviderModel(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                          disabled={!providerId}
                        >
                          {FALLBACK_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.label}</option>
                          ))}
                          {providerModel && !FALLBACK_MODELS.some(m => m.id === providerModel) && (
                            <option value={providerModel}>{providerModel} {t("userManagementExtra.customSuffix")}</option>
                          )}
                        </select>
                      )}
                      {!providerId && (
                        <p className="text-[10px] text-muted-foreground mt-1">{t("userManagement.selectProviderHint")}</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={saveModel} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("common.save")}
                </button>
                {rowHasAllocation(user) && (
                  <button onClick={() => { onReset(user.user_id); onClose(); }}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-100 dark:bg-amber-600/20 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-600/30 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> {t("userManagement.resetToDefaults")}
                  </button>
                )}
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">{t("common.cancel")}</button>
              </div>
            </div>
          )}

          {tab === "credits" && (
            <div className="space-y-4">
              {/* Current usage summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border bg-muted p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("userManagement.daily")}</div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">{c.dailyRemaining}<span className="text-muted-foreground text-sm">/{c.dailyTotal}</span></div>
                  <div className="text-[10px] text-muted-foreground">{t("userManagement.used", { count: c.dailyUsed })}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("userManagement.monthly")}</div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">{c.monthlyRemaining}<span className="text-muted-foreground text-sm">/{c.monthlyTotal}</span></div>
                  <div className="text-[10px] text-muted-foreground">{t("userManagement.used", { count: c.monthlyUsed })}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted p-3 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t("userManagement.rollover")}</div>
                  <div className="text-lg font-semibold text-foreground tabular-nums">{c.rollover}</div>
                  <div className="text-[10px] text-muted-foreground">{t("userManagement.bonusCredits")}</div>
                </div>
              </div>

              {/* Edit fields */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.dailyCredits")}</label>
                  <input type="number" min={0} max={CREDIT_CAPS.daily} step={1} value={creditDaily} onChange={e => setCreditDaily(Number(e.target.value))}
                    aria-invalid={!!creditErrors.dailyCredits}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 ${creditErrors.dailyCredits ? "border-red-500" : "border-border"}`} />
                  <p className="text-[10px] text-muted-foreground mt-1">{t("userManagement.max", { count: CREDIT_CAPS.daily.toLocaleString() })}</p>
                  {creditErrors.dailyCredits && <p className="text-[11px] text-red-400 mt-1">{creditErrors.dailyCredits}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.monthlyCredits")}</label>
                  <input type="number" min={0} max={CREDIT_CAPS.monthly} step={1} value={creditMonthly} onChange={e => setCreditMonthly(Number(e.target.value))}
                    aria-invalid={!!creditErrors.monthlyCredits}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 ${creditErrors.monthlyCredits ? "border-red-500" : "border-border"}`} />
                  <p className="text-[10px] text-muted-foreground mt-1">{t("userManagement.max", { count: CREDIT_CAPS.monthly.toLocaleString() })}</p>
                  {creditErrors.monthlyCredits && <p className="text-[11px] text-red-400 mt-1">{creditErrors.monthlyCredits}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.rolloverCredits")}</label>
                  <input type="number" min={0} max={CREDIT_CAPS.rollover} step={1} value={creditRollover} onChange={e => setCreditRollover(Number(e.target.value))}
                    aria-invalid={!!creditErrors.rolloverCredits}
                    className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500 ${creditErrors.rolloverCredits ? "border-red-500" : "border-border"}`} />
                  <p className="text-[10px] text-muted-foreground mt-1">{t("userManagement.max", { count: CREDIT_CAPS.rollover.toLocaleString() })}</p>
                  {creditErrors.rolloverCredits && <p className="text-[11px] text-red-400 mt-1">{creditErrors.rolloverCredits}</p>}
                </div>
              </div>

              {creditFormError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {creditFormError}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button onClick={() => saveCredits(false)} disabled={creditSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
                  {creditSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} {t("userManagement.saveCredits")}
                </button>
                <button onClick={() => saveCredits(true)} disabled={creditSaving}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" /> {t("userManagement.saveAndResetUsage")}
                </button>
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">{t("common.cancel")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Allocate Modal ────────────────────────────────

export interface BulkApplyPayload {
  model?: {
    source: "copilot" | "custom";
    copilotAccountId: string | null;
    copilotModel: string | null;
    providerId: string | null;
    providerModel: string | null;
  };
  addQuota?: {
    daily: number;
    monthly: number;
    rollover: number;
  };
  role?: string;
  plan?: string;
}

function BulkAllocateModal({
  selectedUsers,
  workspaceId,
  accounts,
  providers,
  currentUserId,
  onClose,
  onApply,
}: {
  selectedUsers: UserAiAllocation[];
  workspaceId: string | null;
  accounts: ApiGitHubCopilotAccount[];
  providers: ApiAiProvider[];
  currentUserId: string;
  onClose: () => void;
  onApply: (userIds: string[], payload: BulkApplyPayload) => Promise<void>;
}) {
  const { t } = useTranslation("admin");
  const [applyModel, setApplyModel] = useState(true);
  const [applyQuota, setApplyQuota] = useState(false);
  const [applyRole, setApplyRole] = useState(false);
  const [applyPlan, setApplyPlan] = useState(false);

  const [source, setSource] = useState<"copilot" | "custom">("copilot");
  const [copilotAccountId, setCopilotAccountId] = useState("");
  const [copilotModel, setCopilotModel] = useState("");
  const [providerId, setProviderId] = useState("");
  const [providerModel, setProviderModel] = useState("");

  const [addDaily, setAddDaily] = useState(0);
  const [addMonthly, setAddMonthly] = useState(0);
  const [addRollover, setAddRollover] = useState(0);

  const [role, setRole] = useState<string>("member");
  const [plan, setPlan] = useState<string>("free");

  const selfInSelection = selectedUsers.some(u => u.user_id === currentUserId);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const validAccounts = accounts.filter(a => a.is_valid);
  const validProviders = providers.filter(p => p.is_valid);

  const { models: copilotModels, loadingModels: loadingCopilot } =
    useCopilotModels(copilotAccountId || undefined);
  const { models: providerModelList, loading: loadingProviderModels } =
    useProviderModels(workspaceId, providerId);

  const roleBlockedBySelf = applyRole && selfInSelection;
  const canApply =
    (applyModel || applyQuota || applyRole || applyPlan) &&
    (!applyModel ||
      (source === "copilot" ? !!copilotModel : !!providerId)) &&
    (!applyQuota || addDaily > 0 || addMonthly > 0 || addRollover > 0) &&
    !roleBlockedBySelf;

  async function handleApply() {
    if (!canApply) return;
    const payload: BulkApplyPayload = {};
    if (applyModel) {
      payload.model = {
        source,
        copilotAccountId: copilotAccountId || null,
        copilotModel: source === "copilot" ? (copilotModel || null) : null,
        providerId: source === "custom" ? (providerId || null) : null,
        providerModel: source === "custom" ? (providerModel || null) : null,
      };
    }
    if (applyQuota) {
      payload.addQuota = { daily: addDaily, monthly: addMonthly, rollover: addRollover };
    }
    if (applyRole) {
      payload.role = role;
    }
    if (applyPlan) {
      payload.plan = plan;
    }
    setSaving(true);
    setProgress({ done: 0, total: selectedUsers.length });
    try {
      // Wrap onApply so it can report progress through a reference; for simplicity
      // we just call onApply once with all ids — parent does its own iteration.
      await onApply(selectedUsers.map(u => u.user_id), payload);
      onClose();
    } finally {
      setSaving(false);
      setProgress(null);
    }
  }

  const previewNames = selectedUsers
    .slice(0, 6)
    .map(u => u.display_name ?? u.email.split("@")[0])
    .join(", ");
  const remaining = selectedUsers.length - 6;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600/20 text-brand-400">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{t("userManagement.bulkEditUsers")}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {selectedUsers.length === 1
                ? t("userManagement.bulkUserPreview", { count: selectedUsers.length })
                : t("userManagement.bulkUserPreviewPlural", { count: selectedUsers.length })}
              {previewNames && <>: <span className="text-muted-foreground">{previewNames}{remaining > 0 ? ` ${t("userManagement.bulkMoreUsers", { count: remaining })}` : ""}</span></>}
            </p>
          </div>
          <button onClick={onClose} className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Section: Model & Source */}
          <div className="rounded-lg border border-border bg-muted">
            <label className="flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer">
              <input
                type="checkbox"
                checked={applyModel}
                onChange={e => setApplyModel(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500"
              />
              <Bot className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("userManagement.setAiModelSource")}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{t("userManagement.replacesUserOverride")}</span>
            </label>
            {applyModel && (
              <div className="px-4 py-4 space-y-3">
                {/* Source toggle */}
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">{t("userManagement.sourceLabel")}</label>
                  <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                    <button onClick={() => setSource("copilot")} className={`px-4 py-2 text-sm font-medium transition-colors ${source === "copilot" ? "bg-brand-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {t("userManagement.githubCopilot")}
                    </button>
                    <button onClick={() => setSource("custom")} className={`px-4 py-2 text-sm font-medium transition-colors ${source === "custom" ? "bg-brand-600 text-white" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {t("userManagement.customProviderLabel")}
                    </button>
                  </div>
                </div>

                {source === "copilot" ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.copilotAccountLabel")}</label>
                      <select value={copilotAccountId} onChange={e => setCopilotAccountId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                        <option value="">{t("userManagement.noSpecificAccount")}</option>
                        {validAccounts.map(a => <option key={a.id} value={a.id}>{a.label} (@{a.github_login})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        {t("userManagement.model")} {loadingCopilot && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                      </label>
                      <select value={copilotModel} onChange={e => setCopilotModel(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                        <option value="">{t("userManagement.selectModel")}</option>
                        {copilotModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.provider")}</label>
                      <select value={providerId} onChange={e => setProviderId(e.target.value)}
                        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                        <option value="">{t("userManagement.selectProvider")}</option>
                        {validProviders.map(p => <option key={p.id} value={p.id}>{p.label} ({p.provider_type})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                        {t("userManagement.model")} {loadingProviderModels && <Loader2 className="inline h-3 w-3 animate-spin ml-1" />}
                      </label>
                      {providerId && providerModelList.length > 0 ? (
                        <select value={providerModel} onChange={e => setProviderModel(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500">
                          <option value="">{t("userManagement.autoProviderDefault")}</option>
                          {providerModelList.map(m => <option key={m.id} value={m.id}>{m.name ?? m.id}</option>)}
                        </select>
                      ) : (
                        <select value={providerModel} onChange={e => setProviderModel(e.target.value)}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                          disabled={!providerId}>
                          {FALLBACK_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section: Add Quota */}
          <div className="rounded-lg border border-border bg-muted">
            <label className="flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer">
              <input
                type="checkbox"
                checked={applyQuota}
                onChange={e => setApplyQuota(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500"
              />
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("userManagement.addAdditionalQuota")}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{t("userManagement.addsToEachUserCredits")}</span>
            </label>
            {applyQuota && (
              <div className="px-4 py-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.addDailyPrefix")}</label>
                    <input type="number" min={0} value={addDaily} onChange={e => setAddDaily(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.addMonthlyPrefix")}</label>
                    <input type="number" min={0} value={addMonthly} onChange={e => setAddMonthly(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t("userManagement.addRolloverPrefix")}</label>
                    <input type="number" min={0} value={addRollover} onChange={e => setAddRollover(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500" />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t("userManagement.bulkQuotaNote")}
                </p>
              </div>
            )}
          </div>

          {/* Section: Role */}
          <div className="rounded-lg border border-border bg-muted">
            <label className="flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer">
              <input
                type="checkbox"
                checked={applyRole}
                onChange={e => setApplyRole(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500"
              />
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("userManagement.setPlatformRole")}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{t("userManagement.replacesEachUserRole")}</span>
            </label>
            {applyRole && (
              <div className="px-4 py-4 space-y-2">
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                >
                  {WORKSPACE_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                {selfInSelection && (
                  <p className="text-[11px] text-red-400">
                    {t("userManagement.cannotChangeOwnRoleBulk")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section: Plan */}
          <div className="rounded-lg border border-border bg-muted">
            <label className="flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer">
              <input
                type="checkbox"
                checked={applyPlan}
                onChange={e => setApplyPlan(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500"
              />
              <Crown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{t("userManagement.setWorkspacePlan")}</span>
              <span className="text-[11px] text-muted-foreground ml-auto">{t("userManagement.replacesEachUserPlan")}</span>
            </label>
            {applyPlan && (
              <div className="px-4 py-4">
                <select
                  value={plan}
                  onChange={e => setPlan(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand-500"
                >
                  {WORKSPACE_PLANS.map(p => <option key={p} value={p}>{PLAN_LABELS[p]}</option>)}
                </select>
              </div>
            )}
          </div>

          {progress && (
            <div className="rounded-lg border border-border bg-muted px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("userManagement.applyingProgress", { done: progress.done, total: progress.total })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={onClose} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button onClick={handleApply} disabled={!canApply || saving}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {selectedUsers.length === 1
              ? t("userManagement.applyToSelected", { count: selectedUsers.length })
              : t("userManagement.applyToSelectedPlural", { count: selectedUsers.length })}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main User Management Panel ─────────────────────────

interface UserManagementPanelProps {
  users: UserAiAllocation[];
  workspaceId: string | null;
  accounts: ApiGitHubCopilotAccount[];
  providers: ApiAiProvider[];
  loading: boolean;
  currentUserId: string;
  onAllocate: (userId: string, data: {
    source?: "copilot" | "custom";
    copilotAccountId?: string | null;
    copilotModel?: string | null;
    providerId?: string | null;
    providerModel?: string | null;
  }) => Promise<void>;
  onReset: (userId: string) => Promise<void>;
  onSetCredits: (userId: string, data: { dailyCredits?: number; monthlyCredits?: number; rolloverCredits?: number; resetUsage?: boolean }) => Promise<void>;
  onChangeRole: (userId: string, role: string) => void;
  onChangePlan: (userId: string, plan: string) => void;
  onBulkApply: (userIds: string[], payload: BulkApplyPayload) => Promise<void>;
}

export function UserManagementPanel({
  users, workspaceId, accounts, providers, loading, currentUserId,
  onAllocate, onReset, onSetCredits, onChangeRole, onChangePlan, onBulkApply,
}: UserManagementPanelProps) {
  const { t } = useTranslation("admin");
  const [selectedUser, setSelectedUser] = useState<UserAiAllocation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "copilot" | "custom" | "none">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const filtered = users.filter(u => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!u.email.toLowerCase().includes(q) && !(u.display_name?.toLowerCase().includes(q))) return false;
    }
    if (filterSource !== "all") {
      const side = rowActiveSide(u);
      if (filterSource === "none" && side !== null) return false;
      if (filterSource === "copilot" && side !== "copilot") return false;
      if (filterSource === "custom" && side !== "custom") return false;
    }
    return true;
  });

  const filteredIds = filtered.map(u => u.user_id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id));
  const someFilteredSelected = filteredIds.some(id => selectedIds.has(id));

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredIds.forEach(id => next.delete(id));
      } else {
        filteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedUsers = users.filter(u => selectedIds.has(u.user_id));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("userManagement.searchPlaceholder")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-brand-500"
          />
        </div>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value as typeof filterSource)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-brand-500"
        >
          <option value="all">{t("userManagement.filterAllSources")}</option>
          <option value="copilot">{t("userManagement.filterCopilotOnly")}</option>
          <option value="custom">{t("userManagement.filterCustomOnly")}</option>
          <option value="none">{t("userManagement.filterNoAi")}</option>
        </select>
        <div className="flex-1" />
        <span className="text-[10px] text-muted-foreground">
          {filtered.length === 1
            ? t("userManagement.userCount", { count: filtered.length })
            : t("userManagement.userCountPlural", { count: filtered.length })}
        </span>
      </div>

      {/* Bulk action toolbar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-600/40 bg-brand-600/10 px-4 py-2.5">
          <UsersIcon className="h-4 w-4 text-brand-400" />
          <span className="text-sm text-foreground">
            <span className="font-semibold text-foreground">{selectedIds.size}</span>{" "}
            {selectedIds.size === 1
              ? t("userManagement.selectedCount", { count: selectedIds.size })
              : t("userManagement.selectedCountPlural", { count: selectedIds.size })}
          </span>
          <button
            onClick={clearSelection}
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            {t("common.clear")}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => setBulkOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> {t("userManagement.bulkEdit")}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  ref={el => {
                    if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                  }}
                  onChange={toggleAllFiltered}
                  aria-label={t("userManagement.selectAll")}
                  className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("userManagement.columnUser")}</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("userManagement.columnRolePlan")}</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("userManagement.columnSubscription")}</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("userManagement.columnActiveModel")}</th>
              <th className="px-3 py-2.5 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{t("userManagement.columnCreditsDaily")}</th>
              <th className="w-16 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const isSelf = u.user_id === currentUserId;
              const isChecked = selectedIds.has(u.user_id);
              return (
                <tr
                  key={u.user_id}
                  className={`border-b border-border last:border-0 hover:bg-card cursor-pointer transition-colors ${isChecked ? "bg-brand-600/5" : ""}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOne(u.user_id)}
                      aria-label={t("userManagement.selectUser", { email: u.email })}
                      className="h-4 w-4 rounded border-input bg-background text-brand-500 focus:ring-brand-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground shrink-0">
                        {(u.display_name ?? u.email)[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-foreground truncate">{u.display_name ?? u.email.split("@")[0]}</span>
                          {u.is_platform_admin && <Crown className="h-3 w-3 text-amber-400 shrink-0" />}
                          {isSelf && <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground">{t("userManagement.you")}</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${ROLE_COLORS[u.platform_role ?? "member"] ?? "text-muted-foreground"} bg-secondary`}>
                        {ROLE_LABELS[u.platform_role ?? "member"]}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${PLAN_COLORS[u.workspace_plan ?? "free"] ?? "text-muted-foreground"} bg-secondary`}>
                        {PLAN_LABELS[u.workspace_plan ?? "free"]}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <SourceBadge row={u} />
                  </td>
                  <td className="px-3 py-3">
                    <EffectiveModelBadge row={u} />
                  </td>
                  <td className="px-3 py-3">
                    <CreditMiniBar row={u} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedUser(u); }}
                      className="rounded p-1.5 text-muted-foreground hover:text-brand-400 hover:bg-secondary transition-colors"
                      title={t("userManagement.manageUser")}
                    >
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? t("userManagement.noUsersMatchSearch") : t("userManagement.noUsersFound")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" /> {t("userManagementExtra.legendEnforced")}</span>
        <span className="flex items-center gap-1"><Bot className="h-3 w-3 text-emerald-400" /> {t("userManagementExtra.legendUserOverride")}</span>
        <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-blue-400" /> {t("userManagementExtra.legendWsDefault")}</span>
        <span>{t("userManagementExtra.legendAutoSelect")}</span>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          workspaceId={workspaceId}
          accounts={accounts}
          providers={providers}
          onClose={() => setSelectedUser(null)}
          onAllocate={onAllocate}
          onReset={onReset}
          onSetCredits={onSetCredits}
          onChangeRole={onChangeRole}
          onChangePlan={onChangePlan}
        />
      )}

      {/* Bulk Allocate Modal */}
      {bulkOpen && selectedUsers.length > 0 && (
        <BulkAllocateModal
          selectedUsers={selectedUsers}
          workspaceId={workspaceId}
          accounts={accounts}
          providers={providers}
          currentUserId={currentUserId}
          onClose={() => setBulkOpen(false)}
          onApply={async (userIds, payload) => {
            await onBulkApply(userIds, payload);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}
