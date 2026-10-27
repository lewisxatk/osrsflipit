/**
 * OSRS Hub Combat Studio V1 data adapter.
 *
 * Structural checks and optional SHA-256 verification only; these checks do
 * not establish OSRS factual correctness or validate combat formulas.
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
    if (state !== "ready") issues.push({
      file: filename, code: "record_integrity_warning",
      message: "Empty records, invalid rows, missing identity or duplicate identity detected.",
      invalidRows: invalidRows.length, missingIdentity, duplicates, recordCount: rows.length,
    });
    datasets[key] = { state, records: rows.filter(isRecord), identityField: identity, recordCount: rows.length };
  }
  return {
    status: issues.some(issue => issue.code === "missing_or_invalid_array") ? "blocked" : issues.length ? "review_required" : "ready_for_consumer_smoke_test",
    issues, datasets,
    guardrails: [
      "Structural readiness and hashes do not prove OSRS factual correctness or DPS accuracy.",
      "Missing and unknown values remain unknown; they are not coerced to zero.",
      "Item presence does not prove account or quest eligibility.",
    ],
  };
}

async function sha256Hex(bytes, cryptoImpl) {
  if (!cryptoImpl?.subtle || typeof cryptoImpl.subtle.digest !== "function") {
    throw new Error("SHA-256 verification requires Web Crypto support.");
  }
  const digest = await cryptoImpl.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Loads a manifest-pinned bundle. The manifest and every JSON file must be
 * served from the same versioned directory. Hash verification is enabled by
 * default so stale/mixed files fail closed instead of being silently mixed.
 */
export async function loadCombatStudioBundle({
  baseUrl = "/data/combat-studio-v1/",
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  verifyHashes = true,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A Fetch-compatible function is required.");
  const root = new URL(baseUrl, globalThis.location?.origin ?? "https://osrshub.invalid/");
  const fetchResponse = async filename => {
    const response = await fetchImpl(new URL(filename, root));
    if (!response.ok) throw new Error(`Combat Studio data unavailable: ${filename} (HTTP ${response.status})`);
    return response;
  };

  let manifest = null;
  if (verifyHashes) {
    const response = await fetchResponse("combat-studio-v1-bundle-manifest.json");
    manifest = await response.json();
    if (!isRecord(manifest) || !isRecord(manifest.datasets)) {
      throw new Error("Combat Studio bundle manifest is missing or invalid.");
    }
    if (manifest.status === "blocked") throw new Error("Combat Studio bundle manifest reports blocked data.");
  }

  const entries = await Promise.all(COMBAT_STUDIO_FILES.map(async ([filename]) => {
    const response = await fetchResponse(filename);
    if (verifyHashes) {
      const expected = manifest.datasets[filename]?.sha256;
      if (typeof expected !== "string" || !/^[a-f0-9]{64}$/i.test(expected)) {
        throw new Error(`Combat Studio manifest has no valid SHA-256 for ${filename}.`);
      }
      const bytes = await response.clone().arrayBuffer();
      const actual = await sha256Hex(bytes, cryptoImpl);
      if (actual.toLowerCase() !== expected.toLowerCase()) {
        throw new Error(`Combat Studio data integrity check failed: ${filename} SHA-256 mismatch.`);
      }
      return [filename, JSON.parse(new TextDecoder().decode(bytes))];
    }
    return [filename, await response.json()];
  }));
  const inspected = inspectCombatStudioBundle(Object.fromEntries(entries));
  if (inspected.status === "blocked") throw new Error("Combat Studio bundle is incomplete: " + inspected.issues.map(issue => issue.file).join(", "));
  return { ...inspected, manifest: manifest ? {
    schemaVersion: manifest.schema_version ?? null,
    contractVersion: manifest.contract_version ?? null,
    generatedAt: manifest.generated_at ?? null,
    integrity: "sha256_verified",
    manifestStatus: manifest.status ?? "unknown",
  } : null };
}
