"use client";

import { useMemo } from "react";
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ─── Types ──────────────────────────────────────────────────

interface TypographyEditorProps {
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  onFontSizeChange: (value: string) => void;
  onFontWeightChange: (value: string) => void;
  onFontStyleChange: (value: string) => void;
  onTextAlignChange: (value: string) => void;
}

// ─── Constants ──────────────────────────────────────────────

const FONT_SIZE_OPTIONS = [
  { value: "0.75rem", label: "xs" },
  { value: "0.875rem", label: "sm" },
  { value: "1rem", label: "base" },
  { value: "1.125rem", label: "lg" },
  { value: "1.25rem", label: "xl" },
  { value: "1.5rem", label: "2xl" },
  { value: "1.875rem", label: "3xl" },
  { value: "2.25rem", label: "4xl" },
  { value: "3rem", label: "5xl" },
];

// ─── Component ──────────────────────────────────────────────

export function TypographyEditor({
  fontSize,
  fontWeight,
  fontStyle,
  textAlign,
  onFontSizeChange,
  onFontWeightChange,
  onFontStyleChange,
  onTextAlignChange,
}: TypographyEditorProps) {
  const { t } = useTranslation("editor");

  const fontWeightOptions = useMemo(
    () => [
      { value: "", label: t("visualEdit.typography.selectWeight") },
      { value: "300", label: t("visualEdit.typography.light") },
      { value: "400", label: t("visualEdit.typography.regular") },
      { value: "500", label: t("visualEdit.typography.medium") },
      { value: "600", label: t("visualEdit.typography.semibold") },
      { value: "700", label: t("visualEdit.typography.bold") },
    ],
    [t],
  );

  const fontStyleOptions = useMemo(
    () => [
      { value: "normal", label: t("visualEdit.typography.normal") },
      { value: "italic", label: t("visualEdit.typography.italic") },
    ],
    [t],
  );

  const alignmentOptions = useMemo(
    () =>
      [
        { value: "left", icon: AlignLeft, label: t("visualEdit.typography.alignLeft") },
        { value: "center", icon: AlignCenter, label: t("visualEdit.typography.alignCenter") },
        { value: "right", icon: AlignRight, label: t("visualEdit.typography.alignRight") },
        { value: "justify", icon: AlignJustify, label: t("visualEdit.typography.justify") },
      ] as const,
    [t],
  );

  const matchedSize = FONT_SIZE_OPTIONS.find((opt) => opt.value === fontSize);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Type className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{t("visualEdit.typography.title")}</span>
      </div>

      <div className="space-y-2.5 px-3 pb-3">
        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.typography.size")}</label>
          <select
            value={matchedSize ? fontSize : ""}
            onChange={(e) => onFontSizeChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand-500/50 transition-colors"
          >
            {!matchedSize && (
              <option value="" disabled>
                {fontSize}
              </option>
            )}
            {FONT_SIZE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} ({opt.value})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.typography.style")}</label>
          <select
            value={fontStyle}
            onChange={(e) => onFontStyleChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand-500/50 transition-colors"
          >
            {fontStyleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.typography.weight")}</label>
          <select
            value={fontWeightOptions.find((o) => o.value === fontWeight) ? fontWeight : ""}
            onChange={(e) => onFontWeightChange(e.target.value)}
            className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none focus:border-brand-500/50 transition-colors"
          >
            {!fontWeightOptions.find((o) => o.value === fontWeight) && fontWeight && (
              <option value="" disabled>
                {fontWeight}
              </option>
            )}
            {fontWeightOptions.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.value === ""}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="w-20 shrink-0 text-[11px] text-muted-foreground">{t("visualEdit.typography.align")}</label>
          <div className="flex gap-0.5 rounded-md border border-input bg-background p-0.5">
            {alignmentOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => onTextAlignChange(value)}
                title={label}
                className={cn(
                  "rounded p-1.5 transition-colors",
                  textAlign === value
                    ? "bg-brand-500/20 text-brand-400"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
