import test from "node:test";
import assert from "node:assert/strict";
import { resolveEngineEquipment, resolveEngineMonster, createEngineRecordBridge } from "../src/combat-studio/engine-record-bridge.js";

const equipment = {
  id: 4151, name: "Abyssal whip", weight: 2, version: "base", slot: "weapon",
  image: "4151.png", speed: 4, category: "weapon", isTwoHanded: false,
  bonuses: { str: 0, ranged_str: 0, magic_str: 0, prayer: 0 },
  offensive: { stab: 0, slash: 82, crush: 0, magic: 0, ranged: 0 },
  defensive: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
};
const monster = {
  id: 415, name: "Abyssal demon", size: 2, speed: 4, style: "slash",
  skills: { atk: 97, def: 135, hp: 150, magic: 1, ranged: 1, str: 150 },
  offensive: { atk: 0, magic: 0, magic_str: 0, ranged: 0, ranged_str: 0, str: 0 },
  defensive: { flat_armour: 0, stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
  attributes: [], weakness: null, immunities: { burn: null }, is_slayer_monster: true,
  inputs: { isFromCoxCm: false, toaInvocationLevel: 0, toaPathLevel: 0,
    partyMaxCombatLevel: 0, partySumMiningLevel: 0, partyMaxHpLevel: 0, partySize: 1,
    monsterCurrentHp: 150, defenceReductions: { vulnerability: false, accursed: false,
      elderMaul: 0, dwh: 0, arclight: 0, emberlight: 0, bgs: 0, tonalztic: 0, seercull: 0, ayak: 0 } },
};

test("resolves a complete canonical engine equipment record without rewriting it", () => {
  const result = resolveEngineEquipment(4151, [equipment]);
  assert.equal(result.status, "engine-record-ready");
  assert.equal(result.record, equipment);
});

test("does not synthesize a canonical engine record from an ID-only row", () => {
  const result = resolveEngineEquipment(4151, [{ id: 4151, name: "Abyssal whip" }]);
  assert.equal(result.status, "review-required");
  assert.equal(result.record, null);
  assert.ok(result.missingFields.includes("offensive"));
});

test("resolves a structurally complete engine monster record", () => {
  const result = resolveEngineMonster(415, [monster]);
  assert.equal(result.status, "engine-record-ready");
  assert.equal(result.record, monster);
});

test("missing IDs and duplicate IDs fail visibly", () => {
  assert.equal(resolveEngineMonster(999, [monster]).status, "not-found");
  const bridge = createEngineRecordBridge({ equipment: [equipment, { ...equipment }], monsters: [monster] });
  assert.ok(bridge.issues.some(issue => issue.code === "duplicate_identity"));
});
