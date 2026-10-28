/**
 * Builds the engine-native Player shape from canonical equipment records and
 * explicit account/combat inputs. This is a data adapter, not a combat formula.
 *
 * Important: callers must supply the engine's canonical equipment records;
 * OSRS Hub's simplified item rows are deliberately not accepted here.
 */
const SKILL_KEYS = [
  "atk", "def", "hp", "magic", "prayer", "ranged", "str",
  "mining", "herblore", "farming",
];
const EQUIPMENT_SLOTS = [
  "head", "cape", "neck", "ammo", "weapon", "body",
  "shield", "legs", "hands", "feet", "ring",
];
const BONUS_KEYS = ["str", "ranged_str", "magic_str", "prayer"];
const ATTACK_KEYS = ["stab", "slash", "crush", "magic", "ranged"];
const DEFENCE_KEYS = ["stab", "slash", "crush", "magic", "ranged"];

const ZERO_SKILLS = () => Object.fromEntries(SKILL_KEYS.map((key) => [key, 0]));
const ZERO_STATS = (keys) => Object.fromEntries(keys.map((key) => [key, 0]));
const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function validateSkills(skills, label, { allowZero = false } = {}) {
  if (!isRecord(skills)) return [`${label} must be an object`];
  const issues = [];
  for (const key of SKILL_KEYS) {
    const value = skills[key];
    const minimum = allowZero ? 0 : 1;
    if (!Number.isInteger(value) || value < minimum || value > 99) {
      issues.push(`${label}.${key} must be an integer from ${minimum} to 99`);
    }
  }
  return issues;
}

function validateStyle(style) {
  if (!isRecord(style)) return ["style must be an engine-native combat style object"];
  const issues = [];
  if (typeof style.name !== "string" || !style.name.trim()) issues.push("style.name is required");
  if (!["stab", "slash", "crush", "magic", "ranged", null].includes(style.type)) {
    issues.push("style.type must be stab, slash, crush, magic, ranged, or null");
  }
  if (![
    null, "Accurate", "Aggressive", "Autocast", "Controlled", "Defensive",
    "Defensive Autocast", "Longrange", "Rapid", "Manual Cast",
  ].includes(style.stance)) issues.push("style.stance is not a supported engine stance");
  return issues;
}

function validateEquipmentPiece(piece, slot) {
  if (piece === null) return [];
  if (!isRecord(piece)) return [`equipment.${slot} must be a canonical record or null`];
  const issues = [];
  if (!Number.isInteger(piece.id) || piece.id <= 0) issues.push(`equipment.${slot}.id is invalid`);
  if (piece.slot !== slot) issues.push(`equipment.${slot} has canonical slot ${String(piece.slot)}`);
  if (typeof piece.name !== "string" || !piece.name) issues.push(`equipment.${slot}.name is missing`);
  for (const [group, keys] of [
    ["bonuses", BONUS_KEYS], ["offensive", ATTACK_KEYS], ["defensive", DEFENCE_KEYS],
  ]) {
    if (!isRecord(piece[group])) {
      issues.push(`equipment.${slot}.${group} must be an object`);
      continue;
    }
    for (const key of keys) {
      if (typeof piece[group][key] !== "number" || !Number.isFinite(piece[group][key])) {
        issues.push(`equipment.${slot}.${group}.${key} must be a finite number`);
      }
    }
  }
  if (!Number.isFinite(piece.weight) || !Number.isFinite(piece.speed)) {
    issues.push(`equipment.${slot} needs canonical numeric weight and speed`);
  }
  if (typeof piece.version !== "string" || typeof piece.image !== "string"
      || typeof piece.category !== "string" || typeof piece.isTwoHanded !== "boolean") {
    issues.push(`equipment.${slot} is missing engine-native metadata`);
  }
  return issues;
}

/**
 * @returns { { status: "ready", player: object, issues: [] } |
 *   { status: "review-required", player: null, issues: string[] } }
 */
