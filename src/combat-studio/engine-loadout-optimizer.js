import { estimateItemScore, inferEquipmentSlot, isQuestAvailable } from "./optimizer.js";
import { buildLiveCalculationRequest } from "./live-calculation-request.js";
import { calculateLiveCombat, getLiveAmmoCompatibility } from "./live-calculation-client.js";

const SLOT_ORDER = ["Weapon", "Ammo", "Head", "Neck", "Cape", "Body", "Legs", "Shield", "Hands", "Feet", "Ring"];
const NON_WEAPON_SLOTS = ["Head", "Neck", "Cape", "Body", "Legs", "Shield", "Hands", "Feet", "Ring"];
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
const itemPrice = (item, ownedKeys = new Set()) => {
  const name = key(itemName(item));
  if (ownedKeys.has(name)) return 0;
  // Barrows gloves are untradeable but have a known, fixed purchase price.
  if (name === "barrowsgloves") return 130000;
  for (const value of [item?._enginePrice,item?._price,item?.sell,item?.high,item?.price,item?.buy,item?.shop_price,item?.cost,item?.latest_price,item?.last_price]) {
    const price = Number(value);
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(price) && price > 0) return price;
  }
  return null;
};
const versionKey = item => key(item?.version);
const unusableVersion = item => /^(broken|locked|inactive|empty|unlit|worn|unwound|inert|unfocused|used)$/.test(versionKey(item));
const twoHanded = item => item?.isTwoHanded === true || item?.two_handed === true || item?.twoHanded === true
  || item?.equipment?.two_handed === true;
