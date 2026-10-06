
## V48.2.1 — Startup UI Error Hotfix
- Restored the V48.1 `MarketEvents`, `MarketConstellation` and `Alerts` components accidentally dropped during the V48.2 intelligence merge.
- Restored the `ColumnResizeEffect` helper from V47.4 so the screener resize path cannot reference a missing component.
- Fixed a High Alch Finder state setter typo (`setRows24` → `setRows24h`) that would throw when the Cool Stuff page mounted.
- Added a static component-reference scan: no unresolved React component tags remain in `src/main.jsx`.
- JSX/TypeScript parse check passes; Worker/config syntax checks pass.
- Full dependency-backed Vite build could not be completed in the build environment because `npm install` timed out; this is intentionally not reported as a passing production build.

## V48.2 — Intelligence Suite + Loadout 2.0

- Removed the large Home “Find the flip / Keep the profit” slogan and kept the Home feature layout/simple graph intact.
- Added a universal dark/Aurora/Void surface lock so legacy white cards, inputs, tables and buttons inherit the active theme.
- Added **Opportunity Feed**: ranked live trading signals using margin, ROI, liquidity and Flip Score.
- Added **Flip Map**: interactive ROI × margin × liquidity market map; click any item for analytics.
- Added **Finance 2.0**: 7d/30d P&L, win rate, average flip, GP per 1m capital and live capital-fit ideas.
- Upgraded **Item DNA → DNA 2.0** with trading profile tags and clearer risk/capital/liquidity interpretation.
- Upgraded **Alerts** with volume, Flip Score, risk score and potential-profit triggers in addition to price/margin/ROI.
- Expanded the keyboard terminal: `Ctrl/Cmd+K`, `/`, `?`, plus quick page keys `H M S A W F L R`.
- Rebuilt **Loadout Lab 2.0** with auto-build by combat style, melee/ranged/magic baselines, saved setups, stronger themed UI, larger equipment slots and improved responsive layout.
- Kept existing Chart Replay 2.0, command palette, right-click item menu, collapsed Market Events, High Alch Finder, Discord/auth worker and Home/mobile structure.
- Static validation: JSX TypeScript diagnostics 0; worker/vite syntax checks pass; CSS delimiter counts balanced.
- Full dependency-backed Vite build was attempted but `npm install` timed out in the build environment, so a full `vite build` could not be honestly certified here.

# OSRS Hub V48.1 — Visual Rebuild & UX Fix Pass

## Included
- Fixed recipe detail modal rendering/blur issue with a centred, scrollable modal system.
- Fixed alert creation modal so long forms remain scrollable and the Create Alert action stays reachable.
- Fixed Screener filter/profile/column overlays so desktop dropdowns float over the market instead of exposing the page/table behind them.
- Moved Item DNA below the price graph so charts remain the visual focus.
- Expanded dark, Aurora and Void surface theming so cards, tiles, tables, forms and analytics panels consistently use the selected theme.
- Rebuilt the desktop navigation around Home, Screener, Recipes, Money Makers and a consolidated Tools menu. Existing pages remain available.
- Added a desktop theme picker dropdown instead of cycling themes blindly.
- Collapsed Market Events on Home by default while keeping the live signals available on demand.
- Added a real desktop item context menu via right-click with analytics, watchlist, alert, Mini GE, copy and OSRS Wiki actions.
- Kept the Home feature set and simple Item Analytics graph experience intact.
- Kept the existing mobile navigation/layout behaviour intact.
- Preserved Worker, D1 and Discord integration/configuration from V47.4.

## Validation
- JSX transpilation: 0 diagnostics.
- Worker syntax check: passed.
- Vite config syntax check: passed.
- Worker and wrangler configuration compared against V47.4: unchanged.
- Full dependency-backed Vite build could not be completed in the isolated environment because `npm install --no-audit --no-fund` timed out.

## V48.0 — OSRS Hub visual + interaction overhaul

