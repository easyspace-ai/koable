/**
 * In-stream HTML injection for preview proxy responses.
 */
export type InjectionTask = {
  patterns: { regex: RegExp; insertBefore: boolean }[];
  snippet: string;
};

/**
 * Build a TransformStream that performs in-stream HTML injection without
 * buffering the entire response body.
 */
export function makeInjectionStream(
  tasks: InjectionTask[],
): TransformStream<Uint8Array, Uint8Array> {
  let taskIdx = 0;
  let buffered = "";
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const MAX_BUFFER = 64 * 1024;

  function tryInject(
    controller: TransformStreamDefaultController<Uint8Array>,
    atEof: boolean,
  ): void {
    while (taskIdx < tasks.length) {
      const task = tasks[taskIdx];
      if (!task) break;
      let matched: { idx: number; len: number; insertBefore: boolean } | null = null;
      for (const { regex, insertBefore } of task.patterns) {
        const m = buffered.match(regex);
        if (m && typeof m.index === "number") {
          matched = { idx: m.index, len: m[0].length, insertBefore };
          break;
        }
      }
      if (matched) {
        const insertAt = matched.insertBefore ? matched.idx : matched.idx + matched.len;
        const before = buffered.slice(0, insertAt);
        const after = buffered.slice(insertAt);
        controller.enqueue(encoder.encode(before + task.snippet));
        buffered = after;
        taskIdx++;
        continue;
      }
      if (atEof || buffered.length >= MAX_BUFFER) {
        controller.enqueue(encoder.encode(buffered + task.snippet));
        buffered = "";
        taskIdx++;
        continue;
      }
      return;
    }
  }

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (taskIdx >= tasks.length) {
        controller.enqueue(chunk);
        return;
      }
      buffered += decoder.decode(chunk, { stream: true });
      tryInject(controller, false);
      if (taskIdx >= tasks.length && buffered.length > 0) {
        controller.enqueue(encoder.encode(buffered));
        buffered = "";
      }
    },
    flush(controller) {
      buffered += decoder.decode();
      tryInject(controller, true);
      if (buffered.length > 0) {
        controller.enqueue(encoder.encode(buffered));
        buffered = "";
      }
    },
  });
}
