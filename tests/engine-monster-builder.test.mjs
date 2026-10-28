import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEngineMonster,
  ENGINE_MONSTER_DEFAULT_INPUTS,
} from "../src/combat-studio/engine-monster-builder.js";

const monsterRecord = () => ({
  id: 415,
  name: "Abyssal demon",
  version: "Standard",
  image: "Abyssal demon.png",
  size: 3,
  speed: 4,
  style: "slash",
  max_hit: 8,
  skills: { atk: 97, def: 135, hp: 150, magic: 1, ranged: 1, str: 105 },
  offensive: { atk: 0, magic: 0, magic_str: 0, ranged: 0, ranged_str: 0, str: 0 },
  defensive: { flat_armour: 0, stab: 0, slash: 0, crush: 0, magic: 0, light: 0, standard: 0, heavy: 0 },
  attributes: ["demon"],
  weakness: null,
  immunities: { burn: null },
  is_slayer_monster: true,
});

test("builds engine-native monster from a complete canonical record", () => {
  const result = buildEngineMonster(monsterRecord());
  assert.equal(result.status, "ready", result.issues.join("; "));
  assert.equal(result.monster.id, 415);
  assert.equal(result.monster.name, "Abyssal demon");
  assert.equal(result.monster.style, "slash");
  assert.equal(result.monster.weakness, null);
  assert.deepEqual(result.monster.inputs, ENGINE_MONSTER_DEFAULT_INPUTS);
  assert.notEqual(result.monster.inputs.defenceReductions, ENGINE_MONSTER_DEFAULT_INPUTS.defenceReductions);
});

test("applies explicit encounter inputs without mutating defaults or caller input", () => {
  const overrides = {
    partySize: 4,
    monsterCurrentHp: 120,
    defenceReductions: { dwh: 1, bgs: 15 },
  };
  const result = buildEngineMonster(monsterRecord(), overrides);
  assert.equal(result.status, "ready", result.issues.join("; "));
  assert.equal(result.monster.inputs.partySize, 4);
  assert.equal(result.monster.inputs.monsterCurrentHp, 120);
  assert.equal(result.monster.inputs.defenceReductions.dwh, 1);
  assert.equal(result.monster.inputs.defenceReductions.bgs, 15);
  assert.equal(result.monster.inputs.defenceReductions.arclight, 0);
  assert.deepEqual(overrides, {
    partySize: 4, monsterCurrentHp: 120, defenceReductions: { dwh: 1, bgs: 15 },
  });
  assert.equal(ENGINE_MONSTER_DEFAULT_INPUTS.defenceReductions.dwh, 0);
});

test("rejects simplified or incomplete OSRS Hub monster rows", () => {
  const result = buildEngineMonster({ id: 415, name: "Abyssal demon", hp: 150 });
  assert.equal(result.status, "review-required");
  assert.equal(result.monster, null);
  assert.ok(result.issues.some(issue => issue.includes("skills must be an object")));
  assert.ok(result.issues.some(issue => issue.includes("defensive must be an object")));
  assert.ok(result.issues.some(issue => issue.includes("immunities")));
});

test("rejects malformed encounter inputs rather than silently accepting them", () => {
  const result = buildEngineMonster(monsterRecord(), {
    partySize: 0,
    defenceReductions: { dwh: -1 },
  });
  assert.equal(result.status, "review-required");
  assert.equal(result.monster, null);
  assert.ok(result.issues.some(issue => issue.includes("partySize")));
  assert.ok(result.issues.some(issue => issue.includes("defenceReductions.dwh")));
});

test("requires a valid canonical identity and explicit engine structures", () => {
  const record = monsterRecord();
  record.id = -1;
  record.skills.hp = "150";
  record.weakness = undefined;
  const result = buildEngineMonster(record);
  assert.equal(result.status, "review-required");
  assert.ok(result.issues.some(issue => issue.includes("positive canonical monster ID")));
  assert.ok(result.issues.some(issue => issue.includes("skills.hp")));
  assert.ok(result.issues.some(issue => issue.includes("weakness must be present")));
});
