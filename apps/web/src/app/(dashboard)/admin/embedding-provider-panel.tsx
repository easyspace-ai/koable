"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Check, AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

/**
 * Platform-default embedding provider panel.
 *
 * The Doable admin configures this once (during /setup or here). All
 * workspaces inherit it silently. End users never see this — they just
 * ask the AI to build a chatbot and the runtime picks the embedding
 * provider via resolveEmbeddingEngine() which walks
 * project_ai_settings → workspace_ai_settings → these platform defaults.
 */

interface Status {
  provider: string | null;
  baseUrl: string | null;
  model: string | null;
  configured: boolean;
  apiKeyMasked: string | null;
}

type PresetId = "openai" | "gemini" | "custom";

interface Preset {
  id: PresetId;
  nameKey: string;
  descriptionKey: string;
  defaultBaseUrl: string;
  defaultModel: string;
  apiKeyHelp?: string;
}

const PRESETS: readonly Preset[] = [
  {
    id: "openai",
    nameKey: "embedding.presets.openai.name",
    descriptionKey: "embedding.presets.openai.description",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModel: "text-embedding-3-small",
    apiKeyHelp: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    nameKey: "embedding.presets.gemini.name",
    descriptionKey: "embedding.presets.gemini.description",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-embedding-001",
    apiKeyHelp: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "custom",
    nameKey: "embedding.presets.custom.name",
    descriptionKey: "embedding.presets.custom.description",
    defaultBaseUrl: "",
    defaultModel: "",
  },
];

export function EmbeddingProviderPanel() {
  const { t } = useTranslation("admin");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Preset | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dims, setDims] = useState<number | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: Status }>("/admin/embedding-provider");
      setStatus(res.data);
      if (res.data.configured) {
        const tile = PRESETS.find((p) =>
          res.data.baseUrl ? p.defaultBaseUrl === res.data.baseUrl : false,
        );
        if (tile) {
          setSelected(tile);
          setBaseUrl(res.data.baseUrl ?? tile.defaultBaseUrl);
          setModel(res.data.model ?? tile.defaultModel);
        } else {
          setSelected(PRESETS[2]!);
          setBaseUrl(res.data.baseUrl ?? "");
          setModel(res.data.model ?? "");
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("embedding.loadFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectPreset(p: Preset) {
    setSelected(p);
    setBaseUrl(p.defaultBaseUrl);
    setModel(p.defaultModel);
    setSaveState("idle");
    setErrorMsg(null);
  }

  async function handleSave() {
    if (!selected) return;
    if (!apiKey.trim() || !baseUrl.trim() || !model.trim()) {
      setSaveState("error");
      setErrorMsg(t("embedding.validation.required"));
      return;
    }
    setSaveState("saving");
    setErrorMsg(null);
    try {
      const res = await apiFetch<{ ok: true; dimensions: number }>(
        "/admin/embedding-provider",
        {
          method: "PUT",
          body: JSON.stringify({
            provider: selected.id,
            baseUrl: baseUrl.trim(),
            model: model.trim(),
            apiKey: apiKey.trim(),
          }),
        },
      );
      setSaveState("saved");
      setDims(res.dimensions);
      setApiKey("");
      await loadStatus();
    } catch (err) {
      setSaveState("error");
      setErrorMsg(err instanceof Error ? err.message : t("embedding.saveFailed"));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/20 shrink-0">
            <Sparkles className="h-5 w-5 text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("embedding.title")}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t("embedding.description")}
            </p>
            {status?.configured ? (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="text-green-500 font-medium">{t("embedding.status.configured")}</span>
                <span className="text-muted-foreground">
                  · {status.model} · {status.baseUrl}
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                <span className="text-yellow-500">
                  {t("embedding.status.notConfigured")}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">{t("embedding.pickProvider")}</h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                className={`flex flex-col gap-1 rounded-md border p-3 text-left transition-all ${
                  selected?.id === p.id
                    ? "border-brand-500 bg-brand-600/10"
                    : "border-border bg-background hover:border-brand-500/40"
                }`}
              >
                <p className="text-sm font-medium text-foreground">{t(p.nameKey)}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{t(p.descriptionKey)}</p>
              </button>
            ))}
          </div>
        </div>

        {selected && (
          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <label className="text-xs font-medium text-foreground">{t("embedding.fields.baseUrl")}</label>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={selected.defaultBaseUrl || t("embedding.fields.baseUrlPlaceholder")}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-foreground">{t("embedding.fields.apiKey")}</label>
                {selected.apiKeyHelp && (
                  <a
                    href={selected.apiKeyHelp}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2"
                  >
                    {t("embedding.fields.getKey")}
                  </a>
                )}
              </div>
              <div className="relative mt-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={status?.configured ? t("embedding.fields.apiKeyPlaceholderKeep") : t("embedding.fields.apiKeyPlaceholderPaste")}
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-9 w-full rounded-md border border-input bg-background pr-9 pl-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">{t("embedding.fields.model")}</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={selected.defaultModel || t("embedding.fields.modelPlaceholder")}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="text-xs">
                {saveState === "error" && errorMsg && (
                  <span className="text-red-400">{errorMsg}</span>
                )}
                {saveState === "saved" && (
                  <span className="text-green-500">
                    {dims ? t("embedding.savedWithDims", { dims }) : t("common.save")}
                  </span>
                )}
                {saveState === "idle" && (
                  <span className="text-muted-foreground">
                    {t("embedding.saveHint")}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveState === "saving" || !apiKey.trim() || !baseUrl.trim() || !model.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveState === "saving" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                {status?.configured ? t("embedding.actions.update") : t("common.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
