"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BookOpen,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lightbulb,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSkills,
} from "./use-skills";

interface SkillsPanelProps {
  workspaceId: string;
  projectId?: string;
}

import { type ScopeType, InlineCreateForm, SkillCard } from "./skills-panel-components";

function SectionHeader({
  icon: Icon,
  title,
  count,
  expanded,
  onToggle,
  onAdd,
  itemType,
}: {
  icon: typeof BookOpen;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  onAdd: () => void;
  itemType: string;
}) {
  const t = useTranslations("skills");
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{t("sectionHeader.count", { count })}</span>
      </button>
      <button
        onClick={onAdd}
        className="p-1 rounded-md hover:bg-muted transition-colors"
        title={t("sectionHeader.addItemTitle", { itemType })}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export const SkillsPanel = ({ workspaceId, projectId }: SkillsPanelProps) => {
  const t = useTranslations("skills");
  const {
    skills,
    rules,
    loading,
    error,
    refresh,
    createSkill,
    updateSkill,
    deleteSkill,
    createRule,
    updateRule,
    deleteRule,
  } = useSkills(workspaceId, projectId);

  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [skillsSectionOpen, setSkillsSectionOpen] = useState(true);
  const [rulesSectionOpen, setRulesSectionOpen] = useState(true);

  const handleCreateSkill = useCallback(
    (name: string, content: string, scope: ScopeType, description?: string, autoInvoke?: boolean) => {
      void createSkill({ skillName: name, description: description ?? "", skillContent: content, autoInvoke: autoInvoke ?? true, scope, projectId }).then(() =>
        setShowSkillForm(false)
      );
    },
    [createSkill, projectId]
  );

  const handleCreateRule = useCallback(
    (name: string, content: string, scope: ScopeType, _desc?: string, _auto?: boolean) => {
      void createRule({ ruleName: name, content, filePatterns: [], scope, projectId }).then(() =>
        setShowRuleForm(false)
      );
    },
    [createRule, projectId]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">{t("panel.title")}</h3>
        </div>
        <button
          onClick={() => void refresh()}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          title={t("panel.refreshTitle")}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
          />
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border-b">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-1">
          {loading && skills.length === 0 && rules.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              {t("panel.loading")}
            </div>
          )}

          <SectionHeader
            icon={Lightbulb}
            title={t("panel.sectionSkills")}
            count={skills.length}
            expanded={skillsSectionOpen}
            onToggle={() => setSkillsSectionOpen((v) => !v)}
            onAdd={() => {
              setSkillsSectionOpen(true);
              setShowSkillForm(true);
            }}
            itemType={t("inlineCreate.labels.skill")}
          />

          {skillsSectionOpen && (
            <div className="space-y-2 pl-1">
              {showSkillForm && (
                <InlineCreateForm
                  type="skill"
                  onSubmit={handleCreateSkill}
                  onCancel={() => setShowSkillForm(false)}
                />
              )}

              {skills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  item={skill}
                  type="skill"
                  expanded={expandedSkillId === skill.id}
                  onToggle={() =>
                    setExpandedSkillId((prev) =>
                      prev === skill.id ? null : skill.id
                    )
                  }
                  onUpdate={(content, description, autoInvoke) =>
                    void updateSkill(skill.id, { skillContent: content, description, autoInvoke })
                  }
                  onDelete={() => void deleteSkill(skill.id)}
                />
              ))}

              {!loading && skills.length === 0 && !showSkillForm && (
                <div className="flex flex-col items-center py-6 text-center">
                  <Lightbulb className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("panel.emptySkills")}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="border-t my-2" />

          <SectionHeader
            icon={Shield}
            title={t("panel.sectionRules")}
            count={rules.length}
            expanded={rulesSectionOpen}
            onToggle={() => setRulesSectionOpen((v) => !v)}
            onAdd={() => {
              setRulesSectionOpen(true);
              setShowRuleForm(true);
            }}
            itemType={t("inlineCreate.labels.rule")}
          />

          {rulesSectionOpen && (
            <div className="space-y-2 pl-1">
              {showRuleForm && (
                <InlineCreateForm
                  type="rule"
                  onSubmit={handleCreateRule}
                  onCancel={() => setShowRuleForm(false)}
                />
              )}

              {rules.map((rule) => (
                <SkillCard
                  key={rule.id}
                  item={rule}
                  type="rule"
                  expanded={expandedRuleId === rule.id}
                  onToggle={() =>
                    setExpandedRuleId((prev) =>
                      prev === rule.id ? null : rule.id
                    )
                  }
                  onUpdate={(content) =>
                    void updateRule(rule.id, content)
                  }
                  onDelete={() => void deleteRule(rule.id)}
                />
              ))}

              {!loading && rules.length === 0 && !showRuleForm && (
                <div className="flex flex-col items-center py-6 text-center">
                  <Shield className="h-6 w-6 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("panel.emptyRules")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
