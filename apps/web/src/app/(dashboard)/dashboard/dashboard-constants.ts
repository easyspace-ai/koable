import type { ApiProject } from "@/lib/api";

// ─── View / Filter Types ────────────────────────────────────

export type ViewMode = "grid" | "list";
export type StatusFilter = "all" | "published" | "draft" | "error";
export type SortKey = "name" | "updated_at" | "created_at" | "status";
export type SortDir = "asc" | "desc";

// ─── Constants ──────────────────────────────────────────────

export const VIEW_MODE_KEY = "doable_dashboard_view";

export const PROJECT_GRADIENTS = [
  "from-brand-500/20 to-brand-600/20",
  "from-blue-500/20 to-cyan-600/20",
  "from-emerald-500/20 to-teal-600/20",
  "from-orange-500/20 to-amber-600/20",
  "from-pink-500/20 to-rose-600/20",
  "from-indigo-500/20 to-blue-600/20",
  "from-fuchsia-500/20 to-pink-600/20",
  "from-cyan-500/20 to-sky-600/20",
];

export const PROJECT_ACCENT_COLORS = [
  "bg-brand-500/30",
  "bg-blue-500/30",
  "bg-emerald-500/30",
  "bg-orange-500/30",
  "bg-pink-500/30",
  "bg-indigo-500/30",
  "bg-fuchsia-500/30",
  "bg-cyan-500/30",
];

export const TEMPLATE_CATEGORY_COLORS: Record<string, { bg: string; accent: string; highlight: string }> = {
  dashboard: { bg: "bg-blue-50", accent: "bg-blue-100", highlight: "bg-blue-200" },
  marketing: { bg: "bg-amber-50", accent: "bg-amber-100", highlight: "bg-amber-200" },
  ecommerce: { bg: "bg-emerald-50", accent: "bg-emerald-100", highlight: "bg-emerald-200" },
  blog: { bg: "bg-rose-50", accent: "bg-rose-100", highlight: "bg-rose-200" },
  social: { bg: "bg-brand-50", accent: "bg-brand-100", highlight: "bg-brand-200" },
  productivity: { bg: "bg-cyan-50", accent: "bg-cyan-100", highlight: "bg-cyan-200" },
  portfolio: { bg: "bg-indigo-50", accent: "bg-indigo-100", highlight: "bg-indigo-200" },
};

const STATUS_CLASS_NAMES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  creating: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  published: "dashboard.toolbar.published",
  draft: "dashboard.toolbar.draft",
  creating: "dashboard.status.creating",
  error: "dashboard.toolbar.error",
};

export function getProjectStatusStyle(
  status: string,
  t: RelativeTimeTranslate,
): { label: string; className: string } {
  const className = STATUS_CLASS_NAMES[status] ?? STATUS_CLASS_NAMES.draft!;
  const labelKey = STATUS_LABEL_KEYS[status] ?? STATUS_LABEL_KEYS.draft!;
  return { label: t(labelKey), className };
}

// ─── Helper Functions ───────────────────────────────────────

export type RelativeTimeTranslate = (
  key: string,
  values?: { count?: number },
) => string;

export function getProjectColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % PROJECT_GRADIENTS.length;
}

export function getTemplateCategoryColors(category: string) {
  return TEMPLATE_CATEGORY_COLORS[category] ?? { bg: "bg-gray-50", accent: "bg-gray-100", highlight: "bg-gray-200" };
}

export function formatRelativeTime(
  dateStr: string,
  locale: string,
  t: RelativeTimeTranslate,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffSec < 60) return t("dashboard.time.justNow");
  if (diffMin < 60) return t("dashboard.time.minutesAgo", { count: diffMin });
  if (diffHours < 24) return t("dashboard.time.hoursAgo", { count: diffHours });
  if (diffDays < 7) return t("dashboard.time.daysAgo", { count: diffDays });
  if (diffWeeks < 5) return t("dashboard.time.weeksAgo", { count: diffWeeks });
  return date.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

export function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
