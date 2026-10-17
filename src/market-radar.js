/** Build a transparent, current-snapshot market radar. It does not infer historical movement. */
export function buildRadarRows(items, metric = 'flipScore', filters = {}) {
  const source = Array.isArray(items) ? items : [];
  const rows = source.filter(item => {
    const buy = Number(item?.buy) || 0;
    const sell = Number(item?.sell) || 0;
    if (buy <= 0 || sell <= 0) return false;
    if (filters.f2pOnly && item.members) return false;
    if (filters.positiveOnly && (Number(item.margin) || 0) <= 0) return false;
    if (filters.minVolume != null && (Number(item.volume) || 0) < Math.max(0, Number(filters.minVolume) || 0)) return false;
    return true;
  }).map(item => ({ ...item, radarValue: Number(item[metric]) || 0 }));
  const sorted = [...rows].sort((a, b) => b.radarValue - a.radarValue);
  const values = sorted.map(row => row.radarValue);
  const min = values.reduce((best, value) => Math.min(best, value), values.length ? values[0] : 0);
  const max = values.reduce((best, value) => Math.max(best, value), values.length ? values[0] : 0);
  const span = max - min;
  return sorted.map((row, index) => ({
    ...row,
    radarRank: index + 1,
    // Relative rank is a display intensity, not a probability or forecast.
    radarIntensity: span === 0 ? 50 : Math.round(12 + ((row.radarValue - min) / span) * 88),
  }));
}

export function radarMetricLabel(metric) {
  return ({ flipScore: 'Flip score', margin: 'After-tax margin', roi: 'ROI', volume: '24h volume', potentialProfit: 'Potential profit' })[metric] || 'Flip score';
}
