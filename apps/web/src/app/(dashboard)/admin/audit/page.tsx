"use client";

/**
 * /admin/audit — Enterprise prompt & conversation audit.
 *
 * Search every AI conversation across the platform with full prompt/response
 * text, click into a session for the full transcript, and review the trail
 * of admin actions. Every read here is itself recorded in `admin_audit_log`.
 */
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Search,
  ShieldCheck,
  X,
  MessageSquare,
  History,
  BarChart3,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { usePlatformAdmin } from "@/hooks/use-platform-admin";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ConversationRow = {
  session_id: string;
  project_id: string;
  project_name: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  user_id: string;
  user_email: string | null;
  user_display_name: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at: string | null;
  last_user_excerpt: string | null;
  last_assistant_excerpt: string | null;
};

type AuditStats = {
  total_sessions: number;
  total_messages: number;
  total_users: number;
  messages_24h: number;
  messages_7d: number;
  sessions_24h: number;
};

function AdminAuditPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation("admin");
  const { isPlatformAdmin, loading: adminLoading } = usePlatformAdmin();

  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const queryString = params.toString();

  useEffect(() => {
    if (!isPlatformAdmin) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setErrorStatus(null);
      try {
        const [list, statsRes] = await Promise.all([
          apiFetch<{ conversations: ConversationRow[] }>(
            queryString
              ? `/admin/audit/conversations?${queryString}`
              : "/admin/audit/conversations",
          ),
          apiFetch<AuditStats>("/admin/audit/stats"),
        ]);
        if (!cancelled) {
          setConversations(list.conversations);
          setStats(statsRes);
        }
      } catch (e) {
        if (!cancelled) {
          const status =
            e && typeof e === "object" && "status" in e && typeof (e as { status?: unknown }).status === "number"
              ? ((e as { status: number }).status)
              : null;
          setErrorStatus(status);
          setError(e instanceof Error ? e.message : t("audit.loadFailed"));
          setConversations([]);
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [isPlatformAdmin, queryString, reloadTick, t]);

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <ShieldCheck className="h-12 w-12" />
        <p className="font-medium text-foreground">{t("page.accessRequired")}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          <ArrowLeft className="mr-2 h-3.5 w-3.5" /> {t("page.backToDashboard")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("trace.adminBreadcrumb")}
          </Link>
        </div>
        <div className="mb-1 flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessageSquare className="h-6 w-6 text-brand-400" />
            {t("audit.title")}
          </h1>
          <Link
            href="/admin/audit/actions"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
            title={t("audit.adminActionLogTitle")}
          >
            <History className="h-3.5 w-3.5 text-brand-400" />
            {t("audit.adminActionLog")}
          </Link>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("audit.description")}
        </p>

        <StatsRow stats={stats} />

        <div className="mb-6">
          <SearchForm />
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-medium text-red-300">
                  {errorStatus === 404
                    ? t("audit.notEnabled")
                    : errorStatus
                    ? t("audit.unavailable", { status: errorStatus })
                    : t("audit.couldNotLoad")}
                </div>
                <div className="mt-0.5 text-xs text-red-400/80">{error}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadTick((tick) => tick + 1)}
              >
                {t("audit.retry")}
              </Button>
            </div>
          </div>
        )}

        <ConversationTable rows={conversations} loading={loading && !error} />
      </div>
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={null}>
      <AdminAuditPageInner />
    </Suspense>
  );
}