export function buildEnginePlayer(input = {}) {
  const issues = [];
  if (!isRecord(input)) {
    return { status: "review-required", player: null, issues: ["input must be an object"] };
  }
  if (typeof input.name !== "string" || !input.name.trim()) issues.push("name is required");
  issues.push(...validateSkills(input.skills, "skills"));
  const boosts = input.boosts === undefined ? ZERO_SKILLS() : input.boosts;
  issues.push(...validateSkills(boosts, "boosts", { allowZero: true }));
  issues.push(...validateStyle(input.style));

  if (!Number.isInteger(input.attackSpeed) || input.attackSpeed < 1) {
    issues.push("attackSpeed must be an explicit positive integer from the selected combat setup");
  }
  if (!isRecord(input.equipment)) issues.push("equipment must map all engine equipment slots");
  const suppliedEquipment = isRecord(input.equipment) ? input.equipment : {};
  const equipment = {};
  for (const slot of EQUIPMENT_SLOTS) {
    const piece = suppliedEquipment[slot] === undefined ? null : suppliedEquipment[slot];
    equipment[slot] = piece;
    issues.push(...validateEquipmentPiece(piece, slot));
  }
  for (const slot of Object.keys(suppliedEquipment)) {
    if (!EQUIPMENT_SLOTS.includes(slot)) issues.push(`equipment has unknown slot: ${slot}`);
  }

  const prayers = input.prayers === undefined ? [] : input.prayers;
  if (!Array.isArray(prayers) || prayers.some((prayer) => !Number.isInteger(prayer) || prayer < 0 || prayer > 21)) {
    issues.push("prayers must be an array of engine Prayer enum values (0–21)");
  }
  const spell = input.spell === undefined ? null : input.spell;
  if (spell !== null && !isRecord(spell)) issues.push("spell must be an engine Spell object or null");

  const providedBuffs = input.buffs === undefined ? {} : input.buffs;
  if (!isRecord(providedBuffs)) issues.push("buffs must be an object");
  const buffs = {
    potions: [],
    onSlayerTask: false,
    inWilderness: false,
    forinthrySurge: false,
    soulreaperStacks: 0,
    baAttackerLevel: 0,
    chinchompaDistance: 0,
    kandarinDiary: false,
    chargeSpell: false,
    markOfDarknessSpell: false,
    usingSunfireRunes: false,
    fragmentOfWind: false,
    fragmentOfWater: false,
    fragmentOfEarth: false,
    fragmentOfFire: false,
    ...(isRecord(providedBuffs) ? providedBuffs : {}),
  };
  if (!Array.isArray(buffs.potions)) issues.push("buffs.potions must be an array");
  for (const key of [
    "onSlayerTask", "inWilderness", "forinthrySurge", "kandarinDiary",
    "chargeSpell", "markOfDarknessSpell", "usingSunfireRunes",
    "fragmentOfWind", "fragmentOfWater", "fragmentOfEarth", "fragmentOfFire",
  ]) {
    if (typeof buffs[key] !== "boolean") issues.push(`buffs.${key} must be boolean`);
  }
  for (const key of ["soulreaperStacks", "baAttackerLevel", "chinchompaDistance"]) {
    if (!Number.isFinite(buffs[key]) || buffs[key] < 0) issues.push(`buffs.${key} must be a non-negative number`);
  }

  const bonuses = ZERO_STATS(BONUS_KEYS);
  const offensive = ZERO_STATS(ATTACK_KEYS);
  const defensive = ZERO_STATS(DEFENCE_KEYS);
  for (const piece of Object.values(equipment)) {
    if (!isRecord(piece)) continue;
    for (const key of BONUS_KEYS) if (typeof piece.bonuses?.[key] === "number") bonuses[key] += piece.bonuses[key];
    for (const key of ATTACK_KEYS) {
      if (typeof piece.offensive?.[key] === "number") offensive[key] += piece.offensive[key];
      if (typeof piece.defensive?.[key] === "number") defensive[key] += piece.defensive[key];
    }
  }

  if (issues.length) return { status: "review-required", player: null, issues };
  return {
    status: "ready",
    issues: [],
    player: {
      name: input.name.trim(),
      style: { ...input.style },
      skills: { ...input.skills },
      boosts: { ...boosts },
      equipment,
      bonuses,
      offensive,
      defensive,
      attackSpeed: input.attackSpeed,
      prayers: [...prayers],
      buffs,
      spell,
    },
  };
}

export const ENGINE_PLAYER_SKILLS = Object.freeze([...SKILL_KEYS]);
export const ENGINE_EQUIPMENT_SLOTS = Object.freeze([...EQUIPMENT_SLOTS]);
