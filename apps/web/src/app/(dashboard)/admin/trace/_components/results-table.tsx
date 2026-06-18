"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export interface TraceRow {
  trace_id: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  workspace_id: string | null;
  user_id: string | null;
  project_id: string | null;
  root_span_name: string | null;
  status: string;
  error_count: number;
  span_count: number;
  services: string[];
}

export function ResultsTable({ traces, loading }: { traces: TraceRow[]; loading: boolean }) {
  const { t } = useTranslation("admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (traces.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        {t("trace.noResults")}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <Th>{t("trace.colStarted")}</Th>
            <Th>{t("trace.colStatus")}</Th>
            <Th>{t("trace.colRootSpan")}</Th>
            <Th>{t("trace.colDuration")}</Th>
            <Th>{t("trace.colSpans")}</Th>
            <Th>{t("trace.colServices")}</Th>
            <Th>{t("trace.colTraceId")}</Th>
          </tr>
        </thead>
        <tbody>
          {traces.map((row) => (
            <tr key={row.trace_id} className="border-b border-border/40 hover:bg-muted/30">
              <Td>
                <Link
                  href={`/admin/trace/${row.trace_id}`}
                  className="text-brand-300 hover:text-brand-200"
                >
                  {new Date(row.started_at).toLocaleString()}
                </Link>
              </Td>
              <Td><StatusBadge status={row.status} errorCount={row.error_count} /></Td>
              <Td className="font-mono text-xs">{row.root_span_name ?? "—"}</Td>
              <Td>{row.duration_ms != null ? `${row.duration_ms}ms` : "—"}</Td>
              <Td>{row.span_count}</Td>
              <Td className="text-xs">{(row.services ?? []).join(", ")}</Td>
              <Td className="font-mono text-[10px] text-muted-foreground">{row.trace_id.slice(0, 12)}…</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function StatusBadge({ status, errorCount }: { status: string; errorCount: number }) {
  const { t } = useTranslation("admin");

  if (status === "error" || errorCount > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
        <AlertCircle className="h-3 w-3" />{" "}
        {errorCount > 1
          ? t("trace.errorsCount", { count: errorCount })
          : t("trace.statusError")}
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/40 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
        <Loader2 className="h-3 w-3 animate-spin" /> {t("trace.statusRunning")}
      </span>
    );
  }
  if (status === "timeout") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
        <Clock className="h-3 w-3" /> {t("trace.statusTimeout")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
      <CheckCircle2 className="h-3 w-3" /> {t("trace.statusOk")}
    </span>
  );
}
