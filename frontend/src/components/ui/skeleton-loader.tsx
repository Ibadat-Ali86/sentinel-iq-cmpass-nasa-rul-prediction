"use client";

import React from "react";

// ───────────────────────────────────────────────────────────────────────────
// SKELETON LOADER PRIMITIVES — SentinelIQ Design System V2.0
// Pulse shimmer using Surface Tertiary colors per spec.
// ───────────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

/** Base skeleton shimmer block */
export function Skeleton({ width = "100%", height = 16, borderRadius = 6, className = "", style }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, var(--surface-tertiary) 25%, var(--surface-overlay) 50%, var(--surface-tertiary) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.6s infinite",
        ...style,
      }}
    />
  );
}

/** Skeleton for KPI / stat cards — V2.0: 20px radius */
export function SkeletonStatCard() {
  return (
    <div style={{
      padding: "20px 22px",
      borderRadius: "var(--radius-kpi, 20px)",
      background: "var(--surface-secondary)",
      border: "1px solid var(--border-default)",
      display: "flex", flexDirection: "column", gap: 12,
    }} aria-busy="true" aria-label="Loading metric">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Skeleton width="40%" height={11} borderRadius={4} />
        <Skeleton width={40} height={40} borderRadius={10} />
      </div>
      <Skeleton width="60%" height={44} borderRadius={6} />
      <Skeleton width="80%" height={11} borderRadius={4} />
      <Skeleton width="100%" height={60} borderRadius={4} />
    </div>
  );
}

/** Skeleton for table rows */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Skeleton
            width={i === 0 ? "30%" : i === columns - 1 ? "50%" : "70%"}
            height={14}
            borderRadius={4}
          />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton for chart containers */
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div style={{
      height,
      background: "var(--surface-secondary)",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }} aria-busy="true" aria-label="Loading chart">
      {/* Header skeleton */}
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="25%" height={11} borderRadius={4} />
        </div>
        <Skeleton width={80} height={32} borderRadius={8} />
      </div>
      {/* Chart body */}
      <div style={{ padding: "20px", display: "flex", alignItems: "flex-end", gap: 8, height: height - 72 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            width={`${100 / 12 - 1}%`}
            height={`${20 + Math.sin(i * 0.8) * 40 + 30}%`}
            borderRadius="4px 4px 0 0"
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for alert list items */
export function SkeletonAlertItem() {
  return (
    <div style={{
      padding: "16px 16px 16px 20px",
      borderBottom: "1px solid var(--border-subtle)",
      display: "flex", gap: 14, alignItems: "flex-start",
    }} aria-hidden="true">
      <Skeleton width={4} height={60} borderRadius={2} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton width="35%" height={14} borderRadius={4} />
        <Skeleton width="60%" height={11} borderRadius={4} />
        <Skeleton width="25%" height={11} borderRadius={4} />
      </div>
      <Skeleton width={60} height={28} borderRadius={8} style={{ flexShrink: 0 }} />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// BRANDED SPINNER — V2.0 multi-size spec
// ───────────────────────────────────────────────────────────────────────────

type SpinnerSize = "sm" | "md" | "lg" | "xl";

const SPINNER_SIZES: Record<SpinnerSize, { outer: number; inner: number; stroke: number }> = {
  sm: { outer: 16, inner: 10, stroke: 2 },
  md: { outer: 24, inner: 14, stroke: 2 },
  lg: { outer: 32, inner: 20, stroke: 2.5 },
  xl: { outer: 48, inner: 30, stroke: 3 },
};

interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  label?: string;
}

export function Spinner({ size = "md", color = "var(--accent)", label = "Loading..." }: SpinnerProps) {
  const { outer, inner, stroke } = SPINNER_SIZES[size];
  const r = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }} role="status" aria-label={label}>
      <svg
        width={outer}
        height={outer}
        viewBox={`0 0 ${outer} ${outer}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ animation: "spinSlow 0.9s linear infinite" }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={r}
          stroke="var(--border-default)"
          strokeWidth={stroke}
          fill="none"
        />
        {/* Arc */}
        <circle
          cx={outer / 2}
          cy={outer / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.75}
          transform={`rotate(-90 ${outer / 2} ${outer / 2})`}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Full-page loading overlay */
export function LoadingOverlay({ label = "Loading..." }: { label?: string }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 16,
      background: "var(--surface-primary)",
      zIndex: 50,
    }} role="status" aria-label={label}>
      <Spinner size="xl" />
      <p style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</p>
    </div>
  );
}
