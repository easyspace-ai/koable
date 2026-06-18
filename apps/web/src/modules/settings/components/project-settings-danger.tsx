"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  ArrowRightLeft,
  Trash2,
} from "lucide-react";
import {
  apiDeleteProject,
  type ApiProject,
} from "@/lib/api";

// ═══════════════════════════════════════════════════════════════
// DANGER ZONE TAB
// ═══════════════════════════════════════════════════════════════

export function DangerTab({
  project,
  addToast,
}: {
  project: ApiProject;
  addToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useTranslations("settings");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [transferEmail, setTransferEmail] = useState("");

  const handleDelete = async () => {
    if (deleteConfirm !== project.name) return;
    setDeleting(true);
    try {
      await apiDeleteProject(project.id);
      addToast("success", t("danger.toasts.deleted"));
      setTimeout(() => {
        window.location.href = "/projects";
      }, 1000);
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : t("danger.toasts.deleteFailed"));
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Transfer Project */}
      <div className="rounded-xl border border-amber-200 p-6 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <ArrowRightLeft className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{t("danger.transfer.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("danger.transfer.description")}
            </p>

            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <label
                  htmlFor="transfer-email"
                  className="text-sm font-medium"
                >
                  {t("danger.transfer.emailLabel")}
                </label>
                <input
                  id="transfer-email"
                  type="email"
                  value={transferEmail}
                  onChange={(e) => setTransferEmail(e.target.value)}
                  placeholder={t("danger.transfer.emailPlaceholder")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <button
                disabled={!transferEmail.trim() || !transferEmail.includes("@")}
                onClick={() =>
                  addToast(
                    "success",
                    t("danger.transfer.toast")
                  )
                }
                className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {t("danger.transfer.button")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Project */}
      <div className="rounded-xl border border-destructive/30 p-6">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-destructive">
              {t("danger.delete.title")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("danger.delete.description")}
            </p>

            {!showDeleteDialog ? (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
                {t("danger.delete.button")}
              </button>
            ) : (
              <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-medium text-destructive">
                  {t("danger.delete.confirmTitle")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("danger.delete.confirmDescription", { projectName: project.name })}
                </p>

                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="delete-confirm"
                      className="text-sm font-medium"
                    >
                      {t("danger.delete.confirmLabel", { projectName: project.name })}
                    </label>
                    <input
                      id="delete-confirm"
                      type="text"
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder={project.name}
                      className="flex h-10 w-full rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleDelete()}
                      disabled={
                        deleteConfirm !== project.name || deleting
                      }
                      className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      {deleting
                        ? t("danger.delete.deleting")
                        : t("danger.delete.confirmButton")}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteDialog(false);
                        setDeleteConfirm("");
                      }}
                      className="rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
                    >
                      {t("danger.delete.cancel")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
