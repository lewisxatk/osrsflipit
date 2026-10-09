-- V54 D1 writer safety settings. Idempotent: safe to apply to an existing database.
INSERT OR IGNORE INTO data_meta(key,value,updated_at) VALUES ('d1_writer_config','{"softLimit":7000,"mappingChunk":150,"marketSyncMs":3600000}',0);
INSERT OR IGNORE INTO data_meta(key,value,updated_at) VALUES ('d1_write_budget','{"day":"","writes":0}',0);
