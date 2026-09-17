# OSRS Hub V47.2 — Reliability, Market API & UX Fixes

This build is based on the V47.1 project and focuses on the issues found on the live site rather than adding placeholder pages.

## Major fixes
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
