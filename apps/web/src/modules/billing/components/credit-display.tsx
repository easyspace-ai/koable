"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Credits } from "../hooks/use-billing";

interface CreditDisplayProps {
  credits: Credits | null;
  loading?: boolean;
  onUpgrade?: () => void;
  className?: string;
}

// Plan credit limits (matching PLAN_LIMITS in shared package)
const PLAN_DAILY_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  business: 200,
  enterprise: 2_147_483_647,
};

const PLAN_MONTHLY_LIMITS: Record<string, number> = {
  free: 0,
  pro: 500,
  business: 3000,
  enterprise: 2_147_483_647,
};

const UNLIMITED_THRESHOLD = 2_000_000_000;

function isUnlimited(value: number): boolean {
  return value >= UNLIMITED_THRESHOLD;
}

function CreditBar({
  label,
  remaining,
  total,
  color,
  unlimitedLabel,
  usedLabel,
}: {
  label: string;
  remaining: number;
  total: number;
  color: string;
  unlimitedLabel: string;
  usedLabel: (used: number, total: number) => string;
}) {
  const unlimited = isUnlimited(total);
  const used = Math.max(0, total - remaining);
  const percentage = unlimited ? 0 : total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const isLow = !unlimited && remaining <= Math.ceil(total * 0.2);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={cn("tabular-nums text-muted-foreground", isLow && "text-orange-400")}>
          {unlimited ? unlimitedLabel : usedLabel(used, total)}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", isLow ? "bg-gradient-to-r from-orange-500 to-red-500" : color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function CreditDisplay({ credits, loading, className }: CreditDisplayProps) {
  const t = useTranslations("dashboard");
  const locale = useLocale();

  if (loading) {
    return (
      <div className={cn("space-y-4 rounded-xl border border-border bg-card p-6", className)}>
        <div className="h-5 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-full animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (!credits) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-6 text-center text-muted-foreground", className)}>
        {t("billing.credits.noInfo")}
      </div>
    );
  }

  const totalAvailable =
    credits.daily_remaining + credits.monthly_remaining + credits.rollover_credits;
  const showUnlimited = isUnlimited(totalAvailable) || isUnlimited(credits.daily_remaining);

  const planKey = (credits as { plan_type?: string }).plan_type ?? "free";
  const dailyTotal =
    credits.daily_total > 0
      ? credits.daily_total
      : PLAN_DAILY_LIMITS[planKey] ?? PLAN_DAILY_LIMITS.free ?? 5;
  const monthlyTotal =
    credits.monthly_total > 0
      ? credits.monthly_total
      : PLAN_MONTHLY_LIMITS[planKey] ?? PLAN_MONTHLY_LIMITS.free ?? 0;

  return (
    <div className={cn("space-y-5 rounded-xl border border-border bg-card p-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">{t("billing.credits.title")}</h3>
        <div className="rounded-full bg-brand-500/10 border border-brand-500/20 px-3 py-1 text-sm font-medium text-brand-400">
          {showUnlimited
            ? t("common.unlimited")
            : t("billing.credits.available", { count: totalAvailable })}
        </div>
      </div>

      <div className="space-y-4">
        <CreditBar
          label={t("billing.credits.dailyCredits")}
          remaining={credits.daily_remaining}
          total={dailyTotal}
          color="bg-blue-500"
          unlimitedLabel={t("common.unlimited")}
          usedLabel={(used, total) => t("billing.credits.used", { used, total })}
        />
        {monthlyTotal > 0 && (
          <CreditBar
            label={t("billing.credits.monthlyCredits")}
            remaining={credits.monthly_remaining}
            total={monthlyTotal}
            color="bg-brand-500"
            unlimitedLabel={t("common.unlimited")}
            usedLabel={(used, total) => t("billing.credits.used", { used, total })}
          />
        )}
        {credits.rollover_credits > 0 && (
          <CreditBar
            label={t("billing.credits.rolloverCredits")}
            remaining={credits.rollover_credits}
            total={credits.rollover_credits}
            color="bg-green-500"
            unlimitedLabel={t("common.unlimited")}
            usedLabel={(used, total) => t("billing.credits.used", { used, total })}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 pt-2">
        <CreditStat label={t("billing.credits.daily")} value={credits.daily_remaining} unlimitedLabel={t("common.unlimited")} />
        <CreditStat label={t("billing.credits.monthly")} value={credits.monthly_remaining} unlimitedLabel={t("common.unlimited")} />
        <CreditStat label={t("billing.credits.rollover")} value={credits.rollover_credits} unlimitedLabel={t("common.unlimited")} />
      </div>

      {credits.last_daily_reset && (
        <p className="text-xs text-muted-foreground">
          {t("billing.credits.resetAt", {
            date: new Date(credits.last_daily_reset).toLocaleString(locale),
          })}
        </p>
      )}
    </div>
  );
}

/** Compact credit indicator for the editor toolbar */
export function CreditToolbarIndicator({
  credits,
  loading,
  onUpgrade,
}: {
  credits: Credits | null;
  loading?: boolean;
  onUpgrade?: () => void;
}) {
  const t = useTranslations("dashboard");

  if (loading || !credits) return null;

  const total = credits.daily_remaining + credits.monthly_remaining + credits.rollover_credits;
  const unlimited = isUnlimited(total) || isUnlimited(credits.daily_remaining);
  const isLow = !unlimited && credits.daily_remaining <= 1 && total <= 2;

  return (
    <button
      onClick={onUpgrade}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
        isLow
          ? "bg-orange-500/15 text-orange-700 dark:text-orange-400 hover:bg-orange-500/25"
          : "bg-secondary text-muted-foreground hover:bg-accent"
      )}
      title={unlimited ? t("billing.credits.toolbarUnlimited") : t("billing.credits.toolbarTitle", { count: total })}
    >
      <span className="tabular-nums">{unlimited ? "∞" : total}</span>
      <span className="text-muted-foreground">{t("billing.credits.toolbarLabel")}</span>
    </button>
  );
}

function CreditStat({
  label,
  value,
  unlimitedLabel,
}: {
  label: string;
  value: number;
  unlimitedLabel: string;
}) {
  return (
    <div className="rounded-lg bg-secondary border border-border p-3 text-center">
      <p className="text-2xl font-bold tabular-nums text-foreground">
        {isUnlimited(value) ? unlimitedLabel : value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
