import test from "node:test";
import assert from "node:assert/strict";
import { createCombatRuntimeClient } from "../src/combat-studio/combat-runtime-client.js";

const response = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

test("runtime client refuses to guess an endpoint when not configured", async () => {
  const client = createCombatRuntimeClient({ fetchImpl: async () => { throw new Error("must not call"); } });
  assert.equal((await client.health()).status, "not-configured");
  assert.equal((await client.calculate({ player: {}, monsterId: 415 })).status, "not-configured");
});

test("health request targets the Worker health endpoint", async () => {
  let called;
  const client = createCombatRuntimeClient({
    baseUrl: "https://combat.example/",
    fetchImpl: async (url, options) => { called = { url, options }; return response({ status: "ok", service: "osrshub-combat-runtime" }); },
  });
  const result = await client.health();
  assert.equal(result.ok, true);
  assert.equal(called.url, "https://combat.example/health");
  assert.equal(called.options.method, "GET");
});

test("calculation posts the engine-native request and preserves calculated response", async () => {
  let called;
  const body = { player: { skills: { atk: 80 } }, monsterId: 415, style: "Melee" };
  const client = createCombatRuntimeClient({
    baseUrl: "https://combat.example",
    fetchImpl: async (url, options) => { called = { url, options }; return response({ status: "calculated", result: { dps: 2.1 } }); },
  });
  const result = await client.calculate(body);
  assert.equal(result.ok, true);
  assert.equal(result.status, "calculated");
  assert.equal(result.payload.result.dps, 2.1);
  assert.equal(called.url, "https://combat.example/api/calculate");
  assert.equal(called.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(called.options.body), body);
});

test("invalid request fails locally without contacting the Worker", async () => {
  let called = false;
  const client = createCombatRuntimeClient({ baseUrl: "https://combat.example", fetchImpl: async () => { called = true; } });
  const result = await client.calculate({ player: {}, monsterId: 0 });
  assert.equal(result.status, "invalid-request");
  assert.equal(called, false);
});

test("review-required responses stay explicit and do not become DPS results", async () => {
  const client = createCombatRuntimeClient({
    baseUrl: "https://combat.example",
    fetchImpl: async () => response({ status: "review-required", result: null, issues: ["Missing canonical weapon record"] }, 422),
  });
  const result = await client.calculate({ player: {}, monsterId: 415 });
  assert.equal(result.ok, false);
  assert.equal(result.status, "review-required");
  assert.deepEqual(result.issues, ["Missing canonical weapon record"]);
  assert.equal(result.payload.result, null);
});

test("network failures and malformed JSON are reported safely", async () => {
  const offline = createCombatRuntimeClient({ baseUrl: "https://combat.example", fetchImpl: async () => { throw new Error("secret network detail"); } });
  assert.equal((await offline.health()).status, "unavailable");

  const malformed = createCombatRuntimeClient({ baseUrl: "https://combat.example", fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new Error("bad json"); } }) });
  assert.equal((await malformed.health()).status, "invalid-response");
});
