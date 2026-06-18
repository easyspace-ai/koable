"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Flag, Loader2, CheckCircle2, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

const REASON_IDS = ["spam", "malware", "broken", "inappropriate", "copyright", "other"] as const;
type Reason = typeof REASON_IDS[number];

export interface ReportListingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}

export function ReportListingDialog({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: ReportListingDialogProps) {
  const t = useTranslations("marketplace");
  const [reason, setReason] = useState<Reason>("spam");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setReason("spam");
    setDetail("");
    setError(null);
    setDone(false);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/marketplace/listings/${listingId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || undefined }),
      });
      setDone(true);
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("reportDialog.errors.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            {t("reportDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("reportDialog.description", { title: listingTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("reportDialog.reasonLabel")}</label>
            <div className="grid grid-cols-1 gap-1">
              {REASON_IDS.map((id) => {
                const active = reason === id;
                return (
                  <button
                    key={id}
                    onClick={() => setReason(id)}
                    className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                      active
                        ? "border-brand-500/50 bg-brand-500/10 text-brand-200"
                        : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {t(`reportDialog.reasons.${id}`)}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t("reportDialog.detailsLabel")} <span className="text-muted-foreground/70">{t("reportDialog.detailsOptional")}</span>
            </label>
            <Textarea
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={t("reportDialog.detailsPlaceholder")}
              maxLength={2000}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("reportDialog.success.received")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="mr-1 h-3.5 w-3.5" /> {t("reportDialog.cancel")}
          </Button>
          <Button onClick={submit} disabled={busy || done} variant="destructive">
            {busy ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("reportDialog.sending")}</>
            ) : done ? (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("reportDialog.sent")}</>
            ) : (
              <><Flag className="mr-1.5 h-3.5 w-3.5" /> {t("reportDialog.submitReport")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
