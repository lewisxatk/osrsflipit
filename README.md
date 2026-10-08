# OSRS Hub V52.0 — Intelligence + Full Item + OSRS Data Platform

Production-focused continuation of V51.2. Discord/OAuth/Discord alert handlers are intentionally left alone.

## Major changes
- Desktop theme picker rebuilt as a larger, theme-aware menu with reliable pointer handling.
- Graph wheel/pan interaction gets scroll priority while normal page scrolling remains intact elsewhere.
- Item Analytics has a real `/item/<numeric-id>` full-page view with the existing graph plus deep market, execution, risk and database sections.
- Item IDs are first-class database keys and are stored in `osrs_items`, `market_current`, `osrs_item_data` and `osrs_catalog`.
- Notifications can be cleared from the header bell and Alerts page.
- Desktop Brain orb is disabled; the floating Brain remains a mobile-only control.
- Rising/Falling analysis now supports 1h / 24h / 48h / 1w / 1m / 3m / 6m with configurable price and volume bounds.
- Sudden Drop Monitor now combines D1 event history with a live 24h baseline fallback so large drops can surface before long history accumulates.
- New dedicated Intelligence page brings the Hub Brain, Account Brain, Combat Brain, PvM intelligence, loot simulator, historical scanners, opportunity tools and market intelligence together.
- Hover motion is simplified site-wide: subtle highlight/glow instead of tacky pop/translate effects.
- Theme-safe table headings, risk/score readability, Mini GE, account/Discord surfaces and back-to-top controls across Comfort, Obsidian, Aurora and Void.
- Recipes and Money Makers remain available and their existing live-data architecture is retained.
- Database schema expanded for NPCs, spells, prayers, locations, activities, combat profiles, PvM methods, item relations, data sources and deeper item identity.
- Scheduled OSRS Wiki content ingestion now rotates through a broader OSRS knowledge catalogue.
- PVM Loot Simulator added for common loot, rare expected value, supplies, deaths, team splits and session profit.

## Database update
Run:

`UPDATE-DATABASE.bat`

This applies all pending remote D1 migrations and deploys the Worker so the progressive database sync can continue.

## Build/deploy
Run:

`BUILD-AND-DEPLOY.bat`

Or use `npm run build` followed by `npx wrangler deploy --config wrangler.jsonc`.

## GitHub cleanliness
Do not commit `node_modules/`, `.wrangler/`, `dist/` or secrets. The production `site/` directory should remain tracked when using the current Wrangler asset configuration.

## Data architecture
Live UI prices continue to come from the existing price API. D1 is the durable intelligence/history layer: market snapshots, event detection, hourly behaviour, OSRS catalogue records and future PvM/combat joins. Current live prices are never replaced by stale D1 values.

### One-click update
Use `D1-SAFE-UPDATE.bat` to install dependencies, apply pending D1 migrations, build the site and deploy the Worker. No manual command sequence is required.