- Preserved the existing Worker, D1 account system, Discord OAuth/DM alert integration, cron alert checks, prices proxy and Cloudflare deployment structure.
- Added a new Obsidian-style dark visual system plus redesigned Aurora treatment and a new Void theme. Existing Light/Comfort themes remain available.
- Added premium motion: page entrance transitions, interactive hover lifts, item icon micro-animation, live-style pulse treatments, responsive reduced-motion support and animated Aurora background.
- Added **Market Pulse**, **Market Events**, **Market Constellation**, **Price Drop Radar**, **Item DNA**, and chart **Replay**.
- Added a Ctrl/Cmd+K command palette and `/` / `?` quick-open shortcuts for items, pages and actions.
- Improved alert creation so threshold editing keeps the modal open while selecting/highlighting/replacing values; thresholds are stored as editable text until saved.
- Added safer alert preview UX and stronger pointer isolation around the modal.
- Added current-vs-24h average price-drop context to radar signals using the existing 24h price feed.
- Added chart replay animation without changing the existing history API or mobile chart gestures.
- Kept the existing mobile navigation and horizontal/vertical behaviour intact rather than redesigning it away.
- Added semantic theme tokens in a dedicated upgrade stylesheet so future theme work does not require hundreds of scattered overrides.
- Existing High Alch Finder, watchlists, alerts, Finance, Loadout, Quest Pathway, XP planner, Screener, Item Analytics, Mini GE and other V47.4 features remain in place.


## V47.4 updates

- **Watchlist ticker cleanup:** removed the large desktop/mobile watchlist label from the scrolling ticker. The ticker is now display-only and uses the full available width.
- **True edge-to-edge ticker movement:** duplicated ticker content continues fully from right to left on desktop and mobile without leaving a permanent watchlist block on the left.
- **High Alch Finder:** added to Cool Stuff as a live market lab. It calculates High Alch profit as `High Alch value - current instant-buy item cost - 1 Nature rune`, with Fire staff cost fixed at 0 gp.
- High Alch filters include minimum profit, minimum 24h volume, minimum alch value, maximum item cost, sorting by profit/ROI/volume/discount, and a filter for items currently below their 24h average price.
- Nature rune price is read live from the GE API; the finder refreshes every 5 minutes.
- High Alch rows link directly into full Item Analytics.
- Dark/Aurora surfaces are included for the new tool.

# OSRS Hub V47.3 — Reliability, Market API & UX Fixes

This build is based on the V47.1 project and focuses on the issues found on the live site rather than adding placeholder pages.

## Major fixes
## V47.3 urgent production fix
- **Critical item/alert crash fixed:** V47.2 had accidentally dropped the production `ItemPanel`, `RuleModal`, `ChartTooltip`, `ColumnResizeEffect` and `MiniGE` component definitions while leaving their render calls in place. That meant clicking an item or opening the alert flow could throw a runtime `ReferenceError`, leaving the boot overlay stuck on **“Loading market tools…”**. All five components are restored from the last known-good V47.1 implementation and remain compatible with the V47.2 watchlist/theme/market changes.
- **Market item clicks restored:** Market, Screener, Watchlist, Movers and other item-selection paths now have the analytics panel component available again.
- **Create Alert restored:** the standalone alert modal and the `+ Create Alert` event path are restored.
- **Mini GE and column resizing restored:** these were also missing definitions and are now back so the fix does not trade one runtime crash for another.

