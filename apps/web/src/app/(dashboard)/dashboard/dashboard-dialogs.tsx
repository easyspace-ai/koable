"use client";

import { useTranslations } from "next-intl";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, FolderIcon } from "lucide-react";
import { TemplatePreviewModal } from "@/components/templates/template-preview-modal";
import { UseTemplateDialog } from "@/components/templates/use-template-dialog";
import { ImportGitHubProjectDialog } from "@/modules/dashboard/components/import-github-project-dialog";
import type { ApiProject, ApiTemplate } from "@/lib/api";
import type { Folder } from "@doable/shared";

interface DashboardDialogsProps {
  // Delete
  deleteConfirmId: string | null;
  setDeleteConfirmId: (id: string | null) => void;
  projects: ApiProject[];
  recentProjects: ApiProject[];
  onDelete: (id: string) => void;
  // Bulk delete
  bulkDeleteConfirm: boolean;
  setBulkDeleteConfirm: (v: boolean) => void;
  selectedIds: Set<string>;
  onBulkDelete: () => void;
  // Rename
  renamingProject: ApiProject | null;
  setRenamingProject: (p: ApiProject | null) => void;
  renameValue: string;
  setRenameValue: (v: string) => void;
  onRename: () => void;
  // Move to folder
  moveToFolderProject: string | null;
  setMoveToFolderProject: (id: string | null) => void;
  folders: Folder[];
  onMoveToFolder: (projectId: string, folderId: string | null) => void;
  // Templates
  previewTemplate: ApiTemplate | null;
  setPreviewTemplate: (t: ApiTemplate | null) => void;
  remixTemplate: ApiTemplate | null;
  setRemixTemplate: (t: ApiTemplate | null) => void;
  onTemplateCreated: (projectId: string) => void;
  // GitHub import
  showImportGitHub: boolean;
  setShowImportGitHub: (v: boolean) => void;
}

export function DashboardDialogs({
  deleteConfirmId, setDeleteConfirmId, projects, recentProjects, onDelete,
  bulkDeleteConfirm, setBulkDeleteConfirm, selectedIds, onBulkDelete,
  renamingProject, setRenamingProject, renameValue, setRenameValue, onRename,
  moveToFolderProject, setMoveToFolderProject, folders, onMoveToFolder,
  previewTemplate, setPreviewTemplate, remixTemplate, setRemixTemplate, onTemplateCreated,
  showImportGitHub, setShowImportGitHub,
}: DashboardDialogsProps) {
  const t = useTranslations("dashboard");
  const deleteName = projects.find((p) => p.id === deleteConfirmId)?.name
    ?? recentProjects.find((p) => p.id === deleteConfirmId)?.name;

  return (
    <>
      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.deleteProject")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.dialogs.deleteProjectConfirm", { name: deleteName ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>{t("common.cancel")}</Button>
            <Button onClick={() => deleteConfirmId && onDelete(deleteConfirmId)} className="bg-red-600 text-white hover:bg-red-500">{t("common.delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={(open) => !open && setBulkDeleteConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.deleteProjects", { count: selectedIds.size })}</DialogTitle>
            <DialogDescription>
              {t("dashboard.dialogs.deleteProjectsConfirm", { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>{t("common.cancel")}</Button>
            <Button onClick={onBulkDelete} className="bg-red-600 text-white hover:bg-red-500">
              {t("dashboard.dialogs.deleteProjectsButton", { count: selectedIds.size })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={!!renamingProject} onOpenChange={(open) => !open && setRenamingProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.renameProject")}</DialogTitle>
          </DialogHeader>
          <div>
            <Input
              placeholder={t("dashboard.dialogs.projectNamePlaceholder")}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingProject(null)}>{t("common.cancel")}</Button>
            <Button onClick={onRename} disabled={!renameValue.trim()} className="bg-brand-600 text-white hover:bg-brand-500">{t("common.rename")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move to Folder */}
      <Dialog open={!!moveToFolderProject} onOpenChange={(open) => !open && setMoveToFolderProject(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("dashboard.dialogs.moveToFolder")}</DialogTitle>
            <DialogDescription>{t("dashboard.dialogs.moveToFolderDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            <button
              onClick={() => moveToFolderProject && onMoveToFolder(moveToFolderProject, null)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
            >
              <FolderOpen className="h-4 w-4 text-muted-foreground" /> {t("dashboard.toolbar.rootNoFolder")}
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => moveToFolderProject && onMoveToFolder(moveToFolderProject, f.id)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
              >
                <FolderIcon className="h-4 w-4 text-muted-foreground" /> {f.name}
              </button>
            ))}
            {folders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.dialogs.noFoldersHint")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={() => { setRemixTemplate(previewTemplate); setPreviewTemplate(null); }}
      />

      {/* Use Template / Remix */}
      <UseTemplateDialog
        template={remixTemplate}
        onClose={() => setRemixTemplate(null)}
        onCreated={onTemplateCreated}
      />

      {/* Import from GitHub */}
      <ImportGitHubProjectDialog open={showImportGitHub} onOpenChange={setShowImportGitHub} />
    </>
  );
}
