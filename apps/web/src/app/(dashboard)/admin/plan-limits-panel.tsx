"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  CreditCard,
  Infinity as InfinityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────

interface PlanLimitRow {
  plan: string;
  maxProjects: number;
  maxMembers: number;
  dailyCredits: number;
  monthlyCredits: number;
  maxFileSize: number;
  customDomains: boolean;
  analytics: boolean;
  prioritySupport: boolean;
  isOverridden: boolean;
  updatedAt: string | null;
}

interface PlanLimitsResponse {
  data: PlanLimitRow[];
  defaults: Record<string, {
    maxProjects: number;
    maxMembers: number;
    dailyCredits: number;
    monthlyCredits: number;
    maxFileSize: number;
    customDomains: boolean;
    analytics: boolean;
    prioritySupport: boolean;
  }>;
}

const PLAN_ORDER = ["free", "pro", "business", "enterprise"];
const PLAN_META: Record<string, { labelKey: string; emoji: string; color: string }> = {
  free: { labelKey: "planLimits.planFree", emoji: "🆓", color: "text-zinc-400" },
  pro: { labelKey: "planLimits.planPro", emoji: "⭐", color: "text-brand-400" },
  business: { labelKey: "planLimits.planBusiness", emoji: "🏢", color: "text-purple-400" },
  enterprise: { labelKey: "planLimits.planEnterprise", emoji: "🏛️", color: "text-amber-400" },
};

// ─── PlanLimitsPanel ────────────────────────────────────────

