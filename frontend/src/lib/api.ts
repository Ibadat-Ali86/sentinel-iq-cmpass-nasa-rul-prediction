/**
 * SentinelIQ — API client
 * Thin wrapper around the FastAPI ml_server endpoints.
 * Falls back to realistic mock data when the backend is unreachable.
 */

import type {
  HealthResponse,
  ModelStatusResponse,
  RULPredictionResponse,
  AnomalyResponse,
  EngineUnit,
  RULTrendPoint,
  MaintenanceRow,
  Severity,
} from "@/types/sentineliq";

const BASE_URL =
  process.env.NEXT_PUBLIC_ML_SERVER_URL ?? "http://localhost:8000";

// ── low-level fetch helper ────────────────────────────────────────────────────

/**
 * Custom fetch wrapper with 8-second timeout.
 * Vercel Hobby tier drops connections after 10s. By aborting at 8s,
 * we can elegantly catch the timeout and return a mock/custom error to the UI
 * indicating that the Hugging Face space is waking from sleep.
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
      signal: controller.signal,
    });
    
    clearTimeout(id);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("503 Waking Up Hugging Face Space. Please retry in 1 minute.");
    }
    throw error;
  }
}

// ── public API ────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}

export async function fetchStatus(): Promise<ModelStatusResponse> {
  return apiFetch<ModelStatusResponse>("/status");
}

export async function predictRUL(
  unit_id: number,
  sequence: number[][]
): Promise<RULPredictionResponse> {
  return apiFetch<RULPredictionResponse>("/predict/rul", {
    method: "POST",
    body: JSON.stringify({
      unit_id,
      sequence: sequence.map((sv) => ({ sensor_values: sv })),
    }),
  });
}

export async function predictAnomaly(
  unit_id: number,
  sensor_values: number[],
  current_cycle?: number
): Promise<AnomalyResponse> {
  return apiFetch<AnomalyResponse>("/predict/anomaly", {
    method: "POST",
    body: JSON.stringify({ unit_id, sensor_values, current_cycle }),
  });
}

// ── mock data (backend unreachable) ──────────────────────────────────────────

const MOCK_UNITS: EngineUnit[] = [
  {
    unit_id: 1,
    predicted_rul: 8.4,
    severity: "critical",
    anomaly_score: 0.81,
    anomaly_severity: "critical",
    recommendation:
      "Immediate maintenance required. Sensor 9 and Sensor 14 show critical degradation.",
    model_used: "TCN",
    inference_time_ms: 14.3,
    timestamp: new Date(Date.now() - 12000).toISOString(),
  },
  {
    unit_id: 2,
    predicted_rul: 22.7,
    severity: "warning",
    anomaly_score: 0.47,
    anomaly_severity: "warning",
    recommendation:
      "Schedule inspection within next 48 hours. Monitor sensor_4 and sensor_7.",
    model_used: "TCN",
    inference_time_ms: 11.1,
    timestamp: new Date(Date.now() - 24000).toISOString(),
  },
  {
    unit_id: 3,
    predicted_rul: 67.2,
    severity: "normal",
    anomaly_score: 0.12,
    anomaly_severity: "normal",
    recommendation: "Normal operation. No action required.",
    model_used: "TCN",
    inference_time_ms: 10.7,
    timestamp: new Date(Date.now() - 36000).toISOString(),
  },
  {
    unit_id: 4,
    predicted_rul: 41.9,
    severity: "normal",
    anomaly_score: 0.22,
    anomaly_severity: "normal",
    recommendation: "Normal operation. No action required.",
    model_used: "TCN",
    inference_time_ms: 12.9,
    timestamp: new Date(Date.now() - 6000).toISOString(),
  },
  {
    unit_id: 5,
    predicted_rul: 5.1,
    severity: "critical",
    anomaly_score: 0.93,
    anomaly_severity: "critical",
    recommendation:
      "CRITICAL: Take offline immediately. Autoencoder reconstruction error exceeds threshold.",
    model_used: "TCN",
    inference_time_ms: 13.5,
    timestamp: new Date(Date.now() - 5000).toISOString(),
  },
  {
    unit_id: 6,
    predicted_rul: 28.3,
    severity: "warning",
    anomaly_score: 0.38,
    anomaly_severity: "warning",
    recommendation:
      "Elevated vibration detected. Lubrication check recommended.",
    model_used: "TCN",
    inference_time_ms: 11.8,
    timestamp: new Date(Date.now() - 18000).toISOString(),
  },
];

const SHAP_FEATURES = [
  "sensor_9",
  "sensor_14",
  "sensor_4",
  "sensor_11",
  "sensor_7",
  "sensor_12",
  "sensor_2",
  "sensor_15",
  "sensor_17",
  "sensor_20",
];

export function getMockUnits(): EngineUnit[] {
  return MOCK_UNITS;
}

/** Simulated 30-cycle trend for a single unit (shows degradation curve) */
export function getMockRULTrend(unit_id: number, activeUnits: EngineUnit[] = MOCK_UNITS): RULTrendPoint[] {
  const base = activeUnits.find((u) => u.unit_id === unit_id);
  const startRUL = (base?.predicted_rul ?? 50) + 30;
  return Array.from({ length: 30 }, (_, i) => {
    const decay = Math.max(0, startRUL - i * (startRUL / 30) + (Math.random() - 0.5) * 4);
    const anomaly = Math.min(
      1,
      Math.max(0, 0.05 + i * 0.025 + (Math.random() - 0.5) * 0.05)
    );
    return { cycle: i + 1, rul: parseFloat(decay.toFixed(1)), anomaly_score: parseFloat(anomaly.toFixed(3)) };
  });
}

/** Mock SHAP feature importances */
export function getMockSHAPData() {
  return SHAP_FEATURES.map((name, i) => ({
    feature: name,
    importance: parseFloat((0.95 - i * 0.08 + (Math.random() - 0.5) * 0.06).toFixed(3)),
  })).sort((a, b) => b.importance - a.importance);
}

/** Mock maintenance schedule */
export function getMockMaintenanceSchedule(activeUnits: EngineUnit[] = MOCK_UNITS): MaintenanceRow[] {
  const priorityMap: Record<Severity, number> = { critical: 1, warning: 2, normal: 3 };
  return activeUnits.filter((u) => u.severity !== "normal")
    .sort((a, b) => a.predicted_rul - b.predicted_rul)
    .map((u, i) => ({
      unit_id: u.unit_id,
      severity: u.severity,
      predicted_rul: u.predicted_rul,
      recommended_action: u.recommendation || (u.severity === "critical"
          ? "Immediate overhaul"
          : "Scheduled inspection + parts check"),
      scheduled_at: new Date(Date.now() + i * 86_400_000 * 1.2).toISOString(),
      priority: priorityMap[u.severity] + i,
    }));
}
