# OSRS Hub V51.1 — Full OSRS Brain Repair Build

Separate experimental build from the fixed V50 source.

- Existing mobile layout retained and improved.
- Hub Brain lives inside Analysis; no explosion of pages.
- Floating/bubbly motion on desktop and mobile, with reduced-motion support.
- Market weather, opportunity radar, fill confidence, decay, capital/slot allocation, session planning, anomaly signals and missions.
- D1 data platform and progressive OSRS item/monster/prayer ingestion.
- RuneLite-fed market stream used for live market data.
- No outbound “See on Wiki” item link.
- Discord/OAuth/alerts preserved.

Apply `migrations/0002_osrs_data_platform.sql` before production deployment and keep V50 as rollback.


## V51.1 repair pass
- Item analytics opens immediately from Home, Screener, global search, ticker and Brain; chart history loads in the background with a timeout guard.
- Recipes and Money Makers now expand inline with detailed breakdowns instead of relying on the old overlay interaction.
- Void theme surface hardening covers Home/Screener tables, cards, stats and expanded tiles.
- The mobile floating Brain orb now opens the real Hub Brain and Brain item signals open Item Analytics.
- Removed outbound OSRS Wiki item links from the app UI.
- Discord OAuth, account sync and Discord alert handlers were left untouched.
- npm/Vite production build could not be verified in this environment because dependency installation and npx parser download timed out; worker syntax and static source checks were completed instead.

## V51.2 Intelligence + OSRS Database Pass

This build adds the next major intelligence/data layer while preserving the existing Discord/auth handlers.

- Candidate-weighted Market Weather (liquid/tradeable flips only)
- Sudden Drop Monitor with percentage + absolute-GP thresholds and saved item monitors
- Hour-on-hour crash monitor
- Custom Smart Signal controls for volume, drop %, drop GP, minimum price and hourly crash %
- Automatic Overnight Monitor using UK-local hours and D1 historical observations; no manual time windows required
- Recommended Flips: under 100m buy price, at least 50k after-tax margin, live-refreshing top 10
- Chart palette/style controls and persisted chart preferences
- Softer Comfort theme and additional Void surface hardening
- Mobile analytics quick-action bar and Brain shortcut retained/improved
- V54 PvM Intelligence, V55 Combat Brain and V56 Account Brain integrated into Analysis
- V57 database foundation expanded with market events/hourly intelligence, generic OSRS catalog, equipment catalog, drop-table and content catalog tables
- OSRSBox item/monster/prayer ingestion now also populates the generic searchable catalog and equipment catalog

### D1 migrations

Apply the bundled migrations to the production D1 database before deploying the Worker:

`npx wrangler d1 migrations apply osrshub-accounts --remote`

Then deploy normally with `npm run deploy`. The Worker cron continues to handle market snapshots, intelligence events and rich-data ingestion.

### Data architecture

Live UI prices remain on the existing fast prices API. D1 is the intelligence/history layer: snapshots feed sudden-drop and hourly-crash events, recurring overnight behaviour, and the wider OSRS catalog. This deliberately avoids replacing instant market prices with stale database values.

Discord/auth code is intentionally preserved.
