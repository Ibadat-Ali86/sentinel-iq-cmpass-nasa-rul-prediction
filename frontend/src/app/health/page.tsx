"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import { StatCard } from "@/components/StatCard";
import { useLiveUnits } from "@/hooks/useLiveUnits";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  Activity, Cpu, Database, Server, Zap, CheckCircle2, XCircle,
  Clock, MemoryStick, HardDrive, Thermometer, Wifi, TrendingDown,
} from "lucide-react";

interface SystemMetric {
  label: string;
  value: string;
  sub?: string;
  status: "ok" | "warn" | "down";
}

function useMockHealth(): SystemMetric[] {
  const [uptime, setUptime] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setUptime((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };
  return [
    { label: "FastAPI ML Server", value: "Demo Mode", sub: "Backend not connected — /health returning mock data", status: "warn" },
    { label: "PostgreSQL Database", value: "Offline", sub: "DATABASE_URL environment variable not set", status: "warn" },
    { label: "TCN RUL Model", value: "Loaded ✓", sub: "FD001 + FD003 datasets · 30-step sequences", status: "ok" },
    { label: "LSTM Autoencoder", value: "Loaded ✓", sub: "Reconstruction error anomaly detection", status: "ok" },
    { label: "Isolation Forest", value: "Loaded ✓", sub: "Statistical outlier detection · 14 sensors", status: "ok" },
    { label: "Session Uptime", value: fmt(uptime), sub: "Time since dashboard loaded", status: "ok" },
  ];
}

const STATUS_ICON = { ok: CheckCircle2, warn: Clock, down: XCircle };
const STATUS_COLOR = { ok: "var(--success)", warn: "var(--warning)", down: "var(--critical)" };

function ServiceRow({ m }: { m: SystemMetric }) {
  const Icon = STATUS_ICON[m.status];
  return (
    <div className="hover-alert-row" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLOR[m.status], flexShrink: 0 }}
        className={m.status !== "ok" ? "animate-pulse-ring" : ""} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.label}</p>
        {m.sub && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{m.sub}</p>}
      </div>
      <p style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: STATUS_COLOR[m.status] }}>{m.value}</p>
      <Icon size={16} style={{ color: STATUS_COLOR[m.status], flexShrink: 0 }} />
    </div>
  );
}

