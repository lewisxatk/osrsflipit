import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/upgrade.css', import.meta.url), 'utf8');
test('R40 exposes dedicated Loadout Studio and Quest Pathway routes', () => {
  assert.match(source, /loadout:"\/loadout-studio"/);
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
test('R40 navigation exposes Quest Pathway and Loadout Studio on desktop and mobile', () => {
  assert.match(source, /\["quests","Quest Pathway"\],\["loadout","Loadout Studio"\]/);
  assert.match(source, /\[\["command","Command Centre"\],\["quests","Quest Pathway"\],\["loadout","Loadout Studio"\]/);
});
test('R40 styles include reduced-motion support and responsive Quest Pathway layouts', () => {
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /@media\(max-width:600px\)/);
  assert.match(styles, /questPathwayPage/);
});
