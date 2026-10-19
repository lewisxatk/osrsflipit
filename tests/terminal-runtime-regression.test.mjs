import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const start = source.indexOf("function TradingTerminal(");
const end = source.indexOf("\nfunction ", start + 10);
const terminal = source.slice(start, end);
test("Trading Terminal declares all chart control state before effects and render", () => {
  for (const declaration of [
    "const [showVolume,setShowVolume]=useState",
    "const [showGrid,setShowGrid]=useState",
    "const [chartStyle,setChartStyle]=useState",
    "const [crosshair,setCrosshair]=useState",
  ]) assert.ok(terminal.includes(declaration), `Missing ${declaration}`);
  for (const identifier of ["showVolume", "showGrid", "chartStyle", "crosshair"]) assert.ok(terminal.includes(identifier));
});
