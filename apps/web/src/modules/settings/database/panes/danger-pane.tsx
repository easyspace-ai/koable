"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { SectionCard } from "@/modules/settings/components/project-settings-shared";
import { useTranslations } from "next-intl";
import type { DataTokenState } from "../hooks/use-data-token";
import { dropTable, resetDatabase, type TableSchema } from "../api";

interface DangerPaneProps {
  projectId: string;
  tokenState: DataTokenState;
}

export function DangerPane({ projectId, tokenState }: DangerPaneProps) {
  const t = useTranslations("settings");
  const { client, loading: tokenLoading, error: tokenError } = tokenState;
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const refresh = useCallback(() => {
    if (!client) return;
    setLoading(true);
    client
      .schema()
      .then((s) => { setTables(s.tables); setError(null); })
      .catch((err) => setError(err instanceof Error ? err.message : t("database.failedLoadSchema")))
      .finally(() => setLoading(false));
  }, [client, t]);

  useEffect(() => { refresh(); }, [refresh]);

  function arm(key: string) {
    setConfirmFor(key);
    setConfirmText("");
    setError(null);
  }

  async function doDrop(table: string): Promise<void> {
    setBusy(table);
    setError(null);
    try {
      await dropTable(projectId, table);
      setConfirmFor(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("database.failedDropTable"));
    } finally {
      setBusy(null);
    }
  }

  async function doReset(): Promise<void> {
    setBusy("__reset__");
    setError(null);
    try {
      await resetDatabase(projectId);
      setConfirmFor(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("database.failedResetDatabase"));
    } finally {
      setBusy(null);
    }
  }

  if (tokenLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (tokenError) {
    return (
      <SectionCard title={t("database.dangerTitle")}>
        <p className="text-sm text-destructive">{tokenError}</p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title={t("database.dropTables")} description={t("database.dropTablesDescription")}>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        {tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("database.noTablesToDrop")}</p>
        ) : (
          <ul className="space-y-2">
            {tables.map((tbl) => {
              const key = `drop:${tbl.name}`;
              const arming = confirmFor === key;
              return (
                <li key={tbl.name} className="rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{tbl.name}</span>
                    <span className="text-xs text-muted-foreground">{t("database.rowsCount", { count: tbl.rowCount })}</span>
                    {!arming && (
                      <button
                        onClick={() => arm(key)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("database.drop")}
                      </button>
                    )}
                  </div>
                  {arming && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t("database.typeToConfirm", { name: tbl.name })}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          className="rounded-md border bg-background px-2 py-1 font-mono text-xs"
                        />
                        <button
                          onClick={() => void doDrop(tbl.name)}
                          disabled={confirmText !== tbl.name || busy === tbl.name}
                          className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                        >
                          {busy === tbl.name && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          {t("database.dropTable")}
                        </button>
                        <button onClick={() => setConfirmFor(null)} className="rounded-md border px-3 py-1 text-xs hover:bg-muted">
                          {t("database.cancel")}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={t("database.resetDatabase")} description={t("database.resetDatabaseDescription")}>
        {confirmFor === "reset" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {t("database.typeResetToConfirm")}
            </p>
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="rounded-md border bg-background px-2 py-1 font-mono text-xs"
              />
              <button
                onClick={() => void doReset()}
                disabled={confirmText !== "reset" || busy === "__reset__"}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1 text-xs font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {busy === "__reset__" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("database.resetDatabase")}
              </button>
              <button onClick={() => setConfirmFor(null)} className="rounded-md border px-3 py-1 text-xs hover:bg-muted">
                {t("database.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => arm("reset")}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <AlertTriangle className="h-4 w-4" /> {t("database.resetDatabase")}
          </button>
        )}
      </SectionCard>
    </div>
  );
}
