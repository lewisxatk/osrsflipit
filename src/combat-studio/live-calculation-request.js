/**
 * Build a strict request for the OSRS Hub combat Worker from explicit UI state.
 *
 * This adapter never guesses attack stance, monster identity, skill levels or
 * equipment IDs. The Worker resolves all equipment and monster records against
 * its own canonical engine datasets and calculates the result.
 */
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const normaliseName = value => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const SLOT_MAP = Object.freeze({
  Head: "head", Cape: "cape", Neck: "neck", Ammo: "ammo", Weapon: "weapon",
  Body: "body", Shield: "shield", Legs: "legs", Hands: "hands", Feet: "feet", Ring: "ring",
});
const SKILLS = Object.freeze({
  atk: ["Attack", "attack", "atk"],
  def: ["Defence", "defence", "Defense", "defense", "def"],
  hp: ["Hitpoints", "Hitpoints level", "hitpoints", "hp"],
  magic: ["Magic", "magic"],
  prayer: ["Prayer", "prayer"],
  ranged: ["Ranged", "ranged", "Range", "range"],
  str: ["Strength", "strength", "str"],
  mining: ["Mining", "mining"],
  herblore: ["Herblore", "herblore"],
  farming: ["Farming", "farming"],
});
const VALID_STANCES = new Set([
  null, "Accurate", "Aggressive", "Autocast", "Controlled", "Defensive",
  "Defensive Autocast", "Longrange", "Rapid", "Manual Cast",
]);
const ZERO_BOOSTS = Object.freeze(Object.fromEntries(Object.keys(SKILLS).map(key => [key, 0])));
const DEFAULT_BUFFS = Object.freeze({
  potions: [], onSlayerTask: false, inWilderness: false, forinthrySurge: false,
  soulreaperStacks: 0, baAttackerLevel: 0, chinchompaDistance: 0,
  kandarinDiary: false, chargeSpell: false, markOfDarknessSpell: false,
  usingSunfireRunes: false, fragmentOfWind: false, fragmentOfWater: false,
  fragmentOfEarth: false, fragmentOfFire: false,
});

function readLevel(stats, aliases) {
  for (const key of aliases) {
    if (!Object.prototype.hasOwnProperty.call(stats ?? {}, key)) continue;
    const raw = stats[key];
    const value = Number(isRecord(raw) ? (raw.level ?? raw.lvl ?? raw.value) : raw);
    if (Number.isInteger(value) && value >= 1 && value <= 99) return value;
  }
  return null;
}

/**
 * @returns {{status:"ready", request:object, issues:[]} |
 * {status:"review-required", request:null, issues:string[]}}
 */
export function buildLiveCalculationRequest({
  playerName,
  stats = {},
  slots = [],
  items = [],
  target = null,
  style = null,
  boosts = ZERO_BOOSTS,
  prayers = [],
  buffs = DEFAULT_BUFFS,
  spell = null,
  monsterInputs = undefined,
} = {}) {
  const issues = [];
  const name = String(playerName ?? "").trim();
  if (!name) issues.push("Player name is required.");

  const skills = {};
  for (const [key, aliases] of Object.entries(SKILLS)) {
    const level = readLevel(stats, aliases);
    if (level === null) issues.push(`Missing or invalid ${key} level; live calculations require explicit account skills.`);
    else skills[key] = level;
  }

  if (!isRecord(style) || typeof style.name !== "string" || !style.name.trim()
    || !["stab", "slash", "crush", "magic", "ranged", null].includes(style.type)
    || !VALID_STANCES.has(style.stance)) {
    issues.push("An explicit engine-native combat style (name, type and supported stance) is required; it is never guessed from the broad combat category.");
  }

  if (!target || !Number.isInteger(Number(target.id)) || Number(target.id) <= 0) {
    issues.push("Target must have a positive canonical engine monster ID.");
  }

  const equipment = Object.fromEntries(Object.values(SLOT_MAP).map(slot => [slot, null]));
  if (!Array.isArray(slots)) {
    issues.push("Equipment slots must be an array of [slot, itemName] pairs.");
  } else {
    for (const entry of slots) {
      if (!Array.isArray(entry) || entry.length < 2) {
        issues.push("Each equipment slot must be a [slot, itemName] pair.");
        continue;
      }
      const [label, itemName] = entry;
      const slot = SLOT_MAP[label];
      if (!slot) {
        issues.push(`Unsupported equipment slot: ${String(label)}.`);
        continue;
      }
      if (!itemName || itemName === "—") continue;
      const match = Array.isArray(items)
        ? items.find(item => isRecord(item)
          && normaliseName(item._name ?? item.name ?? item.item_name ?? item.title) === normaliseName(itemName))
        : null;
      const id = Number(match?.id ?? match?.item_id ?? match?.itemId);
      if (!Number.isInteger(id) || id <= 0) {
        issues.push(`${label} item "${String(itemName)}" has no resolved canonical item ID.`);
        continue;
      }
      equipment[slot] = { id };
    }
  }

  if (!isRecord(boosts)) {
    issues.push("Boosts must be an explicit object.");
  } else {
    for (const key of Object.keys(SKILLS)) {
      if (!Number.isInteger(boosts[key]) || boosts[key] < 0 || boosts[key] > 126) {
        issues.push(`boosts.${key} must be an explicit integer from 0 to 126.`);
      }
    }
  }
  if (!Array.isArray(prayers) || prayers.some(value => !Number.isInteger(value) || value < 0 || value > 21)) {
    issues.push("Prayers must be an array of valid engine Prayer enum values (0–21).");
  }
  if (!isRecord(buffs)) {
    issues.push("Buffs must be an explicit object.");
  } else {
    if (!Array.isArray(buffs.potions ?? [])) issues.push("buffs.potions must be an array.");
    for (const key of [
      "onSlayerTask", "inWilderness", "forinthrySurge", "kandarinDiary", "chargeSpell",
      "markOfDarknessSpell", "usingSunfireRunes", "fragmentOfWind", "fragmentOfWater",
      "fragmentOfEarth", "fragmentOfFire",
    ]) {
      if (buffs[key] !== undefined && typeof buffs[key] !== "boolean") issues.push(`buffs.${key} must be boolean.`);
    }
    for (const key of ["soulreaperStacks", "baAttackerLevel", "chinchompaDistance"]) {
      if (buffs[key] !== undefined && (!Number.isFinite(buffs[key]) || buffs[key] < 0)) {
        issues.push(`buffs.${key} must be a non-negative number.`);
      }
    }
  }
  if (spell !== null && !isRecord(spell)) issues.push("Spell must be an engine spell object or null.");
  if (monsterInputs !== undefined && !isRecord(monsterInputs)) issues.push("Monster inputs must be an object when supplied.");

  if (issues.length) return { status: "review-required", request: null, issues };

  const player = {
    name,
    style: { ...style },
    skills,
    boosts: { ...boosts },
    equipment,
    prayers: [...prayers],
    buffs: { ...DEFAULT_BUFFS, ...buffs, potions: [...(buffs.potions ?? [])] },
    spell,
  };
  return {
    status: "ready",
    issues: [],
    request: {
      player,
      monsterId: Number(target.id),
      ...(monsterInputs === undefined ? {} : { monsterInputs: { ...monsterInputs } }),
    },
  };
}
