import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const main=fs.readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../src/styles.css',import.meta.url),'utf8');
test('R44 navigation is simplified and hidden legacy pages remain directly routable',()=>{
 assert.match(main,/>Home<\/button>/);
 assert.match(main,/>Trading Terminal<\/button>/);
 assert.match(main,/>Account Studio<\/button>/);
 assert.doesNotMatch(main.slice(main.indexOf('<div className="navlinks">'),main.indexOf('<div className="globalSearch">')),/>Screener<\/button>/);
 assert.match(main,/>More <ChevronDown/);
 assert.match(main,/screener:"\/screener"/);
 assert.match(main,/backtest:"\/backtest"/);
 assert.match(css,/\.desktopHubSidebar\{display:none!important\}/);
 assert.match(css,/\.app>main\{max-width:none!important/);
});
test('R44 quest training planner exposes target level, budget and four ranking modes',()=>{
 assert.match(main,/function QuestTrainingPlanner\(/);
 assert.match(main,/Fastest/); assert.match(main,/Most AFK/); assert.match(main,/Cheapest/); assert.match(main,/XP remaining/);
 assert.match(main,/QUEST_XP_LEVELS/);
});
test('R44 keeps live price history source and explicitly labels training rates as estimates',()=>{
 assert.match(main,/api\(`\/timeseries\?timestep=1h&id=\$\{item\.id\}`\)/);
 assert.match(main,/planning estimate/);
 assert.match(main,/not a guaranteed rate/);
});
test('R44 includes responsive and reduced-motion styling',()=>{
 assert.match(css,/@media\(max-width:1100px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
