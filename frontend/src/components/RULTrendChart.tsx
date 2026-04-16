"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import type { RULTrendPoint } from "@/types/sentineliq";
import { TrendingDown } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface RULTrendChartProps {
  data: RULTrendPoint[];
  unit_id: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string | number;
  isDark?: boolean;
}

function CustomTooltip({ active, payload, label, isDark }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: isDark ? "rgba(15,23,42,0.97)" : "rgba(255,255,255,0.97)",
      border: isDark ? "1px solid rgba(148,163,184,0.15)" : "1px solid rgba(15,23,42,0.12)",
      borderRadius: 12,
      padding: "8px 12px",
      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(15,23,42,0.12)",
      minWidth: 140,
    }}>
      <p style={{ fontSize: 10, color: isDark ? "#94a3b8" : "#64748b", marginBottom: 6 }}>Cycle {label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a" }}>
          {p.name === "rul" ? "RUL" : "Anomaly"}:{" "}
          <span style={{ color: p.name === "rul" ? "#06b6d4" : "#f59e0b" }}>
            {p.name === "rul" ? `${p.value} cycles` : `${(p.value * 100).toFixed(0)}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RULTrendChart({ data, unit_id }: RULTrendChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const gridColor = isDark ? "rgba(30,41,59,0.8)" : "rgba(15,23,42,0.08)";
  const tickColor = isDark ? "#475569" : "#94a3b8";

  return (
    <div style={{
      borderRadius: 16,
      background: isDark ? "rgba(13,21,38,0.80)" : "var(--surface-secondary)",
      border: isDark ? "1px solid rgba(148,163,184,0.10)" : "1px solid var(--border-default)",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      boxShadow: "var(--elevation-1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexShrink: 0 }}>
        <TrendingDown size={16} color="#06b6d4" />
        <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
          RUL Trend — Engine #{unit_id.toString().padStart(3, "0")}
        </h2>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text-tertiary)" }}>
            <span style={{ height: 2, width: 16, borderRadius: 99, background: "#06b6d4", display: "inline-block" }} />
            RUL
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--text-tertiary)" }}>
            <span style={{ height: 2, width: 16, borderRadius: 99, background: "#f59e0b", display: "inline-block" }} />
            Anomaly
          </span>
        </div>
      </div>

      <div style={{ height: 192, minHeight: 192 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
            <XAxis
              dataKey="cycle"
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="rul"
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="anomaly"
              orientation="right"
              domain={[0, 1]}
              tick={{ fill: tickColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip isDark={isDark} />} />
            {/* critical RUL threshold */}
            <ReferenceLine yAxisId="rul" y={10} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine yAxisId="rul" y={30} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Area
              yAxisId="rul"
              type="monotone"
              dataKey="rul"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#rulGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4" }}
            />
            <Area
              yAxisId="anomaly"
              type="monotone"
              dataKey="anomaly_score"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#anomGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#f59e0b" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p style={{ marginTop: 8, fontSize: 10, color: "var(--text-tertiary)", textAlign: "center" }}>
        Dashed lines: Warning (30 cycles) · Critical (10 cycles)
      </p>
    </div>
  );
}
