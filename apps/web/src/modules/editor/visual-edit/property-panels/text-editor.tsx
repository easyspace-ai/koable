"use client";

import { Type } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function TextEditor({ value, onChange }: TextEditorProps) {
  const { t } = useTranslation("editor");

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Type className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{t("visualEdit.text.title")}</span>
      </div>

      <div className="px-3 pb-3">
        <label className="mb-1.5 block text-[11px] text-muted-foreground">
          {t("visualEdit.text.content")}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-2 text-[12px] text-foreground outline-none placeholder:text-muted-foreground focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all font-mono leading-relaxed"
          placeholder={t("visualEdit.text.placeholder")}
        />
      </div>
    </div>
  );
}
