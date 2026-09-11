# OSRSFlipIt V13.1

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

## V16 mobile polish
- Reworked mobile Market/Screener controls with compact Profiles, Columns and Reset actions.
- Added mobile column enable/disable plus up/down ordering controls.
- Added Potential Profit to mobile Market/Screener cards with green positive / red negative styling.
- Added five-second alert toast notifications on mobile/desktop.
- Finance item selection now clears the item search after selection so it cannot cover Buy price.
- Numeric GP inputs no longer turn blank/invalid edits into `NaN`; they stay blank until a valid value is entered.
- Item analytics can be restored after refresh using the item URL/session state, with the originating Market/Screener context retained.
- Added two-finger pinch zoom support to analytics charts while preserving one-finger vertical page scrolling.
- Improved mobile landscape spacing and search/analytics layout.
- Added a persistent Back to Top control when the page is scrolled.
- Kept the desktop layout and existing flipping/analytics logic intact.


## V19 navigation and theme polish
- Tablet/iPad and phone navigation now stays at the bottom in a fixed app-style navigation bar, including landscape orientation.
- Top utility area remains reserved for brand, item search, notifications, theme and other utilities; desktop navigation is unchanged.
- Added a third **Comfort** theme alongside Light and Dark, using warmer lower-contrast surfaces intended to be easier on the eyes.
- Theme choice is stored locally and applies across every page.

## Future ideas / backlog
- Add a proper theme picker with previews instead of cycling themes.
- Add configurable bottom-nav shortcuts so users can choose their five most-used pages.
- Add an optional compact landscape header mode for iPad.
- Add accessibility controls for font size, contrast and reduced motion.
- Add cloud-synced preferences when accounts are introduced.
- Add richer item search aliases and OSRS Wiki IDs for even faster exact matching.
- Add a dedicated mobile chart toolbar with reset-zoom and timeframe shortcuts.
