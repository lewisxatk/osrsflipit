# OSRS Hub 2.0 — Trading Terminal Fixes

- Trading Terminal no longer renders the large generic page introduction; the terminal starts directly beneath the global navigation.
- Terminal colours follow the global site theme (Paper/light, Aurora, Void, Obsidian/dark, Comfort/Graphite mapping); no terminal-only theme setting is used.
- Replaced the watchlist's destructive “Top picks” action with “Next item”, which cycles through the current saved watchlist without replacing it.
- Members Only and F2P Only filters now toggle correctly and visibly; unknown membership data is not incorrectly treated as F2P.
- Compare now has a persistent, maximum-four item shortlist and compare toggles in the market scanner.
- Historical hover tooltip now resolves missing buy/sell points from neighbouring observations when possible and labels those values as estimates. It does not present interpolated values as exact observations.
- Watchlist sell-price cells briefly glow green/red when the loaded live market snapshot changes. The app's existing market refresh remains the source of quotes.
- Status wording now says the site GE API feed is connected and that the page follows the site market refresh; no RuneLite-specific feed is claimed.

## Safety

No Worker, Discord integration, D1 schema or migration changes were made. No new database writes or migrations were introduced. Price-change animation is client-side only.

## Validation

- `npm test`: 72/72 passing.
- Production Vite build: not run in this environment because dependency installation did not complete. Run `npm install` and `npm run build` locally before uploading to GitHub.
