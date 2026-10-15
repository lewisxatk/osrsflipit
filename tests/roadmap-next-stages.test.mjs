import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

function makeEnv(rows = []) {
  const state = { writes: 0, lastSql: '' };
  const DB = {
    prepare(sql) { state.lastSql = sql; return {
      sql, args: [], bind(...args) { this.args = args; return this; },
      async all() { return { results: rows }; },
      async first() { return null; },
      async run() { state.writes++; return { success: true }; }
    }; },
    async batch() { return []; }
  };
  return { env: { DB, ASSETS: { fetch: async () => new Response('asset') } }, state };
}

test('knowledge search is read-only and returns bounded catalogue summaries', async () => {
  const { env, state } = makeEnv([{ entity_type: 'monster', entity_id: 50, name: 'King Black Dragon', members: 1, data_json: JSON.stringify({ description: 'A mighty dragon' }), updated_at: 123 }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/knowledge?q=King'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.results[0].name, 'King Black Dragon');
  assert.equal(body.results[0].description, 'A mighty dragon');
  assert.equal(body.readOnly, true);
  assert.equal(state.writes, 0);
});

test('knowledge search rejects unsupported catalogue types', async () => {
  const { env } = makeEnv([]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/knowledge?q=Dragon&type=secrets'), env);
  assert.equal(response.status, 400);
});

test('opportunity evidence reports observation coverage and never writes', async () => {
  const { env, state } = makeEnv([{ item_id: 4151, name: 'Abyssal whip', icon: null, last_seen: Date.now(), samples: 28, first_at: 1000, last_at: 2000, event_count: 2, latest_event_at: 2000 }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/opportunity-evidence'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.results[0].historyCoverage, 'partial');
  assert.equal(body.results[0].eventCount, 2);
  assert.equal(state.writes, 0);
  assert.match(body.notice, /not a forecast/i);
});

test('opportunity evidence enforces GET', async () => {
  const { env } = makeEnv([]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/opportunity-evidence', { method: 'POST' }), env);
  assert.equal(response.status, 405);
});

test('item routes and trading terminal UI are present without new database writes', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const styles = await fs.readFile(new URL('../src/upgrade.css', import.meta.url), 'utf8');
  assert.match(source, /terminal:\s*"\/terminal"/);
  assert.match(source, /function TradingTerminal\(/);
  assert.match(source, /osrshub-terminal-pins/);
  assert.match(source, /prices\.runescape\.wiki\/osrs/);
  assert.match(source, /setItemRouteId\(m\?Number\(m\[1\]\):null\)/);
  assert.match(styles, /\.routeItemPage \.chartbox\{order:1!important/);
  assert.match(styles, /\.terminalCharts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
