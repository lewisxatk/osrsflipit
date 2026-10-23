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


test("R52 adds persistent buy/sell graph colour controls and resets to theme defaults", () => {
  assert.ok(app.includes('aria-label="Buy line colour"'));
  assert.ok(app.includes('aria-label="Sell line colour"'));
  assert.ok(app.includes('osrshub-terminal-buy-color'));
  assert.ok(app.includes('osrshub-terminal-sell-color'));
  assert.ok(app.includes('Reset colours'));
  assert.ok(styles.includes('html[data-theme="frost"] .app :is('));
  assert.ok(styles.includes('html[data-theme="opera"] .app :is('));
});


test("R53 includes accessible, reduced-motion-aware visual effects", () => {
  assert.ok(styles.includes("@keyframes ohFadeUp"));
  assert.ok(styles.includes("@keyframes ohPriceUp"));
  assert.ok(styles.includes("@keyframes ohShimmer"));
  assert.ok(styles.includes("@media(prefers-reduced-motion:reduce)"));
});

test("R53 graph colour pickers do not trigger React state updates on every drag event", () => {
  assert.ok(app.includes('defaultValue={chartColors.buy}'));
  assert.ok(app.includes('onBlur={e=>{const next=e.currentTarget.value;if(next!==chartColors.buy)setChartBuyColor(next)}}'));
  assert.ok(app.includes('defaultValue={chartColors.sell}'));
  assert.ok(app.includes('onBlur={e=>{const next=e.currentTarget.value;if(next!==chartColors.sell)setChartSellColor(next)}}'));
});


test("R54 Trading Terminal displays and sorts after-tax margin multiplied by GE item limit", () => {
  assert.ok(app.includes('["limitProfit","Margin × item limit"]'));
  assert.ok(app.includes('item.margin*Number(item.limit)'));
  assert.ok(app.includes('sortKey==="limitProfit"?Number(x.margin||0)*Math.max(0,Number(x.limit)||0)'));
});

test("R54 terminal profiles save immediately and maximum price participates in filtering", () => {
  assert.ok(app.includes('localStorage.setItem("osrshub-terminal-profiles",JSON.stringify(next))'));
  assert.ok(app.includes('[valid,tableQuery,category,minVolume,minMargin,maxPrice,sortKey,sortDir,scannerTab,quickFilter]'));
  assert.ok(app.includes('setMaxPrice(profile.maxPrice||"")'));
});


test("R55 keeps Potential Profit and ROI as separate named Terminal columns", () => {
  assert.ok(app.includes('["limitProfit","Potential Profit"]'));
  assert.ok(app.includes('["roi","ROI"]'));
  assert.ok(styles.includes('.tradingTerminal .td-market-table th:nth-child(5)'));
  assert.ok(styles.includes('.tradingTerminal .td-market-table th:nth-child(6)'));
});
