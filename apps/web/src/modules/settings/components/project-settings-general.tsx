"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  Hash,
  Calendar,
  Clock,
  Link2,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  apiUpdateProject,
  type ApiProject,
} from "@/lib/api";
import { IntegrationsPanel } from "@/modules/integrations/integrations-panel";
import { GitHubSettings } from "@/modules/settings/components/github-settings";
import { useAuth } from "@/hooks/use-auth";
import { getGitHubConnectUrl, getStoredTokens } from "@/lib/api";
import { SectionCard, InfoItem } from "./project-settings-shared";

// ═══════════════════════════════════════════════════════════════
// GENERAL TAB
// ═══════════════════════════════════════════════════════════════

export function GeneralTab({
  project,
  onUpdate,
  addToast,
}: {
  project: ApiProject;
  onUpdate: (p: ApiProject) => void;
  addToast: (type: "success" | "error", msg: string) => void;
}) {
  const t = useTranslations("settings");
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [visibility, setVisibility] = useState(project.visibility);
  const [saving, setSaving] = useState(false);
  const hasChanges =
    name !== project.name ||
    description !== (project.description ?? "") ||
    visibility !== project.visibility;

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const { data } = await apiUpdateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
      });
      onUpdate(data);
      addToast("success", t("general.toasts.saved"));
    } catch (err) {
      addToast("error", err instanceof Error ? err.message : t("general.toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <SectionCard title={t("general.projectDetails.title")}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="settings-name" className="text-sm font-medium">
              {t("general.projectDetails.nameLabel")}
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("general.projectDetails.namePlaceholder")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="settings-description" className="text-sm font-medium">
              {t("general.projectDetails.descriptionLabel")}
            </label>
            <textarea
              id="settings-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t("general.projectDetails.descriptionPlaceholder")}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("general.projectDetails.visibilityLabel")}</label>
            <div className="flex gap-3">
              <button
                onClick={() => setVisibility("public")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors flex-1",
                  visibility === "public"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-input text-muted-foreground hover:text-foreground"
                )}
              >
                <Eye className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{t("general.projectDetails.public.label")}</div>
                  <div className="text-xs text-muted-foreground">{t("general.projectDetails.public.description")}</div>
                </div>
              </button>
              <button
                onClick={() => setVisibility("private")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors flex-1",
                  visibility === "private"
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-input text-muted-foreground hover:text-foreground"
                )}
              >
                <EyeOff className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">{t("general.projectDetails.private.label")}</div>
                  <div className="text-xs text-muted-foreground">{t("general.projectDetails.private.description")}</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              {hasChanges && t("general.projectDetails.unsavedChanges")}
            </div>
            <button
              onClick={() => void handleSave()}
              disabled={!hasChanges || saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
                hasChanges
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? t("general.projectDetails.saving") : t("general.projectDetails.saveChanges")}
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Project Info */}
      <SectionCard title={t("general.projectInfo.title")} description={t("general.projectInfo.description")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem
            icon={Hash}
            label={t("general.projectInfo.projectId")}
            value={project.id}
            mono
          />
          <InfoItem
            icon={Calendar}
            label={t("general.projectInfo.created")}
            value={new Date(project.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <InfoItem
            icon={Clock}
            label={t("general.projectInfo.lastUpdated")}
            value={new Date(project.updated_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <InfoItem
            icon={Link2}
            label={t("general.projectInfo.projectUrl")}
            value={`${project.slug}.doable.me`}
            mono
          />
          <InfoItem
            icon={Shield}
            label={t("general.projectInfo.status")}
            value={project.status}
            badge
          />
          <InfoItem
            icon={Eye}
            label={t("general.projectInfo.visibility")}
            value={project.visibility}
            badge
          />
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INTEGRATIONS TAB
// ═══════════════════════════════════════════════════════════════

export function IntegrationsPanelWrapper({ projectId }: { projectId: string }) {
  const t = useTranslations("settings");
  const { user } = useAuth();
  const { accessToken } = getStoredTokens();
  const workspaceId =
    typeof window !== "undefined"
      ? localStorage.getItem("doable_active_workspace_id") ?? ""
      : "";

  const handleGitHubConnect = useCallback(() => {
    if (!user?.id) return;
    const returnUrl = `${window.location.origin}/projects/${projectId}/settings?tab=integrations`;
    window.location.href = getGitHubConnectUrl(user.id, returnUrl);
  }, [user, projectId]);

  return (
    <div className="space-y-4">
      <SectionCard
        title={t("integrationsTab.title")}
        description={t("integrationsTab.description")}
      >
        <IntegrationsPanel
          workspaceId={workspaceId}
          projectId={projectId}
          variant="settings"
          onGitHubConnect={handleGitHubConnect}
        />
      </SectionCard>

      {/* Full GitHub push/pull controls when connected */}
      {accessToken && (
        <SectionCard
          title={t("integrationsTab.githubSync.title")}
          description={t("integrationsTab.githubSync.description")}
        >
          <GitHubSettings
            projectId={projectId}
            accessToken={accessToken}
          />
        </SectionCard>
      )}
    </div>
  );
}
