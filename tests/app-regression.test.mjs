import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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
  const terminal = source.slice(source.indexOf('function TradingTerminal('), source.indexOf('function App()'));
  assert.doesNotMatch(terminal, /prices\.runescape\.wiki|ge-tracker\.com|prices\.osrs\.cloud|Grand_Exchange/);
  assert.match(source, /setItemRouteId\(m\?Number\(m\[1\]\):null\)/);
  assert.match(styles, /\.routeItemPage \.chartbox\{order:1!important/);
  assert.match(styles, /\.terminalCharts\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('buy/sell semantics use low-side buy offers and high-side sell offers across live and historical prices', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /const buy = Number\(row\.low \?\? 0\), sell = Number\(row\.high \?\? 0\)/);
  assert.match(source, /buy:p\.avgLowPrice==null\?null:Number\(p\.avgLowPrice\),sell:p\.avgHighPrice==null\?null:Number\(p\.avgHighPrice\)/);
  assert.match(source, /if\(p\.avgLowPrice!=null\)lastBuy=p\.avgLowPrice;if\(p\.avgHighPrice!=null\)lastSell=p\.avgHighPrice/);
  assert.match(source, /const b=Number\(p\.avgLowPrice\),s=Number\(p\.avgHighPrice\);return Number\.isFinite\(b\)&&Number\.isFinite\(s\)&&s>b\?s-b-taxFor\(s\):null/);
  assert.match(source, /Buy = low-side offer \(avgLowPrice\) · Sell = high-side offer \(avgHighPrice\)/);
  // Simple low/high example: low-side buy 4 gp, high-side sell 5 gp, no whole-GP tax.
  const buy = 4, sell = 5, tax = Math.floor(sell * 0.02);
  assert.equal(sell - buy - tax, 1);
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

test('an inverted example trade is correctly identified as a loss after tax', async () => {
  const buy = 38957192;
  const sell = 38046809;
  const tax = Math.min(Math.floor(sell * 0.02), 5000000);
  assert.equal(tax, 760936);
  assert.equal(sell - buy - tax, -1671319);
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /Margin = Sell − Buy − GE tax/);
  assert.match(source, /Buy \u003d low-side offer/);
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

test('Smart Flip Finder persists configurable bankroll rules and only ranks positive after-tax opportunities', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-smart-finder-settings/);
  assert.match(source, /Minimum 24h volume/);
  assert.match(source, /Minimum after-tax margin/);
  assert.match(source, /Minimum safety score/);
  assert.match(source, /\.filter\(x=>x\.expected>0\)\.sort\(\(a,b\)=>b\.finder-a\.finder\|\|b\.expected-a\.expected\)/);
  assert.match(source, /onSelect\(x,"24h","page"\)/);
});

test('finance allocator excludes trades with non-positive after-tax margin and ranks by safety/liquidity', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /x\.sell>x\.buy&&x\.margin>0&&x\.buy<=perSlot/);
  assert.match(source, /allocatorScore:Math\.round\(x\.flipScore\*\.45\+x\.riskScore\*\.2\+fit\*\.2\+liquidity\*\.15\)/);
  assert.match(source, /\.filter\(x=>x\.expected>0\)\.sort\(\(a,b\)=>b\.allocatorScore-a\.allocatorScore\|\|b\.expected-a\.expected\)/);
});

test('market intelligence labels ROI snapshots accurately instead of claiming price trends', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /positive ROI/);
  assert.match(source, /negative ROI/);
  assert.match(source, /Current margin\/ROI snapshot/);
  assert.doesNotMatch(source, /<small>rising<\/small>/);
  assert.doesNotMatch(source, /<small>falling<\/small>/);
});

test('Price Drop Radar ranking mode changes signal formula and alch mode requires a positive raw gap', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /mode==='volume'\?volumeSignal:mode==='alch'\?alchSignal:balanced/);
  assert.match(source, /mode!=='alch'\|\|x\.alchGap>0/);
  assert.match(source, /rune cost and fill risk are not included/);
});


