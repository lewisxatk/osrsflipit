/**
 * Canonical data resolver for Combat Studio.
 *
 * Resolves only explicit IDs/identities from the loaded OSRS Hub data bundle.
 * It does not invent combat stats, infer missing requirements, or claim that a
 * resolved OSRS Hub row is automatically compatible with the DPS engine.
 */
const asRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const usableId = value => value !== undefined && value !== null && String(value).trim() !== "";
const idOf = row => row?.id ?? row?.item_id ?? row?.itemId ?? row?.npc_id ?? row?.monster_id;
const keyOf = value => String(value).trim().toLowerCase();

function indexRows(rows, identity, label, issues) {
  const index = new Map();
  for (const row of rows ?? []) {
    if (!asRecord(row) || !usableId(identity(row))) continue;
    const key = String(identity(row));
    if (index.has(key)) {
      issues.push({ code: "duplicate_identity", dataset: label, identity: key });
      continue;
    }
    index.set(key, row);
  }
  return index;
}

function dataset(bundle, filename, key) {
  return bundle?.datasets?.[key]?.records ?? bundle?.[filename] ?? bundle?.[key] ?? [];
}

/** Build indexes from a bundle already returned by loadCombatStudioBundle. */
export function createCombatDataIndex(bundle = {}) {
  const issues = [];
  const items = dataset(bundle, "items.json", "items");
  const equipment = dataset(bundle, "equipment-stats.json", "equipmentStats");
  const weapons = dataset(bundle, "weapons.json", "weapons");
  const requirements = dataset(bundle, "item-requirements.json", "itemRequirements");
  const profiles = dataset(bundle, "item-combat-profiles.json", "itemCombatProfiles");
  const monsters = dataset(bundle, "monsters-combat.json", "monsters");
  const quests = dataset(bundle, "quests.json", "quests");
  const questRelationships = dataset(bundle, "quest-relationships.json", "questRelationships");

  const itemIndex = indexRows(items, idOf, "items", issues);
  const equipmentIndex = indexRows(equipment, idOf, "equipmentStats", issues);
  const weaponIndex = indexRows(weapons, idOf, "weapons", issues);
  const requirementIndex = indexRows(requirements, row => row?.item_id ?? row?.itemId ?? row?.id, "itemRequirements", issues);
  const profileIndex = indexRows(profiles, idOf, "itemCombatProfiles", issues);
  const monsterIndex = indexRows(monsters, idOf, "monsters", issues);
  const questIndex = indexRows(quests, row => row?.key ?? row?.quest_key ?? row?.id, "quests", issues);

  const requirementsByItem = new Map();
  for (const row of requirements) {
    const itemId = row?.item_id ?? row?.itemId ?? row?.id;
    if (!usableId(itemId)) continue;
    const key = String(itemId);
    if (!requirementsByItem.has(key)) requirementsByItem.set(key, []);
    requirementsByItem.get(key).push(row);
  }
  const questEdgesByKey = new Map();
  for (const row of questRelationships) {
    const key = row?.quest_key ?? row?.questKey ?? row?.key;
    if (!usableId(key)) continue;
    const normalized = keyOf(key);
    if (!questEdgesByKey.has(normalized)) questEdgesByKey.set(normalized, []);
    questEdgesByKey.get(normalized).push(row);
  }

  return {
    issues,
    counts: {
      items: itemIndex.size, equipmentStats: equipmentIndex.size, weapons: weaponIndex.size,
      itemRequirements: requirements.length, itemCombatProfiles: profileIndex.size,
      monsters: monsterIndex.size, quests: questIndex.size, questRelationships: questRelationships.length,
    },
    resolveItem(itemId) {
      const key = String(itemId);
      const item = itemIndex.get(key);
      if (!item) return { status: "not-found", id: itemId, item: null, sources: {}, requirements: [] };
      const equipmentRow = equipmentIndex.get(key) ?? null;
      const weaponRow = weaponIndex.get(key) ?? null;
      const profileRow = profileIndex.get(key) ?? null;
      return {
        status: equipmentRow || weaponRow || profileRow ? "resolved" : "partial",
        id: itemId, item, sources: { equipment: equipmentRow, weapon: weaponRow, combatProfile: profileRow },
        requirements: requirementsByItem.get(key) ?? [],
        engineReady: false,
        note: "OSRS Hub data rows are resolved, but engine-native records and mechanics have not been validated by this resolver.",
      };
    },
    resolveMonster(monsterId) {
      const row = monsterIndex.get(String(monsterId));
      return row
        ? { status: "resolved", id: monsterId, monster: row, engineReady: false, note: "Canonical OSRS Hub monster row found; engine-native compatibility remains unverified." }
        : { status: "not-found", id: monsterId, monster: null, engineReady: false };
    },
    resolveQuest(questKey) {
      const row = questIndex.get(String(questKey)) ?? questIndex.get(keyOf(questKey));
      return row ? { status: "resolved", quest: row, relationships: questEdgesByKey.get(keyOf(questKey)) ?? [] } : { status: "not-found", quest: null, relationships: [] };
    },
    checkItemEligibility(itemId, account = {}) {
      const itemResult = this.resolveItem(itemId);
      if (itemResult.status === "not-found") return { status: "blocked", eligible: false, reasons: ["Item ID was not found in the canonical item dataset."] };
      const skillLevels = account.skills ?? account.stats ?? {};
      const completedQuests = new Set((account.completedQuests ?? account.completed_quests ?? []).map(value => keyOf(typeof value === "object" ? (value.key ?? value.id ?? value.name ?? "") : value)));
      const reasons = [];
      const unknown = [];
      for (const row of itemResult.requirements) {
        const skill = row.skill ?? row.skill_name ?? row.requirement_skill;
        const rawLevel = row.level ?? row.required_level ?? row.requirement_level;
        if (skill && rawLevel !== undefined && rawLevel !== null) {
          const actual = skillLevels[skill] ?? skillLevels[String(skill).toLowerCase()];
          const required = Number(rawLevel);
          if (!Number.isFinite(required)) { unknown.push("Invalid required level in source data."); continue; }
          if (actual === undefined || actual === null || !Number.isFinite(Number(actual))) unknown.push(`Account level for ${skill} is missing.`);
          else if (Number(actual) < required) reasons.push(`${skill} level ${required} required (account has ${actual}).`);
          continue;
        }
        const quest = row.quest_key ?? row.quest ?? row.quest_name ?? row.required_quest;
        if (quest) {
          const questKey = keyOf(quest);
          if (completedQuests.has(questKey)) continue;
          const canonicalQuest = questIndex.get(String(quest)) ?? questIndex.get(questKey);
          if (!canonicalQuest) unknown.push(`Quest requirement "${quest}" could not be matched to the quest catalogue.`);
          else reasons.push(`Required quest not confirmed complete: ${canonicalQuest.name ?? canonicalQuest.title ?? quest}.`);
          continue;
        }
        unknown.push("Requirement row uses an unsupported schema and needs review.");
      }
      if (reasons.length) return { status: "ineligible", eligible: false, reasons, unknown };
      if (unknown.length) return { status: "review_required", eligible: null, reasons: [], unknown };
      return { status: "eligible", eligible: true, reasons: [], unknown: [] };
    },
  };
}
