/**
 * Combat Studio's transparent, scoped gear-ranking helper.
 * This is intentionally NOT advertised as a wiki-accurate DPS simulator. It uses
 * recorded item bonuses/speed/requirements where present, target hints, and price
 * inputs, and leaves missing data unknown instead of inventing values.
 */
const slots = ["Head","Cape","Neck","Ammo","Weapon","Body","Legs","Shield","Hands","Feet","Ring"];
const key = value => String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g,"");
const num = (...values) => {
  for (const value of values) {
    const n = Number(value);
    if (value !== null && value !== undefined && value !== "" && Number.isFinite(n)) return n;
  }
  return null;
};
const valueOf = (item, keys) => num(...keys.map(k => item?.[k] ?? item?.equipment?.[k] ?? item?.bonuses?.[k] ?? item?.stats?.[k]));
export function inferEquipmentSlot(item) {
  const itemName = key(item?.name ?? item?.item_name ?? "");
  if (/rawherring|cookedherring|rawtrout|rawsalmon|rawanchovies|rawsardine|rawmackerel|rawcod|rawtuna|rawshark|rawmonkfish|rawlobster|rawswordfish|potato|logs|ores|runes$/.test(itemName)) return null;
  const raw = String(item?.equipment_slot ?? item?.equipmentSlot ?? item?.slot ?? item?.equip_slot ?? item?.slot_name ?? "").trim();
  const canon = key(raw);
  const aliases = {
    head:"Head",headslot:"Head",helmet:"Head",cape:"Cape",back:"Cape",neck:"Neck",amulet:"Neck",
    ammo:"Ammo",ammunition:"Ammo",weapon:"Weapon",body:"Body",chest:"Body",legs:"Legs",shield:"Shield",
    hands:"Hands",gloves:"Hands",feet:"Feet",boots:"Feet",ring:"Ring"
  };
  if (aliases[canon]) return aliases[canon];
  const name = itemName;
  if (/^ringof|ring$|archerring|berserkerring|seersring|warriorring|magesring|lightbearer/.test(name)) return "Ring";
  if (/(helmet|helm|mask|coif|hood|cowl|crown|hat)$/.test(name)) return "Head";
  if (/(cape|cloak|assembler|quiver)$/.test(name)) return "Cape";
  if (/(amulet|necklace|scarf|pendant)$/.test(name)) return "Neck";
  if (/(arrow|bolt|dart|javelin|throwingknife|chinchompa|tokkul|rune pouch)$/.test(name)) return "Ammo";
  if (/(platebody|chainbody|hauberk|top|body|robe top|shirt|brassard)$/.test(name)) return "Body";
  if (/(platelegs|plateskirt|chaps|trousers|robe bottom|legs)$/.test(name)) return "Legs";
  if (/(shield|defender|book|ward|tome)$/.test(name)) return "Shield";
  if (/(gloves|gauntlets|vambraces|bracers|bracelet|grips)$/.test(name)) return "Hands";
  if (/(boots|shoes|sandals|greaves)$/.test(name)) return "Feet";
  if (/(sword|scimitar|bow|crossbow|staff|wand|spear|lance|hasta|axe|dagger|mace|whip|flail|halberd|rapier|claws|bludgeon|maul|glaive|trident|blowpipe|cannon)$/.test(name)) return "Weapon";
  return null;
}
const requirements = item => item?.requirements ?? item?.level_requirements ?? item?.skill_requirements ?? item?.stats_required ?? {};
const itemReqOk = (item, stats) => {
  const req = requirements(item);
  if (!req || Array.isArray(req) || typeof req !== "object") return null;
  const aliases = {att:"Attack",attack:"Attack",str:"Strength",strength:"Strength",def:"Defence",defence:"Defence",ranged:"Ranged",range:"Ranged",magic:"Magic",prayer:"Prayer"};
  let saw = false;
  for (const [raw,needed] of Object.entries(req)) {
    const skill = aliases[key(raw)];
    const level = num(typeof needed === "object" ? needed.level ?? needed.value : needed);
    if (!skill || level === null || level <= 1) continue;
    saw = true;
    const v = num(stats?.[skill]?.level, stats?.[skill]?.lvl, stats?.[skill], stats?.[skill.toLowerCase()]?.level, stats?.[skill.toLowerCase()]);
    if (v === null || v < level) return false;
  }
  return saw ? true : null;
};
export function isQuestAvailable(item, quests, overrides = {}) {
  const required = item?.quest_requirements ?? item?.questRequirements ?? item?.quests_required ?? item?.required_quests ?? [];
  const list = Array.isArray(required) ? required : typeof required === "string" ? [required] : [];
  if (!list.length) return null;
  for (const quest of list) {
    const name = typeof quest === "string" ? quest : quest?.name ?? quest?.quest ?? quest?.key;
    if (!name) continue;
    const override = overrides[key(name)];
    const imported = (Array.isArray(quests) ? quests : []).find(q => key(typeof q === "string" ? q : q?.name ?? q?.quest ?? q?.key) === key(name));
    const done = override ?? (typeof imported === "object" ? (imported.completed ?? imported.done ?? imported.state === "completed") : false);
    if (!done) return false;
  }
  return true;
}
const attackBonus = (item, style) => {
  if (style === "Ranged") return valueOf(item,["ranged_attack","rangedAttack","attack_ranged","ranged_bonus","ranged"]);
  if (style === "Magic") return valueOf(item,["magic_attack","magicAttack","attack_magic","magic_bonus","magic"]);
  const stab=valueOf(item,["stab_attack","stabAttack","attack_stab","stab"]),slash=valueOf(item,["slash_attack","slashAttack","attack_slash","slash"]),crush=valueOf(item,["crush_attack","crushAttack","attack_crush","crush"]);
  return Math.max(stab ?? -999, slash ?? -999, crush ?? -999) === -999 ? valueOf(item,["melee_attack","attack_bonus","attackBonus","attack"]) : Math.max(stab ?? -999,slash ?? -999,crush ?? -999);
};
const strengthBonus = (item, style) => style === "Ranged"
 ? valueOf(item,["ranged_strength","rangedStrength","ranged_str","rangedStrengthBonus"])
 : style === "Magic"
 ? valueOf(item,["magic_damage","magicDamage","magic_strength","magicStrength"])
 : valueOf(item,["melee_strength","meleeStrength","strength_bonus","strengthBonus","str"]);
