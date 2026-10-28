import test from "node:test";
import assert from "node:assert/strict";
import { buildCombatRequest, normaliseAccountSkills, normaliseEquipmentSlots } from "../src/combat-studio/engine-adapter.js";

const completeStats = {
  Attack: 80, Strength: 86, Defence: 80, Hitpoints: 90,
  Ranged: 93, Magic: 84, Prayer: 77, Mining: 70, Herblore: 70, Farming: 70
};

test("account skills normalise OSRS Hub display names to engine keys", () => {
  const result = normaliseAccountSkills(completeStats);
  assert.deepEqual(result.errors, []);
  assert.equal(result.skills.atk, 80);
  assert.equal(result.skills.str, 86);
  assert.equal(result.skills.ranged, 93);
});

test("missing account levels are reported rather than fabricated", () => {
  const result = normaliseAccountSkills({ Attack: 80 });
  assert.ok(result.missingSkills.includes("str"));
  assert.ok(result.errors.length > 0);
  assert.equal(result.skills.str, undefined);
});

test("equipment slots require canonical item IDs", () => {
  const result = normaliseEquipmentSlots([
    ["Weapon", { name: "Dragon hunter lance" }],
    ["Head", { id: 11864, name: "Neitiznot faceguard" }]
  ]);
  assert.equal(result.equipment.head.id, 11864);
  assert.equal(result.equipment.weapon, null);
  assert.match(result.errors[0], /canonical item ID/);
});

test("request fails closed for unresolved target and invalid style", () => {
  const result = buildCombatRequest({ stats: completeStats, slots: [], target: { name: "Vorkath" }, style: "Range" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes("canonical monster/NPC ID")));
  assert.ok(result.errors.some(error => error.includes("Combat style")));
  assert.equal(result.request.calculationStatus, "not-connected");
});

test("valid request envelope stays explicit that it is not a DPS result", () => {
  const result = buildCombatRequest({
    stats: completeStats,
    slots: [["Weapon", { id: 22978, name: "Dragon hunter lance" }]],
    target: { id: 8059, name: "Vorkath" },
    style: "Melee"
  });
  assert.equal(result.ok, true);
  assert.equal(result.request.equipment.weapon.id, 22978);
  assert.equal(result.request.calculationStatus, "not-connected");
});
