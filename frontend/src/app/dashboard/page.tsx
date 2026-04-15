"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Activity, Zap, Timer, RefreshCw } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import { EngineCard } from "@/components/EngineCard";
import { AnomalyAlertsPanel } from "@/components/AnomalyAlertsPanel";
import { RULTrendChart } from "@/components/RULTrendChart";
import { MaintenanceTable } from "@/components/MaintenanceTable";
import { StatCard } from "@/components/StatCard";
import { PredictForm } from "@/components/PredictForm";
import { useLiveUnits } from "@/hooks/useLiveUnits";
import { getMockRULTrend, getMockMaintenanceSchedule } from "@/lib/api";
import type { EngineUnit } from "@/types/sentineliq";

type FilterType = "all" | "turbofan" | "compressor" | "cnc";

function timeAgoMins(date: Date | null): string {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export default function DashboardPage() {
  const { units, lastUpdated } = useLiveUnits(5000);
  const [selectedUnit, setSelectedUnit] = useState<EngineUnit | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [trendData, setTrendData] = useState<ReturnType<typeof getMockRULTrend>>([]);
  const [scheduleRows, setScheduleRows] = useState<ReturnType<typeof getMockMaintenanceSchedule>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [timeAgoStr, setTimeAgoStr] = useState("");

  const criticalCount = units.filter((u) => u.severity === "critical").length;
  const warningCount = units.filter((u) => u.severity === "warning").length;
  const normalCount = units.filter((u) => u.severity === "normal").length;
  const avgRUL = units.reduce((s, u) => s + u.predicted_rul, 0) / Math.max(units.length, 1);
  const avgMs = units.reduce((s, u) => s + u.inference_time_ms, 0) / Math.max(units.length, 1);

  const trendUnit = selectedUnit ?? units[0];

  useEffect(() => {
    setScheduleRows(getMockMaintenanceSchedule(units));
  }, [units]);

  useEffect(() => {
    setTrendData(getMockRULTrend(trendUnit?.unit_id ?? 1, units));
  }, [trendUnit?.unit_id, units]);

  // Update "X ago" string every 30s
  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => setTimeAgoStr(timeAgoMins(lastUpdated));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    setScheduleRows(getMockMaintenanceSchedule(units));
  }, [units]);

  // Filter logic (demo — in real app would filter by unit type)
  const displayedUnits = units;

  return (
    <DashboardLayout>
      <div id="main-content" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar
          title="Fleet Overview"
          subtitle={`${units.length} engine units monitored · Real-time RUL tracking`}
          lastUpdated={lastUpdated}
          backendOnline={false}
          onRefresh={handleRefresh}
        />

        <main style={{ flex: 1, overflowY: "auto", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>

          {/* ── KPI Strip ──────────────────────────────────────────── */}
          <section className="animate-fade-up" aria-label="Key performance indicators">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
              <StatCard
                label="Critical Units"
                value={criticalCount}
                sub={criticalCount > 0 ? "Take offline immediately" : "All units operational"}
                severity={criticalCount > 0 ? "critical" : "normal"}
                icon={<AlertTriangle size={20} />}
                trend={criticalCount > 0 ? "up" : "stable"}
                trendText={criticalCount > 0 ? `${criticalCount} require attention` : undefined}
                sparklineData={[1, 2, 1, 3, 2, criticalCount, criticalCount]}
              />
              <StatCard
                label="Warning Units"
                value={warningCount}
                sub={warningCount > 0 ? "Inspect within 48 hours" : "No warnings active"}
                severity={warningCount > 0 ? "warning" : "normal"}
                icon={<Zap size={20} />}
                trend={warningCount > 0 ? "up" : "stable"}
                trendText={warningCount > 0 ? "Elevated degradation" : undefined}
                sparklineData={[3, 4, 3, 5, 4, warningCount + 1, warningCount]}
              />
              <StatCard
                label="Fleet Avg RUL"
                value={`${avgRUL.toFixed(0)} cyc`}
                sub={`${normalCount}/${units.length} units nominal`}
                icon={<Activity size={20} />}
                trend="stable"
                sparklineData={[avgRUL + 8, avgRUL + 4, avgRUL + 6, avgRUL + 2, avgRUL + 3, avgRUL + 1, avgRUL].map(Math.round)}
              />
              <StatCard
                label="Avg Inference"
                value={`${avgMs.toFixed(1)} ms`}
                sub="TCN ensemble · CPU inference"
                icon={<Timer size={20} />}
                trend="stable"
                sparklineData={[avgMs + 2, avgMs - 1, avgMs + 3, avgMs - 2, avgMs + 1, avgMs - 1, avgMs].map(v => Math.max(0, v))}
              />
            </div>
          </section>

          {/* ── Engine Units ───────────────────────────────────────── */}
          <section className="animate-fade-up delay-100" aria-label="Engine units">
            <div className="section-header">
              <div>
                <h2 className="section-title">Engine Units</h2>
                <p className="section-subtitle">
                  {units.length} units monitored · Click any card to inspect RUL trend
                  {timeAgoStr && <> · Updated {timeAgoStr}</>}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {lastUpdated && (
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <RefreshCw size={12} /> {timeAgoStr}
                  </span>
                )}
              </div>
            </div>

            {/* Filter pills */}
            <div className="filter-pills">
              {([
                { key: "all", label: "All Units" },
                { key: "turbofan", label: "Turbofan" },
                { key: "compressor", label: "Compressor" },
                { key: "cnc", label: "CNC" },
              ] as { key: FilterType; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  className={`filter-pill${filter === key ? " filter-pill--active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                  {key === "all" && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 18, height: 18, borderRadius: 99, fontSize: 10, fontWeight: 700,
                      background: filter === key ? "rgba(6,182,212,0.2)" : "var(--surface-tertiary)",
                      color: filter === key ? "var(--accent)" : "var(--text-tertiary)",
                    }}>
                      {units.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Cards grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "1rem" }}>
              {displayedUnits.map((unit) => (
                <EngineCard
                  key={unit.unit_id}
                  unit={unit}
                  onClick={() => setSelectedUnit((prev) => prev?.unit_id === unit.unit_id ? null : unit)}
                />
              ))}
            </div>
            {selectedUnit && (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 10, textAlign: "center" }}>
                Showing RUL trend for Engine #{String(selectedUnit.unit_id).padStart(3, "0")} · Click the card again to deselect
              </p>
            )}
          </section>

          {/* ── Predict Form ───────────────────────────────────────── */}
          <div className="animate-fade-up delay-200">
            <PredictForm />
          </div>

          {/* ── RUL Trend Chart ────────────────────────────────────── */}
          <div className="animate-fade-up delay-300">
            <RULTrendChart data={trendData} unit_id={trendUnit?.unit_id ?? 1} />
          </div>

          {/* ── Anomaly Alerts ─────────────────────────────────────── */}
          <section className="animate-fade-up delay-400" aria-label="Anomaly alerts">
            <div className="section-header">
              <div>
                <h2 className="section-title">Anomaly Alerts</h2>
                <p className="section-subtitle">Real-time sensor deviation monitoring • Updated every 5s</p>
              </div>
            </div>
            <AnomalyAlertsPanel units={units} />
          </section>

          {/* ── Maintenance Schedule ───────────────────────────────── */}
          <section className="animate-fade-up delay-500" style={{ paddingBottom: 8 }} aria-label="Maintenance schedule">
            <div className="section-header">
              <div>
                <h2 className="section-title">Maintenance Schedule</h2>
                <p className="section-subtitle">MILP-optimized work order queue · Sorted by RUL urgency and cost priority</p>
              </div>
            </div>
            <MaintenanceTable rows={scheduleRows} />
          </section>

        </main>
      </div>
    </DashboardLayout>
  );
}
