import test from "node:test";
import assert from "node:assert/strict";
import { summariseLiveComparison } from "../src/combat-studio/live-loadout-comparison.js";

const result = overrides => ({
  dps: 5, maxHit: 40, accuracy: 0.7, attackRoll: 12000,
  npcDefenceRoll: 8000, attackSpeed: 4, ...overrides
});

test("compares verified combat results and computes relative DPS change", () => {
  const summary = summariseLiveComparison(result(), result({ dps: 6, maxHit: 44, accuracy: 0.75, attackSpeed: 5 }));
  assert.equal(summary.ok, true);
  assert.equal(summary.deltaDps, 1);
  assert.equal(summary.deltaPercent, 20);
  assert.equal(summary.deltaMaxHit, 4);
  assert.equal(summary.deltaAccuracy, 0.05);
  assert.equal(summary.deltaAttackSpeed, 1);
});

test("does not divide by zero when baseline DPS is zero", () => {
  const summary = summariseLiveComparison(result({ dps: 0 }), result({ dps: 1 }));
  assert.equal(summary.ok, true);
  assert.equal(summary.deltaPercent, null);
});

test("rejects incomplete results instead of inventing missing metrics", () => {
  const summary = summariseLiveComparison(result(), result({ accuracy: undefined }));
  assert.equal(summary.ok, false);
  assert.ok(summary.issues.some(issue => issue.includes("finite accuracy")));
});

test("rejects missing calculation outputs", () => {
  const summary = summariseLiveComparison(null, result());
  assert.equal(summary.ok, false);
  assert.ok(summary.issues.some(issue => issue.includes("no verified calculation result")));
});
