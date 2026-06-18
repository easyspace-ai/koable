"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { PlanDefaultsInline } from "./PlanDefaultsInline";

interface StepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isFinalStep?: boolean;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

export function Step4Integrations({ onNext, onBack, onSkip, isFinalStep }: StepProps) {
  const t = useTranslations("dashboard");
  const [showBilling, setShowBilling] = useState(false);
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [showStripeKey, setShowStripeKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [billingStatus, setBillingStatus] = useState<SaveStatus>("idle");
  const [billingError, setBillingError] = useState<string | null>(null);
  const [requireApproval, setRequireApproval] = useState(false);
  const [policyStatus, setPolicyStatus] = useState<SaveStatus>("idle");

  async function saveBilling() {
    if (!stripeSecret.trim() && !stripeWebhook.trim()) return;
    setBillingStatus("saving");
    setBillingError(null);
    try {
      const body: Record<string, string> = {};
      if (stripeSecret.trim()) body.stripeSecretKey = stripeSecret.trim();
      if (stripeWebhook.trim()) body.stripeWebhookSecret = stripeWebhook.trim();
      await apiFetch("/setup/billing", { method: "POST", body: JSON.stringify(body) });
      setBillingStatus("success");
      setStripeSecret("");
      setStripeWebhook("");
    } catch (err) {
      setBillingStatus("error");
      setBillingError(err instanceof Error ? err.message : t("setup.plansBilling.billingSaveError"));
    }
  }

  async function savePolicy(next: boolean) {
    setRequireApproval(next);
    setPolicyStatus("saving");
    try {
      await apiFetch("/setup/signup-policy", {
        method: "POST",
        body: JSON.stringify({ requireApproval: next }),
      });
      setPolicyStatus("success");
      setTimeout(() => setPolicyStatus("idle"), 1200);
    } catch {
      setRequireApproval(!next);
      setPolicyStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">
          {t("setup.plansBilling.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("setup.plansBilling.description")}
        </p>
      </div>

      <PlanDefaultsInline />

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              {t("setup.plansBilling.signupApproval")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("setup.plansBilling.signupApprovalHint")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={requireApproval}
            onClick={() => savePolicy(!requireApproval)}
            disabled={policyStatus === "saving"}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
              requireApproval ? "bg-brand-600" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                requireApproval ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
        {policyStatus === "success" && (
          <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
            <Check className="h-3 w-3" /> {t("common.saved")}
          </p>
        )}
        {policyStatus === "error" && (
          <p className="text-xs text-red-400 mt-2">{t("setup.plansBilling.policySaveError")}</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card">
        <button
          type="button"
          onClick={() => setShowBilling((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("setup.plansBilling.stripeTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {showBilling
                ? t("setup.plansBilling.stripeExpandedHint")
                : t("setup.plansBilling.stripeCollapsedHint")}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showBilling && "rotate-180")} />
        </button>

        {showBilling && (
          <div className="border-t border-border px-4 pb-4 pt-3 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                {t("setup.plansBilling.stripeSecretKey")}
              </label>
              <div className="relative">
                <input
                  type={showStripeKey ? "text" : "password"}
                  value={stripeSecret}
                  onChange={(e) => { setStripeSecret(e.target.value); setBillingStatus("idle"); }}
                  placeholder={t("setup.plansBilling.stripeSecretPlaceholder")}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-9 w-full rounded-md border border-input bg-background pr-9 pl-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
                <button
                  type="button"
                  onClick={() => setShowStripeKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showStripeKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground">
                {t("setup.plansBilling.webhookSecret")}
              </label>
              <div className="relative">
                <input
                  type={showWebhookSecret ? "text" : "password"}
                  value={stripeWebhook}
                  onChange={(e) => { setStripeWebhook(e.target.value); setBillingStatus("idle"); }}
                  placeholder={t("setup.plansBilling.webhookPlaceholder")}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-9 w-full rounded-md border border-input bg-background pr-9 pl-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                />
                <button
                  type="button"
                  onClick={() => setShowWebhookSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showWebhookSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {billingStatus === "error" && (
              <p className="text-xs text-red-400">{billingError}</p>
            )}
            {billingStatus === "success" && (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <Check className="h-3 w-3" /> {t("common.saved")}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-xs text-muted-foreground">
                {t("setup.plansBilling.stripePriceHint")}
              </p>
              <Button
                onClick={saveBilling}
                disabled={(!stripeSecret.trim() && !stripeWebhook.trim()) || billingStatus === "saving" || billingStatus === "success"}
                size="sm"
                className="bg-brand-600 text-white hover:bg-brand-500 gap-2"
              >
                {billingStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
                {billingStatus === "saving"
                  ? t("common.saving")
                  : billingStatus === "success"
                    ? t("common.saved")
                    : t("setup.plansBilling.saveStripe")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        {t("setup.plansBilling.planLimitsHint")}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {t("common.skipForNow")}
          </button>
          <Button onClick={onNext} className="bg-brand-600 text-white hover:bg-brand-500 gap-2">
            {isFinalStep ? t("setup.plansBilling.finishSetup") : t("common.continue")}{" "}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
