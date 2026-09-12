# OSRS Hub V29.0

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

OSRS Hub uses the public RuneScape Wiki real-time prices API at `prices.runescape.wiki`.

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
- Tablet landscape keeps the top area for OSRS Hub, search and utilities while Market/Screener/Analysis/Watch/More stay fixed at the bottom.
- Navigation buttons divide the available width evenly so they do not bunch up or shrink into a tiny cluster.
- Safe-area spacing is preserved for devices with a home indicator.

### Product video / screenshots backlog
- Build a **real 30-second desktop product fly-through from the actual deployed OSRS Hub UI**, not generated mockups.
- Capture real desktop screenshots for Market, Screener, Item Analytics, Watchlist, Alerts, Finance, Calculators, Money Makers and Movers.
- Animate the real screenshots/UI between pages with an Apple-style product-film rhythm: clean transitions, subtle zooms, cursor/tap focus, chart animation and feature callouts.
- Add a final OSRS Hub logo/end card.
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

## V24 Notes — navigation, alerts, Cool Stuff and future intelligence
- Desktop navigation is now simplified to **Home / Screener / Analysis / Extras**, with the existing search, notifications, sound, theme, account icon and refresh controls retained.
- Market remains the internal route name for compatibility, but is presented as **Home** in navigation.
- Touch landscape devices keep the clean bottom app navigation; extra pages are opened from **More** rather than being permanently shown.
- Mini GE slots remain local and persist while moving around the site.
- Alert notification deletion is now linked to the originating alert rule where possible, so deleting an alert cannot immediately recreate the same notification from the old rule.
- Added **Cool Stuff** under Extras with Best Time to Flip, Historical Low Radar, Why am I seeing this?, If I Had…, Portfolio Mode and Flip Detective.
- Cool Stuff portfolio is local-only for now and supports up to 8 tracked ideas.
- Historical radar uses live OSRS Wiki timeseries evidence where available and keeps a 200+ volume quality gate.
- Dark mode received dedicated readability treatment for Screener/Smart Flip Finder and Cool Stuff.

### Graph redesign notes / options for next update
The next graph pass should be a visual redesign rather than simply changing line colours. Candidate directions:
1. **Clean spread graph** — Sell always rendered above Buy where the data permits, with a shaded spread area and a crisp hover card showing Sell first, Buy second, Margin and timestamp.
2. **Trading terminal** — dark/light grid, compact price scale, crosshair, sticky hover values and optional volume bars underneath.
3. **Minimal Apple-style** — softer grid, larger whitespace, thin lines, subtle gradient spread fill and a single floating tooltip.
4. **OSRS market mode** — Buy/Sell labels, historical-low band, current price marker, 24h change badge and optional GE-tax-adjusted margin line.
5. **User controls** — toggle Buy/Sell/Spread/Volume, line thickness, filled/unfilled spread, grid density, tooltip detail, and light/dark chart treatment.

Recommended default: **Minimal Apple-style + optional Trading Terminal controls**. Sell should appear first in hover details, followed by Buy, Spread/Margin and time. This should be tested on desktop, iPhone portrait/landscape and iPad landscape before replacing the current graph.

### Future market-risk intelligence
A future **Market Risk / News Context** system could combine sharp price drops with official OSRS updates, OSRS Wiki news/history and reputable community/news sources to explain possible catalysts. It should never claim certainty: it should show evidence, source links, confidence and a warning such as **“Possible catalyst detected — investigate before buying.”** This is intentionally kept as a future item until reliable source ingestion is implemented.

### V24 Backlog
- [ ] Market Risk / News Context after sharp drops
- [ ] Catalyst timeline beside the graph
- [ ] Graph redesign and user-selectable visual modes
- [ ] Better Best Time to Flip windows based on hourly history
- [ ] Historical Low Radar with stronger recurrence/rebound statistics
- [ ] Portfolio P&L tracking directly from Mini GE slots
- [ ] Cloud sync/accounts
- [ ] Export/import for full portfolio + alert rules

## V25 Notes — alert rebuild, graph controls, navigation polish and Cool Stuff UX
- Rebuilt alert triggering as a **one-shot per threshold crossing**. A rule fires once when its condition becomes true, is then disarmed, and only re-arms after the live value moves back outside the trigger condition. This removes the repeated-every-refresh/every-minute behaviour.
- Triggered notifications now carry their originating `ruleId`, allowing alert-rule deletion to remove its related notification history as well as the rule itself.
- Alert bell now flashes with the site's purple/blue accent while a fresh trigger is being surfaced.
- Desktop navigation now keeps **Recipes** directly alongside Home / Screener / Analysis, with the rest under Extras.
- Extras dropdown was moved to sit below the header and above the global search-result layer so it does not get trapped behind the Home search suggestions.
- Smart Flip Finder received stronger dark-mode surface overrides so its cards, inputs and text remain readable in Dark theme.
- Item Analytics keeps the existing tile layout and interactions, while the graph now has a simple **Chart options** menu. Default remains Buy + Sell + Grid + Cursor time. Users can toggle Buy line, Sell line, Grid and Cursor time independently.
- Hover details put **Sell before Buy**, while preserving the full date/time readout and the existing cursor-time line beneath the graph.
- Cool Stuff received a sticky **Jump to** control bar for Best Time, Low Radar, Why this?, If I Had…, Portfolio and Flip Detective so the page is much faster to navigate without adding those tools to Home/Screener.