const getCategory = item => key(item?.category ?? item?.weapon_category ?? item?.weaponCategory ?? "");
const isRangedWeapon = item => {
  const category = getCategory(item), name = key(itemName(item));
  return /bow|crossbow|ballista|thrown|chinchompa|javelin|dart/.test(category)
    || /bow|crossbow|blowpipe|ballista|chinchompa|throwingknife|throwingaxe|darkbow|javelinlauncher/.test(name);
};
const isMagicWeapon = item => {
  const category = getCategory(item), name = key(itemName(item));
  return /staff|wand|poweredstaff|polestaff|bladedstaff/.test(category)
    || /staff|wand|trident|sceptre|battlestaff|mystic|salamander/.test(name);
};
const styleCompatible = (item, style, slot) => {
  if (slot !== "Weapon") return true;
  if (style === "Ranged") return isRangedWeapon(item);
  if (style === "Magic") return isMagicWeapon(item);
  return !isRangedWeapon(item) && !isMagicWeapon(item)
    && !/unarmed|cannon/.test(getCategory(item));
};
const itemRequirementsMet = (item, stats) => {
  const requirements = item?.requirements ?? item?.level_requirements ?? item?.skill_requirements ?? item?.stats_required ?? {};
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
const asSlotPairs = picked => SLOT_ORDER.map(slot => {
  const item = picked.get(slot);
  return [slot, item ? itemName(item) : "—", item ? itemId(item) : null, item ? item._enginePrice : null];
});
const costOf = picked => [...picked.values()].reduce((sum,item) => sum + (item._enginePrice ?? 0), 0);
const ZERO_BOOSTS = Object.freeze({atk:0,def:0,hp:0,magic:0,prayer:0,ranged:0,str:0,mining:0,herblore:0,farming:0});
const EMPTY_BUFFS = Object.freeze({
  potions:[],onSlayerTask:false,inWilderness:false,forinthrySurge:false,soulreaperStacks:0,
  baAttackerLevel:0,chinchompaDistance:0,kandarinDiary:false,chargeSpell:false,
  markOfDarknessSpell:false,usingSunfireRunes:false,fragmentOfWind:false,
  fragmentOfWater:false,fragmentOfEarth:false,fragmentOfFire:false,
});
const specialTargetBonus = (item, target) => {
  const name = key(itemName(item));
  const attributes = new Set((Array.isArray(target?.attributes) ? target.attributes : []).map(key));
  let bonus = 0;
  if (attributes.has("dragon") && /dragonhunter/.test(name)) bonus += 1000;
  if (attributes.has("demon") && /arclight|emberlight|silverlight|darklight|scorchingbow|boneclaws|burningclaws/.test(name)) bonus += 1000;
  if (attributes.has("kalphite") && /keris/.test(name)) bonus += 1000;
  if (attributes.has("leafy") && /leafbladed/.test(name)) bonus += 1000;
  if (attributes.has("rat") && /bonemace|boneshortbow|bonestaff/.test(name)) bonus += 1000;
  if (attributes.has("golem") && /granitehammer|barronitemace/.test(name)) bonus += 1000;
  if (attributes.has("undead") && /salve/.test(name)) bonus += 250;
  if (/^(vorkath|galvek|elvarg)$/.test(key(target?.name)) && /dragonhunter/.test(name)) bonus += 1000;
  return bonus;
};
const preference = (item, style, target) => {
  const score = estimateItemScore(item, style, target?.name ?? "") ?? 0;
  return score + specialTargetBonus(item, target);
};
const compareResult = (next, previous, nextCost, previousCost) => {
  if (!previous) return true;
  const delta = next.result.dps - previous.result.dps;
  if (delta > 1e-9) return true;
  if (delta < -1e-9) return false;
  return nextCost < previousCost;
};
const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};
const knownChargedNames = new Set([
  "crawsbow","webweaverbow","toxicblowpipe","accursedSceptre".toLowerCase(),
  "thammaronsSceptre".toLowerCase(),"ursinechainmace","viggoraschainmace",
  "tridentoftheseas","tridentoftheswamp","sanguinestaff","scytheofvitur",
  "tumekensshadow","bowoffaerdhinen","bladeofsaeldor",
]);
const hasChargedCounterpart = (item, items) => {
  if (item?.slot !== "weapon" || versionKey(item) !== "uncharged") return false;
  const name = key(itemName(item));
  return knownChargedNames.has(name) || items.some(other => key(itemName(other)) === name && versionKey(other) === "charged");
};
const dedupeById = pool => [...new Map(pool.map(item => [item._engineId,item])).values()];
const getSlotPool = (items, slot, {style,stats,quests,questOverrides,accountAware,excludedKeys,allowedKeys,ownedKeys,budgetGp}) => {
  const result = [];
  for (const source of Array.isArray(items) ? items : []) {
    if (!source || typeof source !== "object") continue;
    const id = itemId(source), name = itemName(source);
    if (!id || !name) continue;
    if (inferEquipmentSlot({...source,name}) !== slot) continue;
    if (source.equipable === false || source.equippable === false || source.is_equippable === false) continue;
    if (unusableVersion(source) || hasChargedCounterpart(source, items)) continue;
    if (slot === "Weapon" && !styleCompatible(source, style, slot)) continue;
    const normalized = key(name);
    if (excludedKeys.has(normalized)) continue;
    const owned = ownedKeys.has(normalized);
    if (source.tradeable === false && !owned && normalized !== "barrowsgloves") continue;
    if (accountAware) {
      if (!itemRequirementsMet(source, stats)) continue;
      if (!isQuestAvailable(source, quests, questOverrides) && !allowedKeys.has(normalized) && !owned) continue;
    }
    const price = itemPrice(source, ownedKeys);
    if (price == null || price > budgetGp) continue;
    result.push({...source,_engineId:id,_engineName:name,_enginePrice:price,_owned:owned});
  }
  return dedupeById(result);
};
const ammoPreference = (item, target) => {
  const name = key(itemName(item));
  let bonus = Number(item?.bonuses?.ranged_str ?? 0) * 3 + Number(item?.offensive?.ranged ?? 0) * 0.25;
  if (/ruby.*bolt|ruby.*bolt/.test(name)) bonus += Math.max(0,Number(target?.skills?.hp ?? target?.hitpoints ?? 0)) >= 200 ? 150 : 25;
  if (/diamond.*bolt|dragon.*bolt|onyx.*bolt|dragon.*arrow/.test(name)) bonus += 35;
  if (/broadbolt|amethystarrow/.test(name)) bonus += 18;
  return bonus;
};
const selectAmmoCandidates = (compatibleIds, ammoPool, target, limit = 6) => {
  const allowed = new Set(compatibleIds);
  return ammoPool.filter(item => allowed.has(item._engineId))
    .sort((a,b)=>ammoPreference(b,target)-ammoPreference(a,target)
      || a._enginePrice-b._enginePrice)
    .slice(0,limit);
};
const slotShortlist = (pool, style, target, current, max = 12) => {
  const sorted = [...pool].sort((a,b)=>preference(b,style,target)-preference(a,style,target)
    || a._enginePrice-b._enginePrice);
  const cheapest = [...pool].sort((a,b)=>a._enginePrice-b._enginePrice
    || preference(b,style,target)-preference(a,style,target))[0];
  const chosen = [current,cheapest,...sorted.slice(0,max)].filter(Boolean);
  return dedupeById(chosen);
};

