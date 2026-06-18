"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Save,
  X,
  Shield,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Skill, Rule } from "./use-skills";

export type ScopeType = "workspace" | "project" | "user";

const SCOPE_VARIANTS: Record<ScopeType, "default" | "secondary" | "outline"> = {
  workspace: "default",
  project: "secondary",
  user: "outline",
};

export function InlineCreateForm({
  type,
  onSubmit,
  onCancel,
}: {
  type: "skill" | "rule";
  onSubmit: (name: string, content: string, scope: ScopeType, description?: string, autoInvoke?: boolean) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("skills");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState<ScopeType>("workspace");
  const [autoInvoke, setAutoInvoke] = useState(true);
  const [saving, setSaving] = useState(false);
  const isSkill = type === "skill";
  const label = t(`inlineCreate.labels.${type}`);
  const placeholder = t(`inlineCreate.placeholders.${type}`);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      onSubmit(name.trim(), content, scope, isSkill ? description : undefined, isSkill ? autoInvoke : undefined);
    } finally {
      setSaving(false);
    }
  }, [name, description, content, scope, autoInvoke, isSkill, onSubmit]);

  return (
    <div className="border rounded-md bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold">{t("inlineCreate.title", { label })}</span>
        <button
          onClick={onCancel}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t("inlineCreate.nameLabel")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("inlineCreate.namePlaceholder", { label })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t("inlineCreate.scopeLabel")}
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as ScopeType)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          >
            <option value="workspace">{t("inlineCreate.scope.workspace")}</option>
            <option value="project">{t("inlineCreate.scope.project")}</option>
            <option value="user">{t("inlineCreate.scope.user")}</option>
          </select>
        </div>
        {isSkill && (
          <>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                {t("inlineCreate.descriptionLabel")} <span className="text-muted-foreground/50">{t("inlineCreate.descriptionHint")}</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("inlineCreate.descriptionPlaceholder")}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-invoke-create"
                checked={autoInvoke}
                onChange={(e) => setAutoInvoke(e.target.checked)}
                className="rounded border-input"
              />
              <label htmlFor="auto-invoke-create" className="text-xs text-muted-foreground">
                {t("inlineCreate.autoInvoke")}
              </label>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t("inlineCreate.contentLabel")}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("inlineCreate.cancel")}
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            {t("inlineCreate.create")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SkillCard({
  item,
  type,
  expanded,
  onToggle,
  onUpdate,
  onDelete,
}: {
  item: Skill | Rule;
  type: "skill" | "rule";
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (content: string, description?: string, autoInvoke?: boolean) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("skills");
  const itemName = type === "skill" ? (item as Skill).skill_name : (item as Rule).rule_name;
  const itemContent = type === "skill" ? (item as Skill).skill_content : (item as Rule).content;
  const itemDescription = type === "skill" ? (item as Skill).description ?? "" : "";
  const itemAutoInvoke = type === "skill" ? (item as Skill).auto_invoke ?? true : true;
  const [editContent, setEditContent] = useState(itemContent);
  const [editDescription, setEditDescription] = useState(itemDescription);
  const [editAutoInvoke, setEditAutoInvoke] = useState(itemAutoInvoke);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dirty, setDirty] = useState(false);

  const scopeLabel = item.scope === "workspace" || item.scope === "project" || item.scope === "user"
    ? t(`inlineCreate.scope.${item.scope}`)
    : item.scope;

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      onUpdate(editContent, type === "skill" ? editDescription : undefined, type === "skill" ? editAutoInvoke : undefined);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }, [editContent, editDescription, editAutoInvoke, type, onUpdate]);

  const handleDelete = useCallback(() => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete();
    setConfirmDelete(false);
  }, [confirmDelete, onDelete]);

  const handleContentChange = useCallback(
    (value: string) => {
      setEditContent(value);
      setDirty(value !== itemContent || editDescription !== itemDescription || editAutoInvoke !== itemAutoInvoke);
    },
    [itemContent, itemDescription, itemAutoInvoke, editDescription, editAutoInvoke]
  );

  const Icon = type === "skill" ? Lightbulb : Shield;

  return (
    <div className="border rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{itemName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {type === "skill" && itemDescription
              ? itemDescription
              : itemContent
                ? t("skillCard.chars", { count: itemContent.length })
                : t("skillCard.emptyClickToEdit")}
          </p>
        </div>
        {type === "skill" && !itemAutoInvoke && (
          <Badge variant="outline" className="text-[10px] shrink-0 mr-1">
            {t("skillCard.badgeManual")}
          </Badge>
        )}
        <Badge
          variant={SCOPE_VARIANTS[item.scope]}
          className="text-[10px] shrink-0"
        >
          {scopeLabel}
        </Badge>
      </button>

      {expanded && (
        <div className="border-t bg-muted/20">
          <div className="p-3 space-y-3">
            {type === "skill" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    {t("skillCard.descriptionLabel")}
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => {
                      setEditDescription(e.target.value);
                      setDirty(editContent !== itemContent || e.target.value !== itemDescription || editAutoInvoke !== itemAutoInvoke);
                    }}
                    placeholder={t("skillCard.descriptionPlaceholder")}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`auto-invoke-${item.id}`}
                    checked={editAutoInvoke}
                    onChange={(e) => {
                      setEditAutoInvoke(e.target.checked);
                      setDirty(editContent !== itemContent || editDescription !== itemDescription || e.target.checked !== itemAutoInvoke);
                    }}
                    className="rounded border-input"
                  />
                  <label htmlFor={`auto-invoke-${item.id}`} className="text-xs text-muted-foreground">
                    {t("skillCard.autoInvoke")}
                  </label>
                </div>
              </>
            )}
            <textarea
              value={editContent}
              onChange={(e) => handleContentChange(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 resize-y placeholder:text-muted-foreground"
              placeholder={
                type === "skill"
                  ? t("skillCard.contentPlaceholderSkill")
                  : t("skillCard.contentPlaceholderRule")
              }
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t">
            <button
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                dirty
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground",
                "disabled:opacity-40 disabled:cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              {t("skillCard.save")}
            </button>
            <button
              onClick={handleDelete}
              onBlur={() => setConfirmDelete(false)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
              )}
            >
              {confirmDelete ? (
                <>
                  <AlertCircle className="h-3 w-3" />
                  {t("skillCard.confirm")}
                </>
              ) : (
                <>
                  <Trash2 className="h-3 w-3" />
                  {t("skillCard.delete")}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
