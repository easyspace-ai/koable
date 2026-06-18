"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  AlertCircle,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTokens } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────

interface ContextFile {
  filename: string;
  content: string;
  updatedAt: string;
}

interface KnowledgeTabProps {
  projectId: string;
  apiBaseUrl?: string;
}

// ─── Constants ──────────────────────────────────────────────

const AUTO_SAVE_DELAY = 2500;

const KNOWN_FILES = [
  "knowledge.md",
  "instructions.md",
  "identity.md",
  "soul.md",
  "memory.md",
  "user.md",
  "plan.md",
] as const;

function filenameToDescriptionKey(filename: string): string {
  return filename.replace(/\./g, "_");
}

function getFileDescription(
  filename: string,
  t: (key: string) => string,
): string {
  if ((KNOWN_FILES as readonly string[]).includes(filename)) {
    return t(`knowledge.fileDescriptions.${filenameToDescriptionKey(filename)}`);
  }
  return t("knowledge.customContext");
}

function formatRelativeDate(
  dateStr: string,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return t("knowledge.justNow");
    if (minutes < 60) return t("knowledge.minutesAgo", { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("knowledge.hoursAgo", { count: hours });
    const days = Math.floor(hours / 24);
    return t("knowledge.daysAgo", { count: days });
  } catch {
    return "";
  }
}

import { AddFileDialog, FileEditorView } from "./knowledge-tab-parts";

function getAuthHeaders(): Record<string, string> {
  const { accessToken } = getStoredTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  return headers;
}

// ─── File List View ─────────────────────────────────────────

function FileListView({
  files,
  loading,
  error,
  onFileClick,
  onAddFile,
  onRetry,
}: {
  files: ContextFile[];
  loading: boolean;
  error: string | null;
  onFileClick: (file: ContextFile) => void;
  onAddFile: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation("editor");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        {t("knowledge.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-48 px-4">
        <AlertCircle className="h-6 w-6 text-destructive/60" />
        <p className="mt-2 text-xs text-muted-foreground text-center">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {t("knowledge.retry")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Hint */}
      <div className="px-4 py-2 border-b border-border text-xs text-muted-foreground leading-relaxed">
        {t("knowledge.hint")}
      </div>

      {/* File list */}
      <div className="px-2 py-1">
        {files.map((file) => {
          const desc = getFileDescription(file.filename, t);
          const hasContent = file.content.trim().length > 0;
          return (
            <button
              key={file.filename}
              onClick={() => onFileClick(file)}
              className="flex w-full items-start gap-2.5 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-accent/50 group"
            >
              <FileText
                className={cn(
                  "h-4 w-4 flex-none mt-0.5",
                  hasContent ? "text-primary/70" : "text-muted-foreground/40"
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground truncate font-mono">
                    {file.filename}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex-none">
                    {formatRelativeDate(file.updatedAt, t)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {desc}
                </p>
                {hasContent && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                    {t("knowledge.chars", { count: file.content.length })}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Add button */}
      <div className="px-3 py-2">
        <button
          onClick={onAddFile}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
        >
          <Plus className="h-3 w-3" />
          {t("knowledge.addKnowledgeFile")}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export const KnowledgeTab = ({
  projectId,
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
}: KnowledgeTabProps) => {
  const { t } = useTranslation("editor");
  const [files, setFiles] = useState<ContextFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<ContextFile | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Fetch all context files
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/projects/${projectId}/context`,
        { headers: getAuthHeaders() }
      );
      if (!res.ok) throw new Error(t("knowledge.failedLoad"));
      const json = await res.json() as { data: { files: ContextFile[] } };
      setFiles(json.data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("knowledge.unknownError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, apiBaseUrl, t]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Create new file
  const handleCreateFile = useCallback(
    async (filename: string) => {
      setShowAddDialog(false);
      try {
        const res = await fetch(
          `${apiBaseUrl}/projects/${projectId}/context/${filename}`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content: "" }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: t("knowledge.failedCreate") }));
          throw new Error(body.error ?? t("knowledge.failedCreate"));
        }
        const json = await res.json() as { data: ContextFile };
        // Add to list and open immediately
        setFiles((prev) => [...prev, json.data].sort((a, b) => a.filename.localeCompare(b.filename)));
        setActiveFile(json.data);
      } catch (err) {
        console.error("Failed to create context file:", err);
      }
    },
    [projectId, apiBaseUrl, t]
  );

  // Open file for editing — re-fetch latest content
  const handleFileClick = useCallback(
    async (file: ContextFile) => {
      try {
        const res = await fetch(
          `${apiBaseUrl}/projects/${projectId}/context/${file.filename}`,
          { headers: getAuthHeaders() }
        );
        if (res.ok) {
          const json = await res.json() as { data: ContextFile };
          setActiveFile(json.data);
        } else {
          // Fall back to cached version
          setActiveFile(file);
        }
      } catch {
        setActiveFile(file);
      }
    },
    [projectId, apiBaseUrl]
  );

  // Back from editor — refresh list to pick up saves
  const handleBack = useCallback(() => {
    setActiveFile(null);
    void fetchFiles();
  }, [fetchFiles]);

  // If editing a file, show the editor
  if (activeFile) {
    return (
      <FileEditorView
        file={activeFile}
        projectId={projectId}
        apiBaseUrl={apiBaseUrl}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("knowledge.title")}
          </h3>
        </div>
        <button
          onClick={() => setShowAddDialog(!showAddDialog)}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-3 w-3" />
          {t("knowledge.add")}
        </button>
      </div>

      {/* Add File Dialog */}
      {showAddDialog && (
        <AddFileDialog
          onSubmit={handleCreateFile}
          onCancel={() => setShowAddDialog(false)}
          existingFiles={files.map((f) => f.filename)}
        />
      )}

      {/* File list / loading / error */}
      <FileListView
        files={files}
        loading={loading}
        error={error}
        onFileClick={handleFileClick}
        onAddFile={() => setShowAddDialog(true)}
        onRetry={fetchFiles}
      />
    </div>
  );
};
