/**
 * OSRS Hub Combat Studio V1 data adapter.
 *
 * Accepts the nine generated JSON arrays as a bundle object. This module does
 * not invent missing values or claim factual/DPS validation. It intentionally
 * stays separate from the main UI until a real bundle endpoint is configured.
 */
export const COMBAT_STUDIO_FILES = Object.freeze([
  ["items.json", "items", "id"],
  ["equipment-stats.json", "equipmentStats", "id"],
  ["weapons.json", "weapons", "id"],
  ["item-requirements.json", "itemRequirements", "item_id"],
  ["item-combat-profiles.json", "itemCombatProfiles", "id"],
  ["monsters-combat.json", "monsters", "id"],
  ["quests.json", "quests", "key"],
  ["quest-relationships.json", "questRelationships", "quest_key"],
  ["item-relationships.json", "itemRelationships", "item_id"],
]);

const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const hasIdentity = (value, key) => value[key] !== undefined && value[key] !== null && String(value[key]).trim() !== "";

export function inspectCombatStudioBundle(rawBundle) {
  const issues = [];
  const datasets = {};
  if (!isRecord(rawBundle)) {
    return { status: "blocked", issues: ["Bundle must be an object keyed by artifact filename."], datasets };
  }

  for (const [filename, key, identity] of COMBAT_STUDIO_FILES) {
    const rows = rawBundle[filename] ?? rawBundle[key];
    if (!Array.isArray(rows)) {
      issues.push({ file: filename, code: "missing_or_invalid_array", message: "Expected a JSON array." });
      datasets[key] = { state: "blocked", records: [] };
      continue;
    }
    const invalidRows = rows.filter(row => !isRecord(row));
    const missingIdentity = rows.filter(row => isRecord(row) && !hasIdentity(row, identity)).length;
    const identities = rows.filter(row => isRecord(row) && hasIdentity(row, identity)).map(row => String(row[identity]));
    const duplicates = identities.length - new Set(identities).size;
    const state = rows.length === 0 || invalidRows.length || missingIdentity || duplicates ? "review_required" : "ready";
    if (state !== "ready") {
      issues.push({ file: filename, code: "record_integrity_warning", message: "Empty records, invalid rows, missing identity or duplicate identity detected.", invalidRows: invalidRows.length, missingIdentity, duplicates, recordCount: rows.length });
    }
    datasets[key] = { state, records: rows.filter(isRecord), identityField: identity, recordCount: rows.length };
  }

  return {
    status: issues.some(issue => issue.code === "missing_or_invalid_array") ? "blocked" : issues.length ? "review_required" : "ready_for_consumer_smoke_test",
    issues,
    datasets,
    guardrails: [
      "Structural readiness is not proof of OSRS factual correctness or DPS accuracy.",
      "Missing and unknown values remain unknown; they are not coerced to zero.",
      "Item presence does not prove account or quest eligibility.",
    ],
  };
}

export async function loadCombatStudioBundle({ baseUrl = "/data/combat-studio-v1/", fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A Fetch-compatible function is required.");
  const entries = await Promise.all(COMBAT_STUDIO_FILES.map(async ([filename]) => {
    const response = await fetchImpl(new URL(filename, new URL(baseUrl, globalThis.location?.origin ?? "https://osrshub.invalid/")));
    if (!response.ok) throw new Error(`Combat Studio data unavailable: ${filename} (HTTP ${response.status})`);
    return [filename, await response.json()];
  }));
  const inspected = inspectCombatStudioBundle(Object.fromEntries(entries));
  if (inspected.status === "blocked") throw new Error("Combat Studio bundle is incomplete: " + inspected.issues.map(issue => issue.file).join(", "));
  return inspected;
}
