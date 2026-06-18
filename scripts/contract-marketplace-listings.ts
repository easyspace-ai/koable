/**
 * Contract probe: GET /marketplace/listings response shape.
 *
 * Pins { data: Listing[], total: number } browse envelope.
 * Domain-agnostic fixture validation — no network required.
 */

function fail(msg: string): never {
  console.error(`contract-marketplace-listings FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: unknown, msg: string): void {
  if (!cond) fail(msg);
}

const fixture = {
  data: [
    {
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      slug: "vite-starter",
      title: "Vite Starter",
      short_desc: "A minimal Vite + React template",
      install_count: 42,
      avg_rating: 4.5,
      publisher_name: "Doable",
    },
  ],
  total: 128,
};

function validateMarketplaceListingsBody(body: unknown): void {
  assert(body && typeof body === "object" && !Array.isArray(body), "body is object envelope");
  const rec = body as Record<string, unknown>;
  assert("data" in rec, "body has data key");
  assert(Array.isArray(rec.data), "data is array");
  assert(typeof rec.total === "number", "total is number");
  assert(!("pagination" in rec), "browse uses total, not pagination envelope");
}

validateMarketplaceListingsBody(fixture);
validateMarketplaceListingsBody({ data: [], total: 0 });

console.log("contract-marketplace-listings: PASS");
