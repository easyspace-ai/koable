/**
 * BUG-TRACE-002 instrumentation helper for post-stream phases.
 */
export async function tracePhase<T>(
  state: {
    traceCollector?: { pushRaw: (type: string, data: unknown) => void } | null;
  },
  phase: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  state.traceCollector?.pushRaw("post_processing_phase_start", { phase });
  let pingTicks = 0;
  const pinger = setInterval(() => {
    pingTicks += 1;
    state.traceCollector?.pushRaw("post_processing_phase_pending", {
      phase,
      elapsed_ms: Date.now() - startedAt,
      ping: pingTicks,
    });
  }, 5_000);
  try {
    return await fn();
  } catch (err) {
    state.traceCollector?.pushRaw("post_processing_phase_error", {
      phase,
      elapsed_ms: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  } finally {
    clearInterval(pinger);
    state.traceCollector?.pushRaw("post_processing_phase_end", {
      phase,
      duration_ms: Date.now() - startedAt,
    });
  }
}
