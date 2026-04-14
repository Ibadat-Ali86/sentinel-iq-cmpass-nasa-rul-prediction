"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  ReferenceLine,
} from "recharts";
import { BarChart3, TrendingUp, Info } from "lucide-react";

interface SHAPDataPoint {
  feature: string;
  importance: number;
}

interface SHAPChartProps {
  data: SHAPDataPoint[];
  title?: string;
}

// Gradient palette — cyan → indigo → purple
const GRADIENT_COLORS = [
  "#06b6d4", // #1 ranked
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#9333ea",
  "#7c3aed",
  "#6d28d9",
  "#5b21b6", // #10 ranked
];

function getBarColor(index: number): string {
  return GRADIENT_COLORS[Math.min(index, GRADIENT_COLORS.length - 1)];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: SHAPDataPoint & { rank: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const pct = (d.value * 100).toFixed(1);
  const color = getBarColor(d.payload.rank - 1);

  return (
    <div style={{
      background: "rgba(8,13,28,0.97)",
      border: `1px solid ${color}40`,
      borderRadius: 12,
      padding: "12px 16px",
      boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`,
      backdropFilter: "blur(16px)",
      minWidth: 200,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%",
          background: color, boxShadow: `0 0 8px ${color}`,
        }} />
        <p style={{ fontSize: 12, fontFamily: "monospace", color, fontWeight: 700, letterSpacing: "0.04em" }}>
          {d.payload.feature}
        </p>
        <span style={{
          marginLeft: "auto", fontSize: 10, color: "#64748b",
          background: "rgba(255,255,255,0.06)", borderRadius: 4,
          padding: "1px 6px", fontWeight: 600,
        }}>
          #{d.payload.rank}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
          <p style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>SHAP Value</p>
          <p style={{ fontSize: 16, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{d.value.toFixed(4)}</p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 10px" }}>
          <p style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Rel. Impact</p>
          <p style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>{pct}%</p>
        </div>
      </div>
    </div>
  );
}

interface CustomAxisTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  index?: number;
}

function CustomAxisTick({ x = 0, y = 0, payload, index = 0 }: CustomAxisTickProps) {
  const color = getBarColor(index);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={-8}
        y={0}
        dy={4}
        textAnchor="end"
        fontSize={11}
        fontFamily="'JetBrains Mono', monospace"
        fill={color}
        fontWeight={600}
        letterSpacing="0.02em"
      >
        {payload?.value}
      </text>
    </g>
  );
}

export function SHAPChart({ data, title = "SHAP Feature Importance" }: SHAPChartProps) {
  const sorted = [...data]
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 10)
    .map((d, i) => ({ ...d, rank: i + 1, pct: Math.round(d.importance * 100) }));

  const maxVal = sorted[0]?.importance ?? 1;

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(8,13,28,0.98) 0%, rgba(13,21,45,0.95) 100%)",
      border: "1px solid rgba(6,182,212,0.15)",
      borderRadius: 20,
      padding: "28px 32px",
      boxShadow: "0 32px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(6,182,212,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -60, right: -60,
        width: 240, height: 240,
        background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: -40,
        width: 200, height: 200,
        background: "radial-gradient(circle, rgba(168,85,247,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", marginBottom: 28,
        position: "relative",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(99,102,241,0.15))",
            border: "1px solid rgba(6,182,212,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(6,182,212,0.12)",
          }}>
            <BarChart3 size={20} color="#06b6d4" />
          </div>
          <div>
            <h2 style={{
              fontSize: 16, fontWeight: 800, color: "#f1f5f9",
              letterSpacing: "-0.01em", marginBottom: 3,
            }}>
              {title}
            </h2>
            <p style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
              <TrendingUp size={11} style={{ color: "#10b981" }} />
              Mean absolute SHAP values · TCN DeepExplainer
            </p>
          </div>
        </div>

        {/* Legend pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 99,
            background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#06b6d4" }} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>High Impact</span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 99,
            background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#a855f7" }} />
            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Moderate</span>
          </div>
          <div style={{
            padding: "5px 12px", borderRadius: 99,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
              Top {sorted.length} features
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 400, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 80, left: 12, bottom: 4 }}
            barCategoryGap="18%"
          >
            <defs>
              {sorted.map((_, i) => (
                <linearGradient key={i} id={`bar-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={getBarColor(i)} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={getBarColor(Math.min(i + 2, 9))} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              horizontal={false}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4 4"
            />

            <XAxis
              type="number"
              domain={[0, maxVal * 1.12]}
              tick={{ fill: "#475569", fontSize: 10, fontFamily: "monospace" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
            />

            <YAxis
              type="category"
              dataKey="feature"
              tick={(props) => <CustomAxisTick {...props} />}
              axisLine={false}
              tickLine={false}
              width={88}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.03)", radius: 6 }}
            />

            <ReferenceLine
              x={maxVal * 0.5}
              stroke="rgba(255,255,255,0.06)"
              strokeDasharray="4 4"
            />

            <Bar
              dataKey="importance"
              radius={[0, 6, 6, 0]}
              isAnimationActive
              animationDuration={1200}
              animationEasing="ease-out"
            >
              {sorted.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#bar-grad-${index})`}
                  style={{ filter: `drop-shadow(0 0 6px ${getBarColor(index)}40)` }}
                />
              ))}
              <LabelList
                dataKey="importance"
                position="right"
                style={{
                  fontSize: 11,
                  fontFamily: "monospace",
                  fontWeight: 700,
                  fill: "#94a3b8",
                }}
                formatter={(v: number) => v.toFixed(3)}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer info bar */}
      <div style={{
        marginTop: 24, paddingTop: 20,
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Info size={13} color="#475569" />
          <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>
            SHAP (SHapley Additive exPlanations) quantifies each sensor&apos;s contribution to the model&apos;s RUL predictions.
            Higher values indicate stronger influence on the TCN ensemble output.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {[
            { label: "Model", value: "TCN Ensemble" },
            { label: "Dataset", value: "FD001 + FD003" },
            { label: "Method", value: "DeepExplainer" },
          ].map(({ label, value }) => (
            <div key={label} style={{
              padding: "5px 12px", borderRadius: 8,
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              <span style={{ fontSize: 9, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {label}:{" "}
              </span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
