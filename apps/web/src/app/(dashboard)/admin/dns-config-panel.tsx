"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, CheckCircle2, AlertCircle, Sparkles, Trash2, KeyRound, ChevronDown, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

interface CfTokenStatus {
  source: "platform_settings" | "env" | "none";
  tokenSuffix: string;
  hasSslScope: boolean;
  decryptFailed: boolean;
}

type DnsMode = "per_publish" | "wildcard";

interface DnsModeResponse {
  mode: DnsMode;
  defaulted: boolean;
}

type DnsReason =
  | "ok"
  | "no-cf-creds"
  | "no-tunnel-id"
  | "no-publish-domain"
  | "free-plan-multilevel"
  | "zone-lookup-failed";

interface ZoneWildcard {
  hostname: string;
  target: string;
  proxied: boolean;
  modifiedOn: string;
}

interface DnsDiagnostics {
  zoneName: string;
  plan: string;
  acmStatus: "enabled" | "absent" | "undetectable";
  hasAcm: boolean;
  publishDomain: string;
  domainDepth: number;
  recommendedWildcard: string;
  /** Hostname the operator actually persisted via re-verify (e.g.
   * "*.dev.doable.me"). Null when nothing's been persisted — the panel
   * then falls back to recommendedWildcard for pre-fill. */
  configuredWildcard: string | null;
  existingWildcard: { hostname: string; target: string } | null;
  allWildcards: ZoneWildcard[];
  canAutoSetup: boolean;
  reason: DnsReason;
  message: string;
}

interface AutoWildcardResponse {
  mode: "wildcard";
  wildcardHostname: string;
  target: string;
  created: boolean;
  updated: boolean;
  acmOverrideApplied?: boolean;
  diagnostics: DnsDiagnostics;
}

function planLabel(plan: string, t: (key: string) => string): string {
  switch (plan) {
    case "free": return t("dns.planFree");
    case "pro": return t("dns.planPro");
    case "business": return t("dns.planBusiness");
    case "enterprise": return t("dns.planEnterprise");
    default: return t("dns.planUnknown");
  }
}

function validateWildcard(
  hostname: string,
  zoneName: string,
  t: (key: string, values?: Record<string, string>) => string,
): string | null {
  if (!hostname) return t("dns.hostnameRequired");
  if (!hostname.startsWith("*.")) return t("dns.hostnameMustStart");
  if (!/^\*\.[a-z0-9.-]+$/.test(hostname)) {
    return t("dns.hostnameFormat");
  }
  if (!zoneName) return null;
  const bare = hostname.slice(2);
  if (bare !== zoneName && !bare.endsWith(`.${zoneName}`)) {
    return t("dns.hostnameInZone", { zone: zoneName });
  }
  return null;
}

