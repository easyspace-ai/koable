import { getCopilotManager } from "../../ai/providers/copilot-manager.js";
import { getRateLimitState } from "../../ai/rate-limit-state.js";
import type { createInitialState } from "./types.js";

type StreamState = ReturnType<typeof createInitialState>;

export type StreamWatchdogs = {
  thinkingLoopWatchdog: ReturnType<typeof setInterval> | null;
  softHeartbeat: ReturnType<typeof setInterval>;
  abortState: { thinkingLoopAborted: boolean };
  clear: () => void;
};

export function createStreamWatchdogs(opts: {
  projectId: string;
  content: string;
  state: StreamState;
  stream: { writeSSE: (msg: { data: string }) => Promise<void> };
  abortSignal?: { dispatchEvent?: (e: Event) => void };
}): StreamWatchdogs {
  const { projectId, content, state, stream, abortSignal } = opts;
  const isBuildDeckTurn = content.trimStart().startsWith("BUILD_DECK");

  const thinkingAbortMs = (() => {
    const v = process.env.CHAT_THINKING_LOOP_ABORT_MS;
    const n = v === undefined || v === "" ? 180_000 : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 180_000;
  })();
  const thinkingGraceMs = (() => {
    const v = process.env.CHAT_THINKING_LOOP_GRACE_MS;
    const n = v === undefined || v === "" ? 15_000 : Number(v);
    return Number.isFinite(n) && n >= 0 ? n : 15_000;
  })();

  const abortState = { thinkingLoopAborted: false };
  const turnStartedAt = Date.now();

  const thinkingLoopWatchdog =
    thinkingAbortMs > 0
      ? setInterval(async () => {
          if (abortState.thinkingLoopAborted) return;
          const sinceTurnStart = Date.now() - turnStartedAt;
          if (sinceTurnStart < thinkingGraceMs) return;
          const realSilence = Date.now() - state.lastRealEventAt;
          if (realSilence < thinkingAbortMs) return;
          if (state.hadToolCalls) return;
          if (state.assistantContent.length > 0 || state.assistantThinking.length > 0) {
            state.lastRealEventAt = Date.now();
            return;
          }
          abortState.thinkingLoopAborted = true;
          console.warn(
            `[Chat][${projectId.slice(0, 8)}] thinking_loop watchdog firing — realSilence=${realSilence}ms, no tools, no content`,
          );
          state.traceCollector?.onError("thinking_loop", "STREAM", "thinking_loop_timeout");
          try {
            await stream.writeSSE({
              data: JSON.stringify({
                type: "error",
                data: "AI got stuck thinking. Please retry.",
              }),
            });
          } catch {}
          try {
            await getCopilotManager().evictEngine(projectId);
          } catch {}
          try {
            abortSignal?.dispatchEvent?.(new Event("abort"));
          } catch {}
        }, 5_000)
      : null;

  const softHeartbeat = setInterval(async () => {
    const sseSilence = Date.now() - state.lastSseEmitAt;
    if (sseSilence < 3_000) return;
    const realSilence = Date.now() - state.lastRealEventAt;
    let msg: string;
    if (isBuildDeckTurn) {
      if (realSilence < 15_000) msg = "Designing slide layouts\u2026";
      else if (realSilence < 45_000) msg = "Crafting slide content and styling\u2026";
      else if (realSilence < 120_000)
        msg = "Building detailed presentation \u2014 this may take a couple of minutes\u2026";
      else if (realSilence < 240_000)
        msg = "Finishing up your presentation \u2014 creating interactive slides\u2026";
      else msg = "Almost done \u2014 finalizing your presentation deck\u2026";
    } else if (realSilence < 15_000)
      msg = state.friendlyLastTool ? `Working on ${state.friendlyLastTool}\u2026` : "Thinking\u2026";
    else if (realSilence < 30_000)
      msg = state.friendlyLastTool ? `Still working on ${state.friendlyLastTool}\u2026` : "Still thinking\u2026";
    else {
      const rlState = getRateLimitState();
      if (rlState && Date.now() < rlState.nextRetryAt + 5_000) {
        const secsLeft = Math.max(0, Math.ceil((rlState.nextRetryAt - Date.now()) / 1000));
        const rawSnippet = rlState.rawError.slice(0, 200);
        msg = `⚠️ Provider error (${rlState.statusCode}): ${rawSnippet}\n\nRetrying in ${secsLeft}s\u2026 (attempt ${rlState.attempt}/${rlState.maxRetries})`;
      } else if (realSilence < 60_000) {
        msg = state.friendlyLastTool
          ? `Still working on ${state.friendlyLastTool}\u2026`
          : "Generating content \u2014 complex requests take a moment\u2026";
      } else {
        msg = "Waiting for AI provider response\u2026";
      }
    }
    try {
      await stream.writeSSE({
        data: JSON.stringify({ type: "status", data: { phase: "thinking", message: msg } }),
      });
      state.lastSseEmitAt = Date.now();
      state.sseFrameCount++;
    } catch {}
  }, 3_000);

  return {
    thinkingLoopWatchdog,
    softHeartbeat,
    abortState,
    clear: () => {
      clearInterval(softHeartbeat);
      if (thinkingLoopWatchdog) clearInterval(thinkingLoopWatchdog);
    },
  };
}