### V25 Future Ideas / Backlog
- [ ] Add a proper spread-fill visual mode to the graph.
- [ ] Add optional Volume bars and a current-price marker to the graph.
- [ ] Add crosshair-style cursor tracking and a cleaner floating hover card while preserving the current readable timestamp.
- [ ] Add graph presets: Apple Clean / Trading Terminal / OSRS Market.
- [ ] Add per-user chart preferences with a Reset to default button.
- [ ] Add Market Risk / News Context: investigate sharp drops using official OSRS updates, Wiki data and reputable external sources, with evidence + confidence instead of pretending to predict price direction.
- [ ] Add catalyst markers directly on the graph.
- [ ] Add configurable alert re-arm rules and an optional manual “Re-arm” action.
- [ ] Add alert event history with acknowledged/dismissed states separate from the underlying rule.
- [ ] Rework Cool Stuff into a compact dashboard with a saved favourites strip and scan history.
- [ ] Add configurable quality gates for Cool Stuff scans (volume, risk, Flip Score and minimum expected profit).
- [ ] Add Mini GE → Portfolio → P&L workflow so completed tracked flips can flow directly into the journal.
- [ ] Add lossless JSON backup/restore for all local data alongside spreadsheet-friendly CSV.

## V26 Notes — Alerts, chart readability, mobile dark mode, speed

### What changed
- **Alerts rebuilt around one-shot threshold crossing.** The alert checker now reads live refs instead of stale React closures, so a triggered rule is immediately disarmed and cannot fire every refresh. It only re-arms after the price leaves the trigger condition and later crosses it again.
- **Bell-only alert feedback.** Removed the transient alert toast/pop-up. When a rule triggers, the top navigation bell gets the purple/blue pulse. Notifications remain available from the bell and in the Alerts page.
- **Alert history is simpler.** The Alerts page now separates saved rules from notification history, shows `Armed` / `Triggered once`, and dismissing a notification no longer accidentally deletes its underlying rule. Deleting a rule is a separate action.
- **Graph readability improved.** Sell is now a thin cyan line with a subtle filled area down to the chart floor. Buy is a thinner purple dashed guide. This keeps the spread visually obvious without making either line overly thick. Existing hover tooltip, cursor time, zoom/pan and chart options remain.
- **Smart Flip Finder collapsed by default.** Same width, much smaller footprint. `+` expands the existing Top 5 Finder and exposes bankroll/slot controls.
- **Recipes navigation made lighter.** Desktop navigation uses React's transition scheduling, and recipe price matching now uses a pre-built item-name index first instead of repeatedly scanning/fuzzy-searching the entire GE item list for every recipe ingredient.
- **Mobile/tablet dark mode parity.** Added late-loading dark overrides for coarse landscape layouts so Home, Screener, tables, cards, filters, recipes, finance and related surfaces cannot fall back to white/light backgrounds when the device is rotated.
- **General performance cleanup.** Removed an unused icon import, reduced unnecessary alert rendering, and kept the existing session cache for price/history API calls.

### Important behaviour
- Alerts are intentionally **not** repeated every minute anymore.
- A rule triggers once, becomes `Triggered once`, and remains quiet until the live value crosses back out of the trigger condition.
- Dismissing a notification only removes the notification; it does not delete the saved alert rule.
- The bell is now the only transient visual alert. No alert toast is shown.

## V26 Checks
- JSX/TypeScript parser diagnostics: **0**
- `index.html` size: **400 bytes** — preserved
- Existing V25 source carried forward before changes: **yes**
- Full `npm run build`: **attempted but the environment timed out while installing/building dependencies**, so no production-build success is claimed here.
- ZIP integrity: checked after packaging.

## Recommended next roadmap
1. **Accounts / Discord login** — Cloudflare Worker OAuth2 callback + secure session cookie.
2. **Cloudflare D1 account database** — saved columns, profiles, watchlist, alerts, Mini GE, P&L and preferences synced across phone/tablet/desktop.
3. **Server-side alert engine** — scheduled price checks so alerts can work even when the user's browser is closed.
4. **Discord notifications** — Worker-side Discord bot/webhook delivery; never expose a Discord bot token in the browser bundle.
5. **Security hardening** — strict CSP, secure cookies, CSRF protection, input validation, rate limits, Cloudflare WAF/Turnstile for account/auth endpoints, and server-side authorization on every account API.
6. **API proxy/cache** — route RuneScape Wiki price requests through the Worker with controlled caching/rate limiting instead of making every visitor call the upstream API independently.
7. **P&L cloud sync** — make the existing local P&L system account-aware with import/export backup.
8. **Ads only after the product is polished** — add privacy/consent pages and then consider AdSense without letting ads interfere with the Market/Screener UX.
9. **Installable PWA** — offline shell, app icon and faster repeat opens while keeping live market data online.
10. **Observability** — Cloudflare logs/analytics, error reporting and a small internal health page so breakages can be caught before users report them.

