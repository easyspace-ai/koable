"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CreditCard, Zap, Loader2, CheckCircle2, XCircle, AlertTriangle, X } from "lucide-react";
import { PricingCards } from "@/modules/billing/components/pricing-cards";
import { CreditDisplay } from "@/modules/billing/components/credit-display";
import {
  usePlans,
  useCredits,
  useUsage,
  useBillingActions,
  useCurrentPlan,
} from "@/modules/billing/hooks/use-billing";
import { apiFetch, type ApiWorkspace } from "@/lib/api";

function useActiveWorkspaceId(): { workspaceId: string | undefined; loading: boolean } {
  const [workspaceId, setWorkspaceId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      const stored = localStorage.getItem("doable_active_workspace_id");
      if (stored) {
        setWorkspaceId(stored);
        setLoading(false);
        return;
      }

      try {
        const wsRes = await apiFetch<{ data: ApiWorkspace[] }>("/workspaces");
        if (wsRes.data && wsRes.data.length > 0) {
          const wsId = wsRes.data[0]!.id;
          localStorage.setItem("doable_active_workspace_id", wsId);
          setWorkspaceId(wsId);
          setLoading(false);
          return;
        }

        const slug = `my-workspace-${Date.now()}`;
        const createRes = await apiFetch<{ data: ApiWorkspace }>("/workspaces", {
          method: "POST",
          body: JSON.stringify({ name: "My Workspace", slug }),
        });
        if (createRes.data?.id) {
          localStorage.setItem("doable_active_workspace_id", createRes.data.id);
          setWorkspaceId(createRes.data.id);
        }
      } catch (err) {
        console.warn("[Billing] Failed to resolve workspace:", err);
      }
      setLoading(false);
    };
    resolve();
  }, []);

  return { workspaceId, loading };
}

function BillingLoading() {
  const t = useTranslations("dashboard.billing.page");
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    </div>
  );
}

export default function BillingPageWrapper() {
  return (
    <Suspense fallback={<BillingLoading />}>
      <BillingPage />
    </Suspense>
  );
}

function BillingPage() {
  const router = useRouter();
  const t = useTranslations("dashboard.billing.page");
  const tDashCommon = useTranslations("dashboard.common");
  const { workspaceId: WORKSPACE_ID, loading: wsLoading } = useActiveWorkspaceId();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");
  const topupSuccess = searchParams.get("topup") === "success";

  const { plans, loading: plansLoading } = usePlans();
  const { credits, loading: creditsLoading } = useCredits(WORKSPACE_ID);
  const { usage, loading: usageLoading } = useUsage(WORKSPACE_ID);
  const { subscribe, openPortal, topUp, loading: actionLoading, error: actionError, clearError } =
    useBillingActions(WORKSPACE_ID);
  const { plan: currentPlan } = useCurrentPlan(WORKSPACE_ID);

  if (wsLoading) {
    return <BillingLoading />;
  }

  if (!WORKSPACE_ID) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-xl border border-border bg-card p-8 text-center max-w-md">
          <p className="text-foreground font-medium">{t("unableToLoad")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("signInPrompt")}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            {t("signIn")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div>
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToDashboard")}
        </button>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-800 bg-green-950/50 p-4 text-sm text-green-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
          {t("subscriptionUpdated")}
        </div>
      )}
      {canceled && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-800 bg-yellow-950/50 p-4 text-sm text-yellow-300">
          <XCircle className="h-5 w-5 shrink-0 text-yellow-400" />
          {t("checkoutCanceled")}
        </div>
      )}
      {topupSuccess && (
        <div className="flex items-center gap-3 rounded-lg border border-green-800 bg-green-950/50 p-4 text-sm text-green-300">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-400" />
          {t("creditsAdded")}
        </div>
      )}
      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-red-800 bg-red-950/50 p-4 text-sm text-red-300">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            {actionError}
          </div>
          <button
            onClick={clearError}
            className="shrink-0 rounded p-1 text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors"
            aria-label={t("dismissError")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <CreditDisplay
        credits={credits}
        loading={creditsLoading}
        onUpgrade={() => {
          const plansSection = document.querySelector("[data-plans-section]");
          plansSection?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => openPortal()}
          disabled={actionLoading || !WORKSPACE_ID}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {t("manageSubscription")}
        </button>
        <button
          onClick={() => topUp(100)}
          disabled={actionLoading || !WORKSPACE_ID}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {t("buyCredits")}
        </button>
      </div>

      <section data-plans-section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">{t("plansTitle")}</h2>
        {plansLoading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-xl border border-border bg-card" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">{t("plansLoadFailed")}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-secondary px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              {tDashCommon("retry")}
            </button>
          </div>
        ) : (
          <PricingCards
            plans={plans}
            currentPlan={currentPlan}
            onSelect={subscribe}
            loading={actionLoading}
          />
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-foreground">{t("usageTitle")}</h2>
        {usageLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg border border-border bg-card" />
            ))}
          </div>
        ) : usage.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">{t("noUsage")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("noUsageHint")}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("tableAction")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("tableCredits")}</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("tableDate")}</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((entry) => (
                  <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-accent transition-colors">
                    <td className="px-4 py-3 capitalize text-foreground">
                      {(entry.action ?? entry.action_type ?? "").replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{entry.credits_used}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
