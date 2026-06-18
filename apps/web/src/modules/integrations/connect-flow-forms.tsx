"use client";

import { useTranslations } from "next-intl";
import { Loader2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── OAuth Form ─────────────────────────────────────────────

export function OAuthForm({
  itemName,
  loading,
  onOAuth,
  onCancel,
}: {
  itemName: string;
  loading: boolean;
  onOAuth: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("integrations");

  return (
    <div className="space-y-4 py-2">
      <p className="text-sm text-muted-foreground">
        {t("connectFlowForms.oauth.description", { name: itemName })}
      </p>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {t("connectFlowForms.oauth.cancel")}
        </Button>
        <Button onClick={onOAuth} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("connectFlowForms.oauth.connecting")}
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("connectFlowForms.oauth.signIn", { name: itemName })}
            </>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Secret Text Form ───────────────────────────────────────

export function SecretTextForm({
  itemName,
  apiKey,
  setApiKey,
  displayName,
  setDisplayName,
  showSecret,
  setShowSecret,
  loading,
  onConnect,
  onCancel,
}: {
  itemName: string;
  apiKey: string;
  setApiKey: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  loading: boolean;
  onConnect: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("integrations");

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("connectFlowForms.secretText.apiKeyLabel")}</label>
        <div className="relative">
          <Input
            type={showSecret ? "text" : "password"}
            placeholder={t("connectFlowForms.secretText.apiKeyPlaceholder")}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="pr-10"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("connectFlowForms.secretText.labelOptional")}{" "}
          <span className="text-muted-foreground font-normal">
            {t("connectFlowForms.secretText.optionalSuffix")}
          </span>
        </label>
        <Input
          type="text"
          placeholder={t("connectFlowForms.secretText.labelPlaceholder", { name: itemName })}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {t("connectFlowForms.secretText.cancel")}
        </Button>
        <Button onClick={onConnect} disabled={loading || !apiKey.trim()}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("connectFlowForms.secretText.connecting")}
            </>
          ) : (
            t("connectFlowForms.secretText.connect")
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Basic Auth Form ────────────────────────────────────────

export function BasicAuthForm({
  itemName,
  username,
  setUsername,
  password,
  setPassword,
  displayName,
  setDisplayName,
  showSecret,
  setShowSecret,
  loading,
  onConnect,
  onCancel,
}: {
  itemName: string;
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  loading: boolean;
  onConnect: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("integrations");

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("connectFlowForms.basicAuth.usernameLabel")}</label>
        <Input
          type="text"
          placeholder={t("connectFlowForms.basicAuth.usernamePlaceholder")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">{t("connectFlowForms.basicAuth.passwordLabel")}</label>
        <div className="relative">
          <Input
            type={showSecret ? "text" : "password"}
            placeholder={t("connectFlowForms.basicAuth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowSecret(!showSecret)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("connectFlowForms.basicAuth.labelOptional")}{" "}
          <span className="text-muted-foreground font-normal">
            {t("connectFlowForms.basicAuth.optionalSuffix")}
          </span>
        </label>
        <Input
          type="text"
          placeholder={t("connectFlowForms.basicAuth.labelPlaceholder", { name: itemName })}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {t("connectFlowForms.basicAuth.cancel")}
        </Button>
        <Button onClick={onConnect} disabled={loading || !username.trim() || !password.trim()}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("connectFlowForms.basicAuth.connecting")}
            </>
          ) : (
            t("connectFlowForms.basicAuth.connect")
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Custom Auth Form ───────────────────────────────────────

export function CustomAuthForm({
  item,
  apiKey,
  setApiKey,
  customFields,
  setCustomField,
  displayName,
  setDisplayName,
  showSecret,
  setShowSecret,
  loading,
  isValid,
  onConnect,
  onCancel,
}: {
  item: { displayName: string; customAuthFields?: Array<{ name: string; displayName: string; description?: string; type?: string; required?: boolean; options?: Array<{ value: string; label: string }> }> };
  apiKey: string;
  setApiKey: (v: string) => void;
  customFields: Record<string, string>;
  setCustomField: (name: string, value: string) => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  showSecret: boolean;
  setShowSecret: (v: boolean) => void;
  loading: boolean;
  isValid: boolean;
  onConnect: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("integrations");
  const fields = item.customAuthFields ?? [];

  return (
    <div className="space-y-4 py-2">
      {fields.length > 0 ? (
        fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <label className="text-sm font-medium">
              {field.displayName}
              {!field.required && (
                <span className="text-muted-foreground font-normal ml-1">
                  {t("connectFlowForms.customAuth.optionalSuffix")}
                </span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-muted-foreground -mt-1">{field.description}</p>
            )}
            {field.type === "dropdown" && field.options ? (
              <select
                value={customFields[field.name] ?? ""}
                onChange={(e) => setCustomField(field.name, e.target.value)}
                className={cn(
                  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm",
                  "shadow-xs transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                )}
              >
                <option value="">{t("connectFlowForms.customAuth.selectPlaceholder")}</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === "secret" ? (
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder={t("connectFlowForms.customAuth.enterFieldPlaceholder", {
                    fieldName: field.displayName.toLowerCase(),
                  })}
                  value={customFields[field.name] ?? ""}
                  onChange={(e) => setCustomField(field.name, e.target.value)}
                  className="pr-10"
                  autoFocus={field === fields.find((f) => f.required)}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            ) : (
              <Input
                type="text"
                placeholder={t("connectFlowForms.customAuth.enterFieldPlaceholder", {
                  fieldName: field.displayName.toLowerCase(),
                })}
                value={customFields[field.name] ?? ""}
                onChange={(e) => setCustomField(field.name, e.target.value)}
                autoFocus={field === fields.find((f) => f.required)}
              />
            )}
          </div>
        ))
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("connectFlowForms.customAuth.authTokenLabel")}
          </label>
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              placeholder={t("connectFlowForms.customAuth.authTokenPlaceholder")}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t("connectFlowForms.customAuth.labelOptional")}{" "}
          <span className="text-muted-foreground font-normal">
            {t("connectFlowForms.customAuth.optionalSuffix")}
          </span>
        </label>
        <Input
          type="text"
          placeholder={t("connectFlowForms.customAuth.labelPlaceholder", { name: item.displayName })}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          {t("connectFlowForms.customAuth.cancel")}
        </Button>
        <Button onClick={onConnect} disabled={loading || !isValid}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("connectFlowForms.customAuth.connecting")}
            </>
          ) : (
            t("connectFlowForms.customAuth.connect")
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}
