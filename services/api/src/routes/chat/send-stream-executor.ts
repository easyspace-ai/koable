/**
 * SSE stream body for POST /projects/:id/chat.
 * Extracted from send-handler.ts to keep the route orchestrator under 400 lines.
 */
import { sql } from "../../db/index.js";
import { createAllTools, onToolEvent, type ByokProviderConfig } from "../../ai/providers/copilot.js";
import { getCopilotManager } from "../../ai/providers/copilot-manager.js";
import { createUsageCollector } from "../../ai/usage-collector.js";
import { createTraceCollector } from "../../ai/trace-collector.js";
import { creditQueries } from "@doable/db/queries/credits";
import { getProjectPath } from "../../projects/file-manager.js";
import { resolveAiEngine } from "../../ai/engine-resolver.js";
import { buildProjectContextForMode, parseSkillInvocations } from "../../ai/context-builder.js";
import { materializeSkillsForSession } from "../../ai/skills-materializer.js";
import { processAttachments } from "../../ai/attachments.js";
import { ChannelTokenRouter } from "../../ai/sse-mapper.js";
import { stripServerPaths } from "../../ai/tool-messages.js";
import { broadcastToRoom } from "../../ai/yjs-bridge.js";
import type { SSEStreamingApi } from "hono/streaming";
import { projectSessions } from "./session-state.js";
import { createInitialState } from "./types.js";
import { buildSystemPrompt } from "./system-prompts.js";
import { createRecordAssistantToolCall, createToolProgressCallbacks } from "./tool-callbacks.js";
import { createProcessEvent } from "./event-processor.js";
import { popArtifacts } from "./artifact-stash.js";
import { scaffoldAndStartDev, emitConfigTraces, logToolManifest, handleToolEndEvent } from "./send-helpers.js";
import {
  checkAndEvictOnModeChange,
  checkAndEvictOnProviderChange,
  resolveSession,
  persistSessionToDb,
  filterToolsForMode,
  recreateSession,
} from "./session-manager.js";
import { resolveUserDisplay, saveUserMessage, preInsertAssistantMessage } from "./message-persistence.js";
import { handleAutoContinue, handleEmptyResponseRetry } from "./stream-recovery.js";
import { handleAutoFixPreview, handleVersionAndMemory, handleFinalCleanup, handleStreamError } from "./post-processing.js";
import {
  shouldBufferType,
  type BufferedEvent,
} from "./stream-buffer.js";
import { tracePhase } from "./stream-phase-trace.js";
import { createStreamWatchdogs } from "./stream-watchdogs.js";
import { assertToolCapableModel } from "./model-validation.js";
import { assertModelHasProvider, PROVIDER_BACKED_MODEL_SOURCES } from "./send-schema.js";
import type { SendMessageInput } from "./send-schema.js";

export interface SendStreamContext {
  stream: SSEStreamingApi;
  projectId: string;
  userId: string;
  content: string;
  displayContent?: string;
  mode: SendMessageInput["mode"];
  attachments?: SendMessageInput["attachments"];
  messageId: string;
  augmentedContent: string;
  fileAttachments: Array<{ type: "file"; path: string; displayName?: string }>;
  hasAttachments: boolean;
  aiOverrides: {
    copilotAccountId?: string;
    providerId?: string;
    provider?: ByokProviderConfig;
    model?: string;
  };
  abortSignal: AbortSignal;
  flushBuffer: (done: boolean, error?: string) => void;
}

