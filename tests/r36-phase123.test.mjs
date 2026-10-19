import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker from '../worker.js';

const workerSource = await readFile(new URL('../worker.js', import.meta.url), 'utf8');

function adminEnv() {
  const env = { ADMIN_PASSWORD: 'test-only-long-admin-password-2026' };
  env.DB = {
    prepare(sql) {
      return {
        sql, args: [], bind(...args) { this.args = args; return this; },
        async first() {
          if (sql.includes('FROM osrs_item_data d LEFT JOIN osrs_catalog')) return { id:4151, name:'Abyssal whip', data_json:JSON.stringify({id:4151,name:'Abyssal whip',equipment:{slot:'weapon'}}), updated_at:Date.now()-86400000 };
          if (sql.includes('FROM osrs_catalog WHERE entity_type=\'items\'')) return null;
          if (sql.includes("key='d1_write_budget'")) return null;
          if (sql.includes('FROM osrs_data_sources')) return null;
          if (sql.includes('FROM data_meta')) return null;
          return null;
        },
        async all() { return { results: [] }; },
        async run() { throw new Error('Phase 1–3 fallback must not write to D1'); }
      };
    },
    async batch() { throw new Error('Phase 1–3 read-only checks must not batch writes'); }
  };
  return env;
}

test('Phase 2 item detail falls back to stored D1 data when both OSRSBox hosts fail', async () => {
  const env = adminEnv();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('upstream unavailable', { status: 522 });
  try {
    const response = await worker.fetch(new Request('https://hub.test/api/itemstats?id=4151'), env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.name, 'Abyssal whip');
    assert.equal(body._osrshubFallback, true);
    assert.equal(response.headers.get('X-OSRSHub-Data-Freshness'), 'stale-fallback');
    assert.match(response.headers.get('X-OSRSHub-Data-Source'), /stored OSRSBox record/);
  } finally { globalThis.fetch = originalFetch; }
});

test('Phase 1 health diagnostics report unavailable schema tables instead of failing the whole report', async () => {
  const env = adminEnv();
  const originalFirst = env.DB.prepare;
  env.DB.prepare = function(sql) {
    const statement = originalFirst.call(this, sql);
    const original = statement.first;
    statement.first = async function() {
      if (sql.includes('COUNT(*) c FROM osrs_monster_data')) throw new Error('no such table: osrs_monster_data');
      return original.call(this);
    };
    return statement;
  };
  const login = await worker.fetch(new Request('https://hub.test/api/admin/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})}), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const response = await worker.fetch(new Request('https://hub.test/api/data/health', {headers:{Cookie:cookie}}), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.schema.healthy, false);
  assert.ok(body.schema.missingOrUnavailable.some(x => x.table === 'osrs_monster_data'));
});

test('Phase 3 Brain search adds evidence freshness and confidence without writing to D1', () => {
  assert.match(workerSource, /confidence:data\._summary\?0\.45:0\.9/);
  assert.match(workerSource, /freshness:Date\.now\(\)-Number\(row\.updated_at\|\|0\)/);
  assert.match(workerSource, /relevanceScore:rank\(row\)/);
  assert.match(workerSource, /readOnly:true/);
});

test('Phase 3 private Brain UI surfaces source freshness and evidence confidence', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /evidence confidence \$\{Math\.round\(Number\(r\.confidence\)\*100\)\}%/);
  assert.match(source, /\$\{r\.freshness\} data/);
});