/**
 * Deep, engine-first loadout search.
 *
 * The live calculator is the ranking authority. Recorded item stats are used
 * only to prioritise the search order, never to claim DPS. Weapons are searched
 * first, the engine supplies exact ammunition applicability, and complete Void
 * sets are tested as bundles so their set effect cannot be lost by slot-local
 * scoring. Unknown prices, requirements and weapon states fail closed.
 */
export async function optimizeLoadoutWithEngine({
  items = [], playerName, stats = {}, quests = [], questOverrides = {}, accountAware = true,
  excluded = [], allowedItems = [], ownedItems = [], target, style, attackType, stance, spell = null,
  budget = 0, runtimeUrl = "", fetchImpl = globalThis.fetch, onProgress = () => {},
  maxScenarios = 180, maxWeapons = 55, slotCandidates = 12,
} = {}) {
  const budgetGp = Math.max(0, Number(budget) || 0);
  if (!playerName) return { status:"review-required", issues:["Import an account with public combat levels before requesting a verified build."] };
  if (!target || !Number.isInteger(Number(target.id)) || Number(target.id) <= 0) return { status:"review-required", issues:["Choose a monster with a canonical combat-engine ID and exact variant."] };
  if (target.variantRequired && target.recordIndex === undefined && target.monsterIndex === undefined) return { status:"review-required", issues:["Select the exact canonical NPC variant before building; duplicate monster names and IDs must not be guessed."] };
  if (!budgetGp) return { status:"review-required", issues:["Enter a budget greater than 0 GP."] };
  if (!runtimeUrl) return { status:"unavailable", issues:["The combat Worker is not configured. Open DPS Calculator and set its Worker URL first."] };
  if (!["Melee","Ranged","Magic"].includes(style) || !attackType || !stance) return { status:"review-required", issues:["Choose a combat style, attack type and stance."] };
  if (style === "Magic" && !spell) return { status:"review-required", issues:["Choose a spell before asking the engine to build a magic setup."] };

  const excludedKeys = new Set(excluded.map(key));
  const allowedKeys = new Set(allowedItems.map(key));
  const ownedKeys = new Set(ownedItems.map(key));
  const options = {style,stats,quests,questOverrides,accountAware,excludedKeys,allowedKeys,ownedKeys,budgetGp};
  const pools = new Map(SLOT_ORDER.map(slot => [slot,getSlotPool(items,slot,options)]));
  const weaponPool = pools.get("Weapon");
  if (!weaponPool.length) return {status:"review-required",issues:["No eligible, priced or owned weapon with a canonical engine item ID matched this combat style."]};

  const warnings = [];
  const noPriceCount = (Array.isArray(items)?items:[]).filter(item => inferEquipmentSlot(item) && itemPrice(item,ownedKeys)==null).length;
  if (noPriceCount) warnings.push(`${noPriceCount} equipment record(s) had no current usable price and were not included unless marked owned.`);

  const ammoCache = new Map();
  const getAmmo = async weapon => {
    if (ammoCache.has(weapon._engineId)) return ammoCache.get(weapon._engineId);
    const value = await getLiveAmmoCompatibility({baseUrl:runtimeUrl,weaponId:weapon._engineId,fetchImpl});
    ammoCache.set(weapon._engineId,value);
    return value;
  };

  let calculations = 0, rejected = 0;
  const memo = new Map();
  const requestFor = picked => buildLiveCalculationRequest({
    playerName,stats,slots:asSlotPairs(picked),items,target,
    style:{name:`${attackType} ${stance}`,type:attackType,stance},
    boosts:ZERO_BOOSTS,prayers:[],buffs:EMPTY_BUFFS,spell,
  });
  const evaluate = async picked => {
    const totalCost = costOf(picked);
    if (totalCost > budgetGp) return {status:"over-budget",issues:["Candidate exceeds the requested budget."]};
    const slotList = asSlotPairs(picked);
    const cacheKey = JSON.stringify({runtimeUrl,playerName,target,style:attackType,stance,spell:spell?.name,stats,slotList});
    if (memo.has(cacheKey)) return memo.get(cacheKey);
    if (calculations >= maxScenarios) return {status:"limit-reached",issues:["Engine scenario safety limit reached."]};
    const built = requestFor(picked);
    if (built.status !== "ready") return {status:"review-required",issues:built.issues};
    calculations++;
    const response = await calculateLiveCombat({baseUrl:runtimeUrl,request:built.request,fetchImpl});
    if (response.status !== "calculated") rejected++;
    memo.set(cacheKey,response);
    return response;
  };

  const createSeed = (weapon, ammo = null) => {
    const picked = new Map([["Weapon",weapon]]);
    if (ammo) picked.set("Ammo",ammo);
    let remaining = budgetGp - weapon._enginePrice - (ammo?ammo._enginePrice:0);
    if (remaining < 0) return null;
    const order = [...NON_WEAPON_SLOTS].sort((a,b)=>{
      const aCost=pools.get(a).length?Math.min(...pools.get(a).map(x=>x._enginePrice)):Infinity;
      const bCost=pools.get(b).length?Math.min(...pools.get(b).map(x=>x._enginePrice)):Infinity;
      return aCost-bCost;
    });
    for (const slot of order) {
      if (slot === "Shield" && twoHanded(weapon)) continue;
      const cheapest = [...pools.get(slot)].sort((a,b)=>a._enginePrice-b._enginePrice
        || preference(b,style,target)-preference(a,style,target))[0];
      if (!cheapest || cheapest._enginePrice > remaining) continue;
      picked.set(slot,cheapest);
      remaining -= cheapest._enginePrice;
    }
    return picked;
  };

  const weaponRanked = [...weaponPool].sort((a,b)=>{
    const scoreB=preference(b,style,target)+ (b._owned?0.1:0);
    const scoreA=preference(a,style,target)+ (a._owned?0.1:0);
    return scoreB-scoreA || a._enginePrice-b._enginePrice;
  }).slice(0,maxWeapons);
  const weaponScenarios = [];
  let compatibilityFailures = 0;
  for (const weapon of weaponRanked) {
    const ammoInfo = style === "Ranged" ? await getAmmo(weapon) : {status:"not-required",compatibleAmmoIds:[]};
    if (ammoInfo.status === "unavailable" || ammoInfo.status === "incomplete-source") {
      compatibilityFailures++;
      continue;
    }
    const ammoChoices = ammoInfo.status === "required"
      ? selectAmmoCandidates(ammoInfo.compatibleAmmoIds,pools.get("Ammo"),target,6)
      : [];
    if (ammoInfo.status === "required" && !ammoChoices.length) {
      warnings.push(`${itemName(weapon)} needs ammunition, but no compatible ammunition with a known price or ownership was available.`);
      continue;
    }
    const variants = ammoInfo.status === "required" ? ammoChoices.slice(0,3) : [null];
    for (const ammo of variants) {
      const seed = createSeed(weapon,ammo);
      if (seed) weaponScenarios.push({weapon,ammo,picked:seed});
    }
  }
  if (compatibilityFailures) {
    return {
      status:"unavailable",
      issues:["The deployed combat Worker does not yet expose the canonical ammunition-compatibility endpoint. Update/deploy the combat-engine branch before running a weapon-first search; guessed ammo compatibility is disabled."],
      calculations,rejected,
    };
  }
  if (!weaponScenarios.length) return {status:"review-required",issues:["No weapon and ammunition combination could be assembled within the supplied budget."]};

  let bestPicked = null, bestResponse = null, bestCost = Infinity;
  const evaluateWeaponScenarios = await mapLimit(weaponScenarios,5,async scenario=>{
    const response=await evaluate(scenario.picked);
    return response.status==="calculated"?{...scenario,response,cost:costOf(scenario.picked)}:null;
  });
  for (const result of evaluateWeaponScenarios.filter(Boolean)) {
    if (compareResult(result.response,bestResponse,result.cost,bestCost)) {
      bestPicked=new Map(result.picked);bestResponse=result.response;bestCost=result.cost;
    }
  }
  if (!bestPicked || !bestResponse) return {
    status:"review-required",
    issues:["No weapon candidate returned a verified calculation. Check item availability, weapon state, exact NPC variant and Worker response."],
    calculations,rejected,warnings,
  };
  onProgress({checked:calculations,total:maxScenarios,slot:"Weapon search",dps:bestResponse.result.dps});

  // Explicitly test complete Elite and regular Void sets before slot-by-slot
  // optimisation. The engine requires the matching style helm, top, robe and
  // Void knight gloves; testing individual pieces alone misses the set effect.
  const voidHelmet = style==="Ranged"?"Void ranger helm":style==="Melee"?"Void melee helm":"Void mage helm";
  const voidBundles = [
    {label:"Elite Void",top:"Elite void top",legs:"Elite void robe"},
    {label:"Regular Void",top:"Void knight top",legs:"Void knight robe"},
  ];
  let completeVoidBundleTested = false;
  for (const bundle of voidBundles) {
    const wanted = [["Head",voidHelmet],["Body",bundle.top],["Legs",bundle.legs],["Hands","Void knight gloves"]];
    const resolved = wanted.map(([slot,name]) => pools.get(slot).find(item=>key(itemName(item))===key(name)));
    if (resolved.some(item=>!item)) continue;
    const draft=new Map(bestPicked);
    wanted.forEach(([slot],index)=>draft.set(slot,resolved[index]));
    if (costOf(draft)>budgetGp) continue;
    completeVoidBundleTested = true;
    const response=await evaluate(draft);
    if (response.status==="calculated"&&compareResult(response,bestResponse,costOf(draft),bestCost)) {
      bestPicked=draft;bestResponse=response;bestCost=costOf(draft);
    }
  }
  if (!completeVoidBundleTested) {
    warnings.push("A complete Void set was not eligible for testing. Mark the matching style helmet, body, robe and Void knight gloves as owned or provide reliable prices.");
  }
  onProgress({checked:calculations,total:maxScenarios,slot:"Set bonuses",dps:bestResponse.result.dps});

  // Two greedy engine-scored passes let linked choices respond to each other:
  // Barrows gloves vs Void gloves, Masori vs Void, and ring/neck/head accuracy.
  for (let pass=0;pass<2 && calculations<maxScenarios;pass++) {
    for (const slot of NON_WEAPON_SLOTS) {
      if (calculations>=maxScenarios) break;
      if (slot==="Shield" && twoHanded(bestPicked.get("Weapon"))) continue;
      let pool=pools.get(slot);
      if (slot==="Ammo") {
        const info=style==="Ranged"?await getAmmo(bestPicked.get("Weapon")):{status:"not-required",compatibleAmmoIds:[]};
        if (info.status==="required") pool=selectAmmoCandidates(info.compatibleAmmoIds,pool,target,slotCandidates);
        else pool=[];
      }
      const current=bestPicked.get(slot)??null;
      const candidates=slotShortlist(pool,style,target,current,slotCandidates)
        .filter(item=>item._engineId!==current?._engineId);
      const results=await mapLimit(candidates,4,async candidate=>{
        const draft=new Map(bestPicked);
        if (slot==="Ammo"&&!candidate) return null;
        if (slot==="Shield"&&twoHanded(draft.get("Weapon"))) return null;
        draft.set(slot,candidate);
        if (costOf(draft)>budgetGp) return null;
        const response=await evaluate(draft);
        return response.status==="calculated"?{draft,response,cost:costOf(draft)}:null;
      });
      const currentResult=results.filter(Boolean).reduce((selected,option)=>{
        return compareResult(option.response,bestResponse,option.cost,bestCost)?option:selected;
      },null);
      if (currentResult) {
        bestPicked=currentResult.draft;bestResponse=currentResult.response;bestCost=currentResult.cost;
      }
      onProgress({checked:calculations,total:maxScenarios,slot,pass:pass+1,dps:bestResponse.result.dps});
    }
  }

  const selectedItems=[...bestPicked.values()];
  const outputSlots=asSlotPairs(bestPicked);
  const missingPrices = (Array.isArray(items)?items:[]).filter(item=>{
    const slot=inferEquipmentSlot(item);
    return slot && !itemPrice(item,ownedKeys) && !ownedKeys.has(key(itemName(item)));
  }).length;
  if (missingPrices) warnings.push(`${missingPrices} catalogued equipment record(s) had no current price and were excluded unless marked owned.`);
  if (rejected) warnings.push(`${rejected} candidate calculation(s) were rejected by the canonical engine and were skipped.`);
  warnings.push("All ranking decisions use the canonical engine's full combat result, including weapon effects and supported set bonuses.");
  warnings.push("Search is weapon-first and evaluates complete Elite Void set synergy, but remains bounded to the highest-priority weapon and slot candidates; it is not an exhaustive proof over every possible gear permutation.");
  return {
    status:"calculated",slots:outputSlots,totalCost:bestCost,remainingBudget:Math.max(0,budgetGp-bestCost),
    engineResult:bestResponse.result,calculations,eligibleItemCount:SLOT_ORDER.reduce((sum,slot)=>sum+pools.get(slot).length,0),
    warnings,selectedItemIds:selectedItems.map(item=>item._engineId),
    ownedItemCount:selectedItems.filter(item=>item._owned).length,
    skippedUnknownPrice:missingPrices,skippedMissingId:0,
    searchMode:"weapon-first + canonical ammo + complete-set evaluation",
  };
}