/** Wrap writeSSE to mirror events to KV buffer and tolerate client disconnect. */
export function wrapStreamWithBuffer(
  stream: SSEStreamingApi,
  bufferedEvents: BufferedEvent[],
  bufferSeqRef: { seq: number },
  flushBuffer: (done: boolean, error?: string) => void,
  clientDisconnected: { value: boolean },
): SSEStreamingApi {
  const originalWriteSSE = stream.writeSSE.bind(stream);
  stream.writeSSE = async (message) => {
    try {
      const raw = typeof message.data === "string" ? message.data : "";
      if (raw && raw !== "[DONE]") {
        const parsed = JSON.parse(raw) as { type?: string; data?: unknown };
        if (parsed && typeof parsed.type === "string" && shouldBufferType(parsed.type)) {
          bufferSeqRef.seq += 1;
          bufferedEvents.push({
            seq: bufferSeqRef.seq,
            type: parsed.type,
            data: parsed.data,
            ts: Date.now(),
          });
          flushBuffer(false);
        }
      }
    } catch {
      // Non-JSON payloads (e.g. "[DONE]") — skip buffer mirror.
    }
    if (clientDisconnected.value) return;
    try {
      await originalWriteSSE(message);
    } catch {
      clientDisconnected.value = true;
    }
  };
  return stream;
}

