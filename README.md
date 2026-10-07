# OSRS Hub V51 — Full OSRS Brain Experimental Build

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
