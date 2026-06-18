/**
 * Explicit route mount registry — mount order is priority-sorted at startup,
 * not comment-driven in routes.ts.
 *
 * CRITICAL ORDERING RULES (see route-registry-order.test.ts):
 * 1. chatRoutes MUST mount BEFORE any router that applies authMiddlewareWithRls
 *    on "/projects/*" (projectRoutes, dataTokenRoutes, projectAiSettingsRoutes).
 *    Otherwise the streaming /projects/:id/chat handler runs inside the RLS
 *    single-connection transaction and concurrent Promise.all() DB queries deadlock
 *    (AI turns hang ~180s with no output).
 * 2. previewRoutes and connector-proxy MUST mount early (before catch-all /projects).
 * 3. OAuth GitHub redirects MUST register on app directly BEFORE publicFrameworkRoutes
 *    (wildcard auth at "/" would intercept otherwise).
 * 4. mcpAppsDataRoutes MUST use prefix /__doable/mcp-apps/data, NOT "/" ({.+} swallows all GETs).
 */
import type { Hono } from "hono";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { workspaceRoutes } from "./routes/workspaces.js";
import { folderRoutes } from "./routes/folders.js";
import { editorRoutes } from "./routes/editor.js";
import { chatRoutes } from "./routes/chat/index.js";
import { billingRoutes } from "./routes/billing.js";
import { deployRoutes } from "./routes/deploy.js";
import { customDomainRoutes } from "./routes/custom-domains.js";
import { contextRoutes, workspaceContextRoutes } from "./routes/context.js";
import { templateRoutes } from "./routes/templates.js";
import { versionRoutes } from "./routes/versions.js";
import { githubRoutes, githubProjectRoutes } from "./routes/github.js";
import { projectFileRoutes } from "./routes/project-files.js";
import { previewRoutes } from "./routes/preview-proxy.js";
import { connectorProxyRoutes } from "./routes/connector-proxy.js";
import { runtimeRoutes, workspaceRuntimeRoutes } from "./routes/runtime.js";
import { buildStreamRoutes } from "./routes/build-stream.js";
import { thumbnailRoutes } from "./routes/thumbnails.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { aiSettingsRoutes } from "./routes/ai-settings.js";
import { sandboxRoutes } from "./routes/sandbox-rules.js";
import { workspaceSandboxRoutes } from "./routes/workspaces/sandbox.js";
import { providerCatalogRoutes } from "./routes/provider-catalog.js";
import { providerBridgeRoutes } from "./routes/provider-bridge.js";
import { usageRoutes } from "./routes/usage.js";
import { adminRoutes } from "./routes/admin.js";
import { adminTraceRoutes } from "./admin/trace-routes.js";
import { adminAuditRoutes } from "./admin/audit-routes.js";
import { tracingControlRouter } from "./admin/tracing-control.js";
import { adminMfaRoutes } from "./routes/admin-mfa.js";
import { adminSignupRoutes } from "./routes/admin-signups.js";
import { securityRoutes } from "./routes/security.js";
import { communityRoutes } from "./routes/community.js";
import { connectorRoutes, mcpOAuthCallbackRoute } from "./routes/connectors.js";
import { integrationRoutes } from "./routes/integrations.js";
import { supabaseProvisionRoutes } from "./routes/integrations/supabase/provision.js";
import { skillsRoutes } from "./routes/skills.js";
import { environmentRoutes } from "./routes/environments.js";
import { wsEnvVarRoutes, projEnvVarRoutes, envVarUtilRoutes } from "./routes/env-vars.js";
import { workspaceLogFilterRoutes } from "./routes/workspace-log-filters.js";
import { marketplaceRoutes } from "./routes/marketplace.js";
import { marketplaceModerationRoutes } from "./routes/marketplace-moderation.js";
import { teamChatRoutes } from "./routes/team-chat.js";
import { designCommentRoutes } from "./routes/design-comments.js";
import { internalRoutes } from "./routes/internal.js";
import { notificationRoutes } from "./routes/notifications.js";
import { planRoutes } from "./routes/plan.js";
import { directSaveRoutes } from "./direct-save/index.js";
import artifactsRoutes from "./routes/artifacts.js";
import { publicFrameworkRoutes } from "./routes/admin-frameworks.js";
import { setupRoutes } from "./routes/setup.js";
import { appDataRoutes } from "./routes/app-data.js";
import { appAuthRoutes } from "./routes/app-auth.js";
import { dataTokenRoutes } from "./routes/projects/data-token.js";
import { mcpAppsDataRoutes } from "./routes/mcp-apps-data.js";
import { DOABLE_APP_DB_ENABLED } from "./data-worker/config.js";
import { aiProxyRoutes } from "./routes/ai-proxy.js";
import { aiSettingsRoutes as projectAiSettingsRoutes } from "./routes/projects/ai-settings.js";
import { embeddingsRoutes as projectEmbeddingsRoutes } from "./routes/projects/embeddings.js";
import { workspaceAiExtrasRoutes } from "./routes/workspaces/ai-extras.js";
import { DOABLE_APP_AI_ENABLED } from "./ai/runtime-config.js";
import { geminiProxyRoutes } from "./routes/gemini-proxy.js";