export function PlanLimitsPanel() {
  const { t } = useTranslation("admin");
  const [limits, setLimits] = useState<PlanLimitRow[]>([]);
  const [defaults, setDefaults] = useState<PlanLimitsResponse["defaults"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PlanLimitRow>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      const res = await apiFetch<PlanLimitsResponse>("/admin/plan-limits");
      setLimits(res.data);
      setDefaults(res.defaults);
    } catch (e) {
      console.error("Failed to fetch plan limits:", e);
      setMessage({ type: "error", text: t("planLimits.loadFailed") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const startEdit = (row: PlanLimitRow) => {
    setEditPlan(row.plan);
    setEditValues({
      maxProjects: row.maxProjects,
      maxMembers: row.maxMembers,
      dailyCredits: row.dailyCredits,
      monthlyCredits: row.monthlyCredits,
      maxFileSize: row.maxFileSize,
      customDomains: row.customDomains,
      analytics: row.analytics,
      prioritySupport: row.prioritySupport,
    });
  };

  const handleSave = async () => {
    if (!editPlan) return;
    setSaving(editPlan);
    setMessage(null);
    try {
      await apiFetch(`/admin/plan-limits/${editPlan}`, {
        method: "PUT",
        body: JSON.stringify(editValues),
      });
      setMessage({ type: "success", text: t("planLimits.saveSuccess", { plan: PLAN_META[editPlan] ? t(PLAN_META[editPlan].labelKey) : editPlan }) });
      setEditPlan(null);
      await fetchLimits();
    } catch (e) {
      setMessage({ type: "error", text: t("planLimits.saveFailed") });
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (plan: string) => {
    setSaving(plan);
    setMessage(null);
    try {
      await apiFetch(`/admin/plan-limits/${plan}/reset`, { method: "PUT" });
      setMessage({ type: "success", text: t("planLimits.resetSuccess", { plan: PLAN_META[plan] ? t(PLAN_META[plan].labelKey) : plan }) });
      if (editPlan === plan) setEditPlan(null);
      await fetchLimits();
    } catch (e) {
      setMessage({ type: "error", text: t("planLimits.resetFailed") });
    } finally {
      setSaving(null);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (bytes == null || !isFinite(bytes)) return t("common.infinity");
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatNumber = (n: number | null) => {
    if (n == null || !isFinite(n)) return t("common.infinity");
    return n.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {t("planLimits.description")}
          </p>
        </div>
        <Button onClick={fetchLimits} variant="outline" className="gap-2 text-sm">
          <RotateCcw className="h-3.5 w-3.5" /> {t("common.refresh")}
        </Button>
      </div>

      {message && (
        <div className={`rounded-lg border px-4 py-2 text-sm flex items-center gap-2 ${
          message.type === "success"
            ? "border-green-800/50 bg-green-900/20 text-green-400"
            : "border-red-800/50 bg-red-900/20 text-red-400"
        }`}>
          {message.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4">
        {PLAN_ORDER.map((planKey) => {
          const row = limits.find((l) => l.plan === planKey);
          if (!row) return null;
          const display = PLAN_META[planKey];
          if (!display) return null;
          const planLabel = t(display.labelKey);
          const isEditing = editPlan === planKey;
          const isSaving = saving === planKey;

          return (
            <div key={planKey} className="rounded-lg border border-border bg-card p-4">
              {/* Plan Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{display.emoji}</span>
                  <h3 className={`font-semibold ${display.color}`}>{planLabel}</h3>
                  {row.isOverridden && (
                    <span className="text-[10px] bg-amber-900/30 text-amber-400 border border-amber-800/50 px-1.5 py-0.5 rounded-full font-medium">
                      {t("common.customized")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {row.isOverridden && !isEditing && (
                    <Button
                      onClick={() => handleReset(planKey)}
                      disabled={isSaving}
                      variant="outline"
                      className="text-xs h-7 px-2 gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> {t("common.reset")}
                    </Button>
                  )}
                  {!isEditing ? (
                    <Button onClick={() => startEdit(row)} variant="outline" className="text-xs h-7 px-2 gap-1">
                      <CreditCard className="h-3 w-3" /> {t("common.edit")}
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setEditPlan(null)} variant="outline" className="text-xs h-7 px-2">
                        {t("common.cancel")}
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="text-xs h-7 px-2 gap-1 bg-brand-600 hover:bg-brand-700 text-white"
                      >
                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        {t("common.save")}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Limits Grid */}
              {isEditing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <LimitInput label={t("planLimits.maxProjects")} value={editValues.maxProjects} onChange={(v) => setEditValues({ ...editValues, maxProjects: v })} />
                  <LimitInput label={t("planLimits.maxMembers")} value={editValues.maxMembers} onChange={(v) => setEditValues({ ...editValues, maxMembers: v })} />
                  <LimitInput label={t("planLimits.dailyCredits")} value={editValues.dailyCredits} onChange={(v) => setEditValues({ ...editValues, dailyCredits: v })} />
                  <LimitInput label={t("planLimits.monthlyCredits")} value={editValues.monthlyCredits} onChange={(v) => setEditValues({ ...editValues, monthlyCredits: v })} />
                  <FileSizeInput label={t("planLimits.maxFileSize")} value={editValues.maxFileSize} onChange={(v) => setEditValues({ ...editValues, maxFileSize: v })} />
                  <BoolInput label={t("planLimits.customDomains")} value={editValues.customDomains} onChange={(v) => setEditValues({ ...editValues, customDomains: v })} />
                  <BoolInput label={t("planLimits.analytics")} value={editValues.analytics} onChange={(v) => setEditValues({ ...editValues, analytics: v })} />
                  <BoolInput label={t("planLimits.prioritySupport")} value={editValues.prioritySupport} onChange={(v) => setEditValues({ ...editValues, prioritySupport: v })} />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <LimitDisplay label={t("planLimits.maxProjects")} value={formatNumber(row.maxProjects)} />
                  <LimitDisplay label={t("planLimits.maxMembers")} value={formatNumber(row.maxMembers)} />
                  <LimitDisplay label={t("planLimits.dailyCredits")} value={formatNumber(row.dailyCredits)} />
                  <LimitDisplay label={t("planLimits.monthlyCredits")} value={formatNumber(row.monthlyCredits)} />
                  <LimitDisplay label={t("planLimits.maxFileSize")} value={formatFileSize(row.maxFileSize)} />
                  <LimitDisplay label={t("planLimits.customDomains")} value={row.customDomains ? "✓" : "✗"} />
                  <LimitDisplay label={t("planLimits.analytics")} value={row.analytics ? "✓" : "✗"} />
                  <LimitDisplay label={t("planLimits.prioritySupport")} value={row.prioritySupport ? "✓" : "✗"} />
                </div>
              )}

              {row.updatedAt && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t("common.lastUpdated", { date: new Date(row.updatedAt).toLocaleString() })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function LimitDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function LimitInput({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  const displayValue = value != null && isFinite(value) ? value : "";
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">{label}</label>
      <input
        type="number"
        min="0"
        value={displayValue}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}

function FileSizeInput({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  const mbValue = value != null ? Math.round(value / 1048576) : "";
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wide block mb-1">{label} (MB)</label>
      <input
        type="number"
        min="1"
        value={mbValue}
        onChange={(e) => onChange((Number(e.target.value) || 1) * 1048576)}
        className="w-full bg-background border border-border rounded px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>
  );
}

function BoolInput({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2 flex items-center gap-2">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wide flex-1">{label}</label>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          value ? "bg-brand-600" : "bg-zinc-600"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
          value ? "translate-x-4.5" : "translate-x-0.5"
        }`} />
      </button>
    </div>
  );
}
