import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, createHash } from 'node:crypto';
import { COMBAT_STUDIO_FILES, inspectCombatStudioBundle, loadCombatStudioBundle } from '../src/combat-studio/data-adapter.js';
const fixture = () => Object.fromEntries(COMBAT_STUDIO_FILES.map(([file, , key]) => [file, [{ [key]: file.includes('relationships') ? 'cook' : 1, name: file }]]));
const bytes = value => new TextEncoder().encode(JSON.stringify(value));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('accepts a structurally complete nine-file fixture without claiming factual correctness', () => {
  const result = inspectCombatStudioBundle(fixture());
  assert.equal(COMBAT_STUDIO_FILES.length, 9);
  assert.equal(result.status, 'ready_for_consumer_smoke_test');
  assert.equal(result.issues.length, 0);
  assert.match(result.guardrails.join(' '), /do not prove OSRS factual correctness/i);
});
test('blocks a missing artifact and identifies its filename', () => {
  const bundle = fixture(); delete bundle['quests.json'];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.status, 'blocked');
  assert.ok(result.issues.some(issue => issue.file === 'quests.json' && issue.code === 'missing_or_invalid_array'));
});
test('flags empty arrays, invalid rows, missing and duplicate identities', () => {
  const bundle = fixture(); bundle['items.json'] = [{ id: 1 }, { id: 1 }, { name: 'missing id' }, null]; bundle['quests.json'] = [];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.status, 'review_required');
  assert.ok(result.issues.some(issue => issue.file === 'items.json' && issue.duplicates === 1 && issue.missingIdentity === 1 && issue.invalidRows === 1));
  assert.ok(result.issues.some(issue => issue.file === 'quests.json'));
});
test('unknown combat fields remain unknown rather than being invented as zero', () => {
  const bundle = fixture(); bundle['item-combat-profiles.json'] = [{ id: 4151, attackSpeed: null }];
  const result = inspectCombatStudioBundle(bundle);
  assert.equal(result.datasets.itemCombatProfiles.records[0].attackSpeed, null);
  assert.equal(result.datasets.itemCombatProfiles.records[0].maxHit, undefined);
});
test('loads all nine files when hash verification is explicitly disabled', async () => {
  const requested = [];
  const result = await loadCombatStudioBundle({ baseUrl: 'https://example.test/data/combat-studio-v1/', verifyHashes: false, fetchImpl: async url => {
    const filename = String(url).split('/').pop(); requested.push(filename); const value = fixture()[filename];
    return { ok: Boolean(value), status: value ? 200 : 404, json: async () => value };
  }});
  assert.equal(requested.length, 9); assert.equal(result.status, 'ready_for_consumer_smoke_test'); assert.equal(result.manifest, null);
});
test('requires the manifest by default', async () => {
  await assert.rejects(loadCombatStudioBundle({ baseUrl: 'https://example.test/data/combat-studio-v1/', fetchImpl: async () => ({ ok: false, status: 404, json: async () => [] }) }), /combat-studio-v1-bundle-manifest\.json.*404/);
});
test('verifies file hashes and fails closed if a published file differs', async () => {
  const bundle = fixture();
  const manifest = { schema_version: '1.0.0', contract_version: 'combat-studio-v1-data-contract-1', generated_at: '2026-10-27T00:00:00Z', status: 'review_required', datasets: Object.fromEntries(COMBAT_STUDIO_FILES.map(([file]) => [file, { sha256: hash(bundle[file]) }])) };
  const fetchImpl = async url => {
    const filename = String(url).split('/').pop();
    if (filename === 'combat-studio-v1-bundle-manifest.json') return { ok: true, status: 200, json: async () => manifest };
    const value = bundle[filename]; if (!value) return { ok: false, status: 404, json: async () => [] };
    const data = bytes(value);
    return { ok: true, status: 200, clone: () => ({ arrayBuffer: async () => data.slice().buffer }), json: async () => value };
  };
  const loaded = await loadCombatStudioBundle({ baseUrl: 'https://example.test/data/combat-studio-v1/', fetchImpl, cryptoImpl: webcrypto });
  assert.equal(loaded.manifest.integrity, 'sha256_verified');
  assert.equal(loaded.manifest.contractVersion, 'combat-studio-v1-data-contract-1');
  const tampered = async url => {
    const response = await fetchImpl(url);
    if (String(url).endsWith('/items.json')) { const data = bytes([{ id: 999 }]); return { ...response, clone: () => ({ arrayBuffer: async () => data.slice().buffer }) }; }
    return response;
  };
  await assert.rejects(loadCombatStudioBundle({ baseUrl: 'https://example.test/data/combat-studio-v1/', fetchImpl: tampered, cryptoImpl: webcrypto }), /items\.json SHA-256 mismatch/);
});