### Future backlog
- Chart: optional margin/ROI bands and a clean crosshair mode.
- Alerts: per-rule cooldown, optional sound, browser push and Discord delivery.
- Account dashboard: synced columns, profiles, watchlist, P&L and alert management.
- Portfolio → P&L → Mini GE unified workflow.
- Public share links for saved screens/profiles without exposing private account data.
- Lightweight feature flags so new tools can be rolled out without making the main UI heavier.


### V26.1 Build correction
- Removed the duplicate `WatchTicker` declaration that caused Cloudflare/Vite error `The symbol "WatchTicker" has already been declared`.
- Removed the old `MEDIA/` folder and all screenshot/video gallery files from the release ZIP.
- Kept the actual site code and UI unchanged apart from the build correction.
- Vite/Cloudflare production build should be run by the deployment environment with `npm run build`; local dependency installation timed out in this environment, so no false production-build success is claimed here.

## V27.1 mobile/screener update
- Added Screener mobile filter controls with the same FilterBuilder logic as Home.
- Improved Screener filter accessibility in portrait and landscape.
- Added compact mobile-landscape graph layout for shorter screens.
- Chart gestures are isolated in landscape so horizontal graph interaction does not scroll the page behind it.
- Tightened item analytics spacing, controls and chart height for small landscape screens.
- Added standalone `OSRS-Hub-Roadmap.html` and `ROADMAP-README.md` for tracking future builds, bugs and optimisations.

### V27.1 follow-up ideas
- Add a real bug-report destination once one is chosen.
- Add automated CI production build checks.
- Add a proper OSRS Hub favicon/logo system.
- Add a public changelog.


## OSRS Hub V27.2 / V28 handover

### V27.2 stability
- Added a recoverable React error boundary so a component exception no longer has to blank the whole app.
- Restored the notification popover component used by the notification bell.
- Kept existing alert/localStorage behaviour intact.
- Tightened responsive state/interaction handling around the analytics drawer.
- Preserved existing `osrsflipit-*` localStorage keys for backward compatibility.

### V28 product polish
- OSRS Hub branding in the header.
- Purple/cyan Hub brand accent and subtle underline detail.
- Inline SVG favicon; no external image dependency.
- Updated browser title and meta description.
- Added a compact development/build footer.
- Added a small V28 release card in Cool Stuff.
- No Report Bug destination was added because a real submission endpoint has not been chosen yet.

### Mobile / landscape
- Item title is no longer sticky in landscape, so it scrolls away with the analytics page instead of covering the chart.
- Short landscape screens get tighter navigation, item header, stats and chart spacing.
- Full-detail drawer keeps vertical page scrolling outside the chart and avoids sticky overlay behaviour.

### Build verification
- ZIP/source structure checked.
- JSX-sensitive edits inspected.
- Full `npm install` / production build should be run by Cloudflare/GitHub on deploy; local dependency installation was not relied on as a passing build check.

### Future ideas
- Proper OSRS Hub logo assets for social cards and app icons.
- Report Bug endpoint (GitHub Issues, Discord webhook or hosted form).
- Public changelog page.
- Shareable item/screener URLs.
- PWA install support.
- Automated regression checks for mobile breakpoints.
- Compare-items mode and advanced alert conditions.

## V29.0 — Dashboard + Intelligence

- Added local Personal Dashboard with Flip of the Day, Market Pulse, saved workspace summary, competition snapshot and quick P&L log.
- Added one-click JSON export/import for recognised local OSRS Hub data: profiles, column order/widths, analytics tiles, filters, watchlist, alerts/rules, Mini GE, sound/theme/chart settings, recipes, P&L, bankroll and portfolio.
- Profile saves now include column order, column widths and analytics tiles. While a custom profile is active, workspace changes are kept in that profile automatically.
- Added Historical Margin Stability scan to Analysis using sampled 30-day 6-hour price history.
- Added Competition Indicator to Cool Stuff. It is explicitly a market-crowding heuristic, not a player-count measurement.
- Added defensive import validation with a strict key whitelist; imported JSON is treated as data only.
- Discord login/notifications intentionally remain the next major build area.


## V29.0 additions
- Personal Dashboard with local P&L log, Flip of the Day, Market Pulse, saved workspace summary and competition snapshot.
- Full JSON workspace backup/restore for recognised local settings and data.
- Profiles now remember filters, column order, column widths and analytics tiles; active custom profiles update as the workspace changes.
- Analysis: Historical Margin Stability scan using sampled 30-day 6-hour history.
- Cool Stuff: Competition Indicator heuristic and easier intelligence jump navigation.
- Security: strict import whitelist, 2 MB backup cap, bounded collections, JSON-only data handling, and no execution of imported content.
- Next major build: Discord login and Discord notifications.