const priceOf = item => {
  for (const value of [item?._price,item?.sell,item?.high,item?.price,item?.buy,item?.latest_price,item?.last_price]) {
    const candidate = num(value);
    if (candidate !== null && candidate > 0) return candidate;
  }
  return null;
};
export function targetProfile(name, records = []) {
  const n = key(name);
  const record = (Array.isArray(records) ? records : []).find(row => key(row?.name) === n) ?? null;
  const defensive = record?.defensiveBonuses ?? record?.defensive_bonuses ?? record?.defensive ?? null;
  const weaknessRaw = record?.weakness ?? record?.weaknesses ?? null;
  const weakness = Array.isArray(weaknessRaw) ? weaknessRaw.join(", ") : (typeof weaknessRaw === "string" ? weaknessRaw : null);
  let recordStyle = null;
  if (defensive && typeof defensive === "object" && !Array.isArray(defensive)) {
    const bonusKeys = [
      ["Melee / Stab", ["stab", "attack_stab", "defence_stab"]],
      ["Melee / Slash", ["slash", "attack_slash", "defence_slash"]],
      ["Melee / Crush", ["crush", "attack_crush", "defence_crush"]],
      ["Ranged", ["ranged", "range", "attack_ranged", "defence_ranged"]],
      ["Magic", ["magic", "attack_magic", "defence_magic"]]
    ];
    const values = bonusKeys.map(([label, keys]) => ({label, value: keys.map(k => Number(defensive[k])).find(v => Number.isFinite(v))})).filter(x => x.value !== undefined);
    if (values.length) recordStyle = values.sort((a, b) => a.value - b.value)[0].label;
  }
  const combatLevel = Number(record?.combatLevel ?? record?.combat_level ?? record?.combat) || null;
  const hp = Number(record?.hitpoints ?? record?.hp) || null;
  const recordSummary = record ? (" Source record" + (combatLevel ? " (combat " + combatLevel : "") + (hp ? ", " + hp + " HP" : "") + (combatLevel ? ")" : "") + ".") : "";
  const base = (() => {
    if (/vorkath|dragon|wyvern|galvek|elvarg|hydra|olm/.test(n)) return {recommendedStyle:"Ranged",weakness:"Dragon-bane bonus may apply only to eligible target variants",confidence:"Heuristic hint",summary:"Dragon-bane weapons can be strong against eligible dragon targets; the exact NPC/phase bonus must be source-verified."};
    if (/zulrah|kraken|whisperer|phantommuspah/.test(n)) return {recommendedStyle:"Compare styles / phases",weakness:"The best style can change by phase/form",confidence:"Phase-dependent hint",summary:"This target may change form or phase; a single-style recommendation is not a phase-accurate result."};
    if (/cerberus|kalphitequeen|dagannothrex|scurrius|sarachnis|mole/.test(n)) return {recommendedStyle:"Melee candidate",weakness:"Compare the source-backed stab/slash/crush defence fields",confidence:"Heuristic hint",summary:"Melee is only a starting candidate; weapon attack type and target defence values determine the better option."};
    return {recommendedStyle:null,weakness:null,confidence:"Target weaknesses not verified",summary:"No confirmed target-specific weakness data is available for this name in the current source catalogue."};
  })();
  if (record) {
    return {
      ...base,
      recommendedStyle: recordStyle || base.recommendedStyle,
      weakness: weakness || (recordStyle ? "Lowest recorded defensive value: " + recordStyle : base.weakness),
      confidence: weakness || recordStyle ? "Source field present; needs rule validation" : base.confidence,
      combatLevel, hitpoints: hp, recordId: record.id ?? null,
      summary: (recordSummary || " A source monster record is available.") + (weakness ? " Recorded weakness: " + weakness + "." : " The ingested record does not establish a verified style weakness.")
    };
  }
  return {...base, combatLevel:null, hitpoints:null, recordId:null, summary:base.summary + recordSummary};
}
const gearScore = (item, style, target = "") => {
  const a=attackBonus(item,style),s=strengthBonus(item,style),speed=valueOf(item,["attack_speed","attackSpeed","speed","ticks"]);
  const attack=a===null?0:Math.max(-50,a)*0.018;
  const strength=s===null?0:Math.max(-50,s)*0.045;
  const speedFactor=speed===null?0:Math.max(1,8-speed)*0.08;
  const specialName = key(item?._name ?? item?.name);
  const tags = key(item?.target_tags ?? item?.targetTags ?? item?.slayer_category ?? "");
  const targetName = key(target);
  const dragonTarget = /dragon|wyvern|vorkath|galvek|elvarg/.test(targetName);
  const baneWeapon = dragonTarget && (/dragonhunter/.test(specialName) || /dragonbane/.test(specialName) || /dragonhunter|dragonbane/.test(tags));
  const styleFit = style==="Ranged" ? /crossbow|bow|blowpipe/.test(specialName) : style==="Melee" ? /lance|hasta|spear/.test(specialName) : /staff|trident|wand/.test(specialName);
  const bane = baneWeapon ? (styleFit ? 0.8 : 0.45) : 0;
  return 1+attack+strength+speedFactor+bane;
};
export function estimateLoadout({items=[],target="",style="Ranged",budget=0,stats={},quests=[],accountAware=true,excluded=[],questOverrides={},scoreOnly=false,forcedSlots=null}={}) {
  const targetMeta=targetProfile(target), exclude=new Set(excluded.map(key));
  const equipment=(Array.isArray(items)?items:[]).filter(it=>it&&typeof it==="object"&&String(it._name??it.name??it.item_name??"").trim());
  const budgetN=Math.max(0,Number(budget)||0);
  const warnings=[];
  if (budgetN <= 0) warnings.push("Enter a budget greater than zero GP before generating a loadout.");
  if (!equipment.length) warnings.push("The page has no connected item records; confirm the items dataset is loading.");
  if (accountAware && !Object.keys(stats||{}).length) warnings.push("No account stats are available, so skill requirements cannot be fully verified.");
  if (accountAware && !quests?.length) warnings.push("Quest progress is unavailable. Quest-restricted items are excluded unless manually marked done in the local quest checklist.");
  if (budgetN <= 0) return {slots:slots.map(slot=>[slot,"—"]),gearScoreEstimate:null,candidateCount:0,totalCost:0,remainingBudget:0,weaponSpeed:null,weaponAttack:null,weaponDamage:null,targetMeta,warnings};
  const results=slots.map(slot=>{
    const pool=equipment.filter(item=>{
      if (inferEquipmentSlot(item)!==slot) return false;
      const name=String(item._name??item.name??"");
      if (exclude.has(key(name)) || item.tradeable===false || item.tradable===false || item.members===false && item?.equipable!==true) return false;
      const p=priceOf(item);
      if (p===null) return false;
      if (p>budgetN && budgetN>0) return false;
      if (accountAware) {
        if (itemReqOk(item,stats)===false) return false;
        if (isQuestAvailable(item,quests,questOverrides)===false) return false;
      }
      const reqType=key(item?.item_type??item?.type??item?.category??"");
      if (/food|fish|potion|logs|ore|rawfood|cookedfood|misc|junk/.test(reqType) || /rawherring|cookedherring|rawtrout|rawsalmon|rawanchovies|rawsardine|rawmackerel|rawcod|rawtuna|rawshark|rawmonkfish|rawlobster|rawswordfish/.test(key(name))) return false;
      return true;
    }).map(item=>({...item,_name:String(item._name??item.name??item.item_name),_price:priceOf(item),_estimatedScore:gearScore(item,style,target),_slot:slot}))
      .sort((a,b)=>b._estimatedScore-a._estimatedScore);
    return {slot,pool};
  });
  // Start from affordable low-cost gear in every slot, then spend remaining GP
  // on the best marginal score improvement per GP. This avoids choosing one
  // expensive item first and needlessly leaving otherwise-affordable slots empty.
  const chosenBySlot = new Map();
  let spent = 0;
  const rowsByMinimumCost = [...results].map(row => ({
    ...row,
    cheapest: [...row.pool].sort((a,b)=>(a._price??Infinity)-(b._price??Infinity)||b._estimatedScore-a._estimatedScore)[0] ?? null
  })).sort((a,b)=>(a.cheapest?._price??Infinity)-(b.cheapest?._price??Infinity));
  for (const row of rowsByMinimumCost) {
    const affordable = row.pool.filter(item => item._price != null && spent + item._price <= budgetN);
    const pick = affordable.sort((a,b)=>(a._price??Infinity)-(b._price??Infinity)||b._estimatedScore-a._estimatedScore)[0];
    if (pick) {
      chosenBySlot.set(row.slot,pick);
      spent += pick._price;
    }
  }
  // Upgrade one slot at a time, preferring the largest score gain per extra GP.
  // Each selected item is replaced, never double-counted.
  for (let guard=0; guard<equipment.length; guard++) {
    let best = null;
    for (const row of results) {
      const current = chosenBySlot.get(row.slot) ?? null;
      for (const candidate of row.pool) {
        if (current && key(candidate._name)===key(current._name)) continue;
        const costDelta = (candidate._price??Infinity) - (current?._price??0);
        const scoreDelta = candidate._estimatedScore - (current?._estimatedScore??0);
        if (!Number.isFinite(costDelta) || !Number.isFinite(scoreDelta) || scoreDelta<=0) continue;
        if (costDelta>budgetN-spent) continue;
        const efficiency = costDelta<=0 ? scoreDelta*1e6 : scoreDelta/costDelta;
        if (!best || efficiency>best.efficiency) best={slot:row.slot,candidate,current,costDelta,scoreDelta,efficiency};
      }
    }
    if (!best) break;
    chosenBySlot.set(best.slot,best.candidate);
    spent += best.costDelta;
  }
  const chosen = slots.map(slot => [slot,chosenBySlot.get(slot)?._name ?? "—"]);
  const selectedItems=chosen.map(([slot,name])=>chosenBySlot.get(slot) ?? equipment.find(x=>key(x._name??x.name)===key(name))).filter(Boolean);
  const currentScore=selectedItems.reduce((sum,item)=>sum+gearScore(item,style,target)-1,0);
  const weapon=selectedItems.find(item=>inferEquipmentSlot(item)==="Weapon");
  const weaponSpeed=weapon ? valueOf(weapon,["attack_speed","attackSpeed","speed","ticks"]) : null;
  const weaponDamage=strengthBonus(weapon||{},style);
  const weaponAttack=attackBonus(weapon||{},style);
  const score=Math.max(0,currentScore+(targetMeta.recommendedStyle===style?0.2:0));
  const result={slots:chosen,gearScoreEstimate:score>0?Number(score.toFixed(2)):null,candidateCount:results.reduce((n,row)=>n+row.pool.length,0),totalCost:spent,remainingBudget:Math.max(0,budgetN-spent),weaponSpeed,weaponAttack,weaponDamage,targetMeta,warnings:[...warnings]};
  return scoreOnly?result:result;
}