export function DnsConfigPanel() {
  const { t } = useTranslation("admin");
  const [mode, setMode] = useState<DnsMode>("per_publish");
  const [defaulted, setDefaulted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const [diagnostics, setDiagnostics] = useState<DnsDiagnostics | null>(null);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);
  const [autoSetupRunning, setAutoSetupRunning] = useState(false);
  const [autoSetupResult, setAutoSetupResult] = useState<AutoWildcardResponse | null>(null);

  // Custom-wildcard inputs (US-002).
  const [wildcardHostname, setWildcardHostname] = useState<string>("");
  const [acmOverride, setAcmOverride] = useState<boolean>(false);

  // Per-row delete state (R3 US-003). null = no row in confirm mode.
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Optional CF token override (R5).
  const [cfTokenStatus, setCfTokenStatus] = useState<CfTokenStatus | null>(null);
  const [tokenSectionOpen, setTokenSectionOpen] = useState(false);
  const [pastedToken, setPastedToken] = useState("");
  const [tokenSaving, setTokenSaving] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [modeRes, diagRes, tokenRes] = await Promise.allSettled([
          apiFetch<DnsModeResponse>("/admin/dns-mode"),
          apiFetch<DnsDiagnostics>("/admin/dns-mode/diagnostics"),
          apiFetch<CfTokenStatus>("/admin/dns-mode/cf-token"),
        ]);
        if (cancelled) return;
        if (modeRes.status === "fulfilled") {
          setMode(modeRes.value.mode);
          setDefaulted(modeRes.value.defaulted);
        } else {
          setError(modeRes.reason instanceof Error ? modeRes.reason.message : t("dns.loadFailed"));
        }
        if (diagRes.status === "fulfilled") {
          setDiagnostics(diagRes.value);
          setWildcardHostname(
            diagRes.value.configuredWildcard ?? diagRes.value.recommendedWildcard,
          );
        } else {
          setDiagnosticsError(diagRes.reason instanceof Error ? diagRes.reason.message : t("dns.diagnosticsRefreshFailed"));
        }
        if (tokenRes.status === "fulfilled") {
          setCfTokenStatus(tokenRes.value);
          // Auto-expand the section when the stored ciphertext can't be
          // decrypted — operator needs to re-paste or remove the stale row.
          if (tokenRes.value.decryptFailed) setTokenSectionOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function refreshTokenStatus() {
    try {
      const fresh = await apiFetch<CfTokenStatus>("/admin/dns-mode/cf-token");
      setCfTokenStatus(fresh);
      if (fresh.decryptFailed) setTokenSectionOpen(true);
    } catch {
      // non-fatal — leave whatever's there
    }
  }

  async function saveCfToken() {
    const trimmed = pastedToken.trim();
    if (!trimmed) return;
    setTokenSaving(true);
    setTokenError(null);
    try {
      await apiFetch("/admin/dns-mode/cf-token", {
        method: "POST",
        body: JSON.stringify({ token: trimmed }),
      });
      setPastedToken("");
      await Promise.all([refreshTokenStatus(), refreshDiagnostics()]);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : t("dns.saveTokenFailed"));
    } finally {
      setTokenSaving(false);
    }
  }

  async function removeCfToken() {
    setTokenSaving(true);
    setTokenError(null);
    try {
      await apiFetch("/admin/dns-mode/cf-token", { method: "DELETE" });
      await Promise.all([refreshTokenStatus(), refreshDiagnostics()]);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : t("dns.removeTokenFailed"));
    } finally {
      setTokenSaving(false);
    }
  }

  const hostnameError = diagnostics
    ? validateWildcard(wildcardHostname, diagnostics.zoneName, t)
    : null;

  // The button is enabled when:
  //   - diagnostics says we can auto-setup as-is, OR
  //   - the only blocker is free-plan-multilevel AND the operator ticked
  //     the ACM override (server applies the same logic), AND
  //   - the hostname passes client-side validation.
  const buttonEnabled = (() => {
    if (!diagnostics) return false;
    if (autoSetupRunning || saving) return false;
    if (hostnameError) return false;
    if (diagnostics.canAutoSetup) return true;
    if (diagnostics.reason === "free-plan-multilevel" && acmOverride) return true;
    return false;
  })();

  async function changeMode(next: DnsMode) {
    if (next === mode) return;
    setSaving(true);
    setError(null);
    const previous = mode;
    setMode(next);
    try {
      await apiFetch("/admin/dns-mode", {
        method: "PUT",
        body: JSON.stringify({ mode: next }),
      });
      setDefaulted(false);
      setSavedAt(Date.now());
    } catch (err) {
      setMode(previous);
      setError(err instanceof Error ? err.message : t("dns.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function refreshDiagnostics() {
    try {
      const fresh = await apiFetch<DnsDiagnostics>("/admin/dns-mode/diagnostics");
      setDiagnostics(fresh);
    } catch (err) {
      setDiagnosticsError(err instanceof Error ? err.message : t("dns.diagnosticsRefreshFailed"));
    }
  }

  async function runAutoWildcard() {
    if (!buttonEnabled) return;
    setAutoSetupRunning(true);
    setError(null);
    setAutoSetupResult(null);
    try {
      const body: { wildcardHostname?: string; acmOverride?: boolean } = {};
      if (wildcardHostname) body.wildcardHostname = wildcardHostname;
      if (acmOverride) body.acmOverride = true;

      const res = await apiFetch<AutoWildcardResponse>("/admin/dns-mode/auto-wildcard", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setAutoSetupResult(res);
      setMode("wildcard");
      setDefaulted(false);
      setSavedAt(Date.now());
      // Refresh from server so allWildcards reflects the freshly-created record
      // (the snapshot in res.diagnostics was taken BEFORE the CNAME was made).
      await refreshDiagnostics();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dns.autoConfigureFailed"));
    } finally {
      setAutoSetupRunning(false);
    }
  }

  async function deleteWildcard(hostname: string) {
    setDeleting(hostname);
    setError(null);
    try {
      await apiFetch("/admin/dns-mode/wildcard", {
        method: "DELETE",
        body: JSON.stringify({ hostname }),
      });
      await refreshDiagnostics();
      setConfirmingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("dns.deleteFailed", { hostname }));
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const zoneName = diagnostics?.zoneName || "<zone>";
  const isFreePlanMultilevel = diagnostics?.reason === "free-plan-multilevel";

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Globe className="h-4 w-4 text-blue-400" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{t("dns.title")}</h3>
          <p className="text-[11px] text-muted-foreground">
            {t("dns.subtitle")}
          </p>
        </div>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {savedAt && !saving && !error && (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" /> {t("dns.saved")}
          </span>
        )}
      </div>

      {diagnostics && (
        <div className="border-b border-border bg-secondary/40 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">{t("dns.zone")}</span>
            <code className="font-mono text-foreground">{diagnostics.zoneName || "—"}</code>
            <span className="rounded bg-secondary px-1.5 py-0.5 text-foreground/80">{planLabel(diagnostics.plan, t)}</span>
            <span
              className={`rounded px-1.5 py-0.5 ${
                diagnostics.acmStatus === "enabled"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : diagnostics.acmStatus === "absent"
                    ? "bg-secondary text-muted-foreground"
                    : "bg-amber-500/10 text-amber-400"
              }`}
              title={
                diagnostics.acmStatus === "undetectable"
                  ? t("dns.acmUndetectableTitle")
                  : undefined
              }
            >
              {diagnostics.acmStatus === "enabled"
                ? t("dns.acmEnabled")
                : diagnostics.acmStatus === "absent"
                  ? t("dns.noAcm")
                  : t("dns.acmUnknown")}
            </span>
            <span className="text-muted-foreground">{t("dns.publishDomain")}</span>
            <code className="font-mono text-foreground">{diagnostics.publishDomain || "—"}</code>
            {diagnostics.existingWildcard && (
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <code className="font-mono">{diagnostics.existingWildcard.hostname}</code>
                {" → "}
                <code className="font-mono">{diagnostics.existingWildcard.target}</code>
              </span>
            )}
          </div>
        </div>
      )}

      {diagnosticsError && (
        <div className="border-b border-border px-4 py-2.5 text-[11px] text-amber-400">
          {t("dns.diagnosticsFailed", { error: diagnosticsError })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 py-4">
        <button
          onClick={() => changeMode("per_publish")}
          disabled={saving || autoSetupRunning}
          className={`text-left rounded-lg border p-3 transition-colors ${
            mode === "per_publish"
              ? "border-blue-500 bg-blue-500/5"
              : "border-border bg-secondary hover:border-border/80"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <input type="radio" checked={mode === "per_publish"} readOnly className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-medium text-foreground">{t("dns.perPublishTitle")}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{t("dns.defaultBadge")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("dns.perPublishDesc", { zone: zoneName })}
          </p>
        </button>

        <div
          className={`text-left rounded-lg border p-3 transition-colors ${
            mode === "wildcard"
              ? "border-blue-500 bg-blue-500/5"
              : "border-border bg-secondary"
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <input type="radio" checked={mode === "wildcard"} readOnly className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-sm font-medium text-foreground">{t("dns.wildcardTitle")}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
            {t("dns.wildcardDesc")}
          </p>

          <ul className="mb-2 space-y-1 text-[11px] text-muted-foreground leading-relaxed">
            <li>
              <span className="text-foreground">{t("dns.freeApex")}</span>{" "}
              <code className="font-mono">*.{zoneName}</code> {t("dns.freeApexDetail")}
            </li>
            <li>
              <span className="text-foreground">{t("dns.freeMultilevel")}</span>{" "}
              <code className="font-mono">*.&lt;sub&gt;.{zoneName}</code> {t("dns.freeMultilevelDetail")}
            </li>
            <li>
              <span className="text-foreground">{t("dns.paidAcm")}</span>{" "}
              {t("dns.paidAcmDetail", { zone: zoneName })}
            </li>
          </ul>

          <label className="block mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t("dns.wildcardHostname")}</label>
          <input
            type="text"
            value={wildcardHostname}
            onChange={(e) => setWildcardHostname(e.target.value.toLowerCase().trim())}
            placeholder={`*.${zoneName}`}
            disabled={autoSetupRunning}
            className="mb-1 w-full rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          {hostnameError && (
            <p className="mb-1 text-[10px] text-amber-400">{hostnameError}</p>
          )}

          {isFreePlanMultilevel && (
            <label className="mb-2 flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <input
                type="checkbox"
                checked={acmOverride}
                onChange={(e) => setAcmOverride(e.target.checked)}
                disabled={autoSetupRunning}
                className="mt-0.5 h-3.5 w-3.5"
              />
              <span>
                {t("dns.acmOverrideLabel")}
              </span>
            </label>
          )}

          <button
            type="button"
            onClick={runAutoWildcard}
            disabled={!buttonEnabled}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-500 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary disabled:text-muted-foreground"
          >
            {autoSetupRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {autoSetupRunning
              ? t("dns.configuring")
              : mode === "wildcard" && diagnostics?.existingWildcard
                ? t("dns.reverVerify")
                : t("dns.autoConfigure")}
          </button>

          {diagnostics && !diagnostics.canAutoSetup && !(isFreePlanMultilevel && acmOverride) && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>{diagnostics.message}</span>
            </p>
          )}
          {autoSetupResult && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>
                {autoSetupResult.created ? t("dns.created") : autoSetupResult.updated ? t("dns.updated") : t("dns.confirmed")}
                {" "}<code className="font-mono">{autoSetupResult.wildcardHostname}</code> → <code className="font-mono">{autoSetupResult.target}</code>
                {autoSetupResult.acmOverrideApplied && t("dns.acmOverrideApplied")}
              </span>
            </p>
          )}
        </div>
      </div>

      {mode === "wildcard" && diagnostics && diagnostics.allWildcards.length === 0 && (
        <div className="border-t border-border bg-amber-500/10 px-4 py-2.5">
          <p className="flex items-start gap-1.5 text-[11px] text-amber-400 leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
            <span>
              {t("dns.noWildcardWarning")}
            </span>
          </p>
        </div>
      )}

      {diagnostics && diagnostics.allWildcards.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("dns.existingWildcards", { zone: diagnostics.zoneName || "this zone" })}
          </h4>
          <ul className="space-y-1.5">
            {diagnostics.allWildcards.map((w) => {
              const isConfirming = confirmingDelete === w.hostname;
              const isDeleting = deleting === w.hostname;
              return (
                <li
                  key={w.hostname}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-secondary/30 px-2.5 py-1.5 text-[11px]"
                >
                  <code className="font-mono text-foreground">{w.hostname}</code>
                  <span className="text-muted-foreground">→</span>
                  <code className="font-mono text-muted-foreground">{w.target}</code>
                  <span className="text-[10px] text-muted-foreground">{w.modifiedOn.slice(0, 10)}</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    {isConfirming ? (
                      <>
                        <span className="text-amber-400">{t("dns.deleteConfirm", { hostname: w.hostname })}</span>
                        <button
                          type="button"
                          onClick={() => deleteWildcard(w.hostname)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1 rounded-md border border-red-500 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-300 hover:bg-red-500/20 disabled:cursor-not-allowed"
                        >
                          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          {t("dns.confirm")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(null)}
                          disabled={isDeleting}
                          className="inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-secondary/70 disabled:cursor-not-allowed"
                        >
                          {t("common.cancel")}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(w.hostname)}
                        disabled={deleting !== null}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("dns.delete")}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => setTokenSectionOpen((v) => !v)}
          className="flex w-full items-center gap-2 text-left text-[11px] text-muted-foreground hover:text-foreground"
        >
          {tokenSectionOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <KeyRound className="h-3.5 w-3.5" />
          <span className="font-medium">{t("dns.cfTokenOptional")}</span>
          <span className="ml-2 text-muted-foreground">
            {cfTokenStatus?.source === "platform_settings"
              ? t("dns.usingCustomToken", { suffix: cfTokenStatus.tokenSuffix })
              : cfTokenStatus?.source === "env"
                ? t("dns.usingCertToken", { suffix: cfTokenStatus.tokenSuffix })
                : t("dns.noCfToken")}
          </span>
          {cfTokenStatus?.hasSslScope && (
            <span className="ml-auto inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t("dns.acmScopeOk")}
            </span>
          )}
        </button>

        {tokenSectionOpen && (
          <div className="mt-2 space-y-2">
            {cfTokenStatus?.decryptFailed && (
              <p className="flex items-start gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-400 leading-relaxed">
                <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                <span>
                  {t("dns.kekMismatch")}
                </span>
              </p>
            )}
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("dns.tokenOptionalHint")}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-300 underline hover:text-blue-200"
              >
                {t("dns.openCfTokens")}
              </a>
              {" "}{t("dns.tokenPermissionsHint")}
            </p>
            <ul className="ml-4 list-disc text-[11px] text-muted-foreground leading-relaxed">
              <li>{t("dns.permDnsEdit")}</li>
              <li>{t("dns.permZoneRead")}</li>
              <li>{t("dns.permSslRead")}</li>
            </ul>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("dns.scopeHint", { zone: zoneName })}
            </p>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={pastedToken}
                onChange={(e) => setPastedToken(e.target.value)}
                placeholder={t("dns.pasteToken")}
                disabled={tokenSaving}
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] text-foreground focus:border-blue-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={saveCfToken}
                disabled={!pastedToken.trim() || tokenSaving}
                className="inline-flex items-center gap-1 rounded-md border border-blue-500 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:border-border disabled:bg-secondary disabled:text-muted-foreground"
              >
                {tokenSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                {t("dns.verifySave")}
              </button>
              {(cfTokenStatus?.source === "platform_settings" || cfTokenStatus?.decryptFailed) && (
                <button
                  type="button"
                  onClick={removeCfToken}
                  disabled={tokenSaving}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed"
                >
                  {t("dns.removeOverride")}
                </button>
              )}
            </div>
            {tokenError && (
              <p className="flex items-start gap-1.5 text-[11px] text-red-400">
                <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
                <span>{tokenError}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {diagnostics && (
        <div className="border-t border-border bg-secondary/30 px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {t("dns.headsUp", { zone: zoneName })}
          </p>
        </div>
      )}

      {(defaulted || error) && (
        <div className="border-t border-border px-4 py-2.5">
          {defaulted && !error && !autoSetupResult && (
            <p className="text-[11px] text-muted-foreground">
              {t("dns.noSettingYet")}
            </p>
          )}
          {error && (
            <p className="flex items-start gap-1.5 text-[11px] text-red-400">
              <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />
              <span>
                {error}
                {error.includes("migration 081") && (
                  <>{t("dns.migrationHint")}</>
                )}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
