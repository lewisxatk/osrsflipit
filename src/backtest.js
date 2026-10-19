export const GE_TAX_RATE = 0.02;
export const GE_TAX_CAP = 5_000_000;

export function geTax(price) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(Math.floor(value * GE_TAX_RATE), GE_TAX_CAP);
}

/**
 * Replays a single-item strategy against observed hourly/daily low/high prices.
 * Hub semantics: `buy` is the low-side observation and `sell` is the high-side
 * observation. These are historical averages, not guaranteed executable fills.
 */
export function simulateHistoricalStrategy(points, config = {}) {
  const settings = {
    bankroll: Math.max(0, Number(config.bankroll) || 0),
    geLimit: Math.max(1, Math.floor(Number(config.geLimit) || 1)),
    maxUnits: Math.max(1, Math.floor(Number(config.maxUnits) || 1)),
    minEntryMargin: Math.max(0, Number(config.minEntryMargin) || 0),
    targetProfit: Math.max(0, Number(config.targetProfit) || 0),
    stopLoss: Math.max(0, Number(config.stopLoss) || 0),
    maxHoldHours: Math.max(1, Number(config.maxHoldHours) || 1),
  };
  const series = (Array.isArray(points) ? points : [])
    .map(p => ({ timestamp: Number(p.timestamp), buy: Number(p.buy), sell: Number(p.sell) }))
    .filter(p => Number.isFinite(p.timestamp) && p.timestamp > 0 && Number.isFinite(p.buy) && p.buy > 0 && Number.isFinite(p.sell) && p.sell > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  let cash = settings.bankroll;
  let position = null;
  let peakEquity = cash;
  let maxDrawdown = 0;
  const trades = [];
  const equityCurve = [];
  const closePosition = (point, reason) => {
    if (!position || !(point.sell > 0)) return;
    const taxPerUnit = geTax(point.sell);
    const netPerUnit = point.sell - position.entryPrice - taxPerUnit;
    const profit = netPerUnit * position.quantity;
    const proceeds = point.sell * position.quantity - taxPerUnit * position.quantity;
    cash += proceeds;
    trades.push({
      entryAt: position.entryAt,
      exitAt: point.timestamp,
      entryPrice: position.entryPrice,
      exitPrice: point.sell,
      quantity: position.quantity,
      tax: taxPerUnit * position.quantity,
      profit,
      profitPerUnit: netPerUnit,
      holdHours: Math.max(0, (point.timestamp - position.entryAt) / 3_600_000),
      reason,
      bankrollAfter: cash,
    });
    position = null;
  };

  for (let pointIndex = 0; pointIndex < series.length; pointIndex++) {
    const point = series[pointIndex];
    if (position) {
      const netPerUnit = point.sell - position.entryPrice - geTax(point.sell);
      const heldHours = (point.timestamp - position.entryAt) / 3_600_000;
      let reason = null;
      if (settings.targetProfit > 0 && netPerUnit >= settings.targetProfit) reason = 'target';
      else if (settings.stopLoss > 0 && netPerUnit <= -settings.stopLoss) reason = 'stop-loss';
      else if (heldHours >= settings.maxHoldHours) reason = 'time-limit';
      if (reason) closePosition(point, reason);
    } else {
      const observedMargin = point.sell - point.buy - geTax(point.sell);
      if (pointIndex < series.length - 1 && observedMargin >= settings.minEntryMargin && point.buy < cash) {
        const quantity = Math.min(settings.geLimit, settings.maxUnits, Math.floor(cash / point.buy));
        if (quantity > 0) {
          cash -= point.buy * quantity;
          position = { entryAt: point.timestamp, entryPrice: point.buy, quantity };
        }
      }
    }
    // Mark open inventory at the entry-side (low-side) observation, not the
    // same candle’s exit-side quote; this avoids granting an instant spread profit.
    const markedPosition = position ? position.quantity * point.buy : 0;
    const equity = cash + markedPosition;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity * 100);
    equityCurve.push({ timestamp: point.timestamp, equity, cash, inPosition: !!position });
  }
  if (position && series.length) {
    closePosition(series[series.length - 1], 'window-end');
    const last = series[series.length - 1];
    const equity = cash;
    peakEquity = Math.max(peakEquity, equity);
    if (peakEquity > 0) maxDrawdown = Math.max(maxDrawdown, (peakEquity - equity) / peakEquity * 100);
    equityCurve.push({ timestamp: last.timestamp, equity, cash, inPosition: false });
  }

  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));
  const netProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  return {
    settings,
    points: series.length,
    trades,
    equityCurve,
    metrics: {
      startingBankroll: settings.bankroll,
      endingBankroll: cash,
      netProfit,
      returnPct: settings.bankroll > 0 ? netProfit / settings.bankroll * 100 : 0,
      tradeCount: trades.length,
      winRate: trades.length ? wins.length / trades.length * 100 : 0,
      wins: wins.length,
      losses: losses.length,
      breakeven: trades.filter(t => t.profit === 0).length,
      averageProfit: trades.length ? netProfit / trades.length : 0,
      averageHoldHours: trades.length ? trades.reduce((sum, t) => sum + t.holdHours, 0) / trades.length : 0,
      grossProfit,
      grossLoss,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
      maxDrawdownPct: maxDrawdown,
      dataPoints: series.length,
      firstTimestamp: series[0]?.timestamp ?? null,
      lastTimestamp: series[series.length - 1]?.timestamp ?? null,
    },
  };
}

export function compareHistoricalStrategies(points, baseConfig) {
  const strategies = [
    { id: 'tight', name: 'Tight exits', targetProfit: Math.max(1, Math.round((Number(baseConfig.targetProfit) || 10_000) * 0.6)), stopLoss: Math.max(1, Math.round((Number(baseConfig.stopLoss) || 25_000) * 0.6)), maxHoldHours: Math.max(1, Math.round((Number(baseConfig.maxHoldHours) || 12) * 0.6)) },
    { id: 'configured', name: 'Your settings', targetProfit: Number(baseConfig.targetProfit) || 0, stopLoss: Number(baseConfig.stopLoss) || 0, maxHoldHours: Number(baseConfig.maxHoldHours) || 12 },
    { id: 'patient', name: 'Patient exits', targetProfit: Math.max(1, Math.round((Number(baseConfig.targetProfit) || 10_000) * 1.6)), stopLoss: Math.max(1, Math.round((Number(baseConfig.stopLoss) || 25_000) * 1.5)), maxHoldHours: Math.max(1, Math.round((Number(baseConfig.maxHoldHours) || 12) * 1.8)) },
  ];
  return strategies.map(strategy => ({ ...strategy, result: simulateHistoricalStrategy(points, { ...baseConfig, ...strategy }) }));
}
