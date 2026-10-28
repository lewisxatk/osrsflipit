/**
 * OSRS Hub -> Weird Gloop DPS engine boundary.
 *
 * This module deliberately does not calculate DPS. It validates and normalises
 * the website-side inputs before a typed engine bridge is added. Missing or
 * ambiguous game data is reported instead of guessed.
 *
 * The calculator is GPL-3.0; any vendored/adapted implementation must retain
 * its notices and comply with the licence. See docs/combat-engine-integration.md.
 */

const SKILL_ALIASES = Object.freeze({
  atk: ["Attack", "attack", "atk"],
  str: ["Strength", "strength", "str"],
  def: ["Defence", "defence", "Defense", "defense", "def"],
  hp: ["Hitpoints", "Hitpoints level", "hitpoints", "hp"],
  ranged: ["Ranged", "ranged", "range"],
  magic: ["Magic", "magic"],
  prayer: ["Prayer", "prayer"],
  mining: ["Mining", "mining"],
  herblore: ["Herblore", "herblore"],
  farming: ["Farming", "farming"]
});

const SLOT_ALIASES = Object.freeze({
  Head: "head", Cape: "cape", Neck: "neck", Ammo: "ammo",
  Weapon: "weapon", Body: "body", Shield: "shield", Legs: "legs",
  Hands: "hands", Feet: "feet", Ring: "ring"
});

const finiteLevel = value => {
  const raw = value && typeof value === "object"
    ? (value.level ?? value.lvl ?? value.value)
    : value;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 126 ? n : null;
};

function readSkill(stats, aliases) {
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(stats ?? {}, alias)) {
      const value = finiteLevel(stats[alias]);
      if (value !== null) return value;
    }
  }
  return null;
}

/**
 * Validate OSRS Hub account skills without silently defaulting missing levels.
 * Returns { skills, missingSkills, errors }.
 */
export function normaliseAccountSkills(stats = {}) {
  const skills = {};
  const missingSkills = [];
  for (const [engineKey, aliases] of Object.entries(SKILL_ALIASES)) {
    const level = readSkill(stats, aliases);
    if (level === null) missingSkills.push(engineKey);
    else skills[engineKey] = level;
  }
  return {
    skills,
    missingSkills,
    errors: missingSkills.length
      ? [`Missing or invalid skill levels: ${missingSkills.join(", ")}`]
      : []
  };
}

/**
 * Convert the website's slot labels to engine slot keys. This is a shape
 * adapter only: equipment must still be matched to canonical engine records
 * by numeric item ID before calculations are allowed.
 */
export function normaliseEquipmentSlots(slots = []) {
  const equipment = {};
  const errors = [];
  for (const [label, item] of slots) {
    const slot = SLOT_ALIASES[label];
    if (!slot) {
      errors.push(`Unsupported equipment slot: ${label}`);
      continue;
    }
    if (!item || item === "—") {
      equipment[slot] = null;
      continue;
    }
    const id = Number(item.id ?? item.item_id ?? item.itemId);
    if (!Number.isInteger(id) || id <= 0) {
      errors.push(`Equipment in ${label} has no valid canonical item ID`);
      equipment[slot] = null;
      continue;
    }
    // Do not invent bonuses, speed, category or item variables here. A later
    // bridge must resolve this ID against the engine's own equipment dataset.
    equipment[slot] = { id, name: String(item.name ?? item._name ?? item.item_name ?? "") };
  }
  for (const slot of Object.values(SLOT_ALIASES)) {
    if (!(slot in equipment)) equipment[slot] = null;
  }
  return { equipment, errors };
}

/**
 * Build a safe, serialisable request envelope for the future calculation
 * service. It intentionally cannot be passed directly to PlayerVsNPCCalc yet.
 */
export function buildCombatRequest({ stats = {}, slots = [], target = null, style = null } = {}) {
  const account = normaliseAccountSkills(stats);
  const gear = normaliseEquipmentSlots(slots);
  const errors = [...account.errors, ...gear.errors];
  if (!target || !Number.isInteger(Number(target.id)) || Number(target.id) <= 0) {
    errors.push("Target must resolve to a canonical monster/NPC ID");
  }
  if (!["Melee", "Ranged", "Magic"].includes(style)) {
    errors.push("Combat style must be Melee, Ranged or Magic");
  }
  return {
    ok: errors.length === 0,
    errors,
    request: {
      schemaVersion: 1,
      source: "osrshub-combat-studio",
      style,
      target: target && Number.isInteger(Number(target.id)) && Number(target.id) > 0
        ? { id: Number(target.id), name: String(target.name ?? "") }
        : null,
      skills: account.skills,
      equipment: gear.equipment,
      calculationStatus: "not-connected",
      note: "No DPS result is produced by this adapter until canonical engine records and the calculator runtime are connected."
    }
  };
}
