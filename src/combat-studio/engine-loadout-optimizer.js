import { estimateItemScore, inferEquipmentSlot, isQuestAvailable } from "./optimizer.js";
import { buildLiveCalculationRequest } from "./live-calculation-request.js";
import { calculateLiveCombat } from "./live-calculation-client.js";

const SLOT_ORDER = ["Weapon", "Ammo", "Head", "Neck", "Cape", "Body", "Legs", "Shield", "Hands", "Feet", "Ring"];
const SLOT_MAP = Object.freeze({
  Head:"head", Cape:"cape", Neck:"neck", Ammo:"ammo", Weapon:"weapon",
  Body:"body", Legs:"legs", Shield:"shield", Hands:"hands", Feet:"feet", Ring:"ring",
});
const key = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const itemName = item => String(item?._name ?? item?.name ?? item?.item_name ?? "");
const itemId = item => {
  const value = Number(item?.id ?? item?.item_id ?? item?.itemId);
  return Number.isInteger(value) && value > 0 ? value : null;
};
const itemPrice = item => {
  const name = key(itemName(item));
  if (name === "barrowsgloves") return 130000;
  for (const value of [item?._enginePrice,item?._price,item?.sell,item?.high,item?.price,item?.buy,item?.shop_price,item?.cost,item?.latest_price,item?.last_price]) {
    const price = Number(value);
    if (Number.isFinite(price) && price > 0) return price;
  }
  return null;
};
const itemRequirementsMet = (item, stats) => {
  const requirements = item?.requirements ?? item?.level_requirements ?? item?.skill_requirements ?? {};
  if (!requirements || typeof requirements !== "object" || Array.isArray(requirements)) return true;
  const aliases = {att:"Attack",attack:"Attack",atk:"Attack",str:"Strength",strength:"Strength",def:"Defence",defence:"Defence",ranged:"Ranged",range:"Ranged",magic:"Magic",prayer:"Prayer"};
  for (const [raw, requirement] of Object.entries(requirements)) {
    const skill = aliases[key(raw)];
    const level = Number(typeof requirement === "object" ? requirement.level ?? requirement.value : requirement);
    if (!skill || !Number.isFinite(level) || level <= 1) continue;
    const supplied = stats?.[skill] ?? stats?.[skill.toLowerCase()];
    const current = Number(typeof supplied === "object" ? supplied.level ?? supplied.lvl ?? supplied.value : supplied);
    if (!Number.isFinite(current) || current < level) return false;
  }
  return true;
};
const styleCompatible = (item, style, slot) => {
  const name = key(itemName(item));
  const values = Object.assign({},item?.equipment,item?.bonuses,item?.stats,item);
  const has = fields => fields.some(field => Number.isFinite(Number(values[field])) && Number(values[field]) !== 0);
  const hasMelee = has(["melee_strength","meleeStrength","strength_bonus","strengthBonus","str","stab_attack","slash_attack","crush_attack"]);
  const hasRanged = has(["ranged_attack","rangedAttack","attack_ranged","ranged_bonus","ranged","ranged_strength","rangedStrength","ranged_str"]);
  const hasMagic = has(["magic_attack","magicAttack","attack_magic","magic_bonus","magic","magic_damage","magicDamage","magic_strength","magicStrength"]);
  if (style === "Ranged" && hasMagic && !hasRanged && !hasMelee) return false;
  if (style === "Melee" && (hasMagic || hasRanged) && !hasMelee) return false;
  if (style === "Magic" && (hasMelee || hasRanged) && !hasMagic) return false;
  if (slot === "Ammo") return style === "Ranged" && /arrow|bolt|javelin|dart|chinchompa|throwingknife/.test(name);
  if (slot !== "Weapon") return true;
  if (style === "Melee") return !/bow|crossbow|blowpipe|chinchompa|ballista|staff|wand|trident|sceptre|tome|dart|javelin/.test(name);
  if (style === "Ranged") return /bow|crossbow|blowpipe|ballista|chinchompa|dart|javelin|throwingknife/.test(name);
  return /staff|wand|trident|sceptre|battlestaff|mystic|salamander/.test(name);
};
const twoHanded = item => item?.two_handed === true || item?.twoHanded === true || item?.equipment?.two_handed === true
  || /^(twistedbow|longbow|shortbow|ballista|blowpipe|darkbow|crystalbow|shadow|eldermaul|godsword|halberd|scytheofvitur|soulreaperaxe|bowoffaerdhinen|2h)/.test(key(itemName(item)));
