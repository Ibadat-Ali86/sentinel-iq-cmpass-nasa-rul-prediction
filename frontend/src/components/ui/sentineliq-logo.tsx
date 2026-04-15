"use client";

import { useEffect, useRef } from "react";

interface SentinelIQLogoProps {
  /** Icon size in px (default 36) */
  size?: number;
  /** Whether to play the draw animation on mount (default true) */
  animate?: boolean;
  /** Whether to show the text label (default true) */
  showText?: boolean;
  /** Text color override */
  textColor?: string;
  className?: string;
}

/**
 * SentinelIQ Animated Logo — V2.0 Design System Spec
 * Waveform "S" mark representing data streams + intelligence.
 * Draw animation: 800ms stroke-dasharray reveal on mount.
 */
export function SentinelIQLogo({
  size = 36,
  animate = true,
  showText = true,
  textColor = "var(--text-primary)",
  className = "",
}: SentinelIQLogoProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!animate) return;
    const paths = [pathRef.current, path2Ref.current].filter(Boolean) as SVGPathElement[];
    paths.forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.transition = "none";
      // Stagger second path by 200ms
      setTimeout(() => {
        path.style.transition = `stroke-dashoffset ${animate ? 800 : 0}ms cubic-bezier(0.4,0,0.2,1)`;
        path.style.strokeDashoffset = "0";
      }, i * 120);
    });
  }, [animate]);

  const iconSize = size;
  const fontSize = Math.round(iconSize * 0.39);
  const subFontSize = Math.round(iconSize * 0.27);

  return (
    <div className={`sentineliq-logo ${className}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Icon container with gradient background */}
      <div
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: Math.round(iconSize * 0.28),
          background: "linear-gradient(135deg, #0891b2, #1e3a5f)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 18px rgba(8,145,178,0.35), 0 0 0 1px rgba(8,145,178,0.2)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle radial highlight */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-20%",
            width: "60%",
            height: "60%",
            borderRadius: "50%",
            background: "rgba(255,255,255,0.12)",
            pointerEvents: "none",
          }}
        />

        {/* Waveform SVG — "S" data stream path */}
        <svg
          width={Math.round(iconSize * 0.6)}
          height={Math.round(iconSize * 0.6)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="SentinelIQ logo"
        >
          {/* Main waveform path — data stream signal */}
          <path
            ref={pathRef}
            d="M2 12 C4 8, 6 4, 8 8 S10 16, 12 12 S14 4, 16 8 S18 16, 20 12 S22 8, 24 10"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Secondary mark — intelligence indicator */}
          <path
            ref={path2Ref}
            d="M8 17 L16 17"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Live pulse dot */}
          <circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,0.9)" />
        </svg>

        {/* Animated live pulse dot — top right */}
        <span
          className="animate-pulse-ring"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: "#10b981",
            border: `2px solid #0891b2`,
          }}
        />
      </div>

      {showText && (
        <div>
          <p
            style={{
              fontWeight: 800,
              fontSize,
              color: textColor,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            SentinelIQ
          </p>
          <p
            style={{
              fontSize: subFontSize,
              color: "var(--text-tertiary)",
              marginTop: 2,
              lineHeight: 1,
              letterSpacing: "0.01em",
            }}
          >
            RUL Monitoring Platform
          </p>
        </div>
      )}
    </div>
  );
}
