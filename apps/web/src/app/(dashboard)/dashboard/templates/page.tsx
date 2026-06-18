"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { apiListTemplates, type ApiTemplate } from "@/lib/api";
import { TemplateCard } from "@/components/templates/template-card";
import { TemplatePreviewModal } from "@/components/templates/template-preview-modal";
import { UseTemplateDialog } from "@/components/templates/use-template-dialog";
import { Loader2, Search, Sparkles, FileCode, BarChart3, Layout, ShoppingBag, BookOpen, User, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, typeof FileCode> = {
  all: Sparkles,
  starter: FileCode,
  dashboard: BarChart3,
  marketing: Layout,
  ecommerce: ShoppingBag,
  content: BookOpen,
  personal: User,
  productivity: CheckSquare,
};

export default function TemplatesPage() {
  const router = useRouter();
  const t = useTranslations("dashboard.templatesPage");
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [previewTemplate, setPreviewTemplate] = useState<ApiTemplate | null>(null);
  const [remixTemplate, setRemixTemplate] = useState<ApiTemplate | null>(null);

  const categoryLabels = useMemo(
    () =>
      Object.fromEntries(
        (["all", "starter", "dashboard", "marketing", "ecommerce", "content", "personal", "productivity"] as const).map(
          (key) => [key, t(`categories.${key}`)],
        ),
      ) as Record<string, string>,
    [t],
  );

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiListTemplates({
        search: searchQuery || undefined,
      });
      setTemplates(res.data.templates.filter((tpl) => tpl.id !== "blank"));
      setCategories(res.data.categories);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates =
    activeCategory === "all"
      ? templates
      : templates.filter((tpl) => tpl.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
          {["all", ...categories].map((cat) => {
            const label =
              categoryLabels[cat] ??
              cat.charAt(0).toUpperCase() + cat.slice(1);
            const Icon = CATEGORY_ICONS[cat] ?? FileCode;

            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
                  activeCategory === cat
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? t("noResultsSearch", { query: searchQuery })
                : t("noResultsCategory")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => setPreviewTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>

      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onUseTemplate={() => {
          setRemixTemplate(previewTemplate);
          setPreviewTemplate(null);
        }}
      />

      <UseTemplateDialog
        template={remixTemplate}
        onClose={() => setRemixTemplate(null)}
        onCreated={(projectId) => {
          setRemixTemplate(null);
          router.push(`/editor/${projectId}`);
        }}
      />
    </div>
  );
}
