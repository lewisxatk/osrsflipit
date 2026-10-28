/**
 * Build the engine-native Monster input from a canonical record in the
 * Weird Gloop combat engine's monsters.json dataset.
 *
 * This mirrors the engine's documented INITIAL_MONSTER_INPUTS defaults.
 * It does not translate OSRS Hub's simplified monster rows or invent stats.
 */
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const finiteNumber = value => typeof value === "number" && Number.isFinite(value);

const STYLE_TYPES = new Set([
  "stab", "slash", "crush", "magic", "ranged", "light", "standard", "heavy", null,
]);
const SKILL_KEYS = ["atk", "def", "hp", "magic", "ranged", "str"];
const OFFENSIVE_KEYS = ["atk", "magic", "magic_str", "ranged", "ranged_str", "str"];
const DEFENSIVE_KEYS = ["flat_armour", "stab", "slash", "crush", "magic", "light", "standard", "heavy"];

export const ENGINE_MONSTER_DEFAULT_INPUTS = Object.freeze({
  isFromCoxCm: false,
  toaInvocationLevel: 0,
  toaPathLevel: 0,
  partyMaxCombatLevel: 126,
  partySumMiningLevel: 99,
  partyMaxHpLevel: 99,
  partySize: 1,
  monsterCurrentHp: 150,
  defenceReductions: Object.freeze({
    vulnerability: false,
    accursed: false,
    elderMaul: 0,
    dwh: 0,
    arclight: 0,
    emberlight: 0,
    bgs: 0,
    tonalztic: 0,
    seercull: 0,
    ayak: 0,
  }),
});

function validateNumericGroup(row, group, keys, issues, { integer = false, minimum = 0 } = {}) {
  if (!isRecord(row[group])) {
    issues.push(`${group} must be an object`);
    return;
  }
  for (const key of keys) {
    const value = row[group][key];
    if (!finiteNumber(value) || (integer && !Number.isInteger(value)) || value < minimum) {
      issues.push(`${group}.${key} must be a finite number${integer ? " (integer)" : ""} >= ${minimum}`);
    }
  }
}

function validateInputs(inputs) {
  const issues = [];
  if (!isRecord(inputs)) return { issues: ["inputs must be an object"], value: null };
  const booleans = ["isFromCoxCm"];
  const numbers = [
    "toaInvocationLevel", "toaPathLevel", "partyMaxCombatLevel", "partySumMiningLevel",
    "partyMaxHpLevel", "partySize", "monsterCurrentHp",
  ];
  for (const key of booleans) {
    if (typeof inputs[key] !== "boolean") issues.push(`inputs.${key} must be boolean`);
  }
  for (const key of numbers) {
    if (!finiteNumber(inputs[key]) || inputs[key] < 0) issues.push(`inputs.${key} must be a non-negative number`);
  }
  if (!Number.isInteger(inputs.partySize) || inputs.partySize < 1) issues.push("inputs.partySize must be a positive integer");
  if (!isRecord(inputs.defenceReductions)) {
    issues.push("inputs.defenceReductions must be an object");
  } else {
    for (const key of ["vulnerability", "accursed"]) {
      if (typeof inputs.defenceReductions[key] !== "boolean") issues.push(`inputs.defenceReductions.${key} must be boolean`);
    }
    for (const key of ["elderMaul", "dwh", "arclight", "emberlight", "bgs", "tonalztic", "seercull", "ayak"]) {
      const value = inputs.defenceReductions[key];
      if (!finiteNumber(value) || value < 0) issues.push(`inputs.defenceReductions.${key} must be a non-negative number`);
    }
  }
  return { issues, value: { ...inputs, defenceReductions: { ...inputs.defenceReductions } } };
}

/**
 * @returns {{status:"ready", monster:object, issues:[]} |
 * {status:"review-required", monster:null, issues:string[]}}
 */
export function buildEngineMonster(record, overrides = {}) {
  const issues = [];
  if (!isRecord(record)) {
    return { status: "review-required", monster: null, issues: ["record must be a canonical engine monster object"] };
  }
  if (!Number.isInteger(record.id) || record.id <= 0) issues.push("id must be a positive canonical monster ID");
  if (typeof record.name !== "string" || !record.name.trim()) issues.push("name is required");
  if (!Number.isInteger(record.size) || record.size < 1) issues.push("size must be a positive integer");
  if (!Number.isInteger(record.speed) || record.speed < 1) issues.push("speed must be a positive integer");
  if (!STYLE_TYPES.has(record.style)) issues.push("style is not a supported engine monster style");
  validateNumericGroup(record, "skills", SKILL_KEYS, issues, { integer: true });
  validateNumericGroup(record, "offensive", OFFENSIVE_KEYS, issues, { integer: true });
  validateNumericGroup(record, "defensive", DEFENSIVE_KEYS, issues, { integer: true });
  if (!Array.isArray(record.attributes)) issues.push("attributes must be an array");
  if (!Object.prototype.hasOwnProperty.call(record, "weakness")) {
    issues.push("weakness must be present (null is a valid canonical value)");
  } else if (record.weakness !== null && (!isRecord(record.weakness)
    || typeof record.weakness.element !== "string" || !finiteNumber(record.weakness.severity))) {
    issues.push("weakness must be null or a canonical {element, severity} object");
  }
  if (!isRecord(record.immunities) || !Object.prototype.hasOwnProperty.call(record.immunities, "burn")) {
    issues.push("immunities must be the canonical engine object with a burn property");
  }
  if (typeof record.is_slayer_monster !== "boolean") issues.push("is_slayer_monster must be boolean");
  if (!isRecord(overrides)) issues.push("overrides must be an object");

  const inputs = {
    ...ENGINE_MONSTER_DEFAULT_INPUTS,
    defenceReductions: { ...ENGINE_MONSTER_DEFAULT_INPUTS.defenceReductions },
    ...(isRecord(overrides) ? overrides : {}),
    defenceReductions: {
      ...ENGINE_MONSTER_DEFAULT_INPUTS.defenceReductions,
      ...(isRecord(overrides?.defenceReductions) ? overrides.defenceReductions : {}),
    },
  };
  const checkedInputs = validateInputs(inputs);
  issues.push(...checkedInputs.issues);

  if (issues.length) return { status: "review-required", monster: null, issues };
  return {
    status: "ready",
    issues: [],
    monster: {
      id: record.id,
      name: record.name,
      ...(typeof record.image === "string" ? { image: record.image } : {}),
      ...(typeof record.version === "string" ? { version: record.version } : {}),
      size: record.size,
      speed: record.speed,
      style: record.style,
      ...(finiteNumber(record.max_hit) ? { maxHit: record.max_hit } : {}),
      skills: { ...record.skills },
      offensive: { ...record.offensive },
      defensive: { ...record.defensive },
      attributes: [...record.attributes],
      weakness: record.weakness === null ? null : { ...record.weakness },
      immunities: { ...record.immunities },
      is_slayer_monster: record.is_slayer_monster,
      inputs: checkedInputs.value,
    },
  };
}
