import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/upgrade.css', import.meta.url), 'utf8');
test('R40 exposes dedicated Loadout Studio and Quest Pathway routes', () => {
  assert.match(source, /loadout:"\/loadout"/);
  assert.match(source, /PATH_TABS\["\/loadout"\]="loadout"/);
  assert.match(source, /onClick=\{\(\)=>navigateTab\("loadout"\)\}>Loadout<\/button>/);
  assert.match(source, /quests:"\/quest-pathway"/);
  assert.match(source, /tab==="loadout"&&<Loadout/);
  assert.match(source, /tab==="quests"&&<QuestPathway/);
});
test('R40 Quest Pathway persists its goal and checklist locally without API writes', () => {
  assert.match(source, /osrshub-quest-checklist/);
  assert.match(source, /osrshub-quest-goal/);
  assert.match(source, /function QuestPathway\(/);
  assert.match(source, /Data quality note/);
});
test('R40 navigation consolidates Quest Pathway and Loadout Studio into Account Studio tabs', () => {
  assert.match(source, /Quest Progression/);
  assert.match(source, /\["gear","calculators","account","quests"\]/);
  assert.match(source, /Quest Progression/);
  assert.match(source, /Loadout Studio/);
  assert.match(source, /Account Studio sections/);
});
test('R40 styles include reduced-motion support and responsive Quest Pathway layouts', () => {
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /questPathwayPage/);
});

test('standalone Loadout workspace includes username lookup, manual overrides, three combat styles and saved exclusions', () => {
  assert.match(source, /lookupLoadoutAccount/);
  assert.match(source, /YOUR STATS · MANUAL OVERRIDE/);
  assert.match(source, /loadoutStyleTabs/);
  assert.match(source, /osrshub-loadout-excluded-items/);
  assert.match(source, /Incomplete quest requirements are excluded/);
});
test('standalone Loadout workspace hides the generic page intro and has responsive light UI styling', () => {
  assert.match(source, /\["screener","terminal","loadout","combat"\]\.includes\(tab\)\?null/);
  const css=readFileSync(new URL('../src/combat-studio.css', import.meta.url), 'utf8');
  assert.match(css, /\.combat-studio \.cs-hero/);
  assert.match(css, /\.cs-tabs/);
  assert.match(css, /@media\(max-width:600px\)/);
});
