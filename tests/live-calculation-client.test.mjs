import test from "node:test";
import assert from "node:assert/strict";
import { calculateLiveCombat, normaliseRuntimeUrl } from "../src/combat-studio/live-calculation-client.js";

const validRequest = { player: { name: "Tester" }, monsterId: 8059 };
const health = () => new Response(JSON.stringify({ status: "ok", service: "osrshub-combat-runtime" }), { status: 200 });
const calculated = () => new Response(JSON.stringify({
  status: "calculated", issues: [],
  result: { monster: { id: 8059, name: "Vorkath" }, dps: 4.2, maxHit: 48, accuracy: 0.63, attackRoll: 100, npcDefenceRoll: 200, attackSpeed: 4, issues: [] },
}), { status: 200 });

test("normalises trailing slashes without inventing a default endpoint", () => {
  assert.equal(normaliseRuntimeUrl(" https://example.workers.dev/// "), "https://example.workers.dev");
  assert.equal(normaliseRuntimeUrl(" "), "");
});

test("refuses to call a runtime when no explicit URL is configured", async () => {
  let calls = 0;
  const result = await calculateLiveCombat({ request: validRequest, fetchImpl: async () => { calls++; return health(); } });
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 0);
  assert.match(result.issues[0], /VITE_COMBAT_RUNTIME_URL/);
});

test("checks health first and returns a validated real result", async () => {
  const calls = [];
  const result = await calculateLiveCombat({
    baseUrl: "https://example.workers.dev/",
    request: validRequest,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? health() : calculated();
    },
  });
  assert.equal(result.status, "calculated");
  assert.equal(result.result.dps, 4.2);
  assert.equal(calls[0].url, "https://example.workers.dev/health");
  assert.equal(calls[1].url, "https://example.workers.dev/api/calculate");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), validRequest);
});

test("does not submit a calculation if health check fails", async () => {
  let calls = 0;
  const result = await calculateLiveCombat({
    baseUrl: "https://example.workers.dev",
    request: validRequest,
    fetchImpl: async () => { calls++; return new Response("{}", { status: 503 }); },
  });
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
});

test("rejects malformed and non-finite successful payloads", async () => {
  const bad = new Response(JSON.stringify({ status: "calculated", result: { dps: "4", maxHit: 3 } }), { status: 200 });
  const result = await calculateLiveCombat({
    baseUrl: "https://example.workers.dev", request: validRequest,
    fetchImpl: async () => arguments.length ? health() : bad,
  });
  assert.notEqual(result.status, "calculated");
});

test("preserves structured validation issues from the engine", async () => {
  const rejected = new Response(JSON.stringify({ status: "review-required", result: null, issues: ["unknown canonical item"] }), { status: 422 });
  let calls = 0;
  const result = await calculateLiveCombat({
    baseUrl: "https://example.workers.dev", request: validRequest,
    fetchImpl: async () => (++calls === 1 ? health() : rejected),
  });
  assert.equal(result.status, "review-required");
  assert.deepEqual(result.issues, ["unknown canonical item"]);
});

test("rejects a request without a canonical monster ID before network access", async () => {
  let calls = 0;
  const result = await calculateLiveCombat({
    baseUrl: "https://example.workers.dev", request: { player: {}, monsterId: "8059" },
    fetchImpl: async () => { calls++; return health(); },
  });
  assert.equal(result.status, "review-required");
  assert.equal(calls, 0);
});
