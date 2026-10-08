-- V52.0: deeper OSRS data platform / intelligence joins
CREATE TABLE IF NOT EXISTS osrs_items (
 item_id INTEGER PRIMARY KEY, name TEXT, examine TEXT, members INTEGER DEFAULT 0, tradeable INTEGER DEFAULT 0,
 icon TEXT, value INTEGER DEFAULT 0, high_alch INTEGER DEFAULT 0, ge_limit INTEGER DEFAULT 0,
 stackable INTEGER DEFAULT 0, noted INTEGER DEFAULT 0, linked_id INTEGER, data_json TEXT, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_osrs_items_name ON osrs_items(name);
CREATE INDEX IF NOT EXISTS idx_osrs_items_tradeable ON osrs_items(tradeable,members);
CREATE TABLE IF NOT EXISTS osrs_npcs (
 npc_id INTEGER PRIMARY KEY, name TEXT, combat_level INTEGER DEFAULT 0, hitpoints INTEGER DEFAULT 0,
 attack_level INTEGER DEFAULT 0, strength_level INTEGER DEFAULT 0, defence_level INTEGER DEFAULT 0,
 ranged_level INTEGER DEFAULT 0, magic_level INTEGER DEFAULT 0, attributes_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_osrs_npcs_name ON osrs_npcs(name);
CREATE TABLE IF NOT EXISTS osrs_quests_data (quest_id INTEGER PRIMARY KEY, name TEXT UNIQUE, difficulty TEXT, members INTEGER DEFAULT 0, requirements_json TEXT, rewards_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_spells (spell_id INTEGER PRIMARY KEY, name TEXT UNIQUE, spellbook TEXT, level_required INTEGER DEFAULT 0, requirements_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_prayers (prayer_id INTEGER PRIMARY KEY, name TEXT UNIQUE, level_required INTEGER DEFAULT 0, drain_rate REAL DEFAULT 0, requirements_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_locations (location_id INTEGER PRIMARY KEY, name TEXT UNIQUE, region TEXT, members INTEGER DEFAULT 0, coords_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_activities (activity_id INTEGER PRIMARY KEY, name TEXT UNIQUE, category TEXT, requirements_json TEXT, rewards_json TEXT, data_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_drop_sources (source_id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT NOT NULL, source_key INTEGER, source_name TEXT, table_json TEXT NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(source_type,source_key,source_name));
CREATE TABLE IF NOT EXISTS osrs_combat_profiles (entity_id INTEGER PRIMARY KEY, style TEXT, attack_bonus_json TEXT, defence_bonus_json TEXT, max_hit INTEGER DEFAULT 0, attack_speed INTEGER DEFAULT 0, accuracy_json TEXT, mechanics_json TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_pvm_methods (method_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, boss_id INTEGER, solo INTEGER DEFAULT 0, team_size INTEGER DEFAULT 1, min_kc INTEGER DEFAULT 0, kill_time_seconds REAL DEFAULT 0, death_cost INTEGER DEFAULT 0, supply_cost_hour INTEGER DEFAULT 0, loot_value_hour INTEGER DEFAULT 0, net_gp_hour INTEGER DEFAULT 0, variance REAL DEFAULT 0, requirements_json TEXT, notes TEXT, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS osrs_intelligence_events (id INTEGER PRIMARY KEY AUTOINCREMENT, created_at INTEGER NOT NULL, entity_type TEXT, entity_id INTEGER, signal_type TEXT, score REAL DEFAULT 0, confidence REAL DEFAULT 0, payload_json TEXT);
CREATE INDEX IF NOT EXISTS idx_intel_events_entity ON osrs_intelligence_events(entity_type,entity_id,created_at DESC);
CREATE TABLE IF NOT EXISTS osrs_item_relations (item_id INTEGER NOT NULL, relation_type TEXT NOT NULL, related_id INTEGER NOT NULL, weight REAL DEFAULT 1, data_json TEXT, updated_at INTEGER NOT NULL, PRIMARY KEY(item_id,relation_type,related_id));
CREATE TABLE IF NOT EXISTS osrs_data_sources (source_key TEXT PRIMARY KEY, source_name TEXT, endpoint TEXT, cursor TEXT, status TEXT, last_success INTEGER, last_error TEXT);
