import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

function makeEnv(rows) {
  const writes = { count: 0 };
  const DB = {
    prepare(sql) {
      return {
        sql,
        bind(...args) { this.args = args; return this; },
        async all() { return { results: rows }; },
        async first() { return null; },
        async run() { writes.count += 1; return { success: true }; }
      };
    },
    async batch() { return []; }
  };
  return { env: { DB, ASSETS: { fetch: async () => new Response('asset') } }, writes };
}

test('movement endpoint returns observed price movement and coverage without writes', async () => {
  const now = Date.now();
  const { env, writes } = makeEnv([{
    item_id: 4151, start_price: 1000, end_price: 1250,
    start_at: now - 3600000, end_at: now, sample_count: 20,
    avg_volume: 1200, name: 'Test item', icon: null
  }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/movement?window=24h'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.window, '24h');
  assert.equal(body.results[0].changePct, 25);
  assert.equal(body.results[0].changeGp, 250);
  assert.equal(body.results[0].samples, 20);
  assert.ok(['good', 'partial', 'sparse'].includes(body.results[0].quality));
  assert.equal(writes.count, 0, 'read-only movement endpoint must not write to D1');
});

test('movement endpoint accepts the 7-day window', async () => {
  const { env } = makeEnv([]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/movement?window=7d'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.window, '7d');
  assert.equal(body.results.length, 0);
});


test('movement endpoint rejects unsupported windows instead of silently returning 24h data', async () => {
  const { env } = makeEnv([]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/movement?window=30d'), env);
  const body = await response.json();
  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.match(body.error, /Use 24h or 7d/);
});

test('health endpoint advertises the conservative 25,000 estimated-write daily ceiling', async () => {
  const { env } = makeEnv([]);
  env.ADMIN_PASSWORD = 'test-only-long-admin-password-2026';
  const login = await worker.fetch(new Request('https://hub.test/api/admin/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:env.ADMIN_PASSWORD})}), env);
  const cookie = login.headers.get('Set-Cookie').split(';')[0];
  const response = await worker.fetch(new Request('https://hub.test/api/data/health', {headers:{Cookie:cookie}}), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.d1Writer.softLimit, 25000);
  assert.equal(body.d1Writer.authoritative, false);
  assert.equal(body.d1Writer.status, 'within-budget');
});
