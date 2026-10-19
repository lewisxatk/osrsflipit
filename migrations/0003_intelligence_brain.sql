-- V51.2 Intelligence + full OSRS data foundation
CREATE TABLE IF NOT EXISTS market_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  captured_at INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  current_price INTEGER DEFAULT 0,
  previous_price INTEGER DEFAULT 0,
  change_pct REAL DEFAULT 0,
  volume INTEGER DEFAULT 0,
  local_hour INTEGER DEFAULT 0,
  source TEXT DEFAULT 'market_snapshot',
  details_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_market_events_type_time ON market_events(event_type,captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_events_item_time ON market_events(item_id,captured_at DESC);
CREATE TABLE IF NOT EXISTS market_hourly_stats (
  item_id INTEGER NOT NULL,
  local_hour INTEGER NOT NULL,
  samples INTEGER DEFAULT 0,
  avg_change_pct REAL DEFAULT 0,
  negative_samples INTEGER DEFAULT 0,
  positive_samples INTEGER DEFAULT 0,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY(item_id,local_hour)
);
CREATE INDEX IF NOT EXISTS idx_market_hourly_edge ON market_hourly_stats(local_hour,avg_change_pct);
CREATE TABLE IF NOT EXISTS osrs_catalog (
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  name TEXT,
  members INTEGER DEFAULT 0,
  searchable INTEGER DEFAULT 1,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY(entity_type,entity_id)
);
CREATE INDEX IF NOT EXISTS idx_osrs_catalog_name ON osrs_catalog(name);
CREATE INDEX IF NOT EXISTS idx_osrs_catalog_type_name ON osrs_catalog(entity_type,name);
CREATE TABLE IF NOT EXISTS osrs_equipment_catalog (
  item_id INTEGER PRIMARY KEY,
  slot TEXT,
  equipable INTEGER DEFAULT 0,
  weapon INTEGER DEFAULT 0,
  two_handed INTEGER DEFAULT 0,
  attack_speed INTEGER DEFAULT 0,
  requirements_json TEXT,
  bonuses_json TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_equipment_slot_equipable ON osrs_equipment_catalog(slot,equipable);
CREATE TABLE IF NOT EXISTS osrs_drop_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  item_id INTEGER,
  min_qty INTEGER DEFAULT 1,
  max_qty INTEGER DEFAULT 1,
  chance_num INTEGER,
  chance_den INTEGER,
  table_name TEXT,
  data_json TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_drop_tables_source ON osrs_drop_tables(source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_drop_tables_item ON osrs_drop_tables(item_id);
CREATE TABLE IF NOT EXISTS osrs_content_catalog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,
  name TEXT NOT NULL,
  data_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(content_type,name)
);
CREATE INDEX IF NOT EXISTS idx_content_catalog_type ON osrs_content_catalog(content_type);
