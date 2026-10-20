import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
const styles=await readFile(new URL('../src/osrshub2.css',import.meta.url),'utf8');
test('High Alcher is a dedicated routed page with nature rune-aware profit and price history',()=>{
 assert.match(source,/highalch:"\/just-high-alch"/);
 assert.match(source,/function JustHighAlch\(/);
 assert.match(source,/profit=alch-cost/);
 assert.match(source,/Minimum profit per cast/);
 assert.match(source,/Minimum trades per day/);
 assert.match(source,/Buy price/);
 assert.match(source,/Historical prices unavailable/);
 assert.match(source,/timestep=\$\{step\}&id=\$\{selected\.id\}/);
});
test('Quick Tools pop-out is desktop-only and links to High Alcher',()=>{
 assert.match(source,/function QuickToolsDock\(/);
 assert.match(source,/Open High Alcher/);
 assert.match(source,/className="quickToolsDock desktopOnlyGe"/);
 assert.match(styles,/@media\(max-width:1050px\)\{\.quickToolsDock/);
});
test('legacy pages remain implemented but are removed from visible navigation',()=>{
 assert.match(source,/function HistoricalBacktester\(/);
 assert.match(source,/function CoolStuff\(/);
 assert.match(source,/function MarketSpotlight\(/);
 assert.match(source,/function MobileCommandCentre\(/);
 assert.doesNotMatch(source.slice(source.indexOf('const TAB_PATHS='),source.indexOf('function tabFromPath')),/\["backtest","Historical Backtester"\]/);
 assert.match(source,/analysisRadarTail/);
 assert.match(source,/PATH_TABS\["\/market-radar"\]="movers"/);
 assert.match(source,/HISTORICAL MARGIN SCANNER/);
});
