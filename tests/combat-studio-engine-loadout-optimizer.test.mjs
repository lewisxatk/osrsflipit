import test from "node:test";
import assert from "node:assert/strict";
import { optimizeLoadoutWithEngine } from "../src/combat-studio/engine-loadout-optimizer.js";

const stats = {
  Attack:99, Strength:99, Defence:99, Hitpoints:99, Ranged:99,
  Magic:99, Prayer:99, Mining:99, Herblore:99, Farming:99,
};
const bow = {
  id:27655,name:"Webweaver bow",slot:"weapon",category:"Bow",version:"Charged",
  speed:4,isTwoHanded:true,_price:1000000,tradeable:true,equipable:true,
  bonuses:{str:0,ranged_str:65,magic_str:0,prayer:0},
  offensive:{stab:0,slash:0,crush:0,magic:0,ranged:85},
  defensive:{stab:0,slash:0,crush:0,magic:0,ranged:0}
};
const makeFetch = scoreForRequest => async (url, options = {}) => {
  const parsed = new URL(url);
  if (parsed.pathname === "/api/ammo-compatibility") {
    const weaponId = Number(parsed.searchParams.get("weaponId"));
    return {ok:true,status:200,json:async()=>({
      status:weaponId===27655?"not-required":"required",
      weaponId,
      compatibleAmmoIds:weaponId===27655?[]:[21905],
      source:"test engine contract"
    })};
  }
  if (parsed.pathname === "/health") {
    return {ok:true,status:200,json:async()=>({status:"ok",service:"osrshub-combat-runtime"})};
  }
  if (parsed.pathname === "/api/calculate" && options.method === "POST") {
    const request = JSON.parse(options.body);
    const equipment = request.player.equipment;
    const dps = scoreForRequest(equipment);
    return {ok:true,status:200,json:async()=>({
      status:"calculated",
      result:{
        monster:{id:request.monsterId,name:request.monsterName||"Example boss",version:request.monsterVersion||"",recordIndex:request.monsterIndex??0},
        dps,maxHit:30,accuracy:0.8,attackRoll:100000,npcDefenceRoll:50000,attackSpeed:4,issues:[]
      },
      issues:[]
    })};
  }
  return {ok:false,status:404,json:async()=>({error:"Unexpected test route"})};
};

test("weapon-first search never equips javelins with a self-ammunition Webweaver bow", async () => {
  const items = [
    bow,
    {id:19484,name:"Dragon javelin",slot:"ammo",_price:1000,tradeable:true,bonuses:{ranged_str:0},offensive:{ranged:0}},
    {id:7462,name:"Barrows gloves",slot:"hands",_price:130000,tradeable:false,bonuses:{str:12,ranged_str:0},offensive:{ranged:12}},
    {id:2491,name:"Black d'hide vambraces",slot:"hands",_price:10000,tradeable:true,bonuses:{str:0,ranged_str:0},offensive:{ranged:11}},
    {id:13237,name:"Pegasian boots",slot:"feet",_price:20000000,tradeable:true,bonuses:{ranged_str:1},offensive:{ranged:12}},
    {id:9644,name:"Citizen shoes",slot:"feet",_price:100,tradeable:true,bonuses:{ranged_str:0},offensive:{ranged:0}},
  ];
  const fetchImpl = makeFetch(equipment => {
    let dps = 1;
    if (equipment.hands?.id === 7462) dps += 0.2;
    if (equipment.feet?.id === 13237) dps += 0.1;
    return dps;
  });
  const result = await optimizeLoadoutWithEngine({
    items,playerName:"Test account",stats,quests:[],accountAware:true,
    target:{id:1234,recordIndex:0,name:"Example boss",version:"Standard",variantRequired:false},
    questOverrides:{"recipefordisaster":true},
    style:"Ranged",attackType:"ranged",stance:"Rapid",budget:50000000,
    runtimeUrl:"https://combat.example.workers.dev",fetchImpl,maxScenarios:80,maxWeapons:10,slotCandidates:10
  });
  assert.equal(result.status,"calculated");
  assert.equal(result.slots.find(([slot])=>slot==="Weapon")?.[2],27655);
  assert.equal(result.slots.find(([slot])=>slot==="Ammo")?.[1],"—");
  assert.equal(result.slots.find(([slot])=>slot==="Hands")?.[1],"Barrows gloves");
  assert.equal(result.slots.find(([slot])=>slot==="Feet")?.[1],"Pegasian boots");
});

test("weapon-first search evaluates a complete Elite Void set as a single engine scenario", async () => {
  const items = [
    bow,
    {id:11664,name:"Void ranger helm",slot:"head",version:"Normal",_price:0,bonuses:{},offensive:{},defensive:{}},
    {id:13072,name:"Elite void top",slot:"body",version:"Normal",_price:0,bonuses:{prayer:3},offensive:{},defensive:{}},
    {id:13073,name:"Elite void robe",slot:"legs",version:"Normal",_price:0,bonuses:{prayer:3},offensive:{},defensive:{}},
    {id:8842,name:"Void knight gloves",slot:"hands",version:"Normal",_price:0,bonuses:{},offensive:{},defensive:{}},
    {id:7462,name:"Barrows gloves",slot:"hands",_price:130000,tradeable:false,bonuses:{str:12},offensive:{ranged:12}},
  ];
  const ownedItems=["Void ranger helm","Elite void top","Elite void robe","Void knight gloves"];
  const fetchImpl = makeFetch(equipment => {
    const elite = equipment.head?.id===11664 && equipment.body?.id===13072
      && equipment.legs?.id===13073 && equipment.hands?.id===8842;
    return elite ? 3.5 : 1.2;
  });
  const result = await optimizeLoadoutWithEngine({
    items,playerName:"Test account",stats,quests:[],accountAware:true,ownedItems,
    target:{id:1234,recordIndex:0,name:"Example boss",version:"Standard",variantRequired:false},
    style:"Ranged",attackType:"ranged",stance:"Rapid",budget:5000000,
    runtimeUrl:"https://combat.example.workers.dev",fetchImpl,maxScenarios:60,maxWeapons:10,slotCandidates:8
  });
  assert.equal(result.status,"calculated");
  assert.equal(result.slots.find(([slot])=>slot==="Head")?.[1],"Void ranger helm");
  assert.equal(result.slots.find(([slot])=>slot==="Body")?.[1],"Elite void top");
  assert.equal(result.slots.find(([slot])=>slot==="Legs")?.[1],"Elite void robe");
  assert.equal(result.slots.find(([slot])=>slot==="Hands")?.[1],"Void knight gloves");
  assert.equal(result.ownedItemCount,4);
});