export async function executeSendStream(ctx: SendStreamContext): Promise<void> {
  const {
    projectId,
    userId,
    content,
    displayContent,
    mode,
    attachments,
    messageId,
    hasAttachments,
    aiOverrides,
    abortSignal,
    flushBuffer,
  } = ctx;
  let augmentedContent = ctx.augmentedContent;
  let fileAttachments = ctx.fileAttachments;
  const stream = ctx.stream;

  const state = createInitialState();
  const keepAlive = setInterval(async () => {
    try {
      await stream.writeSSE({ data: JSON.stringify({ type: "keep_alive" }) });
    } catch {
      /* ignore */
    }
  }, 10_000);

  const watchdogs = createStreamWatchdogs({
    projectId,
    content,
    state,
    stream,
    abortSignal: abortSignal as unknown as { dispatchEvent?: (e: Event) => void },
  });
  const recordAssistantToolCall = createRecordAssistantToolCall(state);

  try {
    await stream.writeSSE({ data: JSON.stringify({ type: "thinking", data: "Preparing workspace..." }) });

    if (hasAttachments && attachments) {
      const attachmentNames = attachments.map((a) => a.name || "file").join(", ");
      await stream.writeSSE({
        data: JSON.stringify({
          type: "status",
          data: { phase: "thinking", message: `Analyzing ${attachmentNames}...` },
        }),
      });
      const processed = await processAttachments(attachments, content);
      augmentedContent = processed.augmentedPrompt;
      fileAttachments = [...fileAttachments, ...processed.fileAttachments];
      await stream.writeSSE({
        data: JSON.stringify({
          type: "status",
          data: { phase: "thinking", message: "Attachment processed — setting up project..." },
        }),
      });
    }

    await scaffoldAndStartDev(projectId, stream, userId);
    await stream.writeSSE({ data: JSON.stringify({ type: "thinking", data: " Connecting to AI model...\n" }) });
    await stream.writeSSE({
      data: JSON.stringify({ type: "status", data: { phase: "thinking", message: "Connecting to AI..." } }),
    });

    const sessionKey = mode === "visual-edit" ? `${projectId}:visual-edit` : projectId;
    const [aiConfig, workspaceRow] = await Promise.all([
      resolveAiEngine(projectId, userId, aiOverrides),
      sql`SELECT workspace_id FROM projects WHERE id = ${projectId}`.catch(() => []),
    ]);
    const {
      model: resolvedModel,
      provider: resolvedProvider,
      githubToken: resolvedGithubToken,
      providerId: resolvedProviderId,
      modelSource,
      providerSource,
    } = aiConfig;
    const workspaceId: string | undefined = workspaceRow[0]?.workspace_id;

    await assertToolCapableModel(resolvedProviderId, resolvedModel);
    assertModelHasProvider(resolvedModel, resolvedProvider, modelSource);

    state.usageCollector = workspaceId
      ? createUsageCollector({
          userId,
          workspaceId,
          projectId,
          provider: resolvedProvider ? "byok" : "copilot",
          providerLabel: resolvedProvider?.type ?? "GitHub Copilot",
          byokProviderId: aiOverrides.providerId,
          mode,
        })
      : null;
    state.traceCollector = workspaceId
      ? createTraceCollector({
          projectId,
          userId,
          workspaceId,
          provider: resolvedProvider ? "byok" : "copilot",
          providerLabel: resolvedProvider?.type ?? "GitHub Copilot",
          model: resolvedModel,
        })
      : null;
    state.traceCollector?.onRequestStart(augmentedContent?.length ?? null, mode ?? "agent", !!(attachments?.length));
    state.traceCollector?.onStreamStart();
    state.traceCollector?.recordUserMessage(augmentedContent);

    if (!resolvedProvider && !resolvedGithubToken) {
      if (resolvedModel && PROVIDER_BACKED_MODEL_SOURCES.has(modelSource)) {
        const orphanMsg = `No AI provider configured for the selected model "${resolvedModel}". Open AI Settings and pick a model from a connected provider.`;
        state.traceCollector?.onError(orphanMsg, "AUTH", "orphaned_model_no_provider");
        throw new Error(orphanMsg);
      }
      let isWorkspaceOwner = false;
      if (workspaceId) {
        const [ownerRow] = await sql<{ owner_id: string }[]>`SELECT owner_id FROM workspaces WHERE id = ${workspaceId}`;
        isWorkspaceOwner = ownerRow?.owner_id === userId;
      }
      const hasCLIFallback = process.env.NODE_ENV !== "production" && isWorkspaceOwner;
      console.log(
        `[Chat][${projectId.slice(0, 8)}] No provider/token — hasCLIFallback=${hasCLIFallback} (isOwner=${isWorkspaceOwner}, NODE_ENV=${process.env.NODE_ENV})`,
      );
      if (!hasCLIFallback) {
        const missingAuthMsg =
          "AI is not configured for this workspace/user. Connect a GitHub Copilot account or add a custom provider key in Settings > AI.";
        state.traceCollector?.onError(missingAuthMsg, "AUTH", "missing_auth_or_provider");
        throw new Error(missingAuthMsg);
      }
    } else {
      console.log(
        `[Chat][${projectId.slice(0, 8)}] Auth resolved — provider=${!!resolvedProvider}, githubToken=${!!resolvedGithubToken}`,
      );
    }

    console.log(`[Chat][${projectId.slice(0, 8)}] Building context + tools...`);
    const { invokedSkillNames, cleanMessage } = parseSkillInvocations(content);
    if (invokedSkillNames.length > 0) {
      console.log(`[Chat][${projectId.slice(0, 8)}] Skill invocation: ${invokedSkillNames.join(", ")}`);
      augmentedContent = cleanMessage + (augmentedContent !== content ? augmentedContent.slice(content.length) : "");
    }
    const [projectContext, allTools] = await Promise.all([
      buildProjectContextForMode(projectId, mode, workspaceId, userId, {
        invokedSkillNames,
        userMessage: content,
      }),
      createAllTools(projectId, workspaceId, userId),
    ]);
    const systemPrompt = await buildSystemPrompt(mode, projectId, projectContext);
    const projectPath = getProjectPath(projectId);
    emitConfigTraces(
      state.traceCollector,
      resolvedModel,
      modelSource,
      resolvedProvider,
      providerSource,
      resolvedGithubToken,
      systemPrompt,
      projectContext,
    );

    const sessionTools = await filterToolsForMode(allTools, mode);
    logToolManifest(allTools, sessionTools, mode, projectId, state.traceCollector);

    const toolProgress = createToolProgressCallbacks(stream, state, state.traceCollector, recordAssistantToolCall, projectId);
    const modeChanged = checkAndEvictOnModeChange(sessionKey, mode, state.traceCollector);
    await checkAndEvictOnProviderChange(projectId, sessionKey, resolvedProvider, resolvedModel, state.traceCollector);

    let skillDirectories: string[] | undefined;
    if (workspaceId) {
      try {
        const mat = await materializeSkillsForSession({ workspaceId, projectId, userId });
        skillDirectories = mat.skillDirectories.length > 0 ? mat.skillDirectories : undefined;
      } catch (err) {
        console.warn(
          `[Chat][${projectId.slice(0, 8)}] Skills materialization failed:`,
          err instanceof Error ? err.message : err,
        );
      }
    }

    let sessionId = await resolveSession(
      projectId,
      userId,
      sessionKey,
      mode,
      modeChanged,
      resolvedModel,
      resolvedProvider,
      resolvedGithubToken,
      projectPath,
      systemPrompt,
      sessionTools,
      toolProgress,
      state.traceCollector,
      stream,
      skillDirectories,
    );
    const dbSessionId = await persistSessionToDb(projectId, userId, mode, sessionId);
    state.usageCollector?.setSessionId(dbSessionId);

    const { displayName, color } = await resolveUserDisplay(userId);
    await saveUserMessage(dbSessionId, displayContent ?? content, userId, displayName, color, attachments);
    broadcastToRoom(
      projectId,
      { type: "ai:message-sent", userId, displayName, content: content.slice(0, 200), messageId },
      userId,
    ).catch(() => {});

    state.assistantMessageId = await preInsertAssistantMessage(dbSessionId);

    const unsubToolEvents = onToolEvent(projectId, (toolName, status, args) => {
      if (status === "start") {
        const fileName = args?.path ?? args?.filePath ?? args?.file ?? args?.name ?? args?.target ?? "";
        const shortName = typeof fileName === "string" ? (fileName.split("/").pop() ?? "") : "";
        if (shortName) {
          let statusMsg = "";
          if (toolName.toLowerCase().includes("create") || toolName.toLowerCase().includes("write"))
            statusMsg = `Creating ${shortName}...`;
          else if (toolName.toLowerCase().includes("edit") || toolName.toLowerCase().includes("update"))
            statusMsg = `Updating ${shortName}...`;
          else if (toolName.toLowerCase().includes("read")) statusMsg = `Reading ${shortName}...`;
          else if (toolName.toLowerCase().includes("delete")) statusMsg = `Deleting ${shortName}...`;
          else statusMsg = `Working on ${shortName}...`;
          const ssePayload = { type: "status", data: { phase: "building", message: statusMsg } };
          stream.writeSSE({ data: JSON.stringify(ssePayload) }).catch(() => {});
          broadcastToRoom(projectId, { type: "ai:status", messageId, data: ssePayload.data }, userId).catch(() => {});
        }
      }
      if (status !== "end") return;
      handleToolEndEvent(stream, toolName, args, projectId);
    });
    const releaseTracker = getCopilotManager().trackRequest(projectId);

    try {
      const manager = getCopilotManager();
      console.log(`[Chat][${projectId.slice(0, 8)}] Getting engine (githubToken=${!!resolvedGithubToken})...`);
      let currentEngine = await manager.getEngine(projectId, resolvedGithubToken);
      console.log(`[Chat][${projectId.slice(0, 8)}] Engine acquired, preparing to send...`);
      if (mode === "plan" && sessionId) {
        try {
          await currentEngine.setSessionMode(sessionId, "plan");
          state.traceCollector?.onSessionModeSwitch(sessionId, "interactive", "plan");
        } catch (err) {
          console.warn(`[Chat] setSessionMode(plan) failed:`, err instanceof Error ? err.message : err);
        }
      }
      const channelRouter = new ChannelTokenRouter();
      await stream.writeSSE({
        data: JSON.stringify({ type: "status", data: { phase: "thinking", message: "Waiting for AI model to respond..." } }),
      });

      const processEvent = createProcessEvent(
        stream,
        state,
        channelRouter,
        projectId,
        userId,
        messageId,
        mode,
        recordAssistantToolCall,
        (sid, reqId, action) =>
          currentEngine.respondToExitPlanMode(sid, reqId, action).catch((e: unknown) =>
            console.warn("[Chat] respondToExitPlanMode failed:", e instanceof Error ? e.message : e),
          ),
        () => sessionId,
      );

      try {
        await currentEngine.sendMessage(
          sessionId!,
          augmentedContent,
          fileAttachments.length > 0 ? fileAttachments : undefined,
          processEvent,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("not found") || msg.includes("not started") || msg.includes("stopped")) {
          console.log(`[Chat] Session/engine lost for ${projectId}: ${msg.slice(0, 80)}`);
          state.traceCollector?.onSessionEvict(sessionId!, `session_lost:${msg.slice(0, 80)}`);
          stream
            .writeSSE({
              data: JSON.stringify({ type: "status", data: { phase: "reconnecting", message: "Reconnecting to AI..." } }),
            })
            .catch(() => {});
          const recreated = await recreateSession(
            projectId,
            userId,
            sessionKey,
            mode,
            resolvedModel,
            resolvedProvider,
            resolvedGithubToken,
            projectPath,
            systemPrompt,
            toolProgress,
            state.traceCollector,
            workspaceId,
            dbSessionId,
            skillDirectories,
          );
          sessionId = recreated.sessionId;
          currentEngine = recreated.engine;
          await currentEngine.sendMessage(
            sessionId,
            augmentedContent,
            fileAttachments.length > 0 ? fileAttachments : undefined,
            processEvent,
          );
        } else {
          throw err;
        }
      }

      for (const chunk of channelRouter.flush()) {
        if (!chunk.content) continue;
        if (chunk.type === "text") {
          state.assistantContent += chunk.content;
          await stream.writeSSE({ data: JSON.stringify({ type: "text_delta", data: chunk.content }) });
        } else if (chunk.type === "thinking") {
          state.assistantThinking += chunk.content;
          await stream.writeSSE({ data: JSON.stringify({ type: "thinking", data: stripServerPaths(chunk.content) }) });
        } else {
          state.sawToolDelta = true;
          await stream.writeSSE({ data: JSON.stringify({ type: "tool_delta", data: chunk.content }) });
        }
      }

      if (state.leadingTextBuffer) {
        const bufLen = state.leadingTextBuffer.length;
        if (!state.hadToolCalls && state.assistantContent.length === 0) {
          const buffered = state.leadingTextBuffer;
          state.leadingTextBuffer = "";
          state.leadingTextFlushed = true;
          const visibleContent = buffered.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
          if (visibleContent) {
            state.assistantThinking = state.assistantThinking.slice(0, state.assistantThinking.length - buffered.length);
            state.assistantContent += visibleContent;
            console.log(
              `[Chat][${projectId.slice(0, 8)}] Flushing ${visibleContent.length} chars as content (stripped from ${bufLen} buffer, no tools)`,
            );
            broadcastToRoom(
              projectId,
              { type: "ai:stream-chunk", chunk: visibleContent, messageId, isThinking: false },
              userId,
            ).catch(() => {});
            await stream.writeSSE({ data: JSON.stringify({ type: "thinking_to_text", data: visibleContent }) });
          } else {
            console.log(`[Chat][${projectId.slice(0, 8)}] Keeping ${bufLen} chars as thinking (all thinking, no visible content)`);
          }
        } else {
          state.leadingTextBuffer = "";
          state.leadingTextFlushed = true;
          console.log(`[Chat][${projectId.slice(0, 8)}] Keeping ${bufLen} chars as thinking (stream end, hadTools=${state.hadToolCalls})`);
        }
      }

      console.log(
        `[Chat][${projectId.slice(0, 8)}] stream done — content: ${state.assistantContent.length}, thinking: ${state.assistantThinking.length}, tools: ${state.hadToolCalls}`,
      );
      state.traceCollector?.pushRaw("post_stream_boundary", {
        phase: "sdk_stream_resolved",
        content_chars: state.assistantContent.length,
        thinking_chars: state.assistantThinking.length,
        had_tool_calls: state.hadToolCalls,
      });

      const contentBeforeRecovery = state.assistantContent.length;
      await tracePhase(state, "auto_continue", () =>
        handleAutoContinue(stream, state, currentEngine, sessionId!, projectId, mode, recordAssistantToolCall, content),
      );
      await tracePhase(state, "empty_response_retry", () =>
        handleEmptyResponseRetry(stream, state, currentEngine, sessionId!, projectId, augmentedContent, fileAttachments),
      );

      if (!state.hadToolCalls && state.sawToolDelta) {
        await stream.writeSSE({
          data: JSON.stringify({
            type: "error",
            data: "This model streamed tool-like text but did not execute any tools. Switch to a model with tool calling support in AI Settings.",
          }),
        });
      }

      if (state.deferredError && state.assistantContent.length <= contentBeforeRecovery) {
        console.log(`[Chat][${projectId.slice(0, 8)}] emitting deferred error (no recovery): ${state.deferredError.slice(0, 80)}`);
        await stream.writeSSE({ data: JSON.stringify({ type: "error", data: state.deferredError }) });
      } else if (state.deferredError) {
        console.log(
          `[Chat][${projectId.slice(0, 8)}] swallowed deferred error — auto-continue recovered (${state.assistantContent.length - contentBeforeRecovery} chars added)`,
        );
      }
      state.deferredError = undefined;

      for (const pendingName of state.pendingToolNames) {
        const arts = state.pendingArtifacts.get(pendingName) ?? popArtifacts(pendingName);
        const data: Record<string, unknown> = { name: pendingName, success: true, friendlyMessage: "Done" };
        if (arts && arts.length > 0) {
          data.artifacts = arts;
          state.pendingArtifacts.delete(pendingName);
        }
        await stream.writeSSE({ data: JSON.stringify({ type: "tool_result", data }) });
      }
      state.pendingToolNames.length = 0;
      for (const [toolName, arts] of state.pendingArtifacts.entries()) {
        if (arts.length === 0) continue;
        await stream.writeSSE({
          data: JSON.stringify({
            type: "tool_result",
            data: { name: toolName, success: true, friendlyMessage: "Done", artifacts: arts },
          }),
        });
      }
      state.pendingArtifacts.clear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not authorized") || msg.includes("policy") || msg.includes("unauthorized")) {
        const manager = getCopilotManager();
        await manager.evictEngine(projectId);
        state.traceCollector?.onSessionEvict(sessionId ?? "unknown", `auth_error:${msg.slice(0, 80)}`);
        projectSessions.delete(sessionKey);
        console.log("[Chat] Evicted stale engine after streaming auth error");
      }
      await stream.writeSSE({ data: JSON.stringify({ type: "error", data: msg }) });
    } finally {
      unsubToolEvents();
      releaseTracker();
      clearInterval(watchdogs.softHeartbeat);
      watchdogs.clear();
      console.log(`[Chat] AI streaming complete for ${projectId}, starting post-processing...`);
    }

    if (!watchdogs.abortState.thinkingLoopAborted) {
      await tracePhase(state, "auto_fix_preview", () =>
        handleAutoFixPreview(stream, state, projectId, resolvedGithubToken, sessionId!),
      );
      await tracePhase(state, "version_and_memory", () =>
        handleVersionAndMemory(stream, state, projectId, userId, content, messageId),
      );
    }
    await tracePhase(state, "final_cleanup", () =>
      handleFinalCleanup(stream, state, projectId, mode, keepAlive, watchdogs.softHeartbeat),
    );

    flushBuffer(true);

    const didRealWork = !!state.assistantContent || !!state.assistantThinking || state.hadToolCalls;
    if (workspaceId && didRealWork && !watchdogs.abortState.thinkingLoopAborted) {
      try {
        const credits = creditQueries(sql);
        const result = await credits.consumeCredits(userId, workspaceId, 1, {
          actionType: "chat_message",
          projectId,
        });
        if (!result.success) {
          console.warn(
            `[Chat] Credit consumption failed (remaining=${result.remaining}) for user=${userId.slice(0, 8)} ws=${workspaceId.slice(0, 8)}`,
          );
        }
      } catch (err) {
        console.warn("[Chat] Failed to consume credit:", err instanceof Error ? err.message : err);
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (watchdogs.thinkingLoopWatchdog) clearInterval(watchdogs.thinkingLoopWatchdog);
    await handleStreamError(stream, state, err, projectId, keepAlive, watchdogs.softHeartbeat);
    flushBuffer(true, errMsg);
  }
}
