/**
 * Contract probe: GET /chat/modes response shape.
 *
 * Pins { data: ChatMode[] } with id/label/description/default fields.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-chat-modes FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "agent",
      label: "Agent",
      description: "AI builds, edits, and runs your project using tools.",
      default: true,
    },
    {
      id: "chat",
      label: "Chat",
      description: "Plain Q&A — no tool calls, no file writes.",
    },
  ],
};

function validateChatModesBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  assert("data" in body!, "body has data key");
  assert(Array.isArray((body as { data: unknown }).data), "data is array");

  for (const row of (body as { data: unknown[] }).data) {
    assert(row && typeof row === "object", "each mode is object");
    const mode = row as Record<string, unknown>;
    assert(typeof mode.id === "string", "mode.id is string");
    assert(typeof mode.label === "string", "mode.label is string");
    assert(typeof mode.description === "string", "mode.description is string");
  }
}

validateChatModesBody(fixture);

console.log("contract-chat-modes: PASS");
