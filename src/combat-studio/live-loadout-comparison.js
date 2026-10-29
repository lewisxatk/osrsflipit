const finite = value => typeof value === "number" && Number.isFinite(value);

/**
 * Compare two verified combat-engine results. This helper never estimates or
 * fills missing metrics; callers should only pass successful engine results.
 */
export function summariseLiveComparison(baseline, candidate) {
  const metrics = ["dps", "maxHit", "accuracy", "attackRoll", "npcDefenceRoll", "attackSpeed"];
  const issues = [];
  for (const [label, result] of [["Starting loadout", baseline], ["Draft loadout", candidate]]) {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      issues.push(`${label} has no verified calculation result.`);
      continue;
    }
    for (const metric of metrics) {
      if (!finite(result[metric])) issues.push(`${label} is missing a finite ${metric} result.`);
    }
  }
  if (issues.length) return { ok: false, issues };

  const deltaDps = candidate.dps - baseline.dps;
  return {
    ok: true,
    deltaDps,
    deltaPercent: baseline.dps > 0 ? (deltaDps / baseline.dps) * 100 : null,
    deltaMaxHit: candidate.maxHit - baseline.maxHit,
    deltaAccuracy: candidate.accuracy - baseline.accuracy,
    deltaAttackSpeed: candidate.attackSpeed - baseline.attackSpeed,
    deltaAttackRoll: candidate.attackRoll - baseline.attackRoll,
    deltaNpcDefenceRoll: candidate.npcDefenceRoll - baseline.npcDefenceRoll,
  };
}