/** Middleware profile metadata — documents auth expectations per mount group. */
export type MiddlewareProfile =
  | "public"
  | "auth"
  | "auth+rls"
  | "streaming"
  | "platform-admin";

type RouteHandler = Hono<any>;

export type RouteMountEntry = {
  /** Lower priority mounts first. Gaps allow future inserts without renumbering. */
  priority: number;
  path: string;
  handler: RouteHandler;
  profile: MiddlewareProfile;
  /** Stable id for tests and logging. */
  id?: string;
  /** Human-readable ordering rationale for critical mounts. */
  note?: string;
  /** When false, entry is skipped at mount time. */
  enabled?: boolean;
};

export type RouteSetupEntry = {
  priority: number;
  profile: MiddlewareProfile;
  note?: string;
  setup: (app: Hono) => void;
  enabled?: boolean;
};

function preserveQuery(c: { req: { url: string } }): string {
  const i = c.req.url.indexOf("?");
  return i >= 0 ? c.req.url.slice(i) : "";
}

function mountGitHubOAuthRedirects(app: Hono): void {
  app.get("/oauth/github/login/callback", (c) => {
    return c.redirect(`/auth/github/callback${preserveQuery(c)}`, 308);
  });
  app.get("/oauth/github/copilot/callback", (c) => {
    return c.redirect(`/auth/github/copilot/callback${preserveQuery(c)}`, 308);
  });
  app.get("/oauth/github/repo/callback", (c) => {
    return c.redirect(`/github/repo/callback${preserveQuery(c)}`, 308);
  });
}

