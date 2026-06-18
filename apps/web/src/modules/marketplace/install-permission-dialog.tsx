"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShieldCheck,
  Sparkles,
  Shield,
  BookOpen,
  Plug,
  KeyRound,
  Globe,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MarketplaceListing } from "./use-marketplace";

type Severity = "info" | "warn" | "danger";

interface PermissionRow {
  key: string;
  label: string;
  detail?: string;
  severity: Severity;
  Icon: typeof Sparkles;
}

const SEVERITY_STYLES: Record<Severity, { badge: string; icon: string }> = {
  info: {
    badge: "bg-muted text-muted-foreground border-border",
    icon: "text-muted-foreground",
  },
  warn: {
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: "text-amber-400",
  },
  danger: {
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    icon: "text-destructive",
  },
};

function deriveRows(
  listing: MarketplaceListing,
  t: ReturnType<typeof useTranslations<"marketplace">>,
): PermissionRow[] {
  const rows: PermissionRow[] = [];

  if (listing.skill_count > 0) {
    rows.push({
      key: "skills",
      label: t("installDialog.permissions.skills.label", { count: listing.skill_count }),
      detail: t("installDialog.permissions.skills.detail"),
      severity: "info",
      Icon: Sparkles,
    });
  }
  if (listing.rule_count > 0) {
    rows.push({
      key: "rules",
      label: t("installDialog.permissions.rules.label", { count: listing.rule_count }),
      detail: t("installDialog.permissions.rules.detail"),
      severity: "info",
      Icon: Shield,
    });
  }
  if (listing.knowledge_count > 0) {
    rows.push({
      key: "knowledge",
      label: t("installDialog.permissions.knowledge.label", { count: listing.knowledge_count }),
      detail: t("installDialog.permissions.knowledge.detail"),
      severity: "info",
      Icon: BookOpen,
    });
  }

  if (listing.connector_count > 0) {
    rows.push({
      key: "connectors-network",
      label: t("installDialog.permissions.connectors.label", { count: listing.connector_count }),
      detail: t("installDialog.permissions.connectors.detail"),
      severity: "warn",
      Icon: Globe,
    });
    rows.push({
      key: "credentials",
      label: t("installDialog.permissions.credentials.label"),
      detail: t("installDialog.permissions.credentials.detail"),
      severity: "warn",
      Icon: KeyRound,
    });
  }

  return rows;
}

export interface InstallPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing;
  onConfirm: () => Promise<void>;
}

export function InstallPermissionDialog({
  open,
  onOpenChange,
  listing,
  onConfirm,
}: InstallPermissionDialogProps) {
  const t = useTranslations("marketplace");
  const [state, setState] = useState<"idle" | "installing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const rows = useMemo(() => deriveRows(listing, t), [listing, t]);

  const dangerCount = rows.filter((r) => r.severity === "danger").length;
  const warnCount = rows.filter((r) => r.severity === "warn").length;

  async function handleConfirm() {
    setState("installing");
    setError(null);
    try {
      await onConfirm();
      setState("done");
      setTimeout(() => onOpenChange(false), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("installDialog.errors.installFailed"));
      setState("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-400" />
            {t("installDialog.title", { title: listing.title })}
          </DialogTitle>
          <DialogDescription>
            {t("installDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {(dangerCount > 0 || warnCount > 0) && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span className="text-foreground">
                {t("installDialog.warningBanner", {
                  dangerPart: dangerCount > 0 ? t("installDialog.warningBannerDangerPart", { count: dangerCount }) : "",
                  warnCount,
                })}
              </span>
            </div>
          )}

          <ul className="space-y-2">
            {rows.length === 0 && (
              <li className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground italic text-center">
                {t("installDialog.emptyBundle")}
              </li>
            )}
            {rows.map((row) => {
              const style = SEVERITY_STYLES[row.severity];
              return (
                <li
                  key={row.key}
                  className={`flex items-start gap-3 rounded-md border p-3 text-sm ${style.badge}`}
                >
                  <row.Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
                  <div>
                    <p className="text-foreground">{row.label}</p>
                    {row.detail && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.detail}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mr-1 inline-block h-3 w-3" />
            {t("installDialog.isolationNote")}
          </p>

          {state === "error" && error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {state === "done" && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("installDialog.success.installed")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={state === "installing"}>
            <X className="mr-1 h-3.5 w-3.5" /> {t("installDialog.cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={state === "installing" || state === "done"}>
            {state === "installing" ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("installDialog.installing")}</>
            ) : state === "done" ? (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("installDialog.installed")}</>
            ) : (
              <><Plug className="mr-1.5 h-3.5 w-3.5" /> {t("installDialog.installToWorkspace")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
