"use client";

import { AlertCircle, CheckCircle2, Zap, Gauge, ArrowRight } from "lucide-react";
import type { EngineUnit } from "@/types/sentineliq";
import { getSeverityConfig, getAnomalyLabel, formatCycles, timeAgo } from "@/lib/utils";

interface EngineCardProps {
  unit: EngineUnit;
  onClick?: () => void;
}

function RULRing({ rul, severity }: { rul: number; severity: "normal" | "warning" | "critical" }) {
  const pct = Math.min(100, Math.max(0, (rul / 125) * 100));
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (pct / 100) * circ;
  const colour = { critical: "#ef4444", warning: "#f59e0b", normal: "#10b981" }[severity];
  const trackColor = severity === "critical"
    ? "rgba(239,68,68,0.15)"
    : severity === "warning"
    ? "rgba(245,158,11,0.12)"
    : "var(--border-default)";

  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 88 88" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="44" cy="44" r={radius} fill="none" stroke={trackColor} strokeWidth="8" />
        <circle
          cx="44" cy="44" r={radius} fill="none"
          stroke={colour} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${colour}60)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center", flexDirection: "column",
      }}>
        <p style={{ fontSize: 19, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
          {Math.round(rul)}
        </p>
        <p style={{ fontSize: 9, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
          cycles
        </p>
      </div>
    </div>
  );
}

const SeverityIcon = {
  critical: AlertCircle,
  warning: Zap,
  normal: CheckCircle2,
};

export function EngineCard({ unit, onClick }: EngineCardProps) {
  const cfg = getSeverityConfig(unit.severity);
  const Icon = SeverityIcon[unit.severity];
  const anomalyLabel = getAnomalyLabel(unit.anomaly_score);
  const scoreColor = {
    critical: "var(--color-critical)",
    warning: "var(--color-warning)",
    normal: "var(--color-success)",
  }[unit.anomaly_severity];

  const cardBorder = unit.severity === "critical"
    ? "1px solid rgba(239,68,68,0.35)"
    : unit.severity === "warning"
    ? "1px solid rgba(245,158,11,0.28)"
    : "1px solid var(--border-default)";

  const cardBg = unit.severity === "critical"
    ? "linear-gradient(160deg, rgba(239,68,68,0.06) 0%, var(--surface-secondary) 40%)"
    : unit.severity === "warning"
    ? "linear-gradient(160deg, rgba(245,158,11,0.05) 0%, var(--surface-secondary) 40%)"
    : "var(--surface-secondary)";

  return (
    <button
      onClick={onClick}
      className="hover-card"
      aria-label={`Engine unit ${String(unit.unit_id).padStart(3, "0")}, ${Math.round(unit.predicted_rul)} cycles remaining, ${unit.severity} severity. Click to view RUL trend.`}
      style={{
        textAlign: "left", width: "100%", borderRadius: 14, padding: "18px 18px 16px",
        background: cardBg,
        border: cardBorder,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        boxShadow: unit.severity === "critical"
          ? "0 0 0 1px rgba(239,68,68,0.08), var(--elevation-1)"
          : "var(--elevation-1)",
      }}
    >
      {/* Critical pulse ring on card perimeter */}
      {unit.severity === "critical" && (
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, pointerEvents: "none" }}
          className="animate-critical-ring" />
      )}

      {/* Header: Engine ID + Status Badge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <p style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em",
            color: "var(--text-tertiary)", fontWeight: 600, marginBottom: 2,
          }}>
            Engine Unit
          </p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            #{String(unit.unit_id).padStart(3, "0")}
          </p>
        </div>
        <span className={cfg.badgeClass} style={{
          display: "flex", alignItems: "center", gap: 5,
          borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0,
        }}>
          {unit.severity === "critical" && (
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--critical)" }}
              className="animate-pulse-ring" />
          )}
          <Icon size={11} />
          {cfg.shortLabel}
        </span>
      </div>

      {/* RUL Hero Value — large prominent number */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 2 }}>
        <RULRing rul={unit.predicted_rul} severity={unit.severity} />
        <div style={{ flex: 1 }}>
          {/* Large RUL display */}
          <div className={
            unit.severity === "critical"
              ? "engine-card-rul engine-card-rul--critical"
              : unit.severity === "warning"
              ? "engine-card-rul engine-card-rul--warning"
              : "engine-card-rul"
          }>
            {Math.round(unit.predicted_rul)}
          </div>
          <div className="engine-card-rul-unit">cycles remaining</div>

          {/* Model + latency */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <Gauge size={11} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{unit.model_used}</span>
            <span style={{ color: "var(--border-default)" }}>·</span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
              {unit.inference_time_ms.toFixed(1)} ms
            </span>
          </div>
        </div>
      </div>

      {/* Anomaly Score — elevated section */}
      <div className="engine-card-anomaly-section">
        <div>
          <div className="engine-card-anomaly-label">Anomaly Score</div>
          <div style={{ marginTop: 6, height: 4, borderRadius: 99, background: "var(--border-muted)", overflow: "hidden", width: 80 }}>
            <div style={{
              height: "100%", borderRadius: 99, background: scoreColor,
              width: `${Math.round(unit.anomaly_score * 100)}%`,
              transition: "width 0.9s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
        </div>
        <div className="engine-card-anomaly-value" style={{ color: scoreColor }}>
          {(unit.anomaly_score * 100).toFixed(0)}%
        </div>
      </div>

      {/* Anomaly business-language label */}
      <div style={{
        padding: "8px 10px", borderRadius: 8, marginTop: 10,
        background: unit.anomaly_score >= 0.7
          ? "var(--color-critical-bg)"
          : unit.anomaly_score >= 0.3 ? "var(--color-warning-bg)" : "var(--color-success-bg)",
        border: `1px solid ${unit.anomaly_score >= 0.7
          ? "rgba(239,68,68,0.2)"
          : unit.anomaly_score >= 0.3 ? "rgba(245,158,11,0.2)" : "rgba(34,197,94,0.2)"}`,
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, lineHeight: 1.4,
          color: unit.anomaly_score >= 0.7
            ? "var(--color-critical)"
            : unit.anomaly_score >= 0.3 ? "var(--color-warning)" : "var(--color-success)",
        }}>
          {anomalyLabel}
        </p>
      </div>

      {/* Footer: timestamp + navigation arrow */}
      <div className="engine-card-footer">
        <span className="engine-card-footer-ts">Updated {timeAgo(unit.timestamp)}</span>
        <ArrowRight
          size={16}
          className="engine-card-arrow"
          style={{ color: "var(--text-tertiary)" }}
        />
      </div>
    </button>
  );
}
