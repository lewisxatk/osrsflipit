# OSRS Hub V33

OSRS Grand Exchange flipping dashboard built with React + Vite for Cloudflare hosting.

## Included
- Live GE prices, tax-aware margins, ROI, volume and Flip Score
- Screener with saved filters, columns and profiles
- Full-screen Item Analytics with compact tile controls above live price stats
- Isolated analytics window so the underlying market cannot show through while scrolling
- Mobile/Safari search zoom protection and responsive analytics layout
- Watchlist, alerts, Market Movers and historical tools
- Dashboard Competition Snapshot with stable six-item crowding indicators
- Cool Stuff bankroll allocator that responds to entered GP amounts
- Overnight Flip Finder with liquid £50k+ opportunities
- Local JSON backup/restore with a strict import whitelist
- OSRS Hub / OH gradient branding and the small “Taylor is cute” easter egg

## Run locally
npm install
npm run dev

## Production build
npm run build
Cloudflare Workers Builds can use `npm run build` as the build command.

## Data
OSRS Hub uses the public RuneScape Wiki real-time prices API for market data and historical price series.
