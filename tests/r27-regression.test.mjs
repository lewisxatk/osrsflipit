import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = await readFile(new URL('../src/upgrade.css', import.meta.url), 'utf8');

test('R27 Loadout crash regression: gpPrice and isArmourSlot initialise before render-time cost totals', () => {
  const start = source.indexOf('function Loadout(');
  const end = source.indexOf('\nfunction ', start + 10);
  const loadout = source.slice(start, end < 0 ? source.length : end);
  assert.ok(loadout.indexOf('const gpPrice=') >= 0);
  assert.ok(loadout.indexOf('const gpPrice=') < loadout.indexOf('const estimatedSetupCost='));
  assert.ok(loadout.indexOf('const isArmourSlot=') < loadout.indexOf('const estimatedSetupCost='));
  assert.match(loadout, /const estimatedSetupCost=slots\.reduce/);
});

test('R27 Account Studio consolidates legacy Loadout and Calculations routes without losing the existing local keys', () => {
  assert.match(source, /account:"\/account-studio"/);
  assert.match(source, /PATH_TABS\["\/loadout"\]="account"/);
  assert.match(source, /PATH_TABS\["\/calculations"\]="account"/);
  assert.match(source, /function AccountStudio\(/);
  assert.match(source, /<Loadout items=\{items\} account=\{account\} onSelect=\{onSelect\}\/>/);
  assert.match(source, /<Calculators items=\{items\}\/>/);
  assert.match(source, /osrshub-loadout-budget/);
  assert.match(source, /osrshub-loadout-builds/);
  assert.match(source, /\["account","Account Studio","◉"\]/);
  assert.match(source, /Quest Progression/);
  assert.match(source, /Loadout Studio/);
});

test('R27 item analytics page provides a back-to-top control on full item routes', () => {
  assert.match(source, /className="itemAnalyticsTopBtn" onClick=\{\(\)=>window\.scrollTo\(\{top:0,behavior:"smooth"\}\)\}/);
  assert.match(source, /className="itemPageTopActions"/);
  assert.match(styles, /\.itemAnalyticsTopBtn/);
});

test('R27 historical backtester includes actionable presets and an on-page tutorial without fabricated results', () => {
  assert.match(source, /function HistoricalBacktester\(/);
  assert.match(source, /Quick tutorial · start with a preset/);
  assert.match(source, /Balanced · 10m GP/);
  assert.match(source, /Small bankroll · 1m GP/);
  assert.match(source, /Patient exit · 25m GP/);
  assert.match(source, /cannot prove an order would have filled/);
  assert.match(styles, /\.backtestTutorial/);
});

test('R27 data diagnostics use existing read-only health endpoint and explain estimated write counters', () => {
  assert.match(source, /function DataControlCentre\(/);
  assert.match(source, /fetch\("\/api\/data\/health"/);
  assert.match(source, /does not trigger ingestion, retry jobs or write to D1/);
  assert.match(source, /not Cloudflare's authoritative billing metric/);
  assert.match(source, /<DataControlCentre\/>/);
  assert.match(styles, /\.dataControlCentre/);
});
