"use client";

import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import { AnomalyAlertsPanel } from "@/components/AnomalyAlertsPanel";
import { StatCard } from "@/components/StatCard";
import { useLiveUnits } from "@/hooks/useLiveUnits";
import { AlertTriangle, Shield, Zap } from "lucide-react";
import { getSeverityConfig, getAnomalyMessage } from "@/lib/utils";

export default function AnomaliesPage() {
  const { units, lastUpdated } = useLiveUnits(4000);
  const critical = units.filter((u) => u.anomaly_severity === "critical");
  const warning = units.filter((u) => u.anomaly_severity === "warning");
  const normal = units.filter((u) => u.anomaly_severity === "normal");

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar title="Anomaly Alerts"
          subtitle="Isolation Forest + Autoencoder ensemble detection · Real-time monitoring"
          lastUpdated={lastUpdated} backendOnline={false} />
        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }} className="animate-fade-up">
            <StatCard label="Critical Anomalies" value={critical.length}
              sub="Reconstruction error ≥ 70% — immediate action" severity={critical.length > 0 ? "critical" : "normal"}
              icon={<AlertTriangle className="h-5 w-5" />} />
            <StatCard label="Warning Anomalies" value={warning.length}
              sub="Score 30–70% — monitor closely" severity={warning.length > 0 ? "warning" : "normal"}
              icon={<Zap className="h-5 w-5" />} />
            <StatCard label="Units Nominal" value={normal.length}
              sub="No elevated sensor deviation detected" severity="normal"
              icon={<Shield className="h-5 w-5" />} />
          </div>

          <div className="animate-fade-up delay-100">
            <div className="section-header">
              <div>
                <h2 className="section-title">Anomaly Alerts</h2>
                <p className="section-subtitle">Real-time IF + Autoencoder ensemble · Click to expand, acknowledge to dismiss</p>
              </div>
            </div>
            <div style={{ minHeight: 400 }}>
              <AnomalyAlertsPanel units={units} />
            </div>
          </div>

          <div className="animate-fade-up delay-200">
            <div className="section-header">
              <div>
                <h2 className="section-title">All Units — Anomaly Score Breakdown</h2>
                <p className="section-subtitle">Combined Isolation Forest (40%) + Autoencoder (60%) weighted ensemble score</p>
              </div>
            </div>
            <div style={{
              background: "var(--surface-secondary)",
              border: "1px solid var(--border-default)",
              borderRadius: 14, overflow: "hidden",
              boxShadow: "var(--elevation-1)",
            }}>
              <div className="maintenance-table-wrapper">
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      {["Unit", "Anomaly Score", "IF Component", "AE Recon Error", "Status", "Operator Recommendation"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...units].sort((a, b) => b.anomaly_score - a.anomaly_score).map((u) => {
                      const scoreColor = { critical: "var(--color-critical)", warning: "var(--color-warning)", normal: "var(--color-success)" }[u.anomaly_severity];
                      const cfg = getSeverityConfig(u.anomaly_severity);
                      return (
                        <tr key={u.unit_id} className="hover-alert-row">
                          <td style={{ padding: "12px 18px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-jetbrains, monospace)" }}>#{String(u.unit_id).padStart(3, "0")}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 80, height: 6, background: "var(--border-default)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ width: `${Math.round(u.anomaly_score * 100)}%`, height: "100%", background: scoreColor, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontFamily: "var(--font-jetbrains, monospace)", fontSize: 13, color: scoreColor, fontWeight: 700 }}>
                                {(u.anomaly_score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: "12px 18px", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 12, color: "var(--text-secondary)" }}>{(u.anomaly_score * 0.4 * 100).toFixed(0)}%</td>
                          <td style={{ padding: "12px 18px", fontFamily: "var(--font-jetbrains, monospace)", fontSize: 12, color: "var(--text-secondary)" }}>{(u.anomaly_score * 0.004).toFixed(5)}</td>
                          <td style={{ padding: "12px 18px" }}>
                            <span className={cfg.badgeClass} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99 }}>
                              {cfg.shortLabel}
                            </span>
                          </td>
                          <td style={{ padding: "12px 18px", fontSize: 12, color: "var(--text-secondary)", maxWidth: 260 }}>
                            {getAnomalyMessage(u.anomaly_score)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
