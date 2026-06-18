"use client";

import { Scaling, MoveHorizontal, MoveVertical } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

interface SizeEditorProps {
  width: string;
  height: string;
  onWidthChange: (value: string) => void;
  onHeightChange: (value: string) => void;
}

export function SizeEditor({
  width,
  height,
  onWidthChange,
  onHeightChange,
}: SizeEditorProps) {
  const { t } = useTranslation("editor");

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Scaling className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{t("visualEdit.size.title")}</span>
      </div>

      <div className="space-y-2.5 px-3 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex w-20 shrink-0 items-center gap-1.5">
            <MoveHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] text-muted-foreground">{t("visualEdit.size.width")}</label>
          </div>
          <input
            type="text"
            value={width}
            onChange={(e) => onWidthChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none font-mono focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
            placeholder={t("visualEdit.size.autoPlaceholder")}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex w-20 shrink-0 items-center gap-1.5">
            <MoveVertical className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-[11px] text-muted-foreground">{t("visualEdit.size.height")}</label>
          </div>
          <input
            type="text"
            value={height}
            onChange={(e) => onHeightChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none font-mono focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
            placeholder={t("visualEdit.size.autoPlaceholder")}
          />
        </div>
      </div>
    </div>
  );
}
