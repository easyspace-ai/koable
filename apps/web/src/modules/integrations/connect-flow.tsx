"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAuthLabel, type CatalogItem } from "./use-integration-catalog";

import { OAuthForm, SecretTextForm, BasicAuthForm, CustomAuthForm } from "./connect-flow-forms";
import { runOAuthPopup, runEnhancedAuthPopup } from "./connect-flow-oauth";

// ─── Connect Flow Dialog ───────────────────────────────────

interface ConnectFlowProps {
  item: CatalogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (
    integrationId: string,
    data: {
      scope?: string;
      credentials?: Record<string, unknown>;
      displayName?: string;
      projectId?: string;
    }
  ) => Promise<unknown>;
  onGetAuthorizationUrl: (
    integrationId: string,
    scope?: string
  ) => Promise<string>;
  onGetEnhancedAuthUrl?: (integrationId: string) => Promise<string>;
  projectId?: string;
}

export function ConnectFlow({
  item,
  open,
  onOpenChange,
  onConnect,
  onGetAuthorizationUrl,
  onGetEnhancedAuthUrl,
  projectId,
}: ConnectFlowProps) {
  const t = useTranslations("integrations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorVariant, setErrorVariant] = useState<"warning" | "error">("error");

  const [apiKey, setApiKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setApiKey("");
      setUsername("");
      setPassword("");
      setDisplayName("");
      setError(null);
      setErrorVariant("error");
      setLoading(false);
      setShowSecret(false);
      setCustomFields({});
    }
  }, [open, item?.id]);

  const handleNoAuthConnect = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    try {
      await onConnect(item.id, { credentials: {}, projectId });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("connectFlow.errors.connectionFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [item, onConnect, onOpenChange, projectId, t]);

  useEffect(() => {
    if (open && item?.authType === "none") {
      void handleNoAuthConnect();
    }
  }, [open, item?.authType, handleNoAuthConnect]);

  const handleOAuth = useCallback(async () => {
    if (!item) return;
    setLoading(true);
    setError(null);
    await runOAuthPopup({
      getUrl: () => onGetAuthorizationUrl(item.id),
      windowName: "doable-oauth",
      itemName: item.displayName,
      t,
      onDone: () => { setLoading(false); onOpenChange(false); },
      onError: (msg, variant) => {
        setError(msg);
        setErrorVariant(variant ?? "error");
        setLoading(false);
      },
    });
  }, [item, onGetAuthorizationUrl, onOpenChange, t]);

  const handleEnhancedAuth = useCallback(async () => {
    if (!item || !onGetEnhancedAuthUrl) return;
    setLoading(true);
    setError(null);
    await runEnhancedAuthPopup({
      getUrl: () => onGetEnhancedAuthUrl(item.id),
      integrationId: item.id,
      itemName: item.displayName,
      t,
      onDone: () => { setLoading(false); onOpenChange(false); },
      onError: (msg, variant) => {
        setError(msg);
        setErrorVariant(variant ?? "error");
        setLoading(false);
      },
    });
  }, [item, onGetEnhancedAuthUrl, onOpenChange, t]);

  const handleSecretTextConnect = useCallback(async () => {
    if (!item || !apiKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onConnect(item.id, {
        credentials: { apiKey: apiKey.trim() },
        displayName: displayName.trim() || undefined,
        projectId,
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("connectFlow.errors.connectionFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [item, apiKey, displayName, onConnect, onOpenChange, projectId, t]);

  const handleBasicAuthConnect = useCallback(async () => {
    if (!item || !username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onConnect(item.id, {
        credentials: { username: username.trim(), password: password.trim() },
        displayName: displayName.trim() || undefined,
        projectId,
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("connectFlow.errors.connectionFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [item, username, password, displayName, onConnect, onOpenChange, projectId, t]);

  const handleCustomAuthConnect = useCallback(async () => {
    if (!item) return;

    const fields = item.customAuthFields ?? [];
    const credentials: Record<string, string> = {};
    for (const field of fields) {
      const value = customFields[field.name]?.trim() ?? "";
      if (field.required && !value) return;
      if (value) credentials[field.name] = value;
    }

    if (fields.length === 0) {
      if (!apiKey.trim()) return;
      credentials.token = apiKey.trim();
    }

    setLoading(true);
    setError(null);
    try {
      await onConnect(item.id, {
        credentials,
        displayName: displayName.trim() || undefined,
        projectId,
      });
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("connectFlow.errors.connectionFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [item, customFields, apiKey, displayName, onConnect, onOpenChange, projectId, t]);

  const isCustomAuthValid = useCallback(() => {
    if (!item) return false;
    const fields = item.customAuthFields ?? [];
    if (fields.length === 0) return apiKey.trim().length > 0;
    return fields.every(
      (f) => !f.required || (customFields[f.name]?.trim() ?? "").length > 0
    );
  }, [item, customFields, apiKey]);

  const setCustomField = useCallback((name: string, value: string) => {
    setCustomFields((prev) => ({ ...prev, [name]: value }));
  }, []);

  if (!item) return null;

  const authLabel = getAuthLabel(t, item.authType);

  if (item.authType === "none") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            {loading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t("connectFlow.noAuth.connecting", { name: item.displayName })}
                </p>
              </>
            ) : error ? (
              <>
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleNoAuthConnect()}
                >
                  {t("connectFlow.noAuth.tryAgain")}
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0 overflow-hidden">
              {item.logoUrl ? (
                <img
                  src={item.logoUrl}
                  alt={item.displayName}
                  className="h-6 w-6 object-contain"
                />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">
                  {item.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <DialogTitle>{t("connectFlow.title", { name: item.displayName })}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {authLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className={cn(
            "rounded-md border px-3 py-2 text-xs",
            errorVariant === "warning"
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-600"
          )}>
            {errorVariant === "warning" && (
              <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
            )}
            {error}
          </div>
        )}

        {item.enhancedAuth && onGetEnhancedAuthUrl && (
          <div className="space-y-3 py-1">
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => void handleEnhancedAuth()}
            >
              {loading
                ? t("connectFlow.enhancedAuth.connecting")
                : (item.enhancedAuth.connectLabel ??
                    t("connectFlow.enhancedAuth.connectDefault", { name: item.displayName }))}
            </Button>
          </div>
        )}

        {item.authType === "oauth2" && (
          <OAuthForm
            itemName={item.displayName}
            loading={loading}
            onOAuth={() => void handleOAuth()}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {item.authType === "secret_text" && (
          <SecretTextForm
            itemName={item.displayName}
            apiKey={apiKey}
            setApiKey={setApiKey}
            displayName={displayName}
            setDisplayName={setDisplayName}
            showSecret={showSecret}
            setShowSecret={setShowSecret}
            loading={loading}
            onConnect={() => void handleSecretTextConnect()}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {item.authType === "basic_auth" && (
          <BasicAuthForm
            itemName={item.displayName}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            displayName={displayName}
            setDisplayName={setDisplayName}
            showSecret={showSecret}
            setShowSecret={setShowSecret}
            loading={loading}
            onConnect={() => void handleBasicAuthConnect()}
            onCancel={() => onOpenChange(false)}
          />
        )}

        {item.authType === "custom_auth" && (
          <CustomAuthForm
            item={item}
            apiKey={apiKey}
            setApiKey={setApiKey}
            customFields={customFields}
            setCustomField={setCustomField}
            displayName={displayName}
            setDisplayName={setDisplayName}
            showSecret={showSecret}
            setShowSecret={setShowSecret}
            loading={loading}
            isValid={isCustomAuthValid()}
            onConnect={() => void handleCustomAuthConnect()}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
