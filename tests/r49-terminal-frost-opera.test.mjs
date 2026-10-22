import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const styles = readFileSync(new URL("../src/upgrade.css", import.meta.url), "utf8");

test("Trading Terminal calculator starts closed and remains user-toggleable", () => {
  assert.ok(app.includes('const [showFlipCalc,setShowFlipCalc]=useState(false);'));
  assert.ok(app.includes('onClick={()=>setShowFlipCalc(v=>!v)}'));
});

test("Trading Terminal has independent persistent Custom Scanner profiles", () => {
  assert.ok(app.includes('safeRead("osrshub-terminal-profiles",[])'));
  assert.ok(app.includes('localStorage.setItem("osrshub-terminal-profiles"'));
  assert.ok(app.includes('["custom","Custom Scanner"]'));
  assert.ok(app.includes("td-custom-scanner"));
  assert.ok(app.includes('"osrshub-terminal-profiles"'));
});

test("Frost and Opera themes are selectable and have their own full theme tokens", () => {
  assert.ok(app.includes('frost:"Aurora Frost"'));
  assert.ok(app.includes('opera:"Opera Red"'));
  assert.ok(app.includes('"frost","dark","comfort","aurora","void","opera"'));
  assert.ok(styles.includes('html[data-theme="frost"]'));
  assert.ok(styles.includes('html[data-theme="opera"]'));
});

test("Watchlist price movement feedback is more visible and respects reduced motion", () => {
  assert.ok(styles.includes(".td-watch-price.priceFlash-up"));
  assert.ok(styles.includes(".td-watch-price.priceFlash-down"));
  assert.ok(styles.includes("@media(prefers-reduced-motion:reduce)"));
});

test("Mobile terminal scanner tabs and bottom navigation have bounded sticky/fixed layout", () => {
  assert.ok(styles.includes(".td-scanner-tabs{position:sticky!important;top:58px!important"));
  assert.ok(styles.includes(".mobileNav{position:fixed!important"));
});


test("R51 theme repair forces readable Terminal surfaces and high-contrast Paper profit values", () => {
  assert.ok(styles.includes('html[data-theme="frost"] .tradingTerminal :is('));
  assert.ok(styles.includes('html[data-theme="opera"] .tradingTerminal :is('));
  assert.ok(styles.includes('html[data-theme="light"] .tradingTerminal .green'));
  assert.ok(styles.includes('color:#087447!important'));
});
