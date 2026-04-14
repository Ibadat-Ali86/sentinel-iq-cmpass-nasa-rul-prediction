"use client";

import { useState, useEffect } from "react";
import type { EngineUnit } from "@/types/sentineliq";
import { getMockUnits } from "@/lib/api";
import { useInferenceContext } from "@/context/InferenceContext";

/**
 * Polls mock data every `intervalMs` milliseconds, subtly jittering RUL/scores
 * to simulate live telemetry while the backend is not connected.
 * If an uploaded dataset is available in context, returns that static snapshot safely.
 */
export function useLiveUnits(intervalMs = 5000) {
  const [units, setUnits] = useState<EngineUnit[]>(getMockUnits());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const { uploadedUnits } = useInferenceContext();

  useEffect(() => {
    // If unit tracking relies on static uploaded dataset, skip mock jittering.
    if (uploadedUnits && uploadedUnits.length > 0) {
      setUnits(uploadedUnits);
      setLastUpdated(new Date());
      return;
    }

    const tick = () => {
      setUnits((prev) =>
        prev.map((u) => {
          // tiny rul decay + noise
          const rul = Math.max(0, u.predicted_rul - 0.1 + (Math.random() - 0.5) * 0.3);
          const score = Math.min(1, Math.max(0, u.anomaly_score + (Math.random() - 0.5) * 0.02));
          return { ...u, predicted_rul: parseFloat(rul.toFixed(1)), anomaly_score: parseFloat(score.toFixed(3)), timestamp: new Date().toISOString() };
        })
      );
      setLastUpdated(new Date());
    };

    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, uploadedUnits]);

  return { units, lastUpdated };
}
