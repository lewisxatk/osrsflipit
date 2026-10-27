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
  const direct = num(item?._price,item?.sell,item?.high,item?.price,item?.buy,item?.latest_price,item?.last_price);
  return direct !== null && direct > 0 ? direct : null;
};
const styleTag = style => style === "Ranged" ? /range|ranged|bow|crossbow|bolt|arrow|dart|blowpipe|chinchompa/.test : style === "Magic" ? /magic|spell|staff|wand|trident/.test : /melee|slash|stab|crush|sword|lance|scimitar|whip|dagger|mace/.test;
export function targetProfile(name) {
  const n=key(name);
  if (/vorkath|dragon|wyvern|galvek|elvarg|hydra|olm/.test(n)) return {recommendedStyle:/vorkath|dragon|wyvern|galvek|elvarg/.test(n)?"Ranged":"Ranged",weakness:"Dragon/monster-specific bonuses depend on the selected weapon and target form",confidence:"Hint only",summary:"Dragon-bane weapons can be strong against eligible dragon targets; target-specific rules still need verified records."};
  if (/zulrah|kraken|whisperer|phantommuspah/.test(n)) return {recommendedStyle:"Ranged",weakness:"Style depends on phase/form; one style may not work for every phase",confidence:"Hint only",summary:"Some bosses change defence or style weaknesses between phases. Treat this as a starting point, not a phase-accurate result."};
  if (/cerberus|kalphitequeen|dagannothrex|scurrius|sarachnis|mole/.test(n)) return {recommendedStyle:"Melee",weakness:"Melee style depends on defensive bonuses",confidence:"Hint only",summary:"Melee is a general candidate; compare actual stab/slash/crush defence records before declaring a best style."};
  return {recommendedStyle:null,weakness:null,confidence:"Target stats not verified",summary:"No verified target defence/weakness profile is available in this page-level dataset."};
}
const gearScore = (item, style) => {
  const a=attackBonus(item,style),s=strengthBonus(item,style),speed=valueOf(item,["attack_speed","attackSpeed","speed","ticks"]);
  const attack=a===null?0:Math.max(-50,a)*0.018;
  const strength=s===null?0:Math.max(-50,s)*0.045;
  const speedFactor=speed===null?1:Math.max(1,8-speed)*0.08;
  const specialName = key(item?._name ?? item?.name);
  const tags = key(item?.target_tags ?? item?.targetTags ?? item?.slayer_category ?? "");
  const bane = /dragon/.test(specialName) && /dragon|wyvern|vorkath|galvek|elvarg/.test(tags);
  return 1+attack+strength+speedFactor+(bane?0.35:0);
};
export function estimateLoadout({items=[],target="",style="Ranged",budget=0,stats={},quests=[],accountAware=true,excluded=[],questOverrides={},scoreOnly=false,forcedSlots=null}={}) {
  const targetMeta=targetProfile(target), exclude=new Set(excluded.map(key));
  const equipment=(Array.isArray(items)?items:[]).filter(it=>it&&typeof it==="object"&&String(it._name??it.name??it.item_name??"").trim());
  const knownCosts=equipment.map(priceOf).filter(v=>v!==null).sort((a,b)=>a-b);
  const budgetN=Math.max(0,Number(budget)||0);
  const warnings=[];
  if (!equipment.length) warnings.push("The page has no connected item records; confirm the items dataset is loading.");
  if (accountAware && !Object.keys(stats||{}).length) warnings.push("No account stats are available, so skill requirements cannot be fully verified.");
  if (accountAware && !quests?.length) warnings.push("Quest progress is unavailable. Quest-restricted items are excluded unless manually marked done in the local quest checklist.");
  const results=slots.map(slot=>{
    const pool=equipment.filter(item=>{
      if (inferEquipmentSlot(item)!==slot) return false;
      const name=String(item._name??item.name??"");
      if (exclude.has(key(name)) || item.tradeable===false || item.tradable===false || item.members===false && item?.equipable!==true) return false;
      const p=priceOf(item);
      if (slot!=="Ammo" && p===null) return false;
      if (p!==null && p>budgetN && budgetN>0) return false;
      if (accountAware) {
        if (itemReqOk(item,stats)===false) return false;
        if (isQuestAvailable(item,quests,questOverrides)===false) return false;
      }
      const reqType=key(item?.item_type??item?.type??item?.category??"");
      if (/food|fish|potion|logs|ore|rawfood|cookedfood|misc|junk/.test(reqType) || /rawherring|cookedherring|rawtrout|rawsalmon|rawanchovies|rawsardine|rawmackerel|rawcod|rawtuna|rawshark|rawmonkfish|rawlobster|rawswordfish/.test(key(name))) return false;
      return true;
    }).map(item=>({...item,_name:String(item._name??item.name??item.item_name),_price:priceOf(item),_estimatedScore:gearScore(item,style),_slot:slot}))
      .sort((a,b)=>b._estimatedScore-a._estimatedScore);
    return {slot,pool};
  });
  const chosen=[];
  let spent=0;
  for (const row of results) {
    const ranked=row.pool.filter(item=>!item._price || spent+item._price<=budgetN || budgetN===0);
    let pick=ranked[0]||null;
    if (!pick && row.pool.length) {
      pick=[...row.pool].sort((a,b)=>(a._price??0)-(b._price??0))[0];
    }
    if (pick) {
      chosen.push([row.slot,pick._name]);
      spent += pick._price || 0;
    } else chosen.push([row.slot,"—"]);
  }
  if (budgetN>0 && spent>budgetN) {
    const selected=chosen.map(([slot,name])=>({slot,name,item:equipment.find(x=>key(x._name??x.name)===key(name))})).filter(x=>x.name!=="—").sort((a,b)=>gearScore(a.item||{},style)-gearScore(b.item||{},style));
    for (const row of selected) {
      if (spent<=budgetN) break;
      const p=priceOf(row.item)||0;
      chosen[chosen.findIndex(x=>x[0]===row.slot)]=[row.slot,"—"];
      spent-=p;
    }
  }
  const selectedItems=chosen.map(([slot,name])=>equipment.find(x=>key(x._name??x.name)===key(name))).filter(Boolean);
  const currentScore=selectedItems.reduce((sum,item)=>sum+gearScore(item,style)-1,0);
  const speeds=selectedItems.map(item=>valueOf(item,["attack_speed","attackSpeed","speed","ticks"])).filter(v=>v!==null);
  const weapon=selectedItems.find(item=>inferEquipmentSlot(item)==="Weapon");
  const weaponSpeed=weapon ? valueOf(weapon,["attack_speed","attackSpeed","speed","ticks"]) : null;
  const weaponDamage=strengthBonus(weapon||{},style);
  const weaponAttack=attackBonus(weapon||{},style);
  const score=Math.max(0,currentScore+(targetMeta.recommendedStyle===style?0.2:0));
  const result={slots:chosen,estimatedDps:score>0?Number(score.toFixed(2)):null,candidateCount:results.reduce((n,row)=>n+row.pool.length,0),totalCost:spent,remainingBudget:Math.max(0,budgetN-spent),weaponSpeed,weaponAttack,weaponDamage,targetMeta,warnings:[...warnings]};
  return scoreOnly?result:result;
}
