"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Save,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredTokens } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

// ─── Shared Types & Helpers ─────────────────────────────────

export interface ContextFile {
  filename: string;
  content: string;
  updatedAt: string;
}

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
  return t("knowledge.customContextFile");
}

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

// ─── Add File Dialog ────────────────────────────────────────

export function AddFileDialog({
  onSubmit,
  onCancel,
  existingFiles,
}: {
  onSubmit: (filename: string) => void;
  onCancel: () => void;
  existingFiles: string[];
}) {
  const { t } = useTranslation("editor");
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filename = name.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  const fullFilename = filename.endsWith(".md") ? filename : `${filename}.md`;
  const isValid = filename.length > 0 && !existingFiles.includes(fullFilename);
  const isDuplicate = existingFiles.includes(fullFilename);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit(fullFilename);
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-border bg-muted/30">
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {t("knowledge.newKnowledgeFile")}
      </label>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("knowledge.namePlaceholder")}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        spellCheck={false}
      />
      {isDuplicate && (
        <p className="mt-1 text-xs text-destructive">{t("knowledge.fileExists")}</p>
      )}
      {filename && !isDuplicate && (
        <p className="mt-1 text-xs text-muted-foreground font-mono">
          {fullFilename}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={!isValid}
          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("knowledge.create")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {t("pages.cancel")}
        </button>
      </div>
    </form>
  );
}

// ─── File Editor View ───────────────────────────────────────

export function FileEditorView({
  file,
  projectId,
  apiBaseUrl,
  onBack,
}: {
  file: ContextFile;
  projectId: string;
  apiBaseUrl: string;
  onBack: () => void;
}) {
  const { t } = useTranslation("editor");
  const [content, setContent] = useState(file.content);
  const [originalContent, setOriginalContent] = useState(file.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = content !== originalContent;

  // Save
  const save = useCallback(
    async (contentToSave: string) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/projects/${projectId}/context/${file.filename}`,
          {
            method: "PUT",
            headers: getAuthHeaders(),
            body: JSON.stringify({ content: contentToSave }),
          }
        );
        if (!res.ok) throw new Error(t("knowledge.saveFailed"));
        setOriginalContent(contentToSave);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (err) {
        setError(err instanceof Error ? err.message : t("knowledge.saveFailed"));
      } finally {
        setSaving(false);
      }
    },
    [projectId, apiBaseUrl, file.filename, t]
  );

  // Auto-save
  const handleChange = (newContent: string) => {
    setContent(newContent);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (newContent !== originalContent) {
        void save(newContent);
      }
    }, AUTO_SAVE_DELAY);
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const handleManualSave = () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    void save(content);
  };

  const handleReset = () => {
    setContent(originalContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      handleManualSave();
    }
  };

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button
          onClick={onBack}
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          title={t("knowledge.backToList")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate font-mono">
            {file.filename}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {getFileDescription(file.filename, t)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {dirty && (
            <span className="text-[10px] text-amber-500 mr-1">{t("knowledge.unsaved")}</span>
          )}
          <button
            onClick={handleReset}
            disabled={!dirty}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              dirty
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title={t("knowledge.revertChanges")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleManualSave}
            disabled={!dirty || saving}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              dirty
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
            title={t("knowledge.saveShortcut")}
          >
            <Save className={cn("h-3.5 w-3.5", saving && "animate-pulse")} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-red-400 bg-red-950/20 border-b border-border">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          className="w-full h-full p-4 bg-background text-sm font-mono leading-relaxed resize-none focus:outline-none"
          placeholder={t("knowledge.editorPlaceholder", {
            name: file.filename.replace(".md", ""),
          })}
          spellCheck={false}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border text-[11px] text-muted-foreground">
        <span>{t("knowledge.chars", { count: content.length })}</span>
        <div className="flex items-center gap-2">
          {saving && <span className="text-primary">{t("knowledge.saving")}</span>}
          {lastSaved && !saving && (
            <span className="flex items-center gap-1">
              <Check className="h-2.5 w-2.5 text-green-500" />
              {t("knowledge.saved", { time: lastSaved })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