/** Canonical mount table — priority defines startup order. */
export const ROUTE_REGISTRY: readonly (RouteMountEntry | RouteSetupEntry)[] = [
  {
    priority: 10,
    path: "/__gemini-proxy",
    handler: geminiProxyRoutes,
    profile: "public",
    note: "Early — copilot SDK sends Gemini API key without platform auth",
  },
  { priority: 20, path: "/health", handler: healthRoutes, profile: "public" },
  { priority: 30, path: "/artifacts", handler: artifactsRoutes, profile: "public" },
  { priority: 40, path: "/internal", handler: internalRoutes, profile: "public" },
  { priority: 50, path: "/auth", handler: authRoutes, profile: "public" },
  {
    priority: 60,
    path: "/",
    handler: previewRoutes,
    profile: "public",
    note: "Preview reverse proxy — before other catch-all routes",
  },
  {
    priority: 70,
    path: "/",
    handler: connectorProxyRoutes,
    profile: "auth",
    note: "Connector-bridge proxy for generated apps",
  },
  {
    priority: 80,
    path: "/",
    handler: appDataRoutes,
    profile: "public",
    note: "Per-app DB data plane — gated by DOABLE_APP_DB_ENABLED",
    enabled: DOABLE_APP_DB_ENABLED,
  },
  {
    priority: 81,
    path: "/",
    handler: appAuthRoutes,
    profile: "public",
    enabled: DOABLE_APP_DB_ENABLED,
  },
  {
    priority: 82,
    path: "/__doable/mcp-apps/data",
    handler: mcpAppsDataRoutes,
    profile: "public",
    note: "Dedicated prefix — {.+} wildcard must NOT mount at /",
    enabled: DOABLE_APP_DB_ENABLED,
  },
  {
    priority: 90,
    path: "/",
    handler: aiProxyRoutes,
    profile: "public",
    enabled: DOABLE_APP_AI_ENABLED,
  },
  { priority: 100, path: "/", handler: runtimeRoutes, profile: "auth" },
  { priority: 110, path: "/workspaces", handler: workspaceRuntimeRoutes, profile: "auth" },
  { priority: 120, path: "/", handler: buildStreamRoutes, profile: "auth" },
  { priority: 130, path: "/", handler: projectFileRoutes, profile: "public" },
  { priority: 140, path: "/", handler: directSaveRoutes, profile: "public" },
  {
    priority: 150,
    path: "/",
    handler: chatRoutes,
    profile: "streaming",
    id: "chatRoutes",
    note: "BEFORE auth+rls /projects/* — prevents RLS deadlock on chat stream",
  },
  { priority: 160, path: "/", handler: planRoutes, profile: "auth" },
  { priority: 170, path: "/", handler: editorRoutes, profile: "auth" },
  {
    priority: 180,
    path: "/projects",
    handler: dataTokenRoutes,
    profile: "auth+rls",
    id: "dataTokenRoutes",
    note: "AFTER chat — authMiddlewareWithRls on /projects/*",
    enabled: DOABLE_APP_DB_ENABLED,
  },
  {
    priority: 190,
    path: "/projects",
    handler: projectAiSettingsRoutes,
    profile: "auth+rls",
    id: "projectAiSettingsRoutes",
    enabled: DOABLE_APP_AI_ENABLED,
  },
  {
    priority: 191,
    path: "/projects",
    handler: projectEmbeddingsRoutes,
    profile: "auth+rls",
    id: "projectEmbeddingsRoutes",
    enabled: DOABLE_APP_AI_ENABLED,
  },
  {
    priority: 192,
    path: "/workspaces",
    handler: workspaceAiExtrasRoutes,
    profile: "auth+rls",
    enabled: DOABLE_APP_AI_ENABLED,
  },
  {
    priority: 200,
    path: "/projects",
    handler: projectRoutes,
    profile: "auth+rls",
    id: "projectRoutes",
    note: "Wildcard auth on /projects/* — must follow chatRoutes",
  },
  { priority: 210, path: "/workspaces", handler: workspaceRoutes, profile: "auth+rls" },
  { priority: 220, path: "/workspaces", handler: aiSettingsRoutes, profile: "auth+rls" },
  { priority: 230, path: "/workspaces", handler: sandboxRoutes, profile: "auth+rls" },
  { priority: 240, path: "/workspaces", handler: workspaceSandboxRoutes, profile: "auth+rls" },
  { priority: 250, path: "/ai", handler: providerCatalogRoutes, profile: "auth" },
  { priority: 260, path: "/workspaces", handler: providerBridgeRoutes, profile: "auth+rls" },
  { priority: 270, path: "/workspaces", handler: usageRoutes, profile: "auth" },
  { priority: 280, path: "/folders", handler: folderRoutes, profile: "auth+rls" },
  { priority: 290, path: "/billing", handler: billingRoutes, profile: "auth" },
  { priority: 300, path: "/deploy", handler: deployRoutes, profile: "auth+rls" },
  { priority: 310, path: "/domains", handler: customDomainRoutes, profile: "auth+rls" },
  { priority: 320, path: "/projects/:id/context", handler: contextRoutes, profile: "auth+rls" },
  { priority: 330, path: "/templates", handler: templateRoutes, profile: "auth" },
  { priority: 340, path: "/projects", handler: versionRoutes, profile: "auth+rls" },
  {
    priority: 350,
    profile: "public",
    note: "OAuth redirects before publicFrameworkRoutes wildcard auth at /",
    setup: mountGitHubOAuthRedirects,
  },
  { priority: 360, path: "/", handler: githubRoutes, profile: "auth" },
  { priority: 370, path: "/projects", handler: githubProjectRoutes, profile: "auth+rls" },
  { priority: 380, path: "/thumbnails", handler: thumbnailRoutes, profile: "auth" },
  { priority: 390, path: "/analytics", handler: analyticsRoutes, profile: "auth+rls" },
  { priority: 400, path: "/admin", handler: adminRoutes, profile: "platform-admin" },
  { priority: 410, path: "/admin", handler: adminTraceRoutes, profile: "platform-admin" },
  { priority: 420, path: "/admin", handler: adminAuditRoutes, profile: "platform-admin" },
  { priority: 430, path: "/admin/tracing", handler: tracingControlRouter, profile: "platform-admin" },
  { priority: 440, path: "/admin/mfa", handler: adminMfaRoutes, profile: "platform-admin" },
  { priority: 450, path: "/admin", handler: adminSignupRoutes, profile: "platform-admin" },
  { priority: 460, path: "/setup", handler: setupRoutes, profile: "public" },
  { priority: 470, path: "/projects", handler: securityRoutes, profile: "auth+rls" },
  { priority: 480, path: "/community", handler: communityRoutes, profile: "auth" },
  { priority: 490, path: "/workspaces", handler: connectorRoutes, profile: "auth+rls" },
  { priority: 500, path: "/", handler: mcpOAuthCallbackRoute, profile: "public" },
  { priority: 510, path: "/", handler: integrationRoutes, profile: "auth" },
  { priority: 520, path: "/", handler: supabaseProvisionRoutes, profile: "auth+rls" },
  { priority: 530, path: "/workspaces", handler: skillsRoutes, profile: "auth+rls" },
  { priority: 540, path: "/workspaces", handler: environmentRoutes, profile: "auth+rls" },
  { priority: 550, path: "/workspaces", handler: wsEnvVarRoutes, profile: "auth+rls" },
  { priority: 560, path: "/workspaces", handler: workspaceLogFilterRoutes, profile: "auth+rls" },
  { priority: 570, path: "/projects", handler: projEnvVarRoutes, profile: "auth+rls" },
  { priority: 580, path: "/env-vars", handler: envVarUtilRoutes, profile: "auth" },
  { priority: 590, path: "/", handler: marketplaceRoutes, profile: "auth" },
  { priority: 600, path: "/workspaces", handler: marketplaceRoutes, profile: "auth+rls" },
  { priority: 610, path: "/", handler: marketplaceModerationRoutes, profile: "platform-admin" },
  { priority: 620, path: "/workspaces/:wid/context", handler: workspaceContextRoutes, profile: "auth+rls" },
  { priority: 630, path: "/team-chat", handler: teamChatRoutes, profile: "auth+rls" },
  { priority: 640, path: "/design-comments", handler: designCommentRoutes, profile: "auth+rls" },
  { priority: 650, path: "/", handler: notificationRoutes, profile: "auth" },
  {
    priority: 660,
    path: "/",
    handler: publicFrameworkRoutes,
    profile: "auth",
    id: "publicFrameworkRoutes",
    note: "Wildcard auth at / — mount last among root catch-alls",
  },
];

export function mountAll(app: Hono): void {
  const sorted = [...ROUTE_REGISTRY]
    .filter((e) => e.enabled !== false)
    .sort((a, b) => a.priority - b.priority);

  for (const entry of sorted) {
    if ("setup" in entry) {
      entry.setup(app);
    } else {
      app.route(entry.path, entry.handler);
    }
  }
}

/** Exported for tests — ordered labels of mounted route groups. */
export function getMountOrderForTests(): Array<{ priority: number; label: string; profile: MiddlewareProfile }> {
  return [...ROUTE_REGISTRY]
    .filter((e) => e.enabled !== false)
    .sort((a, b) => a.priority - b.priority)
    .map((e) => {
      if ("setup" in e) {
        return { priority: e.priority, label: "oauth-redirects", profile: e.profile };
      }
      return {
        priority: e.priority,
        label: e.id ?? `${e.path} → ${getHandlerLabel(e.handler)}`,
        profile: e.profile,
      };
    });
}

function getHandlerLabel(handler: RouteHandler): string {
  if (handler && typeof handler === "object" && "constructor" in handler) {
    return (handler as { constructor?: { name?: string } }).constructor?.name ?? "handler";
  }
  return "handler";
}
