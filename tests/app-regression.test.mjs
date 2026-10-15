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

test('historical charts consistently map high-side observations to Buy and low-side observations to Sell', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /if\(p\.avgHighPrice!=null\)lastBuy=p\.avgHighPrice;if\(p\.avgLowPrice!=null\)lastSell=p\.avgLowPrice/);
  assert.match(source, /buy:p\.avgHighPrice==null\?null:Number\(p\.avgHighPrice\),sell:p\.avgLowPrice==null\?null:Number\(p\.avgLowPrice\)/);
  assert.match(source, /margin = buy > 0 && sell > 0 \? sell - buy - tax : 0/);
  assert.match(source, /const b=Number\(p\.avgHighPrice\),s=Number\(p\.avgLowPrice\);return Number\.isFinite\(b\)&&Number\.isFinite\(s\)&&s>b\?s-b-taxFor\(s\):null/);
});

test('finance allocator supports reserve capital and item rows open full item analytics', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-bankroll-reserve/);
  assert.match(source, /Allocatable capital:/);
  assert.match(source, /className="allocatorRow" onClick=\{\(\)=>onSelect\?\.\(x,"24h","page"\)\}/);
  assert.match(source, /tab==="finance"&&<Finance items=\{items\} onSelect=\{selectItem\}/);
});

test('terminal offers 24h, 48h and 7d windows while remaining a read-only history client', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /\[\[24,"24h"\],\[48,"48h"\],\[168,"7d"\]\]/);
  assert.match(source, /slice\(-windowHours\)/);
  assert.match(source, /does not add D1 writes/);
});

test('the documented high/low example yields the expected negative after-tax spread', async () => {
  const buy = 38957192;
  const sell = 38046809;
  const tax = Math.min(Math.floor(sell * 0.02), 5000000);
  assert.equal(tax, 760936);
  assert.equal(sell - buy - tax, -1671319);
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /Margin = Sell − Buy − GE tax/);
  assert.match(source, /chartMode==="margin"\?\[Math\.min\(0,min-pad\),max\+pad\]/);
  assert.match(source, /Math\.log10\(Math\.abs\(item\.margin\)\+1\)/);
});

test('R8 terminal keeps its range, normalises pinned IDs, and exposes retry/refresh for failed history', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /safeRead\("osrshub-terminal-range",48\)/);
  assert.match(source, /localStorage\.setItem\("osrshub-terminal-range",String\(windowHours\)\)/);
  assert.match(source, /Array\.from\(new Set\(\(Array\.isArray\(saved\)\?saved:\[\]\)\.map\(Number\)/);
  assert.match(source, /const refreshHistory=\(\)=>\{setSeries\(\{\}\);setHistoryErrors\(\{\}\);setRefreshKey\(v=>v\+1\)\}/);
  assert.match(source, /Price history could not be loaded\./);
  assert.match(source, /Retry this chart/);
  assert.match(source, /Refresh history/);
});
