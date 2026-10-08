# OSRS Hub V52 Data Platform

## Core identity
Numeric OSRS item IDs are canonical across market, analytics, watchlists, alerts and database joins.

## Market layer
- `market_current` — latest live market state
- `market_snapshots` — historical price payloads
- `market_events` — sudden drops and hourly crash events
- `market_hourly_stats` — local-hour behaviour used by overnight intelligence

## OSRS knowledge layer
- `osrs_items` — persistent item identity and mapping metadata
- `osrs_item_data` — rich OSRSBox item JSON
- `osrs_catalog` — generic searchable catalogue
- `osrs_equipment_catalog` — equipability, slots, requirements and bonuses
- `osrs_npcs` — NPC/monster combat metadata
- `osrs_monster_data` — rich monster JSON
- `osrs_drop_tables` / `osrs_drop_sources` — drop-table foundations
- `osrs_quests_data` — quest metadata foundation
- `osrs_spells` — spellbook foundation
- `osrs_prayers` — prayer metadata
- `osrs_locations` — location metadata
- `osrs_activities` — activity/minigame foundation
- `osrs_combat_profiles` — combat/equipment modelling inputs
- `osrs_pvm_methods` — boss/PvM simulation inputs
- `osrs_item_relations` — future item-to-item/content relationships
- `osrs_content_catalog` — rotating OSRS Wiki knowledge pages
- `osrs_data_sources` — source/cursor/status tracking
- `osrs_intelligence_events` — future cross-domain intelligence signals

## Progressive ingestion
The Worker continues to ingest OSRSBox data in bounded batches and rotates through a broad OSRS Wiki content catalogue. This is intentionally progressive so a one-minute cron does not attempt to download the entire OSRS knowledge base in one request.

## Live-price rule
The UI keeps its live price feed separate from D1. D1 provides history, intelligence and durable joins; it does not become the source of truth for current GE prices.

## V53 D1 write protection

The Worker now treats D1 as an intelligence/history store rather than a raw market tick archive. Live market prices continue to come from the price proxy in the browser.

- D1 internal soft writer budget: 12,000 estimated rows/day.
- `market_current`: only a small liquid cache, refreshed every 10 minutes.
- `market_snapshots`: approximately hourly, not every market sync.
- Sudden-drop/hourly-crash events are capped and only meaningful liquid moves are persisted.
- Hourly behaviour is aggregated once per hour.
- OSRS item mapping is ingested incrementally rather than rewritten every tick.
- OSRSBox rich data is throttled and uses the same write governor.
- Wiki content ingestion is throttled.
- When the internal budget is exhausted, historical ingestion pauses; live prices and the frontend remain usable.
- Cloud account sync is change-detected: the browser no longer writes the full `user_data` row every 5 seconds when nothing has changed.

Run `D1-SAFE-UPDATE.bat` for the complete migration/build/deploy process. `CHECK-D1-WRITES.bat` shows the Hub's internal safety counter. Cloudflare's D1 Metrics page is still the authoritative source for actual account usage.