- **Prices API 403:** all browser price requests now go through `/api/prices/*`, which adds the required identifying User-Agent and edge caching. The Discord alert Worker uses the same protected price fetch path.
- **Background Discord alerts:** the Worker cron remains enabled every minute and now has a `PUBLIC_ORIGIN`; it does not depend on the OSRS Hub browser tab being open. Discord delivery can therefore continue in the background when the user is signed in and connected.
- **Check alerts now:** syncs the current alert rules to D1 before running the real Discord alert evaluation, so a newly-created rule is not lost to the 5-second cloud-sync window.
- **Active watchlist:** the top ticker no longer contains a large clickable watchlist switcher. The active list is selected from the Watchlist page and the ticker follows that selection.
- **Watchlist picker:** starring an item opens a per-item list picker, allowing the same item to be saved to multiple lists. Maximum 3 lists and 25 items per list are preserved.
- **Ticker positioning:** the ticker is directly below navigation, keeps its rounded item tiles, and no longer gets cut off by the page layout.
- **Screener controls:** Filters, Profiles and Columns are forced into a high stacking layer/fixed overlay so the market table cannot cover them.
- **Dark/Aurora themes:** cleaned the broad white-card/input/mobile-navigation leftovers and added consistent dark/Aurora surfaces, borders and readable text.
- **Mobile Profiles:** compact horizontal control row with contained scrolling; dropdown panels remain above the market.
- **Item analytics favourite menu:** the watchlist picker opens inward on desktop and uses a fixed high layer on mobile so it cannot disappear below the analytics tiles.
- **Watchlists + theme cloud saving:** local values are preferred when present during first cloud hydration, preventing a refresh from replacing a newer local theme/watchlist with stale cloud defaults. The theme is written to both legacy and current local keys.
- **Analysis page:** the standalone Analysis page was removed from navigation. The Movers route is now the **Analysis** page and contains Movers, Overnight Flip Finder and Historical Margin Stability.
- **Overnight Flip Finder:** scans up to 70 candidates in concurrent batches instead of sequentially, uses the browser's local time, and exposes profit/volume/price/ROI/risk/time-window controls.
- **Historical margin stability:** retained and moved into the Analysis/Movers page.
- **Faster startup:** cached market rows render immediately, mapping is cached locally for 24h, 24h volume data for 5m, and the live market refresh interval is 90s. The Worker also edge-caches price API responses.
- **XP Planner:** added Fastest / Most AFK / Most affordable / Balanced training preferences and per-skill training method dropdowns for the route to 99 or the next level.
- **Quest Pathway:** selected quests now request live requirement data from an OSRS Wiki-backed Worker endpoint. Skill requirements are evaluated against the synced account; prerequisite quests are shown as completed/missing when account quest data is available.
- **RuneLite import:** the importer now understands common JSON account shapes containing skills/levels/quests and still correctly explains that the built-in RuneLite Profile export is primarily settings/plugin configuration. If a profile contains a usable RSN, OSRS Hub can sync it from HiScores/WikiSync.
- **Preserved Discord infrastructure:** Discord OAuth, bot token support, D1, Worker Assets, media, SEO, Wrangler configuration, `/media` build guard and all existing secrets remain intact.

## Cloudflare secrets
Keep these as encrypted Worker Secrets only:
- `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`
- `OSRSHUB_AUTH_SECRET`

Normal Wrangler variables:
- `DISCORD_CLIENT_ID`
- `DISCORD_REDIRECT_URI`
- `PUBLIC_ORIGIN`

Never commit secret values to GitHub.

## Background alert behaviour
The small OSRS Hub top-right toast only exists while the website is open. The **Discord notification is the background channel** and is driven by the Cloudflare Worker cron, so the browser does not need to stay open.

## Build checks completed for this package
- JSX/React source transpilation syntax check: passed.
- Worker JavaScript syntax check: passed.
- Vite config JavaScript syntax check: passed.
- `package.json` / `wrangler.jsonc` JSON validation: passed.
- ZIP structure/integrity: checked before packaging.

A full dependency-backed `npm run build` could not be executed in the isolated build environment used to prepare this package because dependency installation timed out. Cloudflare remains the production build check and should run `npm run build` on deployment.

## Data-source notes
- OSRS Wiki Prices API requires an identifying User-Agent; the Worker proxy now supplies one and caches upstream responses.
- OSRSBox provides item/equipment metadata including equipment bonuses and weapon attack speed.
- WikiSync provides RuneLite-synced quest and level data when the account has the WikiSync plugin enabled and synced.
- Quest requirements are requested from the OSRS Wiki through the Worker backend so the browser does not depend on Wiki CORS.
- XP, PVM/DPS and overnight results are models/analysis, not guarantees of kills, fills or profit.
