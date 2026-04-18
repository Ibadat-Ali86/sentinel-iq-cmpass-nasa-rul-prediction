"use client";

import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { getSeverityConfig } from "@/lib/utils";
import type { Severity } from "@/types/sentineliq";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  severity?: Severity;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  trendText?: string;
  /** V2.0 Spec: 7-day sparkline data array (values only) */
  sparklineData?: number[];
}

export function StatCard({
  label, value, sub, severity = "normal",
  icon, trend, trendText, sparklineData,
}: StatCardProps) {
  const cfg = getSeverityConfig(severity);
  const [displayed, setDisplayed] = useState<string | number>(typeof value === "number" ? 0 : value);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (typeof value !== "number" || animatedRef.current) {
      setDisplayed(value);
      return;
    }
    animatedRef.current = true;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * (value as number)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const isCritical = severity === "critical";
  const isWarning  = severity === "warning";

  const cardBg = isCritical
    ? "linear-gradient(135deg, rgba(239,68,68,0.06) 0%, var(--surface-secondary) 50%)"
    : isWarning
    ? "linear-gradient(135deg, rgba(245,158,11,0.04) 0%, var(--surface-secondary) 50%)"
    : "var(--surface-secondary)";

  const cardBorder = isCritical
    ? "2px solid var(--color-critical)"
    : isWarning
    ? "1.5px solid rgba(245,158,11,0.5)"
    : "1px solid var(--border-default)";

  const iconBg = isCritical
    ? "rgba(239,68,68,0.12)"
    : isWarning
    ? "rgba(245,158,11,0.10)"
    : "var(--surface-tertiary)";

  const iconColor = isCritical
    ? "var(--color-critical)"
    : isWarning
    ? "var(--color-warning)"
    : "var(--accent)";

  const trendColor = trend === "up"
    ? (isCritical ? "var(--color-critical)" : "var(--color-success)")
    : trend === "down"
    ? "var(--color-warning)"
    : "var(--text-tertiary)";

  // V2.0 Spec: sparkline color matches severity
  const sparkColor = isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#06b6d4";

  // Prepare sparkline chart data
  const chartData = sparklineData?.map((v, i) => ({ i, v })) ?? [];

  return (
    <div
      className="hover-stat-card"
      style={{
        padding: "20px 22px",
        /* V2.0 Spec: KPI cards use --radius-kpi (20px) */
        borderRadius: "var(--radius-kpi, 20px)",
        background: cardBg,
        border: cardBorder,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: isCritical ? "var(--elevation-2)" : "var(--elevation-1)",
      }}
    >
      {/* Top row: label + icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: "0.08em", color: isCritical ? "var(--color-critical)" : "var(--text-tertiary)",
        }}>
          {label}
        </p>
        {icon && (
          <div className="stat-icon" style={{
            width: 40, height: 40, borderRadius: 10,
            background: iconBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: iconColor,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* KPI value — large and prominent */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="kpi-value animate-count-up"
          style={{
            color: isCritical
              ? "var(--color-critical)"
              : isWarning
              ? "var(--color-warning)"
              : "var(--text-primary)",
          }}
        >
          {displayed}
        </span>
      </div>

      {/* Sub-text */}
      {sub && (
        <p style={{ fontSize: 12, color: isCritical ? "rgba(239,68,68,0.8)" : "var(--text-secondary)", lineHeight: 1.4, marginTop: -4 }}>
          {sub}
        </p>
      )}

      {/* V2.0 Spec: 7-day sparkline (60px height) */}
      {chartData.length > 0 && (
        <div style={{ height: 60, marginTop: 2, marginLeft: -4, marginRight: -4 }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
            <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={sparkColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={sparkColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={sparkColor}
                strokeWidth={1.5}
                fill={`url(#spark-${label.replace(/\s/g, "")})`}
                dot={false}
                isAnimationActive
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Trend indicator */}
      {trend && trend !== "stable" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <TrendIcon size={13} style={{ color: trendColor }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: trendColor }}>
            {trendText ?? (trend === "up" ? "Increased" : "Decreased")}
          </span>
        </div>
      )}
    </div>
  );
}
