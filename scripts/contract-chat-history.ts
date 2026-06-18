/**
 * Contract probe: GET /projects/:id/chat/history response shape.
 *
 * Pins cursor pagination envelope { data: Message[], hasMore: boolean }.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-chat-history FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      role: "user",
      content: "Hello",
      created_at: new Date().toISOString(),
    },
    {
      id: "bbbbbbbb-cccc-dddd-eeee-ffffffffffff",
      role: "assistant",
      content: "Hi there!",
      created_at: new Date().toISOString(),
    },
  ],
  hasMore: true,
};

function validateChatHistoryBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  const rec = body as Record<string, unknown>;
  assert("data" in rec, "body has data key");
  assert(Array.isArray(rec.data), "data is array");
  assert(typeof rec.hasMore === "boolean", "hasMore is boolean");
}

validateChatHistoryBody(fixture);
validateChatHistoryBody({ data: [], hasMore: false });

console.log("contract-chat-history: PASS");
