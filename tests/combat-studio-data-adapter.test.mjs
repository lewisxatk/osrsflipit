import test from 'node:test';
import assert from 'node:assert/strict';
import { COMBAT_STUDIO_FILES, inspectCombatStudioBundle, loadCombatStudioBundle } from '../src/combat-studio/data-adapter.js';

function fixture() {
  return Object.fromEntries(COMBAT_STUDIO_FILES.map(([file, , identity]) => [file, [{ [identity]: file === 'item-requirements.json' || file === 'item-relationships.json' ? 4151 : file === 'quest-relationships.json' ? 'cook' : 1, name: file }]]));
}

test('accepts a structurally complete nine-file fixture without asserting factual correctness', () => {
  const result = inspectCombatStudioBundle(fixture());
  assert.equal(COMBAT_STUDIO_FILES.length, 9);
  assert.equal(result.status, 'ready_for_consumer_smoke_test');
  assert.equal(result.issues.length, 0);
  assert.equal(result.datasets.items.records[0].name, 'items.json');
  assert.match(result.guardrails.join(' '), /not proof of OSRS factual correctness/);
});

test('blocks a missing artifact and identifies the exact filename', () => {
  const bundle = fixture();
  delete bundle['quests.json'];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.status, 'blocked');
  assert.ok(result.issues.some(issue => issue.file === 'quests.json' && issue.code === 'missing_or_invalid_array'));
});

test('flags empty arrays, invalid rows, missing identities and duplicate identities for review', () => {
  const bundle = fixture();
  bundle['items.json'] = [{ id: 1 }, { id: 1 }, { name: 'identity missing' }, null];
  bundle['quests.json'] = [];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.status, 'review_required');
  assert.ok(result.issues.some(issue => issue.file === 'items.json' && issue.code === 'record_integrity_warning' && issue.duplicates === 1 && issue.missingIdentity === 1 && issue.invalidRows === 1));
  assert.ok(result.issues.some(issue => issue.file === 'quests.json' && issue.code === 'record_integrity_warning'));
});

test('does not treat missing combat fields as zero or silently fabricate them', () => {
  const bundle = fixture();
  bundle['item-combat-profiles.json'] = [{ id: 4151, attackSpeed: null }];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.datasets.itemCombatProfiles.records[0].attackSpeed, null);
  assert.equal(result.datasets.itemCombatProfiles.records[0].maxHit, undefined);
});

test('loader fetches all nine files and rejects a missing remote artifact', async () => {
  const requested = [];
  const result = await loadCombatStudioBundle({
    baseUrl: 'https://example.test/data/combat-studio-v1/',
    fetchImpl: async url => {
      const filename = String(url).split('/').pop();
      requested.push(filename);
      const row = fixture()[filename];
      return { ok: true, json: async () => row };
    },
  });
  assert.equal(requested.length, 9);
  assert.equal(result.status, 'ready_for_consumer_smoke_test');
  await assert.rejects(loadCombatStudioBundle({
    baseUrl: 'https://example.test/data/combat-studio-v1/',
    fetchImpl: async url => ({ ok: !String(url).endsWith('quests.json'), status: 404, json: async () => [] }),
  }), /quests\.json/);
});
