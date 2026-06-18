/**
 * POST /projects/:id/chat — SSE streaming handler (orchestrator).
 * Coordinates pre-stream validation, session registration, and delegates
 * the SSE body to send-stream-executor.ts.
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { bodyLimit } from "hono/body-limit";
import { sql } from "../../db/index.js";
import { isUuid } from "../../lib/uuid.js";
import { projectQueries, workspaceQueries } from "@doable/db";
import type { ByokProviderConfig } from "../../ai/providers/copilot.js";
import { creditQueries } from "@doable/db/queries/credits";
import { ensureDataConnectorForProject } from "../../mcp/builtin/data/register.js";
import { getProjectPath } from "../../projects/file-manager.js";
import type { AuthEnv } from "../../middleware/auth.js";
import { activeRequests } from "./session-state.js";
import { writeStreamBuffer, type BufferedEvent, type StreamBuffer } from "./stream-buffer.js";
import { sendMessageSchema } from "./send-schema.js";
import { executeSendStream, wrapStreamWithBuffer } from "./send-stream-executor.js";

export function registerSendHandler(app: Hono<AuthEnv>) {
  app.post(
    "/projects/:id/chat",
    bodyLimit({ maxSize: 20 * 1024 * 1024 }),
    zValidator("json", sendMessageSchema),
    async (c) => {
      const projectId = c.req.param("id");
      const {
        content,
        displayContent,
        mode,
        model,
        provider,
        providerId,
        copilotAccountId,
        attachments,
        projectFiles,
        createIfMissing,
      } = c.req.valid("json");
      const userId = c.get("userId")!;

      let chatProject = await projectQueries(sql).findById(projectId);

      if (!chatProject && createIfMissing) {
        const NIL_UUID = "00000000-0000-0000-0000-000000000000";
        if (isUuid(projectId) && projectId.toLowerCase() !== NIL_UUID) {
          const userWorkspaces = await workspaceQueries(sql).listByUser(userId);
          const wsId = userWorkspaces.length > 0 ? userWorkspaces[0]!.id : null;
          if (!wsId) return c.json({ error: "No workspace found" }, 400);
          const name = content.slice(0, 100) || "New Project";
          const slug = `p-${Date.now().toString(36)}`;
          const [created] = await sql<
            [{ id: string; workspace_id: string; name: string; slug: string; status: string }]
          >`
            INSERT INTO projects (id, workspace_id, name, slug)
            VALUES (${projectId}::uuid, ${wsId}, ${name}, ${slug})
            RETURNING *
          `;
          if (created) {
            chatProject = await projectQueries(sql).findById(projectId);
            if (process.env.DOABLE_APP_DB_ENABLED !== "0") {
              ensureDataConnectorForProject(projectId, wsId, userId).catch((err) => {
                console.error("[builtin-data] Failed to provision data connector:", err);
              });
            }
          }
        }
      }

      if (!chatProject) return c.json({ error: "Project not found" }, 404);
      const chatRole = await workspaceQueries(sql).getMemberRole(chatProject.workspace_id, userId);
      if (!chatRole) {
        const [collab] = await sql<{ role: string }[]>`
          SELECT role FROM project_collaborators
          WHERE project_id = ${projectId} AND user_id = ${userId}
        `;
        if (!collab) {
          const [adminCheck] = await sql<{ is_platform_admin: boolean }[]>`
            SELECT is_platform_admin FROM users WHERE id = ${userId}
          `;
          if (!adminCheck?.is_platform_admin) return c.json({ error: "Access denied" }, 403);
        }
      }
      const effectiveRole = chatRole ?? "member";
      if (effectiveRole === "viewer") {
        return c.json({ error: "Viewers cannot use AI chat" }, 403);
      }

      try {
        const credits = creditQueries(sql);
        const balance = await credits.getCreditBalance(userId, chatProject.workspace_id);
        if (balance.total_available <= 0) {
          return c.json(
            {
              error: "Credit balance exhausted",
              code: "INSUFFICIENT_CREDITS",
              daily_remaining: balance.daily_remaining,
              monthly_remaining: balance.monthly_remaining,
              rollover_credits: balance.rollover_credits,
              total_available: balance.total_available,
            },
            429,
          );
        }
      } catch (err) {
        console.warn("[Chat] pre-stream credit check failed:", err instanceof Error ? err.message : err);
      }

      let augmentedContent = content;
      let fileAttachments: Array<{ type: "file"; path: string; displayName?: string }> = [];
      const hasAttachments = attachments && attachments.length > 0;

      if (projectFiles && projectFiles.length > 0) {
        const projectPath = getProjectPath(projectId);
        for (const relPath of projectFiles) {
          try {
            const { resolve } = await import("node:path");
            const { existsSync } = await import("node:fs");
            const absPath = resolve(projectPath, relPath);
            if (!absPath.startsWith(projectPath)) {
              console.warn(`[Chat] project file path traversal blocked: ${relPath}`);
              continue;
            }
            if (!existsSync(absPath)) {
              console.warn(`[Chat] project file not found: ${relPath}`);
              continue;
            }
            fileAttachments.push({ type: "file", path: absPath, displayName: relPath });
          } catch (err) {
            console.warn(`[Chat] failed to resolve project file "${relPath}":`, err);
          }
        }
      }

      c.header("X-Accel-Buffering", "no");

      const clientDisconnectedRef = { value: false };
      c.req.raw.signal.addEventListener("abort", () => {
        clientDisconnectedRef.value = true;
        console.log(`[Chat] client disconnected for ${projectId.slice(0, 8)} — generation continues in background`);
      });

      const messageId = crypto.randomUUID();
      const bufferedEvents: BufferedEvent[] = [];
      const bufferSeqRef = { seq: 0 };
      const flushBuffer = (done: boolean, error?: string) => {
        const snapshot: StreamBuffer = {
          events: bufferedEvents,
          done,
          updatedAt: Date.now(),
        };
        if (error) snapshot.error = error;
        writeStreamBuffer(messageId, snapshot).catch(() => {});
      };

      activeRequests.set(projectId, { mode, startedAt: Date.now() });
      sql`INSERT INTO ai_active_streams (project_id, message_id) VALUES (${projectId}, ${messageId}) ON CONFLICT (project_id) DO UPDATE SET message_id = ${messageId}, started_at = now()`.catch(
        () => {},
      );
      flushBuffer(false);

      const aiOverrides = {
        copilotAccountId,
        providerId,
        provider: provider as ByokProviderConfig | undefined,
        model,
      };

      return streamSSE(c, async (stream) => {
        const wrapped = wrapStreamWithBuffer(
          stream,
          bufferedEvents,
          bufferSeqRef,
          flushBuffer,
          clientDisconnectedRef,
        );
        await executeSendStream({
          stream: wrapped,
          projectId,
          userId,
          content,
          displayContent,
          mode,
          attachments,
          messageId,
          augmentedContent,
          fileAttachments,
          hasAttachments: !!hasAttachments,
          aiOverrides,
          abortSignal: c.req.raw.signal,
          flushBuffer,
        });
      });
    },
  );
}
