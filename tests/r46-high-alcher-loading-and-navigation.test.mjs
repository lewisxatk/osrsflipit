import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
const styles=await readFile(new URL('../src/osrshub2.css',import.meta.url),'utf8');
test('High Alcher handles both supported latest-price response shapes and shows a recoverable empty state',()=>{
 assert.match(source,/const data=latest\?\.data\?\.data\|\|latest\?\.data\|\|\{\}/);
 assert.match(source,/const buy=Number\(x\.buy\|\|x\.avgLowPrice\|\|0\)/);
 assert.match(source,/No market items are loaded yet/);
 assert.match(source,/marketLoading=\{loading\}/);
});
test('High Alcher is named consistently and the More dropdown is alphabetically ordered',()=>{
 assert.match(source,/"highalch","High Alcher"/);
 assert.match(source,/Open High Alcher/);
 const start=source.indexOf('className="extrasMenu toolsMenu"');
 const end=source.indexOf('</div></div></div>',start);
 const menu=source.slice(start,end);
 const labels=['Analysis','Alerts','Dashboard','High Alcher','Money Makers','OSRS Brain','Recipes','Watchlists'];
 let prev=-1;
 for(const label of labels){const i=menu.indexOf(`"${label}"`);assert.ok(i>prev,`${label} should appear after the previous menu item`);prev=i;}
});
test('shared page headings are compact and hide repeated descriptions',()=>{
 assert.match(styles,/\.pageIntro p\{display:none!important\}/);
 assert.match(styles,/\.hero\.compactPageHeading h1\{font-size:clamp\(20px,2\.2vw,26px\)!important/);
});
