"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useDataToken } from "./hooks/use-data-token";
import { OverviewPane } from "./panes/overview-pane";
import { SchemaPane } from "./panes/schema-pane";
import { RowsPane } from "./panes/rows-pane";
import { QueriesPane } from "./panes/queries-pane";
import { MigrationsPane } from "./panes/migrations-pane";
import { DangerPane } from "./panes/danger-pane";
import { useTranslation } from "@/lib/i18n";

type Pane = "overview" | "schema" | "rows" | "queries" | "migrations" | "danger";

const PANE_IDS: Pane[] = ["overview", "schema", "rows", "queries", "migrations", "danger"];
const PANE_LABEL_KEYS: Record<Pane, string> = {
  overview: "settings.database.overview",
  schema: "settings.database.schema",
  rows: "settings.database.rows",
  queries: "settings.database.queries",
  migrations: "settings.database.migrations",
  danger: "settings.database.dangerZone",
};

interface DatabaseTabProps {
  projectId: string;
}

export function DatabaseTab({ projectId }: DatabaseTabProps) {
  const { t } = useTranslation("editor");
  const [activePane, setActivePane] = useState<Pane>(() => {
    if (typeof window === "undefined") return "overview";
    const p = new URLSearchParams(window.location.search).get("pane") as Pane | null;
    return PANE_IDS.includes(p as Pane) ? (p as Pane) : "overview";
  });

  const tokenState = useDataToken(projectId);

  function navigate(pane: string) {
    const valid = PANE_IDS.includes(pane as Pane);
    if (!valid) return;
    setActivePane(pane as Pane);
    // Update URL without pushing history
    const url = new URL(window.location.href);
    url.searchParams.set("pane", pane);
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="space-y-4">
      {/* Sub-pane navigation */}
      <nav
        role="tablist"
        aria-label={t("settings.database.navLabel")}
        className="flex gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1"
      >
        {PANE_IDS.map((paneId) => (
          <button
            key={paneId}
            role="tab"
            aria-selected={activePane === paneId}
            onClick={() => navigate(paneId)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              activePane === paneId
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(PANE_LABEL_KEYS[paneId])}
          </button>
        ))}
      </nav>

      {/* Pane content */}
      <div role="tabpanel">
        {activePane === "overview" && (
          <OverviewPane projectId={projectId} tokenState={tokenState} onNavigate={navigate} />
        )}
        {activePane === "schema" && <SchemaPane projectId={projectId} tokenState={tokenState} />}
        {activePane === "rows" && <RowsPane tokenState={tokenState} />}
        {activePane === "queries" && <QueriesPane tokenState={tokenState} />}
        {activePane === "migrations" && <MigrationsPane projectId={projectId} />}
        {activePane === "danger" && <DangerPane projectId={projectId} tokenState={tokenState} />}
      </div>
    </div>
  );
}
