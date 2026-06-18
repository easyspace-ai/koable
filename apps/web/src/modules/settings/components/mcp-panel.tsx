"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Wrench,
  Globe,
  Terminal,
  Radio,
  Power,
  PowerOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useMcpConnectors,
  type McpConnector,
  type McpTool,
  type CreateConnectorPayload,
} from "../hooks/use-mcp-connectors";
import { ConnectorCard } from "./mcp-connector-card";
import { AddServerForm } from "./mcp-add-server-form";

// ─── Types ──────────────────────────────────────────────────

interface McpPanelProps {
  workspaceId: string;
}

// ─── Main Panel ─────────────────────────────────────────────

export function McpPanel({ workspaceId }: McpPanelProps) {
  const t = useTranslations("settings");
  const {
    connectors,
    loading,
    error,
    refresh,
    createConnector,
    updateConnector,
    deleteConnector,
    testConnector,
    discoverServer,
    startOAuth,
  } = useMcpConnectors(workspaceId);

  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreated = useCallback(
    async (payload: CreateConnectorPayload) => {
      await createConnector(payload);
      setShowForm(false);
    },
    [createConnector],
  );

  const activeCount = connectors.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("mcp.panel.title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("mcp.panel.description")}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => void refresh()}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title={t("mcp.panel.refreshTitle")}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("mcp.panel.addServer")}
          </button>
        </div>
      </div>

      {/* Stats */}
      {connectors.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t("mcp.panel.stats.configured", { count: connectors.length })}</span>
          <span className="text-muted-foreground/40">&middot;</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("mcp.panel.stats.active", { count: activeCount })}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <AddServerForm
          onSubmit={handleCreated}
          onCancel={() => setShowForm(false)}
          onDiscover={discoverServer}
          onStartOAuth={startOAuth}
          onOAuthComplete={refresh}
        />
      )}

      {/* Loading */}
      {loading && connectors.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("mcp.panel.loading")}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && connectors.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Terminal className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t("mcp.panel.empty.title")}</p>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            {t("mcp.panel.empty.description")}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("mcp.panel.empty.addFirst")}
          </button>
        </div>
      )}

      {/* Connector list */}
      {connectors.length > 0 && (
        <div className="space-y-2">
          {connectors.map((connector) => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              expanded={expandedId === connector.id}
              onToggle={() =>
                setExpandedId(expandedId === connector.id ? null : connector.id)
              }
              onTest={() => void testConnector(connector.id)}
              onToggleActive={() =>
                void updateConnector(connector.id, {
                  status: connector.status === "active" ? "inactive" : "active",
                })
              }
              onDelete={() => void deleteConnector(connector.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
