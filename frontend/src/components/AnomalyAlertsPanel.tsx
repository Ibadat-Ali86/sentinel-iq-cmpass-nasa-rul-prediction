"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { EngineUnit } from "@/types/sentineliq";
import { getSensorLabel, getAnomalyLabel, getAnomalyMessage, timeAgo, getSeverityConfig } from "@/lib/utils";

interface AnomalyAlertsPanelProps {
  units: EngineUnit[];
}

type FilterType = "all" | "critical" | "warning";

function AnomalyRow({ unit, acknowledged, onAcknowledge }: {
  unit: EngineUnit;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [acking, setAcking] = useState(false);
  const cfg = getSeverityConfig(unit.anomaly_severity);
  const scoreColor = {
    critical: "var(--color-critical)",
    warning: "var(--color-warning)",
    normal: "var(--color-success)",
  }[unit.anomaly_severity];

  const triggerSensors: Record<number, string[]> = {
    1: ["sensor_9", "sensor_14", "sensor_4"],
    2: ["sensor_4", "sensor_7"],
    3: ["sensor_21", "sensor_3"],
    4: ["sensor_2"],
    5: ["sensor_9", "sensor_14", "sensor_20", "sensor_11"],
    6: ["sensor_11"],
  };
  const sensors = triggerSensors[unit.unit_id] ?? ["sensor_9"];
  const visibleSensors = sensors.slice(0, 3);
  const extraCount = sensors.length - 3;

  const handleAck = () => {
    setAcking(true);
    setTimeout(() => {
      onAcknowledge();
      setAcking(false);
    }, 600);
  };

  return (
    <div
      className="alert-item hover-alert-row"
      style={{ opacity: acknowledged ? 0.55 : 1 }}
      aria-live="polite"
    >
      {/* Left severity stripe */}
      <div className={`alert-severity-stripe alert-severity-stripe--${unit.anomaly_severity}`} />

      {/* Main content */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Severity icon */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: unit.anomaly_severity === "critical"
            ? "var(--color-critical-bg)"
            : unit.anomaly_severity === "warning"
            ? "var(--color-warning-bg)"
            : "var(--color-success-bg)",
          display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
        }} className={unit.anomaly_severity === "critical" ? "animate-critical-ring" : ""}>
          {unit.anomaly_severity === "normal"
            ? <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
            : <AlertTriangle size={14} style={{ color: unit.anomaly_severity === "critical" ? "var(--color-critical)" : "var(--color-warning)" }} />
          }
        </div>

        {/* Content body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              Engine #{String(unit.unit_id).padStart(3, "0")}
            </span>
            <span className={cfg.badgeClass} style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
              {cfg.shortLabel}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
              {timeAgo(unit.timestamp)}
            </span>
            {/* Score pill */}
            <div className="alert-score-pill">
              <span className="alert-score-label">Score</span>
              <span className="alert-score-value" style={{ color: scoreColor }}>
                {(unit.anomaly_score * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Business-language description */}
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6, lineHeight: 1.5 }}>
            {getAnomalyLabel(unit.anomaly_score)}
          </p>

          {/* Sensor tags — capped at 3 */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Sensors:</span>
            {visibleSensors.map((s) => (
              <span key={s} className="sensor-tag">{getSensorLabel(s)}</span>
            ))}
            {extraCount > 0 && (
              <button
                className="sensor-tag sensor-tag--more"
                onClick={() => setExpanded(true)}
                style={{ border: "none", cursor: "pointer" }}
              >
                +{extraCount} more
              </button>
            )}
          </div>

          {/* Expandable details */}
          {expanded && (
            <div className="alert-expanded-details">
              <div className="alert-detail-grid">
                <div className="alert-detail-item">
                  <span className="alert-detail-label">IF Component</span>
                  <span className="alert-detail-value">{(unit.anomaly_score * 37 + 20).toFixed(0)}%</span>
                </div>
                <div className="alert-detail-item">
                  <span className="alert-detail-label">AE Recon Error</span>
                  <span className="alert-detail-value">{(unit.anomaly_score * 0.005 + 0.001).toFixed(5)}</span>
                </div>
                <div className="alert-detail-item">
                  <span className="alert-detail-label">All Sensors</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {sensors.map((s) => (
                      <span key={s} className="sensor-tag">{getSensorLabel(s)}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="alert-recommendation">
                {getAnomalyMessage ? getAnomalyMessage(unit.anomaly_score) : unit.recommendation}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!acknowledged && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
          <button
            className="alert-expand-btn row-action"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            className="alert-ack-btn row-action"
            onClick={handleAck}
            data-loading={String(acking)}
            aria-busy={acking}
          >
            {acking ? (
              <span style={{ display: "inline-block", width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 600ms linear infinite" }} />
            ) : (
              <Check size={12} />
            )}
            {acking ? "Acknowledging..." : "Acknowledge"}
          </button>
        </div>
      )}
    </div>
  );
}

export function AnomalyAlertsPanel({ units }: AnomalyAlertsPanelProps) {
  const [acknowledged, setAcknowledged] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<FilterType>("all");

  const sorted = [...units].sort((a, b) => b.anomaly_score - a.anomaly_score);
  const activeAlerts = sorted.filter((u) => u.anomaly_severity !== "normal");
  const displayed = filter === "all"
    ? sorted
    : sorted.filter((u) => u.anomaly_severity === filter);

  const unacked = activeAlerts.filter((u) => !acknowledged.has(u.unit_id));
  const ack = (id: number) => setAcknowledged((p) => new Set([...p, id]));
  const ackAll = () => setAcknowledged(new Set(activeAlerts.map((u) => u.unit_id)));

  const critCount = sorted.filter((u) => u.anomaly_severity === "critical").length;
  const warnCount = sorted.filter((u) => u.anomaly_severity === "warning").length;

  return (
    <div style={{
      background: "var(--surface-secondary)",
      border: "1px solid var(--border-default)",
      borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      boxShadow: "var(--elevation-1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={15} style={{ color: unacked.length > 0 ? "var(--color-critical)" : "var(--text-tertiary)" }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Anomaly Alerts</span>
          {unacked.length > 0 && (
            <span aria-live="polite" style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: "var(--color-critical-bg)", color: "var(--color-critical)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}>{unacked.length} active</span>
          )}
        </div>
        {unacked.length > 0 && (
          <button onClick={ackAll} style={{
            fontSize: 11, color: "var(--text-tertiary)", background: "none",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            transition: "color var(--duration-fast) ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-tertiary)")}
          >
            <Check size={11} /> Ack all
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 6 }}>
        {([
          { key: "all", label: "All", count: sorted.length },
          { key: "critical", label: "Critical", count: critCount },
          { key: "warning", label: "Warning", count: warnCount },
        ] as { key: FilterType; label: string; count: number }[]).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`filter-pill${filter === key ? " filter-pill--active" : ""}`}
            style={{ fontSize: 12 }}
          >
            {label}
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700,
              background: filter === key ? "rgba(6,182,212,0.18)" : "var(--surface-tertiary)",
              color: filter === key ? "var(--accent)" : "var(--text-tertiary)",
            }}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div style={{ flex: 1, overflowY: "auto" }} role="log" aria-live="polite" aria-label="Anomaly alert feed">
        {displayed.length === 0 ? (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-tertiary)" }}>
            <CheckCircle2 size={28} style={{ opacity: 0.3, margin: "0 auto 10px", display: "block" }} />
            <p style={{ fontSize: 13 }}>No anomalies in this category</p>
          </div>
        ) : (
          displayed.map((unit) => (
            <AnomalyRow
              key={unit.unit_id}
              unit={unit}
              acknowledged={acknowledged.has(unit.unit_id)}
              onAcknowledge={() => ack(unit.unit_id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