const ammoCompatible = (weapon, ammo) => {
  if (!weapon || !ammo) return true;
  const w = key(itemName(weapon)), a = key(itemName(ammo));
  if (/blowpipe/.test(w)) return /dart/.test(a);
  if (/crossbow/.test(w)) return /bolt/.test(a);
  if (/bow|ballista/.test(w)) return /arrow|javelin/.test(a);
  return false;
};
const costOf = picked => [...picked.values()].reduce((sum, item) => sum + (itemPrice(item) ?? 0), 0);
const preference = (item, style, target) => estimateItemScore(item, style, target) ?? 0;
const compareResult = (next, previous, nextItem, previousItem, style, target) => {
  if (!previous) return true;
  const delta = next.result.dps - previous.result.dps;
  if (delta > 1e-9) return true;
  if (delta < -1e-9) return false;
  const scoreDelta = preference(nextItem, style, target) - preference(previousItem, style, target);
  if (scoreDelta > 1e-9) return true;
  if (scoreDelta < -1e-9) return false;
  return (itemPrice(nextItem) ?? 0) < (itemPrice(previousItem) ?? 0);
};
const asSlotPairs = picked => SLOT_ORDER.map(slot => {
  const item = picked.get(slot);
  return [slot, item ? itemName(item) : "—", item ? itemId(item) : null, item ? item._enginePrice : null];
});
const ZERO_BOOSTS = Object.freeze({atk:0,def:0,hp:0,magic:0,prayer:0,ranged:0,str:0,mining:0,herblore:0,farming:0});
const EMPTY_BUFFS = Object.freeze({
  potions:[],onSlayerTask:false,inWilderness:false,forinthrySurge:false,soulreaperStacks:0,
  baAttackerLevel:0,chinchompaDistance:0,kandarinDiary:false,chargeSpell:false,
  markOfDarknessSpell:false,usingSunfireRunes:false,fragmentOfWind:false,
  fragmentOfWater:false,fragmentOfEarth:false,fragmentOfFire:false,
});

/**
 * A bounded coordinate search. Every candidate that can enter a recommendation is
 * evaluated by the canonical combat engine; item stats only narrow the search.
 * At most two shortlisted alternatives are evaluated per slot, plus the starting setup (23 total).
 */
