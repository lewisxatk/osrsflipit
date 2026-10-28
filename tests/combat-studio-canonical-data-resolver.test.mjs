import test from "node:test";
import assert from "node:assert/strict";
import { createCombatDataIndex } from "../src/combat-studio/canonical-data-resolver.js";

const bundle = () => ({
  items: [{ id: 4151, name: "Abyssal whip" }, { id: 11864, name: "Neitiznot faceguard" }],
  equipmentStats: [{ id: 4151, attack_slash: 82 }],
  weapons: [{ id: 4151, attack_speed: 4 }],
  itemRequirements: [
    { item_id: 11864, skill: "Defence", level: 70 },
    { item_id: 11864, quest_key: "mountain_daughter" },
  ],
  itemCombatProfiles: [{ id: 4151, attackSpeed: 4 }],
  monsters: [{ id: 8059, name: "Vorkath", hitpoints: 750 }],
  quests: [{ key: "mountain_daughter", name: "Mountain Daughter" }],
  questRelationships: [{ quest_key: "mountain_daughter", prerequisite_key: "death_plateau" }],
});

test("resolves item records by explicit canonical ID and joins available combat rows", () => {
  const index = createCombatDataIndex(bundle());
  const result = index.resolveItem(4151);
  assert.equal(result.status, "resolved");
  assert.equal(result.item.name, "Abyssal whip");
  assert.equal(result.sources.weapon.attack_speed, 4);
  assert.equal(result.engineReady, false);
});

test("does not resolve a missing item by name guess", () => {
  const result = createCombatDataIndex(bundle()).resolveItem(999999);
  assert.equal(result.status, "not-found");
  assert.equal(result.item, null);
});

test("resolves monsters by ID and keeps engine compatibility explicitly unverified", () => {
  const result = createCombatDataIndex(bundle()).resolveMonster(8059);
  assert.equal(result.status, "resolved");
  assert.equal(result.monster.name, "Vorkath");
  assert.equal(result.engineReady, false);
});

test("eligibility blocks known low skills and reports incomplete quest evidence", () => {
  const index = createCombatDataIndex(bundle());
  const result = index.checkItemEligibility(11864, { skills: { Defence: 60 }, completedQuests: [] });
  assert.equal(result.status, "ineligible");
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some(reason => reason.includes("Defence level 70")));
  assert.ok(result.reasons.some(reason => reason.includes("Mountain Daughter")));
});

test("unknown account levels and unsupported requirement rows are not treated as eligible", () => {
  const data = bundle();
  data.itemRequirements = [{ item_id: 11864, requirement_text: "some unparsed requirement" }];
  const result = createCombatDataIndex(data).checkItemEligibility(11864, {});
  assert.equal(result.status, "review_required");
  assert.equal(result.eligible, null);
});

test("duplicate canonical IDs are surfaced as integrity issues", () => {
  const data = bundle(); data.items.push({ id: 4151, name: "duplicate" });
  const index = createCombatDataIndex(data);
  assert.ok(index.issues.some(issue => issue.code === "duplicate_identity" && issue.dataset === "items"));
});