test('stored equipment endpoint rejects writes and unsupported slots', async () => {
  const { env } = makeEnv([]);
  const post = await worker.fetch(new Request('https://hub.test/api/data/equipment?slot=weapon', { method: 'POST' }), env);
  assert.equal(post.status, 405);
  const invalid = await worker.fetch(new Request('https://hub.test/api/data/equipment?slot=secrets'), env);
  assert.equal(invalid.status, 400);
});

test('OSRSBox ingestion advances all three catalogues in budgeted hourly batches with a correct completion state', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(source, /60\*60\*1000\)return/);
  assert.match(source, /syncOsrsBox\(env,dataset,1\)/);
  assert.match(source, /for\(const dataset of \['items','monsters','prayers'\]\)/);
  assert.match(source, /osrsbox-\$\{dataset\}/);
  assert.match(source, /stateKey=`osrsbox_\$\{dataset\}_state`/);
  assert.match(source, /bind\(stateKey,complete\?'complete':'in-progress',now\)/);
  assert.match(source, /const estimatedWrites=q\.length\+c\.length\+nq\.length\+eq\.length/);
  assert.match(source, /Reserve the entire batch before writing any tables/);
});

test('stored equipment endpoint joins the OSRS catalogue to market prices without D1 writes', async () => {
  const { env, state } = makeEnv([{ id: 4151, name: 'Abyssal whip', icon: 'Abyssal_whip.png', slot: 'weapon', equipable: 1, weapon: 1, two_handed: 0, attack_speed: 4, requirements_json: JSON.stringify({ attack: 70 }), bonuses_json: JSON.stringify({ attack_slash: 82, melee_strength: 82 }), item_json: '{}', buy: 1000000, sell: 1010000, high_volume: 20, low_volume: 15, limit_qty: 70, high_alch: 120000, members: 1 }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/equipment?slot=weapon'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.readOnly, true);
  assert.equal(body.results[0].name, 'Abyssal whip');
  assert.equal(body.results[0].buy, 1000000);
  assert.equal(body.results[0].sell, 1010000);
  assert.equal(body.results[0].equipment.melee_strength, 82);
  assert.equal(state.writes, 0);
});

test('loadout has a baseline fallback and prioritises stored catalogue data before external data', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /const fallbackEquipment=\{/);
  assert.match(source, /fetch\(`\/api\/data\/equipment\?slot=/);
  assert.match(source, /fetch\(`\/api\/itemstats\?slot=/);
  assert.match(source, /Baseline data was used for:/);
});

test('loadout remembers combat style, target values and manually entered stats locally', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-loadout-style/);
  assert.match(source, /osrshub-loadout-target-def/);
  assert.match(source, /osrshub-loadout-target-hp/);
  assert.match(source, /osrshub-loadout-stats/);
  assert.match(source, /\[style,targetDef,targetHp,stats,totalBudget,weaponBudget,armourBudget,excludedQuests\]/);
  assert.match(source, /Number\(v\)<=99/);
});

test('loadout auto-build keeps successful slots when one equipment feed fails and reports partial results', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /for\(let offset=0;offset<slotsToBuild\.length;offset\+=6\)/);
  assert.match(source, /setTimeout\(\(\)=>controller\.abort\(\),8000\)/);
  assert.match(source, /fetchSlotRecords/);
  assert.match(source, /bundled fallback/);
  assert.match(source, /setLoadout\(finalLoadout\);setDetails\(finalDetails\)/);
  assert.match(source, /Auto-build could not find equipment in either the live catalogue or the bundled baseline/);
  assert.match(source, /market=marketById\.get\(id\)\|\|\{\}/);
  assert.match(source, /buy:Number\(market\.buy\|\|0\),sell:Number\(market\.sell\|\|0\),margin:Number\(market\.margin\|\|0\)/);
});


