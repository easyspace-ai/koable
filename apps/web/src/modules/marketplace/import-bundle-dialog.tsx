"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  Link as LinkIcon,
  FileCode,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  ShieldCheck,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type Tab = "json" | "zip" | "url";

const TAB_IDS: Tab[] = ["json", "zip", "url"];
const TAB_ICONS = { json: FileCode, zip: Upload, url: LinkIcon } as const;

export interface ImportBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onImported?: () => void;
}

export function ImportBundleDialog({
  open,
  onOpenChange,
  workspaceId,
  onImported,
}: ImportBundleDialogProps) {
  const t = useTranslations("marketplace");
  const [tab, setTab] = useState<Tab>("json");
  const [jsonText, setJsonText] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() {
    setJsonText("");
    setZipFile(null);
    setUrl("");
    setError(null);
    setDone(false);
  }

  async function handleImport() {
    setBusy(true);
    setError(null);

    try {
      if (tab === "json") {
        const parsed = JSON.parse(jsonText);
        await apiFetch(`/marketplace/${workspaceId}/environments/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed),
        });
      } else if (tab === "zip") {
        if (!zipFile) throw new Error(t("importDialog.errors.pickZip"));
        const fd = new FormData();
        fd.append("file", zipFile);
        fd.append("format", "standards.zip.v1");
        await apiFetch(`/marketplace/${workspaceId}/environments/import-bundle`, {
          method: "POST",
          body: fd,
        });
      } else {
        if (!url.trim()) throw new Error(t("importDialog.errors.pasteUrl"));
        await apiFetch(`/marketplace/${workspaceId}/environments/import-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim() }),
        });
      }

      setDone(true);
      onImported?.();
      setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("importDialog.errors.importFailed"));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    !busy &&
    !done &&
    ((tab === "json" && jsonText.trim().length > 0) ||
      (tab === "zip" && !!zipFile) ||
      (tab === "url" && url.trim().length > 0));

  const tabLabel = (id: Tab) => {
    if (id === "url") return t("importDialog.tabs.githubUrl");
    return t(`importDialog.tabs.${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-400" />
            {t("importDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("importDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex gap-1 rounded-md border border-border bg-card p-1">
            {TAB_IDS.map((id) => {
              const active = tab === id;
              const Icon = TAB_ICONS[id];
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tabLabel(id)}
                </button>
              );
            })}
          </div>

          {tab === "json" && (
            <div className="space-y-1.5">
              <Textarea
                rows={10}
                placeholder={t("importDialog.jsonPlaceholder")}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {t("importDialog.jsonHint", { format: t("importDialog.jsonFormatLabel") })}
              </p>
            </div>
          )}

          {tab === "zip" && (
            <div className="space-y-1.5">
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card/40 px-4 py-6 text-center transition-colors hover:bg-card cursor-pointer">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {zipFile ? zipFile.name : t("importDialog.zipDropPrompt")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("importDialog.zipCompatibility")}
                </span>
                <input
                  type="file"
                  accept=".zip,application/zip"
                  className="hidden"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {tab === "url" && (
            <div className="space-y-1.5">
              <Input
                placeholder={t("importDialog.urlPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t("importDialog.urlHint")}
              </p>
            </div>
          )}

          <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <span>{t("importDialog.trustNote")}</span>
          </p>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t("importDialog.success.imported")}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="mr-1 h-3.5 w-3.5" /> {t("importDialog.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={!canSubmit}>
            {busy ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> {t("importDialog.importing")}</>
            ) : done ? (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> {t("importDialog.imported")}</>
            ) : (
              <><Upload className="mr-1.5 h-3.5 w-3.5" /> {t("importDialog.importToWorkspace")}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
