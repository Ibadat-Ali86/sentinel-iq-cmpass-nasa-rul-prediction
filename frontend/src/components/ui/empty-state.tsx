"use client";

import React from "react";
import Link from "next/link";

// ───────────────────────────────────────────────────────────────────────────
// EMPTY STATE COMPONENT — SentinelIQ Design System V2.0
// Illustrative technical SVG art + actionable CTA.
// Variants: no-data, no-results, error, offline
// ───────────────────────────────────────────────────────────────────────────

type EmptyStateVariant = "no-data" | "no-results" | "error" | "offline";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  /** CTA label */
  actionLabel?: string;
  /** CTA href (use Link) */
  actionHref?: string;
  /** CTA onClick callback */
  onAction?: () => void;
  /** Compact mode (smaller sizing) */
  compact?: boolean;
  className?: string;
}

function BlueprintSVG({ variant }: { variant: EmptyStateVariant }) {
  if (variant === "no-data" || variant === "no-results") {
    return (
      <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Blueprint grid */}
        <rect x="10" y="10" width="100" height="70" rx="6" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="4 3" fill="none" />
        {/* Axis lines */}
        <line x1="20" y1="70" x2="100" y2="70" stroke="var(--border-emphasis)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="20" y2="70" stroke="var(--border-emphasis)" strokeWidth="1.5" strokeLinecap="round" />
        {/* No data — dashed rising line with question */}
        <polyline
          points="25,65 40,55 55,60 70,42 85,35"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 3"
          fill="none"
        />
        {/* Endpoint "?" dot */}
        <circle cx="85" cy="35" r="5" fill="var(--accent)" fillOpacity="0.2" stroke="var(--accent)" strokeWidth="1.5" />
        <text x="83.5" y="38.5" fontSize="6" fill="var(--accent)" fontWeight="700" fontFamily="monospace">?</text>
        {/* Tick marks */}
        {[25, 40, 55, 70, 85].map((x, i) => (
          <line key={i} x1={x} y1="70" x2={x} y2="73" stroke="var(--border-default)" strokeWidth="1" />
        ))}
      </svg>
    );
  }

  if (variant === "error") {
    return (
      <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Circuit board background */}
        <rect x="15" y="15" width="70" height="70" rx="8" stroke="var(--color-critical)" strokeWidth="1" strokeOpacity="0.3" fill="var(--color-critical-bg)" />
        {/* Cross mark */}
        <line x1="37" y1="37" x2="63" y2="63" stroke="var(--color-critical)" strokeWidth="3" strokeLinecap="round" />
        <line x1="63" y1="37" x2="37" y2="63" stroke="var(--color-critical)" strokeWidth="3" strokeLinecap="round" />
        {/* Corner details */}
        {[[15,15],[75,15],[15,75],[75,75]].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="var(--color-critical)" fillOpacity="0.4" />
        ))}
      </svg>
    );
  }

  if (variant === "offline") {
    return (
      <svg width="110" height="90" viewBox="0 0 110 90" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* WiFi arcs — broken */}
        <path d="M15 55 Q55 20 95 55" stroke="var(--border-default)" strokeWidth="2" strokeLinecap="round" fill="none" strokeDasharray="4 3" />
        <path d="M27 65 Q55 40 83 65" stroke="var(--border-emphasis)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M39 75 Q55 60 71 75" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <circle cx="55" cy="82" r="4" fill="var(--text-tertiary)" />
        {/* Diagonal cross — offline indicator */}
        <line x1="75" y1="20" x2="95" y2="40" stroke="var(--color-critical)" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="95" y1="20" x2="75" y2="40" stroke="var(--color-critical)" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Default fallback
  return null;
}

const DEFAULTS: Record<EmptyStateVariant, { title: string; description: string; actionLabel: string }> = {
  "no-data": {
    title: "No data yet",
    description: "Upload a dataset to run model inference and visualize results here.",
    actionLabel: "Upload Dataset",
  },
  "no-results": {
    title: "No results found",
    description: "Try adjusting your filters or search criteria to find what you're looking for.",
    actionLabel: "Clear Filters",
  },
  error: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try refreshing or contact support if the issue persists.",
    actionLabel: "Retry",
  },
  offline: {
    title: "Backend offline",
    description: "The prediction server is unreachable. Showing cached data in demo mode.",
    actionLabel: "Check Connection",
  },
};

export function EmptyState({
  variant = "no-data",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const defaults = DEFAULTS[variant];
  const finalTitle = title ?? defaults.title;
  const finalDesc = description ?? defaults.description;
  const finalAction = actionLabel ?? defaults.actionLabel;

  const isError = variant === "error";

  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "2rem 1rem" : "4rem 2rem",
        gap: compact ? 16 : 20,
      }}
      role="status"
      aria-label={finalTitle}
    >
      {/* Illustrative SVG */}
      <div style={{
        opacity: 0.7,
        animation: "float 5s ease-in-out infinite",
      }}>
        <BlueprintSVG variant={variant} />
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: compact ? 16 : 20,
        fontWeight: 700,
        color: isError ? "var(--color-critical)" : "var(--text-primary)",
        letterSpacing: "-0.01em",
        margin: 0,
      }}>
        {finalTitle}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: compact ? 13 : 14,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        maxWidth: 360,
        margin: 0,
      }}>
        {finalDesc}
      </p>

      {/* CTA */}
      {(actionHref || onAction) && (
        actionHref ? (
          <Link
            href={actionHref}
            className={isError ? "btn btn--danger btn--md" : "btn btn--primary btn--md"}
            style={{
              marginTop: 4,
              boxShadow: isError ? "none" : "var(--elevation-2)",
            }}
          >
            {finalAction}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className={isError ? "btn btn--danger btn--md" : "btn btn--primary btn--md"}
            style={{
              marginTop: 4,
              boxShadow: isError ? "none" : "var(--elevation-2)",
            }}
          >
            {finalAction}
          </button>
        )
      )}
    </div>
  );
}
