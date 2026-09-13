# OSRS Hub V32.1

OSRS Grand Exchange flipping dashboard built with React + Vite for Cloudflare hosting.

## Included
- Live Grand Exchange prices, margins, ROI and 24h volume
- Screener with filters, profiles and configurable columns
- Full mobile/tablet Item Analytics with touch-friendly charts
- Watchlist, alerts, finance/P&L, recipes, calculators and money makers
- Market Movers with configurable volume thresholds
- Overnight Flip Finder with 15 liquid £50k+ opportunities
- Historical low finder using 30-day time-series data
- Local backup/restore for supported settings and trading data
- OSRS Hub / OH gradient branding built into the app

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```

Cloudflare Workers Builds can use `npm run build` as the build command.

## Data
OSRS Hub uses the public RuneScape Wiki real-time prices API. No API key is required.
