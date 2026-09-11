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


## V20 — Mobile/tablet navigation polish
- Mobile/tablet bottom navigation now uses a stable flex layout so iPad and Android/tablet widths do not bunch the five primary actions together.
- Bottom navigation remains available in portrait and landscape below 1100px wide.
- The More menu is positioned independently from the five navigation slots so it cannot become a sixth grid item.
- The Columns panel now has an explicit **Done** button to collapse it after making changes, plus a separate reset control.
- Columns remains scrollable on smaller screens without forcing the page to jump unexpectedly.
- Existing V19 desktop navigation and theme behaviour is preserved.

## Future ideas / backlog
- Add a dedicated iPad/tablet navigation mode with optional larger labels.
- Add an animated first-run walkthrough showing Market → Search → Analytics → Watchlist.
- Add an in-app “Help / What’s new” panel for version changes.
- Add optional haptic feedback for important mobile interactions where supported.
- Create polished Apple-style promotional renders/video once the UI is fully locked.


## V21 — iPad/tablet app-style navigation + promo plan

### Priority update
- iPad and tablet landscape now use the same five-button bottom navigation pattern as iPhone when the device reports a coarse pointer.
- Desktop/touch-laptop layouts are not forced into the mobile navigation.
- Tablet landscape keeps the top area for OSRSFlipIt, search and utilities while Market/Screener/Analysis/Watch/More stay fixed at the bottom.
- Navigation buttons divide the available width evenly so they do not bunch up or shrink into a tiny cluster.
- Safe-area spacing is preserved for devices with a home indicator.

### Product video / screenshots backlog
- Build a **real 30-second desktop product fly-through from the actual deployed OSRSFlipIt UI**, not generated mockups.
- Capture real desktop screenshots for Market, Screener, Item Analytics, Watchlist, Alerts, Finance, Calculators, Money Makers and Movers.
- Animate the real screenshots/UI between pages with an Apple-style product-film rhythm: clean transitions, subtle zooms, cursor/tap focus, chart animation and feature callouts.
- Add a final OSRSFlipIt logo/end card.
- If a public deployment URL is supplied, use that exact rendered site as the visual source so the promo cannot accidentally show a different or fictional design.

### Future ideas
- Dedicated iPad landscape header with larger search and utility controls.
- First-run interactive tour.
- What's New/version history panel.
- Customisable navigation shortcuts.
- Mobile haptic feedback where supported.
- User-selectable font size/contrast/reduced-motion options.
- Cloud-synced preferences once accounts exist.


## V22 — Minimal UI sound design
- Added a very short, low-volume click sound for buttons and navigation controls when interface sounds are enabled.
- Added a slightly brighter two-tone confirmation sound for successful UI feedback while keeping the existing alert sound system.
- Text inputs, textareas and selects are excluded from click sounds so typing does not become noisy.
- Uses one reusable Web Audio context instead of loading audio files, keeping the bundle lightweight and avoiding extra asset requests.
- Existing sound preference, volume and alert sound settings remain stored locally.

### Media capture
The live deployment is available at https://osrsflipit.lxwisfm.workers.dev/. This environment can inspect the live page but cannot run a full interactive browser session against the Cloudflare deployment, so no fake screenshots or fake UI video are included. The media folder contains a live-capture gallery/link pack for the exact deployment and a shot list for the desktop fly-through.

### Future Ideas / Backlog
- Capture exact live desktop screenshots for every tab using an interactive browser session.
- Record the real 30-second Apple-style fly-through from the deployed site, including subtle UI sounds.
- Optional separate volume controls for UI clicks vs alerts.
- Haptic feedback on supported mobile devices.
- Reduced-motion / accessibility sound profile.

## V23 — Mobile navigation, P&L tools, Mini GE & market opportunity scans

### Updates
- Fixed touch-device navigation duplication: phone and iPad/tablet layouts now hide the desktop page-link row so the bottom app navigation is the single navigation surface.
- Screener touch layout now places **Profiles** and **Columns** directly underneath Smart Flip Finder instead of above it.
- Flip Log now supports **Export CSV** for spreadsheet use and **Import CSV** to restore trades into the browser.
- Flip Log item selection now keeps the chosen item name visible and fills live buy/sell prices instead of appearing to disappear after selection.
- Alerts now support dismissing individual notification entries; dismissals persist in localStorage.
- Desktop-only **Mini GE** added. It is a compact 8-slot tracker that can be opened/minimised from the bottom-right. Item Analytics has a **+ GE** action; duplicate items are prevented and the UI reports when all 8 slots are filled.
- Mini GE slots persist in the browser and can be individually removed.
- Movers now contains a separate **Market Opportunities** area with:
  - **Overnight Flip Finder** — scans liquid £100k+ estimated opportunities and uses 7-day hourly price-pattern evidence, volume, risk and Flip Score.
  - **Historical Low Watch** — scans liquid items against their observed 30-day low using 6-hour history, with a deliberately conservative volume threshold of 200.
- Opportunity scans deliberately prefer returning fewer/no results rather than low-quality recommendations.
- iPhone landscape Item Analytics graph gets extra spacing and a compact cursor-time readout.

### Important data note
The Overnight and Historical Low tools use historical OSRS Wiki time-series data as evidence. They are **not guarantees** of future fills or profit. The Overnight tool's £100k threshold is estimated opportunity profit based on current spread, GE limit and a conservative volume allocation, not a promise that £100k will be made overnight.

### Notes
- P&L CSV is spreadsheet-friendly and limited to the app's existing 500-trade local journal cap.
- Mini GE is intentionally desktop-only so it does not interfere with the clean iPhone/iPad navigation.
- Market Opportunity scans are on-demand to avoid hammering the OSRS Wiki API on every page refresh.
- The existing sound system remains minimalist and is unchanged by these features.

### Future Ideas / Backlog
- Add a true background historical-pattern cache so Overnight/Historical Low results can refresh automatically without user scans.
- Add configurable Overnight settings: minimum profit, minimum volume, maximum capital, preferred buy/sell hours and risk ceiling.
- Add confidence labels based on the number of historical occurrences of a pattern.
- Add a “buy zone → target sell → expected hold time” model backed by historical hourly behaviour.
- Add Mini GE quantity tracking, buy/sell state, filled/unfilled status and a simulated 8-slot order board.
- Add Mini GE “Send to Flip Log” after a tracked flip is completed.
- Add P&L CSV import preview, duplicate detection and date-range export.
- Add JSON backup/restore alongside CSV for lossless local backup.
- Add portfolio analytics: daily/weekly/monthly P&L, best items, average hold time and ROI by flip.
- Add historical-low watchlists and optional alerts when an item enters its chosen low band.
- Add a dedicated “Investment” page for longer-term holds, separate from active flipping.
- Add market regime detection: stable, trending, volatile and spread-compressed.
- Add fill-likelihood estimates using volume and price movement instead of relying only on margin.
- Add “why this is recommended” explanations to every opportunity result.
- Add user-defined quality gates so users can permanently reject low-volume, low-score or high-risk items.
- Add a first-run tour explaining Market → Screener → Analytics → Mini GE → Flip Log.
- Add cloud accounts later for synced watchlists, profiles, alerts, P&L and Mini GE layouts.
