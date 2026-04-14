"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import { MaintenanceTable } from "@/components/MaintenanceTable";
import { StatCard } from "@/components/StatCard";
import { useLiveUnits } from "@/hooks/useLiveUnits";
import { getMockMaintenanceSchedule } from "@/lib/api";
import { Calendar, AlertTriangle, Clock, CheckCircle2, Wrench, TrendingDown } from "lucide-react";
import { getSeverityConfig, formatCycles, formatDate } from "@/lib/utils";

export default function MaintenancePage() {
  const { units, lastUpdated } = useLiveUnits(6000);
  const rows = getMockMaintenanceSchedule(units);
  const critical = rows.filter((r) => r.severity === "critical");
  const warning = rows.filter((r) => r.severity === "warning");
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const toggle = (id: number) => setCompleted((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar title="Maintenance Schedule"
          subtitle="MILP-optimised work order queue — sorted by RUL urgency and cost priority"
          lastUpdated={lastUpdated} backendOnline={false} />

        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }} className="animate-fade-up">
            <StatCard label="Immediate Actions" value={critical.length} sub="Take offline — RUL &lt; 10 cycles"
              severity={critical.length > 0 ? "critical" : "normal"} icon={<AlertTriangle className="h-5 w-5" />} />
            <StatCard label="Scheduled Soon" value={warning.length} sub="Inspect within 48 hours"
              severity={warning.length > 0 ? "warning" : "normal"} icon={<Clock className="h-5 w-5" />} />
            <StatCard label="Completed" value={completed.size} sub="Marked done this session"
              severity="normal" icon={<CheckCircle2 className="h-5 w-5" />} />
            <StatCard label="Fleet Coverage" value={`${units.length} units`} sub="Engines under monitoring"
              icon={<TrendingDown className="h-5 w-5" />} />
          </div>

          <div className="animate-fade-up delay-100">
            <div className="section-header">
              <div>
                <h2 className="section-title">Work Order Queue</h2>
                <p className="section-subtitle">Click any row to mark as completed · Priority sorted by model-predicted urgency</p>
              </div>
            </div>
            <div style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-default)",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "var(--elevation-1)",
            }}>
              {rows.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center" }}>
                  <CheckCircle2 size={28} style={{ opacity: 0.3, margin: "0 auto 8px", color: "var(--text-tertiary)" }} />
                  <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>No maintenance required</p>
                </div>
              ) : (
                <div>
                  {rows.map((row, idx) => {
                    const cfg = getSeverityConfig(row.severity);
                    const done = completed.has(row.unit_id);
                    const dotBg = row.severity === "critical" ? "var(--color-critical)" : row.severity === "warning" ? "var(--color-warning)" : "var(--color-success)";
                    return (
                      <button key={row.unit_id} onClick={() => toggle(row.unit_id)} className="hover-alert-row"
                        style={{
                          width: "100%", textAlign: "left", padding: "12px 18px",
                          display: "flex", alignItems: "center", gap: 14,
                          border: "none", borderBottom: "1px solid var(--border-subtle)",
                          background: done ? "var(--color-success-bg)" : "transparent", cursor: "pointer",
                          opacity: done ? 0.6 : 1, transition: "all var(--duration-base) ease",
                        }}>
                        <span style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: "var(--surface-tertiary)", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)",
                        }}>{idx + 1}</span>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: dotBg }}
                          className={row.severity === "critical" ? "animate-pulse-ring" : ""} />
                        <span style={{ width: 80, flexShrink: 0, fontWeight: 700, color: "var(--text-primary)", fontSize: 14, fontFamily: "var(--font-jetbrains, monospace)" }}>
                          #{String(row.unit_id).padStart(3, "0")}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, color: "var(--text-secondary)" }}>{row.recommended_action}</span>
                        <span style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 13, fontWeight: 700, color: row.severity === "critical" ? "var(--color-critical)" : row.severity === "warning" ? "var(--color-warning)" : "var(--color-success)", flexShrink: 0 }}>
                          {formatCycles(row.predicted_rul)}
                        </span>
                        <span className={cfg.badgeClass} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, flexShrink: 0 }}>
                          {cfg.shortLabel}
                        </span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 80, textAlign: "right", flexShrink: 0 }}>
                          {formatDate(row.scheduled_at)}
                        </span>
                        {done && <CheckCircle2 size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="animate-fade-up delay-200"><MaintenanceTable rows={rows} /></div>

          <div className="animate-fade-up delay-300" style={{
            padding: "14px 16px", borderRadius: 12,
            background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <Calendar size={16} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--color-primary)" }}>MILP Maintenance Scheduling</p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.6 }}>
                Maintenance windows are optimised using Mixed Integer Linear Programming (MILP via PuLP) to minimise
                fleet downtime while ensuring all critical engines are serviced before predicted failure.
                Preventive cost: <strong>$5,000</strong> vs failure cost: <strong>$50,000</strong> — 10× cost reduction.
              </p>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
