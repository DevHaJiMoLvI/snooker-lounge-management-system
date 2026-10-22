CREATE TABLE IF NOT EXISTS crm_records (
  collection TEXT NOT NULL,
  record_id TEXT NOT NULL,
  location_id TEXT NOT NULL DEFAULT 'main',
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, record_id)
);
CREATE INDEX IF NOT EXISTS crm_records_location_idx ON crm_records (location_id);

