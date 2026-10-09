# OSRS Hub V56 Data Platform

## Core identity
Numeric OSRS item IDs are canonical across market, analytics, watchlists, alerts and database joins.

## Market layer
- `market_current` — small shared cache for the most liquid items; live UI prices remain API-fed.
- `market_snapshots` — hourly historical price payloads.
- `market_events` — bounded sudden-drop and hourly-crash observations.
- `market_hourly_stats` — local-hour behaviour used by the overnight finder.

## OSRS knowledge layer
- `osrs_items` — persistent item identity and mapping metadata.
- `osrs_item_data` — rich OSRSBox item JSON.
- `osrs_catalog` — generic searchable catalogue.
- `osrs_equipment_catalog` — equipability, slots, requirements and bonuses.
- `osrs_npcs` / `osrs_monster_data` — NPC and monster metadata.
- `osrs_drop_tables` / `osrs_drop_sources` — drop-table foundations.
- `osrs_quests_data`, `osrs_spells`, `osrs_prayers`, `osrs_locations`, `osrs_activities` — reference-data foundations.
- `osrs_combat_profiles` / `osrs_pvm_methods` — combat and PvM model inputs.
- `osrs_item_relations` — item-to-item/content relationship foundation.
- `osrs_content_catalog` — rotating OSRS Wiki knowledge pages.
- `osrs_data_sources` — source/cursor/status tracking.
- `osrs_intelligence_events` — cross-domain signal foundation.

## Ingestion and write budget
The Worker cron wakes every minute to support alert processing, but site-wide OSRS data jobs check the market sync timestamp and run at most once every 15 minutes. A normal market pass updates up to 25 current-market rows and 25 item-mapping rows. Event rows are capped at 8 per pass; hourly behaviour is capped at 30 records and is eligible only once per hour. Snapshots are hourly. Rich OSRSBox and wiki syncs are gated to longer intervals.

The internal D1 write governor is 7,000 estimated rows per UTC day. It is a conservative app-side brake, not Cloudflare billing telemetry. The check script reads internal metadata and the live health API; Cloudflare Dashboard → D1 → `osrshub-accounts` → Metrics is authoritative for actual `rows_written`.

## Emergency controls
- `00-EMERGENCY-STOP-DATA.bat` sets `data_ingestion_paused=1`.
- `01-RESUME-DATA.bat` clears that flag.
- `02-CHECK-D1-HEALTH.bat` checks the deployed `/api/data/health` endpoint and remote D1 tables/metadata.

The emergency flag pauses site-wide OSRS data ingestion and manual `/api/data/sync`; it does not pause live price API reads, user/account writes or the Discord alert cron. If the Worker cannot read the pause flag, it fails closed for site-wide ingestion.

## Live-price rule
The UI keeps its live price feed separate from D1. D1 provides history, intelligence and durable joins; it does not become the source of truth for current GE prices.