function StatsRow({ stats }: { stats: AuditStats | null }) {
  const { t } = useTranslation("admin");
  const items = useMemo(
    () => [
      {
        label: t("audit.statsSessions"),
        value: stats?.total_sessions,
        sub: t("audit.statsSessionsSub", { count: stats?.sessions_24h ?? 0 }),
      },
      {
        label: t("audit.statsMessages"),
        value: stats?.total_messages,
        sub: t("audit.statsMessagesSub", { count: stats?.messages_24h ?? 0 }),
      },
      {
        label: t("audit.statsMessages7d"),
        value: stats?.messages_7d,
        sub: t("audit.statsMessages7dSub"),
      },
      {
        label: t("audit.statsDistinctUsers"),
        value: stats?.total_users,
        sub: t("audit.statsDistinctUsersSub"),
      },
    ],
    [stats, t],
  );
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            <BarChart3 className="h-3 w-3" /> {it.label}
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {it.value ?? "—"}
          </div>
          <div className="text-xs text-muted-foreground">{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useTranslation("admin");
  const [userId, setUserId] = useState(params.get("user_id") ?? "");
  const [workspaceId, setWorkspaceId] = useState(params.get("workspace_id") ?? "");
  const [projectId, setProjectId] = useState(params.get("project_id") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");
  const [q, setQ] = useState(params.get("q") ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams();
    if (userId) next.set("user_id", userId);
    if (workspaceId) next.set("workspace_id", workspaceId);
    if (projectId) next.set("project_id", projectId);
    if (from) next.set("from", new Date(from).toISOString());
    if (to) next.set("to", new Date(to).toISOString());
    if (q) next.set("q", q);
    router.push(`/admin/audit?${next.toString()}`);
  }
  function clear() {
    setUserId(""); setWorkspaceId(""); setProjectId("");
    setFrom(""); setTo(""); setQ("");
    router.push("/admin/audit");
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label={t("audit.searchUserId")}>
          <Input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t("trace.placeholderUuid")}
          />
        </Field>
        <Field label={t("audit.searchWorkspaceId")}>
          <Input
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            placeholder={t("trace.placeholderUuid")}
          />
        </Field>
        <Field label={t("audit.searchProjectId")}>
          <Input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder={t("trace.placeholderUuid")}
          />
        </Field>
        <Field label={t("audit.searchFrom")}>
          <Input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("audit.searchTo")}>
          <Input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t("audit.messageContains")}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("audit.messagePlaceholder")}
          />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="submit" size="sm">
          <Search className="mr-1.5 h-3.5 w-3.5" /> {t("audit.search")}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clear}>
          <X className="mr-1.5 h-3.5 w-3.5" /> {t("audit.reset")}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ConversationTable({ rows, loading }: { rows: ConversationRow[]; loading: boolean }) {
  const { t } = useTranslation("admin");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {t("audit.noResults")}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("audit.colWhen")}</th>
            <th className="px-3 py-2">{t("audit.colUser")}</th>
            <th className="px-3 py-2">{t("audit.colWorkspaceProject")}</th>
            <th className="px-3 py-2">{t("audit.colMessages")}</th>
            <th className="px-3 py-2">{t("audit.colLastExcerpt")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.session_id} className="hover:bg-muted/30">
              <td className="px-3 py-2 align-top whitespace-nowrap">
                <Link
                  href={`/admin/audit/${r.session_id}`}
                  className="text-brand-400 hover:underline"
                >
                  {formatDate(r.last_message_at ?? r.updated_at)}
                </Link>
              </td>
              <td className="px-3 py-2 align-top">
                <div className="font-medium text-foreground">
                  {r.user_display_name || r.user_email || r.user_id.slice(0, 8)}
                </div>
                {r.user_email && (
                  <div className="text-xs text-muted-foreground">{r.user_email}</div>
                )}
              </td>
              <td className="px-3 py-2 align-top">
                <div className="text-foreground">{r.workspace_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{r.project_name ?? "—"}</div>
              </td>
              <td className="px-3 py-2 align-top whitespace-nowrap">{r.message_count}</td>
              <td className="px-3 py-2 align-top max-w-md">
                {r.last_user_excerpt && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    <span className="font-medium text-foreground/80">{t("audit.userPrefix")}</span>{" "}
                    {r.last_user_excerpt}
                  </div>
                )}
                {r.last_assistant_excerpt && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    <span className="font-medium text-foreground/80">{t("audit.assistantPrefix")}</span>{" "}
                    {r.last_assistant_excerpt}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
