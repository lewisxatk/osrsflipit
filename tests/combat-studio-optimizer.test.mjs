import test from "node:test";
import assert from "node:assert/strict";
import { estimateLoadout, inferEquipmentSlot, isQuestAvailable, targetProfile } from "../src/combat-studio/optimizer.js";

test("item classification does not mistake raw fish for equipment", () => {
  assert.equal(inferEquipmentSlot({name:"Raw Herring",slot:"ring"}), null);
  assert.equal(inferEquipmentSlot({name:"Dragon crossbow",slot:"weapon"}), "Weapon");
  assert.equal(inferEquipmentSlot({name:"Ring of suffering",slot:"ring"}), "Ring");
});

test("loadout ranking creates equipment slots under the GP budget and respects exclusions", () => {
  const items = [
    {id:1,name:"Bronze crossbow",slot:"weapon",sell:25,equipment:{ranged_attack:10,ranged_strength:1,attack_speed:6}},
    {id:2,name:"Rune crossbow",slot:"weapon",sell:90,equipment:{ranged_attack:60,ranged_strength:6,attack_speed:6}},
    {id:3,name:"Archer ring",slot:"ring",sell:20,equipment:{ranged_attack:4}},
    {id:4,name:"Raw Herring",slot:"ring",sell:1,equipment:{}},
    {id:5,name:"Leather body",slot:"body",sell:15,equipment:{ranged_attack:2}},
    {id:6,name:"Excluded bow",slot:"weapon",sell:1,equipment:{ranged_attack:500,ranged_strength:100}}
  ];
  const result = estimateLoadout({
    items, target:"Vorkath", style:"Ranged", budget:100,
    stats:{Attack:{level:99},Ranged:{level:99},Defence:{level:99}},
    accountAware:false, excluded:["Excluded bow"]
  });
  assert.equal(result.slots.length, 11);
  assert.ok(result.totalCost <= 100, "generated setup must fit its stated budget");
  assert.equal(result.slots.find(([slot])=>slot==="Weapon")?.[1] === "Excluded bow", false);
  assert.equal(result.slots.find(([slot])=>slot==="Ring")?.[1] === "Raw Herring", false);
  assert.ok(result.candidateCount > 0);
});

test("manual quest override can satisfy a known quest requirement", () => {
  const item={name:"Example locked weapon",slot:"weapon",sell:1,quest_requirements:["Recipe for Disaster"]};
  assert.equal(isQuestAvailable(item,[],{}),false);
  assert.equal(isQuestAvailable(item,[],{"recipefordisaster":true}),true);
});

test("target helper avoids claiming source-verified weaknesses", () => {
  assert.match(targetProfile("Vorkath").confidence,/hint/i);
  assert.match(targetProfile("Unknown boss").confidence,/not verified/i);
});
