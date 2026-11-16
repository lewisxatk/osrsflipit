import test from "node:test";
import assert from "node:assert/strict";
import { defaultMeleeAttackType, estimateItemScore, estimateLoadout, inferEquipmentSlot, isQuestAvailable, targetProfile } from "../src/combat-studio/optimizer.js";

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
    {id:5,name:"Leather body",slot:"body",sell:15,members:false,equipment:{ranged_attack:2}},
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

test("canonical engine offensive bonuses are included in shortlist scoring", () => {
  const barrows = {
    name:"Barrows gloves", slot:"hands",
    bonuses:{str:12,ranged_str:0,magic_str:0,prayer:0},
    offensive:{stab:12,slash:12,crush:12,magic:6,ranged:12},
    defensive:{stab:12,slash:12,crush:12,magic:6,ranged:12}
  };
  const blackVambraces = {
    name:"Black d'hide vambraces", slot:"hands",
    bonuses:{str:0,ranged_str:0,magic_str:0,prayer:0},
    offensive:{stab:0,slash:0,crush:0,magic:-10,ranged:11},
    defensive:{stab:4,slash:5,crush:5,magic:8,ranged:0}
  };
  const pegasians = {
    name:"Pegasian boots", slot:"feet",
    bonuses:{str:0,ranged_str:1,magic_str:0,prayer:0},
    offensive:{stab:0,slash:0,crush:0,magic:-12,ranged:12},
    defensive:{stab:5,slash:5,crush:5,magic:5,ranged:5}
  };
  const citizenShoes = {
    name:"Citizen shoes", slot:"feet",
    bonuses:{str:0,ranged_str:0,magic_str:0,prayer:0},
    offensive:{stab:0,slash:0,crush:0,magic:0,ranged:0},
    defensive:{stab:0,slash:2,crush:2,magic:0,ranged:0}
  };
  assert.ok(estimateItemScore(barrows,"Ranged") > estimateItemScore(blackVambraces,"Ranged"));
  assert.ok(estimateItemScore(pegasians,"Ranged") > estimateItemScore(citizenShoes,"Ranged"));
});

test("target resolver requires an exact monster variant and separates spell weakness from style defence", () => {
  const records = [
    {id:42,recordIndex:7,name:"Example boss",version:"Phase 1",skills:{hp:100},attributes:["dragon"],defensive:{stab:60,slash:40,crush:20,magic:100,light:50,standard:30,heavy:40},weakness:{element:"water",severity:50}},
    {id:42,recordIndex:8,name:"Example boss",version:"Phase 2",skills:{hp:250},attributes:["dragon"],defensive:{stab:10,slash:30,crush:80,magic:200,light:80,standard:70,heavy:60},weakness:null}
  ];
  const ambiguous = targetProfile("Example boss",records);
  assert.equal(ambiguous.variantRequired,true);
  assert.equal(ambiguous.recordId,null);
  const phaseOne = targetProfile("Example boss",records,7);
  assert.equal(phaseOne.recordIndex,7);
  assert.equal(phaseOne.elementalWeakness.element,"water");
  assert.equal(phaseOne.lowestDefence.style,"Crush");
  const phaseTwo = targetProfile("Example boss",records,8);
  assert.equal(phaseTwo.recordIndex,8);
  assert.equal(phaseTwo.elementalWeakness,null);
  assert.equal(phaseTwo.lowestDefence.style,"Stab");
});

test("Vorkath defaults to stab; exact NPC variants use their lowest recorded melee defence", () => {
  assert.equal(defaultMeleeAttackType("Vorkath"), "stab");
  const records = [
    { name:"Example boss", recordIndex:1, defensive:{stab:30,slash:10,crush:20} },
    { name:"Example boss", recordIndex:2, defensive:{stab:5,slash:25,crush:20} },
  ];
  assert.equal(defaultMeleeAttackType("Example boss", records), "slash");
  assert.equal(defaultMeleeAttackType("Example boss", records, 2), "stab");
  assert.equal(defaultMeleeAttackType("Unknown boss"), "slash");
});