export default function HealthPage() {
  const { units, lastUpdated } = useLiveUnits(5000);
  const metrics = useMockHealth();
  const okCount = metrics.filter((m) => m.status === "ok").length;
  const warnCount = metrics.filter((m) => m.status === "warn").length;
  const downCount = metrics.filter((m) => m.status === "down").length;
  const avgRUL = units.reduce((s, u) => s + u.predicted_rul, 0) / Math.max(units.length, 1);
  const avgInference = units.reduce((s, u) => s + u.inference_time_ms, 0) / Math.max(units.length, 1);
  const critical = units.filter((u) => u.severity === "critical").length;

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar title="System Health"
          subtitle="Backend services, model status, and fleet telemetry — real-time"
          lastUpdated={lastUpdated} backendOnline={false} />

        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }} className="animate-fade-up">
            <StatCard label="Services Online" value={okCount}
              sub={`${warnCount} degraded, ${downCount} offline`}
              severity={downCount > 0 ? "critical" : warnCount > 0 ? "warning" : "normal"} icon={<Activity className="h-5 w-5" />} />
            <StatCard label="Fleet Avg RUL" value={`${avgRUL.toFixed(0)} cycles`}
              sub={`${units.length} units monitored`} icon={<Zap className="h-5 w-5" />} />
            <StatCard label="Inference Latency" value={`${avgInference.toFixed(1)} ms`}
              sub="TCN forward pass · CPU" severity="normal" icon={<Cpu className="h-5 w-5" />} />
            <StatCard label="Critical Engines" value={critical}
              sub={critical > 0 ? "Require immediate action" : "Fleet fully operational"}
              severity={critical > 0 ? "critical" : "normal"} icon={<Thermometer className="h-5 w-5" />} />
          </div>

          {/* V2.0 Spec: RUL Trajectory Chart — 350px height */}
          <div className="animate-fade-up delay-50" style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--elevation-1)",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
              <TrendingDown size={16} style={{ color: "var(--accent)" }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Fleet RUL Trajectory</p>
                <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 1 }}>7-day degradation forecast · all monitored engines</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                {[["#ef4444","Critical"],["#f59e0b","Warning"],["#06b6d4","Healthy"]].map(([color,label]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-tertiary)" }}>
                    <div style={{ width: 8, height: 3, borderRadius: 99, background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
            {/* V2.0 Spec: 350px chart height */}
            <div style={{ height: 350, padding: "16px 8px 8px" }} role="img" aria-label="Fleet RUL trajectory over 7 days">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={Array.from({ length: 30 }, (_, i) => ({
                    day: `D${i+1}`,
                    avg: Math.max(10, 80 - i * 2.2 + Math.sin(i * 0.5) * 5),
                    min: Math.max(5, 35 - i * 1.8 + Math.cos(i * 0.4) * 3),
                    max: Math.min(125, 115 - i * 1.2 + Math.sin(i * 0.3) * 4),
                  }))}
                  margin={{ top: 4, right: 20, bottom: 4, left: 10 }}
                >
                  <defs>
                    <linearGradient id="rul-area-max" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="rul-area-avg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="rul-area-min" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 4" stroke="var(--border-subtle)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                    axisLine={false} tickLine={false} width={36}
                    tickFormatter={(v: number) => `${v}c`}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-overlay)", border: "1px solid var(--border-default)", borderRadius: 10, fontSize: 12 }}
                    formatter={(v: number, name: string) => [`${v.toFixed(1)} cycles`, name === "avg" ? "Fleet Avg" : name === "min" ? "Min RUL" : "Max RUL"]}
                    labelFormatter={(l: string) => `Day ${l.replace("D","")}`}
                  />
                  <Area type="monotone" dataKey="max" stroke="#06b6d4" strokeWidth={1.5} fill="url(#rul-area-max)" dot={false} isAnimationActive animationDuration={1200} />
                  <Area type="monotone" dataKey="avg" stroke="#06b6d4" strokeWidth={2.5} fill="url(#rul-area-avg)" dot={false} isAnimationActive animationDuration={1200} animationBegin={200} />
                  <Area type="monotone" dataKey="min" stroke="#ef4444" strokeWidth={1.5} fill="url(#rul-area-min)" dot={false} isAnimationActive animationDuration={1200} animationBegin={400} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="animate-fade-up delay-100" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Server size={16} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Service Status</h2>
                <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  Demo Mode
                </span>
              </div>
              {metrics.map((m) => <ServiceRow key={m.label} m={m} />)}
            </div>

            <div className="animate-fade-up delay-200" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
                <Database size={16} style={{ color: "var(--accent)" }} />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Configuration</h2>
              </div>
              <div style={{ padding: "1rem 18px", display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { key: "NEXT_PUBLIC_ML_SERVER_URL", value: "http://localhost:8000", set: true },
                  { key: "DATABASE_URL", value: "not configured", set: false },
                  { key: "RUL_CAP", value: "125 cycles", set: true },
                  { key: "SEQ_LENGTH", value: "30 time-steps", set: true },
                  { key: "NODE_ENV", value: "development", set: true },
                ].map(({ key, value, set }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <code style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)" }}>{key}</code>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: set ? "var(--text)" : "var(--text-subtle)", fontStyle: set ? "normal" : "italic" }}>{value}</span>
                      {set ? <CheckCircle2 size={13} style={{ color: "var(--success)" }} /> : <XCircle size={13} style={{ color: "var(--text-subtle)" }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }} className="animate-fade-up delay-300">
            {[
              { name: "TCN RUL Predictor", desc: "Temporal Convolutional Network on NASA C-MAPSS FD001+FD003. 30-step sequence → scalar RUL. Cap: 125 cycles. RMSE ≤ 13 cycles.", icon: <Cpu size={20} />, color: "#06b6d4" },
              { name: "LSTM Autoencoder", desc: "Unsupervised anomaly detection via reconstruction error. Trained on healthy-only sequences. Threshold: 95th percentile of training loss.", icon: <MemoryStick size={20} />, color: "#3b82f6" },
              { name: "Isolation Forest", desc: "Statistical outlier detection on 14 sensor channels. Combined with Autoencoder (40/60 weighted) for robust severity classification.", icon: <HardDrive size={20} />, color: "#a855f7" },
            ].map((m) => (
              <div key={m.name} className="hover-stat-card" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "1.25rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${m.color}15`, border: `1px solid ${m.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: m.color, marginBottom: 12 }} className="stat-icon">{m.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{m.name}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--success)" }} />
                  <span style={{ fontSize: 11, color: "var(--success)", fontWeight: 600 }}>Loaded & Operational</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{m.desc}</p>
              </div>
            ))}
          </div>

          <div className="animate-fade-up delay-400" style={{ padding: "14px 16px", borderRadius: 12, background: "var(--bg-card-2)", border: "1px solid var(--border)", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <Wifi size={16} style={{ color: "var(--text-subtle)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Connect to Live FastAPI Backend</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Set <code style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)" }}>NEXT_PUBLIC_ML_SERVER_URL</code> in{" "}
                <code style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)" }}>.env.local</code> and restart. Run: {" "}
                <code style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)" }}>uvicorn ml_server.main:app --host 0.0.0.0 --port 8000</code>
              </p>
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
