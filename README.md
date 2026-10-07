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
