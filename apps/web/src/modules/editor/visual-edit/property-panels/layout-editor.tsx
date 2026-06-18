"use client";

import { useMemo } from "react";
import {
  LayoutGrid,
  ArrowRight,
  ArrowDown,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Rows3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface LayoutEditorProps {
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  onFlexDirectionChange: (value: string) => void;
  onAlignItemsChange: (value: string) => void;
  onJustifyContentChange: (value: string) => void;
  onGapChange: (value: string) => void;
}

export function LayoutEditor({
  display,
  flexDirection,
  alignItems,
  gap,
  onFlexDirectionChange,
  onAlignItemsChange,
  onGapChange,
}: LayoutEditorProps) {
  const { t } = useTranslation("editor");

  const directionOptions = useMemo(
    () =>
      [
        { value: "row", icon: ArrowRight, label: t("visualEdit.layout.row") },
        { value: "column", icon: ArrowDown, label: t("visualEdit.layout.column") },
      ] as const,
    [t],
  );

  const alignOptions = useMemo(
    () =>
      [
        { value: "flex-start", icon: AlignStartVertical, label: t("visualEdit.layout.start") },
        { value: "center", icon: AlignCenterVertical, label: t("visualEdit.layout.center") },
        { value: "flex-end", icon: AlignEndVertical, label: t("visualEdit.layout.end") },
        { value: "stretch", icon: Rows3, label: t("visualEdit.layout.stretch") },
      ] as const,
    [t],
  );

  const isFlexOrGrid =
    display === "flex" ||
    display === "inline-flex" ||
    display === "grid" ||
    display === "inline-grid";

  if (!isFlexOrGrid) {
    return (
      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 px-3 py-2">
          <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t("visualEdit.layout.title")}</span>
        </div>

        <div className="px-3 pb-3">
          <p className="text-[11px] text-muted-foreground">
            {t("visualEdit.layout.display")}: <span className="font-mono text-muted-foreground">{display}</span>
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t("visualEdit.layout.flexGridOnly")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium text-foreground">{t("visualEdit.layout.title")}</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          {display}
        </span>
      </div>

      <div className="space-y-2.5 px-3 pb-3">
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.layout.direction")}</label>
          <div className="flex gap-0.5 rounded-md border border-input bg-background p-0.5">
            {directionOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onFlexDirectionChange(value)}
                title={label}
                className={cn(
                  "flex items-center gap-1 rounded px-2 py-1.5 text-[11px] transition-colors",
                  flexDirection === value
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.layout.align")}</label>
          <div className="flex gap-0.5 rounded-md border border-input bg-background p-0.5">
            {alignOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onAlignItemsChange(value)}
                title={label}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  alignItems === value
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.layout.gap")}</label>
          <input
            type="text"
            value={gap}
            onChange={(e) => onGapChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none font-mono focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-colors"
            placeholder="0px"
          />
        </div>
      </div>
    </div>
  );
}
