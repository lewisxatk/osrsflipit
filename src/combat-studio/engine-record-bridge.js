/**
 * Safe resolver for canonical records owned by the Weird Gloop DPS engine.
 *
 * This deliberately validates records rather than synthesising engine data from
 * OSRS Hub's simplified stats. Feed it the engine's own equipment.json and
 * monsters.json records. It does not calculate DPS or claim a record is usable
 * merely because an ID exists in the OSRS Hub dataset.
 */
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const validId = value => Number.isInteger(Number(value)) && Number(value) > 0;

function indexCanonicalRows(rows, label) {
  const index = new Map();
  const issues = [];
  if (!Array.isArray(rows)) {
    return { index, issues: [{ code: "invalid_dataset", dataset: label, message: "Expected an array of canonical engine records." }] };
  }
  for (const row of rows) {
    if (!isRecord(row) || !validId(row.id)) {
      issues.push({ code: "invalid_identity", dataset: label, id: row?.id ?? null });
      continue;
    }
    const id = Number(row.id);
    if (index.has(id)) {
      issues.push({ code: "duplicate_identity", dataset: label, id });
      continue;
    }
    index.set(id, row);
  }
  return { index, issues };
}

function missingFields(row, fields) {
  return fields.filter(field => row[field] === undefined || row[field] === null);
}

const EQUIPMENT_FIELDS = [
  "name", "weight", "version", "slot", "image", "speed", "category",
  "isTwoHanded", "bonuses", "offensive", "defensive"
];
const BONUS_FIELDS = ["str", "ranged_str", "magic_str", "prayer"];
const ATTACK_FIELDS = ["stab", "slash", "crush", "magic", "ranged"];
const DEFENCE_FIELDS = ["stab", "slash", "crush", "magic", "ranged"];
const MONSTER_FIELDS = [
  "name", "size", "speed", "style", "skills", "offensive", "defensive",
  "attributes", "weakness", "immunities", "is_slayer_monster", "inputs"
];

function validateEquipment(row) {
  const missing = missingFields(row, EQUIPMENT_FIELDS);
  if (isRecord(row.bonuses)) missing.push(...missingFields(row.bonuses, BONUS_FIELDS).map(x => "bonuses." + x));
  else if (row.bonuses !== undefined && row.bonuses !== null) missing.push("bonuses (object)");
  if (isRecord(row.offensive)) missing.push(...missingFields(row.offensive, ATTACK_FIELDS).map(x => "offensive." + x));
  else if (row.offensive !== undefined && row.offensive !== null) missing.push("offensive (object)");
  if (isRecord(row.defensive)) missing.push(...missingFields(row.defensive, DEFENCE_FIELDS).map(x => "defensive." + x));
  else if (row.defensive !== undefined && row.defensive !== null) missing.push("defensive (object)");
  return [...new Set(missing)];
}

function validateMonster(row) {
  const missing = missingFields(row, MONSTER_FIELDS);
  for (const [group, fields] of Object.entries({
    skills: ["atk", "def", "hp", "magic", "ranged", "str"],
    offensive: ["atk", "magic", "magic_str", "ranged", "ranged_str", "str"],
    inputs: ["isFromCoxCm", "toaInvocationLevel", "toaPathLevel", "partyMaxCombatLevel",
      "partySumMiningLevel", "partyMaxHpLevel", "partySize", "monsterCurrentHp", "defenceReductions"],
    immunities: ["burn"],
  })) {
    if (isRecord(row[group])) missing.push(...missingFields(row[group], fields).map(x => group + "." + x));
    else missing.push(group + " (object)");
  }
  if (isRecord(row.defensive) && row.defensive.flat_armour === undefined) missing.push("defensive.flat_armour");
  if (!Array.isArray(row.attributes)) missing.push("attributes (array)");
  return [...new Set(missing)];
}

/**
 * Resolve one item ID only when the matching canonical engine record is
 * structurally complete enough to pass to a later typed player builder.
 */
export function resolveEngineEquipment(itemId, engineEquipmentRows) {
  if (!validId(itemId)) return { status: "invalid-id", record: null, missingFields: [] };
  const { index, issues } = indexCanonicalRows(engineEquipmentRows, "equipment");
  if (issues.some(issue => issue.code === "invalid_dataset")) {
    return { status: "invalid-engine-dataset", record: null, issues, missingFields: [] };
  }
  const record = index.get(Number(itemId));
  if (!record) return { status: "not-found", record: null, issues, missingFields: [] };
  const missing = validateEquipment(record);
  return {
    status: missing.length ? "review-required" : "engine-record-ready",
    record: missing.length ? null : record,
    candidate: record,
    missingFields: missing,
    issues,
  };
}

export function resolveEngineMonster(monsterId, engineMonsterRows) {
  if (!validId(monsterId)) return { status: "invalid-id", record: null, missingFields: [] };
  const { index, issues } = indexCanonicalRows(engineMonsterRows, "monsters");
  if (issues.some(issue => issue.code === "invalid_dataset")) {
    return { status: "invalid-engine-dataset", record: null, issues, missingFields: [] };
  }
  const record = index.get(Number(monsterId));
  if (!record) return { status: "not-found", record: null, issues, missingFields: [] };
  const missing = validateMonster(record);
  return {
    status: missing.length ? "review-required" : "engine-record-ready",
    record: missing.length ? null : record,
    candidate: record,
    missingFields: missing,
    issues,
  };
}

/** Build a lookup once per loaded engine dataset; no OSRS Hub rows are coerced. */
export function createEngineRecordBridge({ equipment = [], monsters = [] } = {}) {
  const equipmentIndex = indexCanonicalRows(equipment, "equipment");
  const monsterIndex = indexCanonicalRows(monsters, "monsters");
  return {
    issues: [...equipmentIndex.issues, ...monsterIndex.issues],
    resolveEquipment: id => resolveEngineEquipment(id, equipment),
    resolveMonster: id => resolveEngineMonster(id, monsters),
  };
}
