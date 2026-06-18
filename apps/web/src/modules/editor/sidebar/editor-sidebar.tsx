"use client";

import { useEditorStore } from "../hooks/use-editor-store";
import { FileTree } from "./file-tree";
import { VersionHistory } from "./version-history";
import { PagesTab } from "./pages-tab";
import { KnowledgeTab } from "./knowledge-tab";
import { SkillsPanel } from "@/modules/skills/skills-panel";
import { useTranslation } from "@/lib/i18n";
import {
  Files,
  History,
  BookOpen,
  Layout,
  PanelLeftClose,
  Sparkles,
} from "lucide-react";

const TAB_CONFIG = [
  { id: "pages" as const, labelKey: "sidebar.pages", icon: Layout },
  { id: "files" as const, labelKey: "sidebar.files", icon: Files },
  { id: "history" as const, labelKey: "sidebar.history", icon: History },
  { id: "knowledge" as const, labelKey: "sidebar.knowledge", icon: BookOpen },
  { id: "skills" as const, labelKey: "sidebar.skills", icon: Sparkles },
];

export function EditorSidebar() {
  const { t } = useTranslation("editor");
  const { activeSidebarTab, setActiveSidebarTab, toggleSidebar, projectId } =
    useEditorStore();

  // Resolve workspaceId from localStorage (same pattern as EditorToolbar)
  const workspaceId =
    typeof window !== "undefined"
      ? localStorage.getItem("doable_active_workspace_id")
      : null;

  return (
    <div className="flex h-full flex-col bg-muted/20">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border">
        <div className="flex flex-1 overflow-x-auto">
          {TAB_CONFIG.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSidebarTab(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors border-b-2 ${
                activeSidebarTab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(labelKey)}
            </button>
          ))}
        </div>
        <button
          onClick={toggleSidebar}
          className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground transition-colors mr-1"
          title={t("sidebar.collapse")}
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSidebarTab === "pages" && <PagesTab />}
        {activeSidebarTab === "files" && <FileTree />}
        {activeSidebarTab === "history" && <VersionHistory />}
        {activeSidebarTab === "knowledge" && projectId && (
          <KnowledgeTab projectId={projectId} />
        )}
        {activeSidebarTab === "knowledge" && !projectId && (
          <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
            {t("sidebar.noProject")}
          </div>
        )}
        {activeSidebarTab === "skills" && workspaceId && (
          <SkillsPanel
            workspaceId={workspaceId}
            projectId={projectId ?? undefined}
          />
        )}
        {activeSidebarTab === "skills" && !workspaceId && (
          <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
            {t("sidebar.noWorkspace")}
          </div>
        )}
      </div>
    </div>
  );
}
