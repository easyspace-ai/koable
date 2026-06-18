"use client";

import { useTranslations } from "next-intl";
import {
  Search, LayoutGrid, List, Filter, X, Star,
  Trash2, FolderInput, ChevronDown,
  Globe, AlertCircle, FileCode, ArrowRight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger,
  DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Folder } from "@doable/shared";
import type { ViewMode, StatusFilter, SortKey } from "./dashboard-constants";

interface DashboardToolbarProps {
  activeTab: "recent" | "projects" | "templates";
  setActiveTab: (tab: "recent" | "projects" | "templates") => void;
  onBrowseTemplates: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  starredFilter: boolean;
  setStarredFilter: (v: boolean) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  folders: Folder[];
  onBulkMoveToFolder: (folderId: string | null) => void;
  onBulkDeleteConfirm: () => void;
}

export function DashboardToolbar({
  activeTab, setActiveTab, onBrowseTemplates,
  searchRef, searchQuery, setSearchQuery,
  statusFilter, setStatusFilter,
  starredFilter, setStarredFilter,
  viewMode, setViewMode,
  selectedIds, setSelectedIds,
  folders, onBulkMoveToFolder, onBulkDeleteConfirm,
}: DashboardToolbarProps) {
  const t = useTranslations("dashboard");

  const TABS = [
    { key: "recent" as const, label: t("dashboard.toolbar.recentlyViewed") },
    { key: "projects" as const, label: t("dashboard.toolbar.myProjects") },
    { key: "templates" as const, label: t("dashboard.toolbar.templates") },
  ];

  const statusLabel =
    statusFilter === "all"
      ? t("dashboard.toolbar.allStatus")
      : statusFilter === "published"
        ? t("dashboard.toolbar.published")
        : statusFilter === "draft"
          ? t("dashboard.toolbar.draft")
          : t("dashboard.toolbar.error");

  return (
    <div className="flex flex-col gap-3 mb-6">
      {/* Row 1: Tab Bar */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pl-1 md:pl-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? "text-foreground bg-secondary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
        {activeTab === "templates" && (
          <button
            onClick={onBrowseTemplates}
            className="ml-auto flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("dashboard.toolbar.browseAll")}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Row 2: Search + Filters + View Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[140px] max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder={t("dashboard.toolbar.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        {activeTab !== "templates" && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors">
              <Filter className="h-3.5 w-3.5" />
              {statusLabel}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                {t("dashboard.toolbar.allStatus")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("published")}>
                <Globe className="mr-2 h-3.5 w-3.5 text-emerald-400" /> {t("dashboard.toolbar.published")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("draft")}>
                <FileCode className="mr-2 h-3.5 w-3.5 text-muted-foreground" /> {t("dashboard.toolbar.draft")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("error")}>
                <AlertCircle className="mr-2 h-3.5 w-3.5 text-red-400" /> {t("dashboard.toolbar.error")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Starred filter */}
        {activeTab !== "templates" && (
          <button
            onClick={() => setStarredFilter(!starredFilter)}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
              starredFilter
                ? "border-yellow-600/40 bg-yellow-500/15 text-yellow-700 dark:border-yellow-500/30 dark:text-yellow-400"
                : "border-border bg-card text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${starredFilter ? "fill-yellow-400" : ""}`} />
            {t("dashboard.toolbar.starred")}
          </button>
        )}

        {/* View Mode */}
        {activeTab !== "templates" && (
          <div className="flex items-center rounded-lg border border-border bg-card overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-9 w-9 items-center justify-center transition-colors ${
                viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("dashboard.toolbar.gridView")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-9 w-9 items-center justify-center transition-colors ${
                viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title={t("dashboard.toolbar.listView")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-brand-500/30 bg-brand-500/5 px-4 py-2">
          <span className="text-sm text-brand-300 font-medium">
            {t("dashboard.toolbar.selected", { count: selectedIds.size })}
          </span>
          <div className="flex items-center gap-1 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-foreground hover:bg-accent transition-colors">
                <FolderInput className="h-3.5 w-3.5" />
                {t("dashboard.toolbar.moveToFolder")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onBulkMoveToFolder(null)}>
                  {t("dashboard.toolbar.rootNoFolder")}
                </DropdownMenuItem>
                {folders.length > 0 && <DropdownMenuSeparator />}
                {folders.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => onBulkMoveToFolder(f.id)}>
                    <FolderInput className="mr-2 h-3.5 w-3.5" />
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={onBulkDeleteConfirm}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("common.delete")}
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              {t("common.clear")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
