import test from "node:test";
import assert from "node:assert/strict";
import { buildEnginePlayer, ENGINE_EQUIPMENT_SLOTS } from "../src/combat-studio/engine-player-builder.js";

const skills = {
  atk: 80, def: 80, hp: 90, magic: 84, prayer: 70, ranged: 93, str: 86,
  mining: 1, herblore: 1, farming: 1,
};
const whip = {
  id: 4151, name: "Abyssal whip", weight: 2, version: "base", slot: "weapon",
  image: "4151.png", speed: 4, category: "Whip", isTwoHanded: false,
  bonuses: { str: 0, ranged_str: 0, magic_str: 0, prayer: 0 },
  offensive: { stab: 0, slash: 82, crush: 0, magic: 0, ranged: 0 },
  defensive: { stab: 0, slash: 0, crush: 0, magic: 0, ranged: 0 },
};
const blankEquipment = () => Object.fromEntries(ENGINE_EQUIPMENT_SLOTS.map((slot) => [slot, null]));
const baseInput = () => ({
  name: "OSRS Hub test account",
  skills,
  equipment: { ...blankEquipment(), weapon: whip },
  style: { name: "Flick", type: "slash", stance: "Accurate" },
  attackSpeed: 4,
});

test("builds a complete engine-native player and sums canonical gear stats", () => {
  const result = buildEnginePlayer(baseInput());
  assert.equal(result.status, "ready");
  assert.equal(result.player.equipment.weapon, whip);
  assert.equal(result.player.offensive.slash, 82);
  assert.equal(result.player.attackSpeed, 4);
  assert.equal(result.player.buffs.onSlayerTask, false);
  assert.equal(result.player.boosts.atk, 0);
  assert.equal(result.player.spell, null);
});

test("refuses incomplete account skills rather than inventing values", () => {
  const input = baseInput();
  delete input.skills.ranged;
  const result = buildEnginePlayer(input);
  assert.equal(result.status, "review-required");
  assert.equal(result.player, null);
  assert.ok(result.issues.some((issue) => issue.includes("skills.ranged")));
});

test("refuses simplified/non-canonical equipment rows", () => {
  const input = baseInput();
  input.equipment.weapon = { id: 4151, name: "Abyssal whip" };
  const result = buildEnginePlayer(input);
  assert.equal(result.status, "review-required");
  assert.equal(result.player, null);
  assert.ok(result.issues.some((issue) => issue.includes("engine-native metadata")));
});

test("requires explicit attack speed and a valid engine combat style", () => {
  const input = baseInput();
  delete input.attackSpeed;
  input.style = { name: "", type: "flail", stance: "Auto" };
  const result = buildEnginePlayer(input);
  assert.equal(result.status, "review-required");
  assert.ok(result.issues.some((issue) => issue.includes("attackSpeed")));
  assert.ok(result.issues.some((issue) => issue.includes("style.name")));
  assert.ok(result.issues.some((issue) => issue.includes("style.type")));
});

test("supports explicit boosts, prayers and buffs without modifying inputs", () => {
  const input = baseInput();
  input.boosts = { ...Object.fromEntries(Object.keys(skills).map((key) => [key, 0])), str: 5 };
  input.prayers = [13];
  input.buffs = { onSlayerTask: true, soulreaperStacks: 3 };
  const result = buildEnginePlayer(input);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.player.prayers, [13]);
  assert.equal(result.player.buffs.onSlayerTask, true);
  assert.equal(result.player.buffs.soulreaperStacks, 3);
  assert.equal(input.buffs.onSlayerTask, true);
});

test("all engine equipment slots are present even when empty", () => {
  const result = buildEnginePlayer({ ...baseInput(), equipment: blankEquipment() });
  assert.equal(result.status, "ready");
  assert.deepEqual(Object.keys(result.player.equipment), ENGINE_EQUIPMENT_SLOTS);
});
