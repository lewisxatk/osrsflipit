import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRadarRows, radarMetricLabel } from '../src/market-radar.js';

const sample = [
  { id: 1, name: 'A', buy: 100, sell: 120, margin: 18, roi: 18, volume: 1000, flipScore: 90, potentialProfit: 180, members: false },
  { id: 2, name: 'B', buy: 100, sell: 105, margin: 3, roi: 3, volume: 5000, flipScore: 60, potentialProfit: 30, members: true },
  { id: 3, name: 'C', buy: 0, sell: 300, margin: 0, roi: 0, volume: 9000, flipScore: 99, potentialProfit: 0, members: false },
];

test('radar ranks by the selected metric and supplies bounded relative intensity', () => {
  const rows = buildRadarRows(sample, 'volume');
  assert.deepEqual(rows.map(x => x.id), [2, 1]);
  assert.equal(rows[0].radarRank, 1);
  assert.ok(rows.every(x => x.radarIntensity >= 12 && x.radarIntensity <= 100));
});

test('radar filters invalid prices, members and low-volume items without mutating input', () => {
  const before = JSON.stringify(sample);
  const rows = buildRadarRows(sample, 'flipScore', { f2pOnly: true, positiveOnly: true, minVolume: 800 });
  assert.deepEqual(rows.map(x => x.id), [1]);
  assert.equal(JSON.stringify(sample), before);
});

test('equal-valued radar rows have a neutral intensity and labels are explicit', () => {
  const rows = buildRadarRows([{ id: 1, buy: 1, sell: 2, volume: 4 }, { id: 2, buy: 1, sell: 2, volume: 4 }], 'volume');
  assert.deepEqual(rows.map(x => x.radarIntensity), [50, 50]);
  assert.equal(radarMetricLabel('volume'), '24h volume');
  assert.equal(radarMetricLabel('unknown'), 'Flip score');
});
