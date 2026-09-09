# OSRSFlipIt v5

This build was rebuilt from the original OSRSFlipIt project, then the requested v2/v3/v4 features were ported into it in one codebase.

Features include live OSRS Wiki market data, tax-aware margins, Match All filters, saved profiles, custom/reorderable columns with reset, Screener, Movers, Watchlist ticker, Alerts, Analysis, Recipes, Money Makers, detailed buy/sell graphs with local timestamps, 5-minute points, zoom/pan, GP k/m/b inputs, account UI placeholder, dark Blue Nights theme, and Escape-to-close overlays.

## Cloudflare Workers
This uses Cloudflare Workers Static Assets with a small Worker that serves the Vite `dist` output. It deliberately does not serve `/src/main.jsx` directly.

Install/build/deploy:
```bash
npm install
npm run build
npm run deploy
```

For GitHub/Cloudflare Workers Builds:
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The public RuneScape Wiki prices API does not require an API key. Market data is refreshed about once per minute and secondary data is cached where appropriate.
