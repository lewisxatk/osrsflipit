-- V57: compact per-item hourly prices for a real overnight buy-to-later-sell analysis.
-- One row per item per hourly capture; retained for 30 days by the Worker.
CREATE TABLE IF NOT EXISTS market_price_history (
  captured_at INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price INTEGER NOT NULL,
  volume INTEGER NOT NULL DEFAULT 0,
  local_hour INTEGER NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (captured_at, item_id)
);
CREATE INDEX IF NOT EXISTS idx_market_price_history_item_time
  ON market_price_history(item_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_market_price_history_hour_time
  ON market_price_history(local_hour, captured_at);

INSERT INTO data_meta(key,value,updated_at)
VALUES ('d1_writer_config','{"softLimit":50000,"mappingChunk":100,"marketSyncMs":900000}',0)
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
