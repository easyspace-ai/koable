"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

interface Props {
  workspaceName: string;
  onWorkspaceNameChange: (name: string) => void;
  onNext: () => void;
}

export function Step1Welcome({ workspaceName, onWorkspaceNameChange, onNext }: Props) {
  const t = useTranslations("dashboard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!workspaceName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/setup/workspace-name", {
        method: "POST",
        body: JSON.stringify({ name: workspaceName.trim() }),
      });
    } catch {
      // Non-fatal — workspace name save is best-effort; wizard proceeds regardless
    } finally {
      setSaving(false);
    }
    onNext();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-foreground tracking-tight">
          {t("setup.welcome.title")}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed max-w-prose">
          {t("setup.welcome.description")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="workspace-name" className="text-sm font-medium text-foreground">
          {t("setup.welcome.workspaceName")}
        </label>
        <input
          id="workspace-name"
          type="text"
          value={workspaceName}
          onChange={(e) => onWorkspaceNameChange(e.target.value)}
          placeholder={t("setup.welcome.workspacePlaceholder")}
          maxLength={80}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
        />
        <p className="text-xs text-muted-foreground">
          {t("setup.welcome.workspaceHint")}
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={saving || !workspaceName.trim()}
          className="bg-brand-600 text-white hover:bg-brand-500 gap-2"
        >
          {saving ? t("common.saving") : t("setup.welcome.continue")}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