test('OSRS Brain knowledge searches structured records and indexed Wiki pages with provenance', async () => {
  const { env, state } = makeEnv([{ entity_type: 'monsters', entity_id: 5347, name: 'Vorkath', members: 1, data_json: JSON.stringify({ combat_level: 732, drops: [{ id: 22124, name: 'Dragonbone necklace', rarity: 1000 }] }), updated_at: 123 }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/knowledge?q=Vorkath&type=monster'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.readOnly, true);
  assert.ok(body.results.some(x => x.name === 'Vorkath' && x.type === 'monster'));
  assert.ok(body.results.some(x => x.type === 'wiki'));
  assert.equal(state.writes, 0);
});

test('drop lookup returns stored OSRSBox drop details without inventing missing drop rates', async () => {
  const { env, state } = makeEnv([{ monster_id: 5347, name: 'Vorkath', data_json: JSON.stringify({ combat_level: 732, drops: [{ id: 22124, name: 'Dragonbone necklace', quantity: [1, 1], rarity: 1000 }] }), updated_at: 123 }]);
  const response = await worker.fetch(new Request('https://hub.test/api/data/drops?monsterId=5347'), env);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.results[0].monster, 'Vorkath');
  assert.equal(body.results[0].drops[0].itemId, 22124);
  assert.equal(body.results[0].drops[0].chanceDenominator, 1000);
  assert.equal(state.writes, 0);
});

test('scheduled knowledge ingestion is not skipped by the market refresh cooldown', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(source, /if\(!last\|\|Date\.now\(\)-Number\(last\.updated_at\|\|0\)>=DATA_SYNC_MS\)\{await seedCatalog\(env\);try\{await syncOsrsMarket\(env\)\}catch\(e\)\{await recordDataSource\(env,\"prices-wiki-api\"[\s\S]*?\}\}await syncRichData\(env\);await syncWikiContent\(env\)/);
  assert.match(source, /2\*60\*60\*1000/);
  assert.match(source, /for\(let offset=0;offset<3;offset\+\+\)/);
});

test('OSRSBox full item-name index is paged in 50-record batches and protects richer records', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(source, /items-summary\.json/);
  assert.match(source, /items\.slice\(offset,offset\+50\)/);
  assert.match(source, /detailStatus:'summary-only'/);
  assert.match(source, /json_extract\(osrs_catalog\.data_json,'\$\._summary'\)=1 OR length\(osrs_catalog\.data_json\)<=length\(excluded\.data_json\)/);
  assert.match(source, /osrsbox_items_summary_cursor/);
});

test('OSRS Brain exposes data-source status and a read-only monster drop lookup', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../worker.js', import.meta.url), 'utf8');
  assert.match(source, /SELECT source_key,source_name,endpoint,cursor,status,last_success,last_error FROM osrs_data_sources/);
  assert.match(source, /u\.pathname==='\/api\/data\/drops'/);
  assert.match(source, /Drop data is returned from stored OSRSBox records/);
  assert.match(source, /chanceDenominator:denominator/);
  assert.match(source, /catalogType=\{item:'items',monster:'monsters',npc:'monsters',prayer:'prayers'\}/);
});

test('knowledge coverage UI is present on the main Intelligence page and Auto-build has bounded latency', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /knowledgeCoverage/);
  assert.match(source, /Ingestion source status/);
  assert.match(source, /<OsrsKnowledgeSearch\/>/);
  assert.match(source, /offset<slotsToBuild\.length;offset\+=6/);
  assert.match(source, /controller\.abort\(\),8000/);
});


test('loadout planner persists total, weapon and armour GP budgets plus quest exclusions', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-loadout-budget/);
  assert.match(source, /osrshub-loadout-weapon-budget/);
  assert.match(source, /osrshub-loadout-armour-budget/);
  assert.match(source, /osrshub-loadout-excluded-quests/);
  assert.match(source, /Total setup budget \(GP\)/);
  assert.match(source, /Weapon budget \(GP\)/);
  assert.match(source, /Armour budget \(GP\)/);
  assert.match(source, /Exclude equipment requiring quests I haven't completed/);
  assert.match(source, /requiresExcludedQuest/);
  assert.match(source, /remainingBudget/);
});

