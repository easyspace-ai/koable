#!/usr/bin/env tsx
/**
 * Generate OpenAPI 3.1 spec from documented route contracts.
 *
 * Run: pnpm exec tsx services/api/scripts/generate-openapi.ts
 * Output: services/api/openapi.json
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "openapi.json");

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Doable API",
    version: "0.1.0",
    description: "Bootstrap OpenAPI spec from route contracts. Regenerate via generate-openapi.ts.",
  },
  servers: [{ url: "/api", description: "API prefix (relative to web origin)" }],
  paths: {
    "/health": {
      get: {
        operationId: "getHealth",
        summary: "Health check",
        tags: ["Health"],
        responses: {
          "200": {
            description: "Service healthy or degraded",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HealthStatus" },
              },
            },
          },
          "503": { description: "Service degraded" },
        },
      },
    },
    "/health/ready": {
      get: {
        operationId: "getReadiness",
        summary: "Readiness probe",
        tags: ["Health"],
        responses: {
          "200": { description: "Ready", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" } } } } } },
          "503": { description: "Not ready" },
        },
      },
    },
    "/auth/register": {
      post: {
        operationId: "register",
        summary: "Register a new user",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } },
        },
        responses: {
          "201": { description: "User created", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthSuccess" } } } },
          "400": { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "409": { description: "Email already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/auth/login": {
      post: {
        operationId: "login",
        summary: "Login with email and password",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } },
        },
        responses: {
          "200": { description: "Tokens issued", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthSuccess" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/auth/refresh": {
      post: {
        operationId: "refreshTokens",
        summary: "Refresh access token",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RefreshRequest" } } },
        },
        responses: {
          "200": { description: "New tokens", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthSuccess" } } } },
          "401": { description: "Invalid refresh token", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/workspaces": {
      get: {
        operationId: "listWorkspaces",
        summary: "List workspaces for the authenticated user",
        tags: ["Workspaces"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Workspace list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/WorkspaceList" } } },
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
      post: {
        operationId: "createWorkspace",
        summary: "Create a workspace",
        tags: ["Workspaces"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateWorkspace" } } },
        },
        responses: {
          "201": { description: "Workspace created", content: { "application/json": { schema: { $ref: "#/components/schemas/WorkspaceEnvelope" } } } },
          "409": { description: "Slug already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/workspaces/{id}": {
      get: {
        operationId: "getWorkspace",
        summary: "Get workspace by ID",
        tags: ["Workspaces"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Workspace", content: { "application/json": { schema: { $ref: "#/components/schemas/WorkspaceEnvelope" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
      patch: {
        operationId: "updateWorkspace",
        summary: "Update a workspace",
        tags: ["Workspaces"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateWorkspace" } } },
        },
        responses: {
          "200": { description: "Workspace updated", content: { "application/json": { schema: { $ref: "#/components/schemas/WorkspaceEnvelope" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/projects": {
      get: {
        operationId: "listProjects",
        summary: "List projects with pagination",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Paginated project list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectList" } } },
          },
        },
      },
      post: {
        operationId: "createProject",
        summary: "Create a project",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CreateProject" } } },
        },
        responses: {
          "201": { description: "Project created", content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectDetail" } } } },
          "400": { description: "Validation failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "403": { description: "Access denied", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/projects/{id}": {
      get: {
        operationId: "getProject",
        summary: "Get project detail",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Project detail", content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectDetail" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
      patch: {
        operationId: "updateProject",
        summary: "Update a project",
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProject" } } },
        },
        responses: {
          "200": { description: "Project updated", content: { "application/json": { schema: { $ref: "#/components/schemas/ProjectDetail" } } } },
          "403": { description: "Insufficient role", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "404": { description: "Not found", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/notifications": {
      get: {
        operationId: "listNotifications",
        summary: "List notifications for a workspace",
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "workspaceId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 50 } },
          { name: "unreadOnly", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          "200": {
            description: "Notification list",
            content: { "application/json": { schema: { $ref: "#/components/schemas/NotificationList" } } },
          },
          "400": { description: "Invalid workspaceId", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "403": { description: "Not a workspace member", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/billing/portal": {
      post: {
        operationId: "createBillingPortalSession",
        summary: "Create Stripe billing portal session",
        tags: ["Billing"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["workspaceId"], properties: { workspaceId: { type: "string", format: "uuid" } } } } },
        },
        responses: {
          "200": { description: "Portal URL", content: { "application/json": { schema: { $ref: "#/components/schemas/BillingPortalSuccess" } } } },
          "503": { description: "Stripe bypass mode", content: { "application/json": { schema: { $ref: "#/components/schemas/BillingPortalBypass" } } } },
        },
      },
    },
    "/marketplace/listings": {
      get: {
        operationId: "browseMarketplaceListings",
        summary: "Browse published marketplace listings",
        tags: ["Marketplace"],
        parameters: [
          { name: "category", in: "query", schema: { type: "string" } },
          { name: "search", in: "query", schema: { type: "string", maxLength: 200 } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["popular", "newest", "rating"] } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0 } },
        ],
        responses: {
          "200": {
            description: "Paginated listing browse result",
            content: { "application/json": { schema: { $ref: "#/components/schemas/MarketplaceBrowseResult" } } },
          },
        },
      },
    },
    "/admin/users": {
      get: {
        operationId: "listAdminUsers",
        summary: "List platform users (platform admin only)",
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "search", in: "query", schema: { type: "string", maxLength: 100 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 500, default: 100 } },
          { name: "offset", in: "query", schema: { type: "integer", minimum: 0, default: 0 } },
        ],
        responses: {
          "200": {
            description: "Flat snake_case user array (NOT a data envelope)",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/AdminUserRow" } },
              },
            },
          },
          "401": { description: "Authentication required", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "403": { description: "Platform admin required", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
    "/projects/{id}/chat": {
      post: {
        operationId: "sendChatMessage",
        summary: "Send a chat message (SSE stream)",
        tags: ["Chat"],
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SendMessage" } } },
        },
        responses: {
          "200": {
            description: "Server-Sent Events stream. Each event is a JSON object in the `data` field.",
            content: {
              "text/event-stream": {
                schema: { $ref: "#/components/schemas/ChatSseEvent" },
              },
            },
          },
          "400": { description: "Validation or credit error", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
          "402": { description: "Insufficient credits", content: { "application/json": { schema: { $ref: "#/components/schemas/ClientError" } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ClientError: {
        type: "object",
        required: ["error"],
        properties: {
          error: { type: "string" },
          details: { type: "object", additionalProperties: true },
          code: { type: "string" },
        },
      },
      HealthStatus: {
        type: "object",
        required: ["status", "timestamp", "checks"],
        properties: {
          status: { type: "string", enum: ["healthy", "degraded"] },
          timestamp: { type: "string", format: "date-time" },
          version: { type: "string" },
          uptime: { type: "number" },
          checks: { type: "object" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
          displayName: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" },
        },
      },
      RefreshRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: { refreshToken: { type: "string" } },
      },
      AuthSuccess: {
        type: "object",
        required: ["user", "tokens"],
        properties: {
          user: { type: "object" },
          tokens: {
            type: "object",
            required: ["accessToken", "refreshToken", "expiresIn"],
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
              expiresIn: { type: "integer" },
            },
          },
        },
      },
      CreateWorkspace: {
        type: "object",
        required: ["name", "slug"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          slug: { type: "string", minLength: 3, maxLength: 48 },
          description: { type: "string", maxLength: 500 },
          environmentId: { type: "string", format: "uuid" },
        },
      },
      UpdateWorkspace: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          description: { type: "string", maxLength: 500 },
          avatarUrl: { type: "string", format: "uri" },
        },
      },
      WorkspaceEnvelope: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "object" } },
      },
      WorkspaceList: {
        type: "object",
        required: ["data"],
        properties: { data: { type: "array", items: { type: "object" } } },
      },
      ProjectList: {
        type: "object",
        required: ["data", "pagination"],
        properties: {
          data: { type: "array", items: { type: "object" } },
          pagination: {
            type: "object",
            required: ["total", "page", "pageSize", "totalPages"],
            properties: {
              total: { type: "integer" },
              page: { type: "integer" },
              pageSize: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
      ProjectDetail: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            required: ["id", "name", "starred"],
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              starred: { type: "boolean" },
            },
          },
        },
      },
      SendMessage: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", maxLength: 100000 },
          displayContent: { type: "string", maxLength: 4000 },
          mode: { type: "string", enum: ["agent", "plan", "visual-edit", "chat"], default: "agent" },
          model: { type: "string" },
          providerId: { type: "string", format: "uuid" },
          createIfMissing: { type: "boolean", default: false },
        },
      },
      ChatSseEvent: {
        description: "Partial SSE event shapes emitted by POST /projects/{id}/chat",
        oneOf: [
          {
            type: "object",
            required: ["type"],
            properties: {
              type: { type: "string", enum: ["text", "thinking", "tool_call", "tool_result", "suggestion", "error", "done"] },
              data: { type: "object", additionalProperties: true },
              seq: { type: "integer" },
            },
          },
        ],
      },
      CreateProject: {
        type: "object",
        required: ["name", "workspaceId"],
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          slug: { type: "string" },
          description: { type: "string", maxLength: 500 },
          workspaceId: { type: "string", format: "uuid" },
          templateId: { type: "string", format: "uuid" },
          folderId: { type: "string", format: "uuid" },
          frameworkId: { type: "string" },
        },
      },
      UpdateProject: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 100 },
          description: { type: "string", maxLength: 500 },
          status: { type: "string", enum: ["creating", "draft", "published", "error"] },
          visibility: { type: "string", enum: ["public", "private"] },
          folderId: { type: "string", format: "uuid", nullable: true },
        },
      },
      NotificationList: {
        type: "object",
        required: ["data"],
        properties: {
          data: { type: "array", items: { $ref: "#/components/schemas/NotificationItem" } },
        },
      },
      NotificationItem: {
        type: "object",
        required: ["id", "kind", "title", "isRead", "createdAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          kind: { type: "string" },
          title: { type: "string" },
          body: { type: "string", nullable: true },
          link: { type: "string", nullable: true },
          isRead: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      BillingPortalSuccess: {
        type: "object",
        required: ["data"],
        properties: {
          data: {
            type: "object",
            required: ["url"],
            properties: { url: { type: "string", format: "uri" } },
          },
        },
      },
      BillingPortalBypass: {
        type: "object",
        required: ["error", "message"],
        description: "Dual envelope preserved for billing bypass UX",
        properties: {
          error: { type: "string", enum: ["stripe_disabled"] },
          message: { type: "string" },
        },
      },
      MarketplaceBrowseResult: {
        type: "object",
        required: ["data", "total"],
        properties: {
          data: { type: "array", items: { type: "object" } },
          total: { type: "integer" },
        },
      },
      AdminUserRow: {
        type: "object",
        required: ["id", "email", "display_name", "is_platform_admin", "created_at"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          display_name: { type: "string", nullable: true },
          is_platform_admin: { type: "boolean" },
          platform_role: { type: "string", nullable: true },
          created_at: { type: "string", format: "date-time" },
          workspace_id: { type: "string", format: "uuid", nullable: true },
          plan: { type: "string", nullable: true },
        },
      },
    },
  },
};

writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n");
console.log(`Wrote ${outPath}`);
