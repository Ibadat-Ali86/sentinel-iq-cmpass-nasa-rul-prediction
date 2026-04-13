-- =============================================================================
-- SentinelIQ — PostgreSQL Schema (Supabase-compatible, Postgres 15+)
-- =============================================================================
-- Apply with:
--   psql $DATABASE_URL -f db/schema.sql
-- OR paste into Supabase → SQL Editor
-- =============================================================================

-- Extension: updated_at trigger helper
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. unit_metadata — Engine fleet registry
-- =============================================================================

CREATE TABLE IF NOT EXISTS unit_metadata (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         INTEGER     NOT NULL UNIQUE,               -- CMAPSS unit number
    dataset         VARCHAR(10) NOT NULL DEFAULT 'FD001',      -- FD001..FD004
    description     TEXT,
    commissioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unit_metadata_dataset_chk CHECK (dataset IN ('FD001','FD002','FD003','FD004'))
);

COMMENT ON TABLE  unit_metadata                IS 'Engine fleet registry — one row per turbofan unit.';
COMMENT ON COLUMN unit_metadata.unit_id        IS 'CMAPSS unit identifier (1-based integer).';
COMMENT ON COLUMN unit_metadata.dataset        IS 'NASA CMAPSS sub-dataset the unit belongs to.';

CREATE INDEX IF NOT EXISTS idx_unit_metadata_unit_id  ON unit_metadata (unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_metadata_dataset  ON unit_metadata (dataset);


-- =============================================================================
-- 2. prediction_logs — One row per /predict/rul call
-- =============================================================================

CREATE TABLE IF NOT EXISTS prediction_logs (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id             INTEGER     NOT NULL,
    dataset             VARCHAR(10) NOT NULL DEFAULT 'FD001',
    predicted_rul       REAL        NOT NULL,
    severity            VARCHAR(10) NOT NULL,                  -- critical | warning | normal
    model_used          VARCHAR(20) NOT NULL DEFAULT 'TCN',
    inference_time_ms   REAL,
    sequence_length     INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT prediction_logs_severity_chk  CHECK (severity  IN ('critical','warning','normal')),
    CONSTRAINT prediction_logs_rul_positive  CHECK (predicted_rul >= 0),
    CONSTRAINT prediction_logs_unit_fk       FOREIGN KEY (unit_id)
        REFERENCES unit_metadata (unit_id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  prediction_logs                     IS 'Audit log of every RUL prediction made via /predict/rul.';
COMMENT ON COLUMN prediction_logs.predicted_rul       IS 'Predicted Remaining Useful Life in operational cycles.';
COMMENT ON COLUMN prediction_logs.severity            IS 'Derived risk label: critical (≤10), warning (≤30), normal (>30).';
COMMENT ON COLUMN prediction_logs.inference_time_ms   IS 'Model inference wall-clock time in milliseconds.';

CREATE INDEX IF NOT EXISTS idx_pred_logs_unit_id   ON prediction_logs (unit_id);
CREATE INDEX IF NOT EXISTS idx_pred_logs_created   ON prediction_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pred_logs_severity  ON prediction_logs (severity);
CREATE INDEX IF NOT EXISTS idx_pred_logs_unit_time ON prediction_logs (unit_id, created_at DESC);


-- =============================================================================
-- 3. anomaly_events — One row per /predict/anomaly call
-- =============================================================================

CREATE TABLE IF NOT EXISTS anomaly_events (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id                 INTEGER,                           -- nullable: caller may not supply
    anomaly_score           REAL        NOT NULL,
    isolation_forest_score  REAL,
    reconstruction_error    REAL,
    severity                VARCHAR(10) NOT NULL,
    is_anomaly              BOOLEAN     NOT NULL GENERATED ALWAYS AS (anomaly_score > 0.5) STORED,
    recommendation          TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT anomaly_events_severity_chk CHECK (severity IN ('critical','warning','normal'))
);

COMMENT ON TABLE  anomaly_events                          IS 'Log of every anomaly detection call via /predict/anomaly.';
COMMENT ON COLUMN anomaly_events.anomaly_score            IS 'Composite anomaly score in [0, 1].';
COMMENT ON COLUMN anomaly_events.isolation_forest_score   IS 'Isolation Forest component score.';
COMMENT ON COLUMN anomaly_events.reconstruction_error     IS 'Autoencoder reconstruction MSE component.';
COMMENT ON COLUMN anomaly_events.is_anomaly               IS 'Computed column: true when anomaly_score > 0.5.';

CREATE INDEX IF NOT EXISTS idx_anomaly_unit_id    ON anomaly_events (unit_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_created    ON anomaly_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_is_anomaly ON anomaly_events (is_anomaly);


-- =============================================================================
-- 4. updated_at auto-update trigger (unit_metadata only)
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unit_metadata_updated_at ON unit_metadata;
CREATE TRIGGER trg_unit_metadata_updated_at
    BEFORE UPDATE ON unit_metadata
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- 5. Supabase Row Level Security (RLS) — safe defaults
--    Enable per table, then add your own policies via Supabase dashboard.
-- =============================================================================

ALTER TABLE unit_metadata    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prediction_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_events   ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (Supabase service key always bypasses RLS)
-- Add JWT-based user policies in the Supabase dashboard as needed.