test('saved and exported loadouts include planner constraints and restore them on import', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /totalBudget,weaponBudget,armourBudget,excludedQuests/);
  assert.match(source, /setExcludedQuests\(source\.excludedQuests\.filter/);
  assert.match(source, /setExcludedQuests\(b\.excludedQuests\.filter/);
});

test('OSRS Brain offers interactive one-tap searches for common knowledge topics', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /knowledgeQuickTopics/);
  assert.match(source, /\[\"Vorkath\",\"boss\"\]/);
  assert.match(source, /\[\"Recipe for Disaster\",\"quest\"\]/);
  assert.match(source, /onClick=\{\(\)=>runSearch\(term,kind\)\}/);
});


test('manual loadout picker filters by stats, quest exclusions and available GP budget', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /fitsSlotBudget/);
  assert.match(source, /meetsRequirements\(x\)&&!requiresExcludedQuest\(x\)&&fitsSlotBudget\(x,editing\.slot\)/);
  assert.match(source, /Number\(m\.buy\|\|x\?\.buy\|\|m\.sell\|\|x\?\.sell\|\|0\)/);
});

test('R20 OSRS Brain research board saves records, remembers recent searches, sorts results and supports a three-record shortlist', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-brain-saved-records/);
  assert.match(source, /osrshub-brain-recent-searches/);
  assert.match(source, /const displayRows=\[\.\.\.rows\]\.sort/);
  assert.match(source, /const toggleCompare=r=>/);
  assert.match(source, /prev\.length<3/);
  assert.match(source, /Open source/);
  assert.match(source, /knowledgeCompare/);
});

test('R21 loadout slot locks persist in saved/exported builds and Auto-build preserves locked equipment while budgeting it', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /osrshub-loadout-locked-slots/);
  assert.match(source, /Keep selected items during Auto-build/);
  assert.match(source, /lockedSlots\},\.\.\.v\.filter/);
  assert.match(source, /armourBudget,excludedQuests,lockedSlots/);
  assert.match(source, /for\(const slot of lockedSlots\)/);
  assert.match(source, /if\(lockedSlots\.includes\(result\.slot\)&&loadout\[result\.slot\]\)continue/);
  assert.match(source, /usedIds\.add\(Number\(kept\.id\)\)/);
});

test('R23 historical backtester is a routed tool with strategy controls, auditable trades and CSV export', async () => {
  const fs = await import('node:fs/promises');
  const source = await fs.readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const styles = await fs.readFile(new URL('../src/upgrade.css', import.meta.url), 'utf8');
  assert.match(source, /backtest:"\/backtest"/);
  assert.match(source, /function HistoricalBacktester\(/);
  assert.match(source, /simulateHistoricalStrategy\(history,c\)/);
  assert.match(source, /compareHistoricalStrategies\(history,c\)/);
  assert.match(source, /Export trades CSV/);
  assert.match(source, /Save snapshot/);
  assert.match(source, /EQUITY CURVE/);
  assert.match(source, /backtestEquityChart/);
  assert.match(source, /Historical simulation, not a fill guarantee/);
  assert.match(source, /\["backtest","Historical Backtester"\]/);
  assert.match(styles, /\.backtestMetricGrid/);
  assert.match(styles, /@media\(max-width:520px\)\{\.backtestHero/);
});

test('R24-R26 Market Radar is routed, exposes evidence-safe current snapshot language and mobile quick calculator', async () => {
  const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert.match(source, /heatmap:"\/market-radar"/);
  assert.match(source, /function MarketRadar\(\{items,onSelect,onWatch\}\)/);
  assert.match(source, /does not claim historical movement or guarantee a fill/);
  assert.match(source, /mobileQuickCalcSheet/);
  assert.match(source, /mobileQuickCalcFab/);
  assert.match(source, /<span>Radar<\/span>/);
});
