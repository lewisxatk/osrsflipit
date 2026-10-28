import test from "node:test";
import assert from "node:assert/strict";
import { estimateLoadout, inferEquipmentSlot } from "../src/combat-studio/optimizer.js";

const items = [
  { id: 1, name: "Bronze full helm", equipment_slot: "Head", sell: 100, stab_attack: 1, requirements: {} },
  { id: 2, name: "Rune full helm", equipment_slot: "Head", sell: 30000, stab_attack: 10, requirements: { Defence: 40 } },
  { id: 3, name: "Bronze sword", equipment_slot: "Weapon", sell: 50, slash_attack: 4, melee_strength: 3 },
  { id: 4, name: "Rune scimitar", equipment_slot: "Weapon", sell: 15000, slash_attack: 45, melee_strength: 44, requirements: { Attack: 40 } },
  { id: 5, name: "Bronze platebody", equipment_slot: "Body", sell: 200, stab_attack: 0 },
];

test("slot resolver recognises canonical equipment slot labels", () => {
  assert.equal(inferEquipmentSlot(items[0]), "Head");
  assert.equal(inferEquipmentSlot(items[3]), "Weapon");
});

test("budget estimator stays inside budget and returns an explicit warning when data is missing", () => {
  const result = estimateLoadout({ items, style: "Melee", budget: 1000, stats: { Attack: 1, Defence: 1 }, accountAware: false });
  assert.ok(result.totalCost <= 1000);
  assert.ok(result.slots.length > 0);
  const empty = estimateLoadout({ items: [], budget: 1000, style: "Melee" });
  assert.ok(empty.warnings.length > 0);
});

test("account-aware mode excludes gear with known unmet level requirements", () => {
  const result = estimateLoadout({ items, style: "Melee", budget: 100000, stats: { Attack: 1, Defence: 1, Strength: 1 }, quests: [], accountAware: true });
  assert.ok(!result.slots.some(([, name]) => name === "Rune full helm" || name === "Rune scimitar"));
});
