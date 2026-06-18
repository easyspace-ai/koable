"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, ChevronRight, ChevronDown, ShieldCheck, ShieldAlert } from "lucide-react";
import { SectionCard } from "@/modules/settings/components/project-settings-shared";
import { useTranslations } from "next-intl";
import type { DataTokenState } from "../hooks/use-data-token";
import { enableRls, type SchemaResult, type TableSchema } from "../api";

interface SchemaPaneProps {
  projectId: string;
  tokenState: DataTokenState;
}

const IDENTITY_COLS = ["created_by", "owner_id", "user_id"];
const hasIdentityCol = (t: TableSchema): boolean =>
  t.columns.some((c) => IDENTITY_COLS.includes(c.name));

export function SchemaPane({ projectId, tokenState }: SchemaPaneProps) {
  const t = useTranslations("settings");
  const { client, loading: tokenLoading, error: tokenError } = tokenState;
  const [schema, setSchema] = useState<SchemaResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [rlsBusy, setRlsBusy] = useState<string | null>(null);

  const loadSchema = useCallback(() => {
    if (!client) return;
    setLoading(true);
    client
      .schema()
      .then((s) => {
        setSchema(s);
        setError(null);
        setSelectedName((cur) => cur ?? s.tables[0]?.name ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : t("database.failedLoadSchema")))
      .finally(() => setLoading(false));
  }, [client, t]);

  useEffect(() => { loadSchema(); }, [loadSchema]);

  async function doEnableRls(table: string): Promise<void> {
    setRlsBusy(table);
    setError(null);
    try {
      await enableRls(projectId, table);
      loadSchema();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("database.failedEnableRls"));
    } finally {
      setRlsBusy(null);
    }
  }

  if (tokenLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenError ?? error) {
    return (
      <SectionCard title={t("database.schemaTitle")}>
        <p className="text-sm text-destructive">{tokenError ?? error}</p>
      </SectionCard>
    );
  }

  const tables = schema?.tables ?? [];

  if (tables.length === 0) {
    return (
      <SectionCard title={t("database.schemaTitle")} description={t("database.schemaDescription")}>
        <p className="text-sm text-muted-foreground">{t("database.schemaEmpty")}</p>
      </SectionCard>
    );
  }

  const selected = tables.find((tbl) => tbl.name === selectedName) ?? null;

  return (
    <SectionCard title={t("database.schemaTitle")} description={t("database.schemaDescription")}>
      <div className="flex gap-4">
        <div className="w-52 shrink-0 space-y-1 border-r pr-4">
          {tables.map((tbl) => {
            const open = expandedTables.has(tbl.name);
            return (
              <button
                key={tbl.name}
                onClick={() => {
                  setSelectedName(tbl.name);
                  setExpandedTables((prev) => {
                    const next = new Set(prev);
                    if (open) next.delete(tbl.name); else next.add(tbl.name);
                    return next;
                  });
                }}
                className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  selectedName === tbl.name ? "bg-muted font-medium" : "hover:bg-muted/50"
                }`}
              >
                {open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
                {tbl.rls_enabled
                  ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-500" aria-label={t("database.rlsEnabledAria")} />
                  : <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-label={t("database.rlsOffAria")} />}
                <span className="truncate">{tbl.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{tbl.rowCount}</span>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{selected.name}</h3>
              {selected.rls_enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-600 dark:text-green-400">
                  <ShieldCheck className="h-3 w-3" /> {t("database.rlsEnabledBadge")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-3 w-3" /> {t("database.rlsOffBadge")}
                </span>
              )}
              {!selected.rls_enabled && (
                hasIdentityCol(selected) ? (
                  <button
                    onClick={() => void doEnableRls(selected.name)}
                    disabled={rlsBusy === selected.name}
                    className="inline-flex items-center gap-1.5 rounded-md border border-green-500/40 px-2.5 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-500/10 disabled:opacity-50 dark:text-green-400"
                  >
                    {rlsBusy === selected.name && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <ShieldCheck className="h-3.5 w-3.5" /> {t("database.enableRls")}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {t("database.addIdentityColumnHint")}
                  </span>
                )
              )}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("database.columnsSection")}</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1 text-left font-medium">{t("database.columnName")}</th>
                    <th className="pb-1 text-left font-medium">{t("database.columnType")}</th>
                    <th className="pb-1 text-left font-medium">{t("database.columnFlags")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.columns.map((col) => (
                    <tr key={col.name} className="border-b border-muted/40">
                      <td className="py-1 font-mono">{col.name}</td>
                      <td className="py-1 text-muted-foreground">{col.type}</td>
                      <td className="py-1 space-x-1">
                        {!col.nullable && <span className="rounded bg-muted px-1">{t("database.notNull")}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selected.indexes.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("database.indexesSection", { count: selected.indexes.length })}
                </p>
                <ul className="space-y-0.5">
                  {selected.indexes.map((indexdef) => {
                    const name = indexdef.match(/INDEX (\w+)/i)?.[1] ?? indexdef;
                    const unique = /UNIQUE INDEX/i.test(indexdef);
                    return (
                      <li key={indexdef} className="flex items-center gap-2 text-xs">
                        <span className="font-mono">{name}</span>
                        {unique && <span className="rounded bg-muted px-1 text-muted-foreground">{t("database.unique")}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("database.policiesSection", { count: selected.policies.length })}
              </p>
              {selected.policies.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {selected.rls_enabled ? t("database.noPoliciesRlsOn") : t("database.noPoliciesRlsOff")}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {selected.policies.map((pol) => (
                    <li key={pol.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      <span className="font-mono">{pol.name}</span>
                      <span className="text-muted-foreground">{pol.command}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