export async function optimizeLoadoutWithEngine({
  items = [], playerName, stats = {}, quests = [], questOverrides = {}, accountAware = true,
  excluded = [], allowedItems = [], target, style, attackType, stance, spell = null,
  budget = 0, runtimeUrl = "", fetchImpl = globalThis.fetch, onProgress = () => {},
} = {}) {
  const budgetGp = Math.max(0, Number(budget) || 0);
  if (!playerName) return { status:"review-required", issues:["Import an account with public combat levels before requesting a verified build."] };
  if (!target || !Number.isInteger(Number(target.id)) || Number(target.id) <= 0) return { status:"review-required", issues:["Choose a monster with a canonical combat-engine ID."] };
  if (!budgetGp) return { status:"review-required", issues:["Enter a budget greater than 0 GP."] };
  if (!runtimeUrl) return { status:"unavailable", issues:["The combat Worker is not configured. Open DPS Calculator and set its Worker URL first."] };
  if (!["Melee","Ranged","Magic"].includes(style) || !attackType || !stance) return { status:"review-required", issues:["Choose a combat style, attack type and stance."] };
  if (style === "Magic" && !spell) return { status:"review-required", issues:["Choose a spell before asking the engine to build a magic setup."] };

  const excludedKeys = new Set(excluded.map(key));
  const allowedKeys = new Set(allowedItems.map(key));
  const pools = new Map(SLOT_ORDER.map(slot => [slot, []]));
  let skippedUnknownPrice = 0, skippedMissingId = 0;
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || typeof item !== "object" || item.equipable === false || item.equippable === false) continue;
    const id = itemId(item), name = itemName(item), slot = inferEquipmentSlot(item);
    if (!id) { if (slot) skippedMissingId++; continue; }
    if (!name || !pools.has(slot) || !styleCompatible(item, style, slot)) continue;
    const normalized = key(name);
    if (excludedKeys.has(normalized) || item.tradeable === false && normalized !== "barrowsgloves") continue;
    if (accountAware && (!itemRequirementsMet(item, stats)
      || (!isQuestAvailable(item, quests, questOverrides) && !allowedKeys.has(normalized)))) continue;
    const price = itemPrice(item);
    if (price == null) { skippedUnknownPrice++; continue; }
    if (price > budgetGp) continue;
    pools.get(slot).push({...item,_engineId:id,_engineName:name,_enginePrice:price});
  }
  for (const [slot, pool] of pools) {
    const unique = new Map(pool.map(item => [item._engineId,item]));
    pools.set(slot,[...unique.values()]);
  }
  if (!pools.get("Weapon").length) return {
    status:"review-required",
    issues:["No priced, account-eligible weapon with a canonical engine item ID matched this style. No guessed setup was returned."],
    skippedUnknownPrice,skippedMissingId,
  };

  const picked = new Map();
  let spent = 0;
  for (const slot of SLOT_ORDER) {
    const cheapest = [...pools.get(slot)].sort((a,b)=>a._enginePrice-b._enginePrice)[0] ?? null;
    if (!cheapest || spent + cheapest._enginePrice > budgetGp) continue;
    if (slot === "Shield" && twoHanded(picked.get("Weapon"))) continue;
    if (slot === "Ammo" && !ammoCompatible(picked.get("Weapon"),cheapest)) continue;
    picked.set(slot,cheapest);
    spent += cheapest._enginePrice;
    if (slot === "Weapon" && twoHanded(cheapest)) {
      const shield = picked.get("Shield");
      if (shield) { spent -= shield._enginePrice; picked.delete("Shield"); }
    }
  }
  const weapon = picked.get("Weapon");
  if (!weapon) return { status:"review-required",issues:["No valid weapon could fit within the budget."] };

  const requestFor = nextPicked => buildLiveCalculationRequest({
    playerName,stats,slots:asSlotPairs(nextPicked),items,target,
    style:{name:`${attackType} ${stance}`,type:attackType,stance},
    boosts:ZERO_BOOSTS,prayers:[],buffs:EMPTY_BUFFS,spell,
  });
  const memo = new Map();
  let calculations = 0, rejected = 0, currentResult = null;
  const evaluate = async nextPicked => {
    const slotList = asSlotPairs(nextPicked);
    const keyFor = JSON.stringify({runtimeUrl,playerName,target:target.id,style:attackType,stance,spell:spell?.name,stats,slotList});
    if (memo.has(keyFor)) return memo.get(keyFor);
    const built = requestFor(nextPicked);
    if (built.status !== "ready") return {status:"review-required",issues:built.issues};
    calculations++;
    const response = await calculateLiveCombat({baseUrl:runtimeUrl,request:built.request,fetchImpl});
    if (response.status !== "calculated") rejected++;
    memo.set(keyFor,response);
    return response;
  };

  const initial = await evaluate(picked);
  if (initial.status !== "calculated") return {
    status:initial.status,issues:initial.issues,
    calculations,rejected,skippedUnknownPrice,skippedMissingId,
  };
  currentResult = initial;
  onProgress({checked:calculations,total:23,slot:"Weapon",dps:currentResult.result.dps});

  for (const slot of SLOT_ORDER) {
    const pool = pools.get(slot);
    if (!pool.length) continue;
    const current = picked.get(slot) ?? null;
    const cheapest = [...pool].sort((a,b)=>a._enginePrice-b._enginePrice)[0];
    const highest = [...pool].sort((a,b)=>
      preference(b,style,target.name)-preference(a,style,target.name)
      || a._enginePrice-b._enginePrice)[0];
    const shortlist = [...new Map([cheapest,highest].filter(Boolean).map(item=>[item._engineId,item])).values()].slice(0,2);
    const alternatives = shortlist.filter(item=>item._engineId!==current?._engineId);
    const evaluated = await Promise.all(alternatives.map(async candidate=>{
      const draft = new Map(picked);
      draft.set(slot,candidate);
      if (slot === "Weapon" && twoHanded(candidate)) draft.delete("Shield");
      if (slot === "Shield" && twoHanded(draft.get("Weapon"))) return null;
      if (slot === "Ammo" && !ammoCompatible(draft.get("Weapon"),candidate)) return null;
      if (slot === "Weapon" && !ammoCompatible(candidate,draft.get("Ammo"))) draft.delete("Ammo");
      if (costOf(draft)>budgetGp) return null;
      const response = await evaluate(draft);
      return response.status==="calculated"?{candidate,draft,response}:null;
    }));
    const best = evaluated.filter(Boolean).reduce((selected,option)=>{
      const oldItem=picked.get(slot)??null;
      const better=compareResult(option.response,currentResult,option.candidate,oldItem,style,target.name);
      return better?option:selected;
    },null);
    if (best) { picked.clear(); for (const [keyName,item] of best.draft) picked.set(keyName,item); currentResult=best.response; }
    onProgress({checked:calculations,total:23,slot,dps:currentResult.result.dps});
  }

  const outputSlots=asSlotPairs(picked);
  const selectedItems=[...picked.values()];
  const totalCost=costOf(picked);
  const warnings=[];
  if (skippedUnknownPrice) warnings.push(`${skippedUnknownPrice} eligible equipment records had no usable price and were not considered.`);
  if (skippedMissingId) warnings.push(`${skippedMissingId} equipment records had no canonical item ID and were not considered.`);
  if (rejected) warnings.push(`${rejected} candidate calculation(s) were rejected by the canonical engine and were skipped.`);
  warnings.push("The returned DPS is engine-calculated with zero boosts and no prayers.");
  warnings.push("The search tests at most two shortlisted alternatives per slot. It returns the best verified setup it checked, not a proof of the global best combination.");
  return {
    status:"calculated",slots:outputSlots,totalCost,remainingBudget:Math.max(0,budgetGp-totalCost),
    engineResult:currentResult.result,calculations,eligibleItemCount:SLOT_ORDER.reduce((n,slot)=>n+pools.get(slot).length,0),
    warnings,selectedItemIds:selectedItems.map(item=>item._engineId),
    skippedUnknownPrice,skippedMissingId,
  };
}
