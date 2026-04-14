// ── SentinelIQ — TypeScript types (mirrors Pydantic response schemas) ──────────

export type Severity = "normal" | "warning" | "critical";

// GET /health
export interface HealthResponse {
  status: "healthy" | "degraded" | "unavailable";
  version: string;
  device: string;
  timestamp: string;
}

// GET /status
export interface ModelStatusResponse {
  models_loaded: Record<string, boolean>;
  feature_count: number;
  feature_cols: string[];
  sequence_length: number;
  rul_cap: number;
}

// POST /predict/rul
export interface RULPredictionResponse {
  unit_id: number;
  predicted_rul: number;
  confidence_interval: { lower: number; upper: number } | null;
  severity: Severity;
  model_used: string;
  inference_time_ms: number;
  timestamp: string;
}

export interface BatchRULResponse {
  results: RULPredictionResponse[];
  total_units: number;
  total_inference_time_ms: number;
}

// POST /predict/anomaly
export interface AnomalyResponse {
  unit_id: number;
  current_cycle: number | null;
  anomaly_score: number;
  isolation_forest_score: number;
  reconstruction_error: number;
  severity: Severity;
  recommendation: string;
  inference_time_ms: number;
  timestamp: string;
}

// ── Dashboard-level derived types ─────────────────────────────────────────────

/** Generated mock for the dashboard when backend is unreachable */
export interface EngineUnit {
  unit_id: number;
  predicted_rul: number;
  severity: Severity;
  anomaly_score: number;
  anomaly_severity: Severity;
  recommendation: string;
  model_used: string;
  inference_time_ms: number;
  timestamp: string;
}

/** One data-point in the RUL sparkline trend */
export interface RULTrendPoint {
  cycle: number;
  rul: number;
  anomaly_score: number;
}

/** Maintenance schedule row */
export interface MaintenanceRow {
  unit_id: number;
  severity: Severity;
  predicted_rul: number;
  recommended_action: string;
  scheduled_at: string;
  priority: number;
}
