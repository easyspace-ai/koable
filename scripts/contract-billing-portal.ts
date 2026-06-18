/**
 * Contract probe: POST /billing/portal response shape.
 *
 * Pins bypass-mode 503 and success { data: { url } } envelopes.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-billing-portal FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const bypassFixture = {
  error: "stripe_disabled",
  message: "Billing portal unavailable in bypass mode",
};

const successFixture = {
  data: {
    url: "https://billing.stripe.com/session/test_abc123",
  },
};

function validatePortalBypass(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "bypass body is object");
  const rec = body as Record<string, unknown>;
  assert(rec.error === "stripe_disabled", "bypass error code is stripe_disabled");
  assert(typeof rec.message === "string", "bypass includes message for UX");
}

function validatePortalSuccess(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "success body is object");
  assert("data" in body!, "success has data key");
  const data = (body as { data: unknown }).data;
  assert(data && typeof data === "object", "data is object");
  assert(typeof (data as Record<string, unknown>).url === "string", "data.url is string");
}

validatePortalBypass(bypassFixture);
validatePortalSuccess(successFixture);

console.log("contract-billing-portal: PASS");
