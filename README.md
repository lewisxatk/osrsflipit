# OSRS Hub V35.2.1 — Startup + Calculator Fix

## Changes
- Hardened startup so module/runtime failures no longer present as an unexplained white page.
- Added a self-contained boot fallback message and global error visibility.
- Browser favicon now exactly matches the purple→blue OSRS Hub OH mark with white text.
- Retained the V35.2 desktop Quick Profit Calculator beside Notifications.
- Calculator accepts plain GP values and k/m/b shorthand, quantity, GE tax, per-item profit, total profit, investment, sale value and ROI.

## Build
`npm install`
`npm run build`
`npm run preview`

## Deployment
Use the V35.2.1 ZIP as a fresh Cloudflare Pages deployment/build. If an old Cloudflare deployment is cached, trigger a new deployment and hard refresh.

## Verification
- ZIP integrity: passed.
- Static JSX/source checks: passed.
- Full Vite production build: not executable in this offline environment because npm dependencies are not cached.


## V36 updates
- Dark-mode parity fixes for Screener and full Item Analytics, with brighter profit-green in dark mode.
- Item Analytics title no longer sticks while scrolling.
- Recipe cards show skill requirements more clearly and include expanded Magic enchanting and Herblore unfinished-potion methods.
- Recipes remain sorted by highest estimated GP/hour by default.
- Finance Flip Log item picker uses the shared searchable suggestion menu and is no longer clipped/sticky.
- Added optional **Full GE Limit Cost** column/filter: buy price × GE limit. It is opt-in and not part of the default columns.
- Added mobile/tablet sort controls for Volume, Margin, Potential Profit, ROI, Flip Score and Limit Cost.
- Added real browser paths: `/dashboard`, `/screener`, `/analysis`, `/recipes`, `/finance`, `/calculators`, `/money-makers`, `/movers`, `/watchlist`, `/alerts`, `/cool-stuff`.
- Added Cloudflare Pages SPA fallback via `_redirects`.


## V38 updates
- Mobile/tablet Profiles fixed on Market and landscape layouts.
- Desktop header cleaned up; Analysis moved into Extras.
- Quick profit calculator restored on wider desktop screens and expanded with GE-limit profit after tax.
- Aurora theme added with stronger dark-mode contrast and ticker/table surface fixes.
- New Calculations page: HiScores account lookup, XP-to-level/99 planning, quest-pathway beta, and live-price-linked boss/monster GP/hour modelling.
- RuneLite profile import accepts compatible text/JSON/profile exports and explains that the built-in RuneLite export is primarily client settings.
- Cool Stuff now includes a Last 1 Hour Scanner for historical buy-low/sell-higher sequences with a 250+ 24h-volume quality floor.
- `/calculations` is the primary calculations route; `/calculators` remains an alias.

## V39 fixes
- Last 1 Hour Scanner no longer leaves the item suggestion layer stuck open after selecting an item.
- One-item scanner now opens the item's full analytics on demand and can open it automatically after a successful scan.
- Added editable minimum 24h volume and minimum post-tax margin thresholds for the scanner.
- Market scanner now uses the chosen volume/margin floors instead of the fixed 250-volume rule.
- Added a Cloudflare Pages Function at `/api/hiscores` so account lookups are server-side instead of browser-direct to Jagex, avoiding normal browser CORS blocking.
- Added basic username validation, upstream status forwarding, short public caching, and CORS headers for the account lookup endpoint.


## V39.2 scanner + account reliability
- Fixed scanner threshold parsing so volume/margin filters accept plain numbers, commas, and GP shorthand such as `1k`, `50k`, `2.5m`.
- Scanner now explicitly converts live volume/price fields to numbers before filtering, reports when no tracked items meet the chosen volume floor, and only shows the market scan button in Market mode.
- Added clearer last-hour scanning diagnostics and preserves the one-item scanner flow.
- Improved HiScores endpoint response handling so the UI shows the real reason for failure instead of the old generic CORS message.
- Added a Cloudflare Workers-compatible `public/_worker.js` API handler as well as the Pages Function, covering both common Cloudflare deployment modes.
- Added detailed RuneLite Profile export/import instructions in Calculations, including the important limitation that RuneLite Profiles are primarily plugin/settings exports and are not a guaranteed source of skill XP or quest data. RuneLite documents Profiles as separate plugin/settings sets and the export control is inside the expanded profile controls.
- Added clearer styling for the RuneLite import guide in all themes.

### Scanner input examples
- `250` = 250 volume/day
- `1,000` = 1,000 volume/day
- `1k` = 1,000 volume/day
- `10k` = 10,000 volume/day
- `50k` = 50,000 GP minimum margin after tax
- `2.5m` = 2.5m GP minimum margin after tax

### Cloudflare note
If the site is deployed as a Workers Static Assets project, `public/_worker.js` is copied into `dist` and handles `/api/hiscores`. If it is deployed as Cloudflare Pages, `functions/api/hiscores.js` handles the same route. This avoids relying on a browser-direct request to Jagex.


## V39.2 fixes
- Last 1 Hour Scanner now rejects zero/missing time-series prices instead of treating them as valid buy prices.
- Scanner uses positive historical entry/exit prices only.
- Market scan accepts custom 24h volume floors and minimum after-tax margin floors using gp/k/m/b notation.
- Item search is restricted to currently tradable GE items with live volume/prices; monster/activity names are not used as scanner suggestions.
- Main market price semantics corrected: Buy Price uses the live high/instant-buy side and Sell Price uses the live low/instant-sell side; margin is calculated accordingly.
- RuneLite import now attempts to extract an account name from JSON/profile exports and automatically runs the HiScores lookup when a username is present.
- RuneLite import now gives a precise explanation when the exported profile contains settings but no account name or skill data.


## V40.0 — Historical Margin Scanner
- Replaced the previous last-hour scanner logic with a configurable historical opportunity scanner.
- Filters: current price range, minimum 24h volume, minimum after-tax profit, minimum margin %, and minimum time between observations.
- Uses 5-minute time-series observations across the last hour.
- Finds the best earlier observed low → later observed high sequence per item.
- GE tax is explicitly deducted from the later sale using the site-wide 2% tax rate with the 5m cap.
- Shows exact local entry/exit times, observed prices, after-tax profit, margin %, tax paid, and number of qualifying sequences.
- Scans candidates in concurrent batches of 8 to reduce waiting time while avoiding an uncontrolled request burst.
- Clearly labels results as historical opportunities rather than guaranteed GE fills.

### V40 test defaults
- Min price: 1m
- Max price: 25m
- Min 24h volume: 250
- Min profit after tax: 200k
- Min margin: 0%
- Minimum time between observations: 10 minutes
