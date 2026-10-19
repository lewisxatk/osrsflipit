import test from 'node:test';
import assert from 'node:assert/strict';
import { geTax, simulateHistoricalStrategy, compareHistoricalStrategies } from '../src/backtest.js';

const H = 3_600_000;

test('GE tax matches OSRS Hub 2% rate and 5m cap', () => {
  assert.equal(geTax(100), 2);
  assert.equal(geTax(38_046_809), 760_936);
  assert.equal(geTax(500_000_000), 5_000_000);
  assert.equal(geTax(-2), 0);
});

test('historical replay records after-tax target exit and reinvests returned capital', () => {
  const points = [
    { timestamp: 1 * H, buy: 100, sell: 110 },
    { timestamp: 2 * H, buy: 105, sell: 130 },
    { timestamp: 3 * H, buy: 120, sell: 150 },
  ];
  const result = simulateHistoricalStrategy(points, { bankroll: 1_000, geLimit: 5, maxUnits: 5, minEntryMargin: 0, targetProfit: 10, stopLoss: 20, maxHoldHours: 12 });
  assert.equal(result.metrics.tradeCount, 1);
  assert.equal(result.trades[0].entryPrice, 100);
  assert.equal(result.equityCurve[0].equity, 1_000, 'entry candle must not manufacture an instant spread profit');
  assert.equal(result.trades[0].exitPrice, 130);
  assert.equal(result.trades[0].quantity, 5);
  assert.equal(result.trades[0].reason, 'target');
  assert.equal(result.trades[0].profit, 140);
  assert.equal(result.metrics.endingBankroll, 1_140);
});

test('historical replay triggers stop loss and never spends beyond bankroll or GE limit', () => {
  const points = [
    { timestamp: 1 * H, buy: 100, sell: 105 },
    { timestamp: 2 * H, buy: 70, sell: 75 },
    { timestamp: 3 * H, buy: 80, sell: 90 },
  ];
  const result = simulateHistoricalStrategy(points, { bankroll: 250, geLimit: 2, maxUnits: 10, minEntryMargin: 0, targetProfit: 100, stopLoss: 10, maxHoldHours: 24 });
  assert.equal(result.trades.length, 1);
  assert.equal(result.trades[0].quantity, 2);
  assert.equal(result.trades[0].reason, 'stop-loss');
  assert.equal(result.trades[0].profit, -52);
  assert.equal(result.metrics.endingBankroll, 198);
});

test('historical replay sorts timestamps, ignores invalid prices and reports no fabricated trades', () => {
  const result = simulateHistoricalStrategy([
    { timestamp: 2 * H, buy: 100, sell: 90 },
    { timestamp: 1 * H, buy: 100, sell: 90 },
    { timestamp: 3 * H, buy: 0, sell: 100 },
  ], { bankroll: 1000, geLimit: 5, maxUnits: 5, minEntryMargin: 0, targetProfit: 10, stopLoss: 20, maxHoldHours: 4 });
  assert.equal(result.points, 2);
  assert.equal(result.metrics.tradeCount, 0);
  assert.equal(result.metrics.netProfit, 0);
  assert.equal(result.metrics.returnPct, 0);
});

test('strategy comparison produces three actual simulations with shared data coverage', () => {
  const points = Array.from({ length: 30 }, (_, i) => ({ timestamp: (i + 1) * H, buy: 100 + (i % 5) * 2, sell: 140 + (i % 7) * 5 }));
  const rows = compareHistoricalStrategies(points, { bankroll: 10_000, geLimit: 10, maxUnits: 10, minEntryMargin: 0, targetProfit: 30, stopLoss: 15, maxHoldHours: 4 });
  assert.deepEqual(rows.map(x => x.id), ['tight', 'configured', 'patient']);
  assert.ok(rows.every(x => x.result.metrics.dataPoints === 30));
  assert.ok(rows.every(x => typeof x.result.metrics.netProfit === 'number'));
});
