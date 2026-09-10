# OSRSFlipIt V13

OSRS Grand Exchange flipping dashboard built with React + Vite and designed for Cloudflare hosting.

## V13 upgrades

- **Mobile-first market experience:** desktop tables become compact flip cards on phones, with Buy, Sell, Margin, ROI, 24h volume, Risk and Profit/slot visible without horizontal scrolling.
- **Mobile bottom navigation:** Market, Screener, Analysis, Watch and a More menu are always within thumb reach.
- **Full-screen mobile item analytics:** faster access to the chart, larger touch targets, compact metric tiles, drag/pinch-friendly chart area and an obvious Back to Screener action.
- **Smart Flip Finder:** enter bankroll + GE slots and get the best current candidates based on Flip Score, safety, capital fit and expected profit.
- **Stable Flip Score /100:** fixed thresholds rather than normalising against the current best item, so scores are much more consistent between refreshes.
- **Risk Score:** Low / Medium / High risk indicator with a 0–100 safety score.
- **Capital efficiency:** estimated profit per 1m GP invested.
- **GE-slot efficiency:** estimated profit for a practical 1m-per-slot allocation constrained by the item's GE limit.
- **Score explanation:** item analytics shows the component scores behind the Flip Score.
- **24h volume:** uses the OSRS Wiki `/24h` data and labels the column explicitly.
- **Correct GE direction:** Buy = lowest current sell offer (`low`); Sell = highest current buy offer (`high`); tax-aware margin uses the 2% GE tax capped at 5m.
- **Client-side API cache:** bulk market data is cached for 45 seconds and item time-series for 5 minutes, with cached fallback when a request temporarily fails.
- **Login clearly marked Coming soon:** the top-right login control opens an explanation instead of pretending authentication is live.
- Existing Finance, Calculators, Recipes, Money Makers, Movers, Watchlist, Alerts, profiles, dark mode, sound alerts and item charts retained.

## Important limitation

V13 is still a client-side application. The login control is intentionally **not a real account system yet**. Discord automation, Stripe subscriptions, server-side alert scheduling, cross-device accounts and persistent server-side market caching belong in the next backend phase.

The client-side cache improves repeat browsing and resilience, but it is not a replacement for a Cloudflare Worker/KV/D1 market-data cache.

## Data / API

OSRSFlipIt uses the public RuneScape Wiki real-time prices API at `prices.runescape.wiki`.

No API key is required. The API exposes bulk latest prices, mapping, 24h market data and item time-series data. The app uses a descriptive User-Agent and avoids unnecessary polling.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated production files are placed in `dist/`.

## Cloudflare Pages

For a GitHub-connected Cloudflare Pages project:

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- No environment variables are required for the current public OSRS Wiki API integration.

## Accounts / premium roadmap

The UI intentionally says **Coming soon** until a real authentication/database backend is connected. The recommended next architecture is Cloudflare Worker + D1/KV for server state and caching, with Stripe for premium billing and a protected server-side Discord integration.
