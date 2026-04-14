"use client";

import { useState } from "react";
import { Calendar, AlertTriangle, CheckCircle2, Clock, GripVertical, TrendingDown, Download } from "lucide-react";
import type { MaintenanceRow, Severity } from "@/types/sentineliq";
import { getSeverityConfig } from "@/lib/utils";

interface MaintenanceTableProps {
  rows: MaintenanceRow[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  immediate: <AlertTriangle size={13} style={{ color: "var(--color-critical)", flexShrink: 0 }} />,
  scheduled: <Calendar size={13} style={{ color: "var(--color-warning)", flexShrink: 0 }} />,
  preventive: <CheckCircle2 size={13} style={{ color: "var(--color-success)", flexShrink: 0 }} />,
};

const SEV_ICONS: Record<Severity, React.ElementType> = {
  critical: AlertTriangle,
  warning: Clock,
  normal: CheckCircle2,
};

// Estimated cost map (demo data)
const COST_MAP: Record<number, number> = {
  1: 5000, 2: 4500, 3: 3200, 4: 7500, 5: 2800, 6: 6000,
};
const FAILURE_COST = 50000;

export function MaintenanceTable({ rows }: MaintenanceTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelectedIds(selectedIds.size === rows.length ? new Set() : new Set(rows.map((r) => r.unit_id)));

  const totalPreventive = rows.reduce((s, r) => s + (COST_MAP[r.unit_id] ?? 5000), 0);
  const totalFailure = rows.length * FAILURE_COST;
  const savings = Math.round((1 - totalPreventive / totalFailure) * 100);

  return (
    <div style={{
      background: "var(--surface-secondary)",
      border: "1px solid var(--border-default)",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "var(--elevation-1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--border-default)",
        display: "flex", alignItems: "center", gap: 10, background: "var(--surface-tertiary)",
      }}>
        <Calendar size={16} style={{ color: "var(--accent)" }} />
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
            Maintenance Schedule
          </h2>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 }}>
            MILP-optimized work order queue — sorted by RUL urgency
          </p>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 11, color: "var(--text-tertiary)",
          padding: "3px 10px", borderRadius: 99,
          background: "var(--surface-overlay)", border: "1px solid var(--border-subtle)",
        }}>
          {rows.length} actions pending
        </span>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="maint-bulk-actions">
          <span className="maint-bulk-count">{selectedIds.size} selected</span>
          <div className="maint-bulk-buttons">
            <button className="btn btn--sm" style={{
              background: "rgba(255,255,255,0.12)", color: "white",
              borderColor: "rgba(255,255,255,0.25)",
            }}>
              <Calendar size={13} /> Reschedule
            </button>
            <button className="btn btn--sm" style={{
              background: "rgba(255,255,255,0.12)", color: "white",
              borderColor: "rgba(255,255,255,0.25)",
            }}>
              <Download size={13} /> Export CSV
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem", color: "var(--text-tertiary)" }}>
          <CheckCircle2 size={32} style={{ opacity: 0.25, marginBottom: 10 }} />
          <p style={{ fontSize: 13 }}>No maintenance required</p>
        </div>
      ) : (
        <>
          <div className="maintenance-table-wrapper">
            <table className="maintenance-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === rows.length}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                      style={{ cursor: "pointer", accentColor: "var(--color-primary)" }}
                    />
                  </th>
                  <th>Priority</th>
                  <th>Unit ID</th>
                  <th>RUL</th>
                  <th>Severity</th>
                  <th>Action</th>
                  <th>Scheduled</th>
                  <th>Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cfg = getSeverityConfig(row.severity);
                  const Icon = SEV_ICONS[row.severity];
                  const date = new Date(row.scheduled_at);
                  const isSelected = selectedIds.has(row.unit_id);
                  const cost = COST_MAP[row.unit_id] ?? 5000;
                  const saved = FAILURE_COST - cost;
                  const isCrit = row.severity === "critical";
                  const isWarn = row.severity === "warning";

                  return (
                    <tr
                      key={row.unit_id}
                      className={`${isCrit ? "maint-row--critical" : isWarn ? "maint-row--warning" : ""} ${isSelected ? "maint-row--selected" : ""}`}
                    >
                      <td style={{ width: 48 }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.unit_id)}
                          aria-label={`Select engine ${row.unit_id}`}
                          style={{ cursor: "pointer", accentColor: "var(--color-primary)" }}
                        />
                      </td>
                      <td>
                        <div className="priority-badge" title="Drag to reorder">
                          <GripVertical size={12} style={{ color: "var(--text-tertiary)" }} />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginLeft: 4 }}>
                            {row.priority}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          fontFamily: "var(--font-jetbrains, monospace)",
                          fontWeight: 700, color: "var(--color-primary)",
                          fontSize: 13,
                        }}>
                          #{row.unit_id.toString().padStart(3, "0")}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          fontVariantNumeric: "tabular-nums", fontWeight: 700,
                          color: isCrit ? "var(--color-critical)" : isWarn ? "var(--color-warning)" : "var(--text-primary)",
                          fontSize: 14,
                        }}>
                          {Math.round(row.predicted_rul)} cycles
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 700,
                            textTransform: "uppercase", letterSpacing: "0.06em",
                          }}
                          className={cfg.badgeClass}
                        >
                          <Icon size={11} />
                          {row.severity}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          {isCrit
                            ? ACTION_ICONS.immediate
                            : isWarn
                            ? ACTION_ICONS.scheduled
                            : ACTION_ICONS.preventive}
                          <span style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                            {row.recommended_action}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--text-secondary)" }}>
                          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            ${cost.toLocaleString()}
                          </span>
                          <span className="cost-savings-text">
                            Saves ${saved.toLocaleString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cost summary footer */}
          <div className="cost-summary">
            <div className="cost-summary__item">
              <span className="cost-summary__label">Total Preventive Cost</span>
              <span className="cost-summary__value cost-summary__value--preventive">
                ${totalPreventive.toLocaleString()}
              </span>
            </div>
            <span className="cost-summary__vs">vs</span>
            <div className="cost-summary__item">
              <span className="cost-summary__label">Failure Cost (reactive)</span>
              <span className="cost-summary__value cost-summary__value--failure">
                ${totalFailure.toLocaleString()}
              </span>
            </div>
            <div className="cost-summary__savings">
              <TrendingDown size={16} />
              <span>{savings}% cost reduction</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
