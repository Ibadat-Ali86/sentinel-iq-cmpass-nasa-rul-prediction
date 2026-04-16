"use client";

// ───────────────────────────────────────────────────────────────────────────
// TURBOFAN ENGINE HERO — SentinelIQ Design System V2.0
// Animated 3D-perspective SVG turbofan cross-section engine illustration.
// Shows live RUL degradation, rotating fan blades, and sensor telemetry panels.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface TurbofanEngineHeroProps {
  rul?: number;         // Current RUL (0-125 cycles)
  anomalyScore?: number; // Anomaly score (0-1)
  isLoaded?: boolean;
}


function useAnimatedRUL(startRUL: number) {
  const [rul, setRUL] = useState(startRUL);
  useEffect(() => {
    const id = setInterval(() => {
      setRUL(prev => {
        // Slowly degrade, then reset
        const next = prev - 0.15 - Math.random() * 0.05;
        return next < 5 ? startRUL : parseFloat(next.toFixed(1));
      });
    }, 150);
    return () => clearInterval(id);
  }, [startRUL]);
  return rul;
}

export function TurbofanEngineHero({ rul: initialRUL = 38.4, anomalyScore = 0.72, isLoaded = true }: TurbofanEngineHeroProps) {
  const rul = useAnimatedRUL(initialRUL);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Continuously rotate the fan blades
  useEffect(() => {
    const spin = (ts: number) => {
      if (lastRef.current) {
        const dt = ts - lastRef.current;
        // Speed up rotation as RUL decreases (more urgency)
        const rpm = 0.05 + (1 - rul / 125) * 0.25;
        setRotation(r => (r + rpm * dt * 0.1) % 360);
      }
      lastRef.current = ts;
      animRef.current = requestAnimationFrame(spin);
    };
    animRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animRef.current);
  }, [rul]);

  const rulPct = Math.max(0, Math.min(1, rul / 125));
  const severity = rul < 15 ? "critical" : rul < 45 ? "warning" : "normal";
  const sevColor = severity === "critical" ? "#ef4444" : severity === "warning" ? "#f59e0b" : "#10b981";
  const sevGlow = severity === "critical" ? "rgba(239,68,68,0.4)" : severity === "warning" ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)";

  // Theme-aware card colors
  const cardBg = isDark ? "rgba(8,13,28,0.95)" : "rgba(255,255,255,0.96)";
  const cardShadow = isDark
    ? `0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px ${sevColor}15, inset 0 1px 0 rgba(255,255,255,0.04)`
    : `0 20px 60px rgba(15,23,42,0.10), 0 0 0 1px ${sevColor}20`;
  const headerTextColor = isDark ? "#f1f5f9" : "#0f172a";
  const subTextColor = isDark ? "#64748b" : "#94a3b8";
  const engineCasingFill = isDark ? "rgba(15,23,42,0.6)" : "rgba(241,245,249,0.8)";
  const engineInnerFill = isDark ? "rgba(13,21,38,0.8)" : "rgba(248,250,252,0.9)";
  const sensorBoxFill = isDark ? "rgba(8,13,28,0.9)" : "rgba(255,255,255,0.92)";
  const sensorBoxStroke = isDark ? "rgba(15,23,42,0.7)" : "rgba(15,23,42,0.4)";
  const exhauseFill = isDark ? "rgba(15,23,42,0.7)" : "rgba(241,245,249,0.85)";
  const progressBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.08)";
  const kpiPanelBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.04)";
  const kpiPanelBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)";
  const kpiLabelColor = isDark ? "#475569" : "#94a3b8";
  const rulTextColor = isDark ? "#475569" : "#94a3b8";

  return (
    <div
      style={{
        position: "relative",
        opacity: isLoaded ? 1 : 0,
        transform: isLoaded ? "translateX(0) rotateY(0deg)" : "translateX(40px)",
        transition: "opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s",
      }}
      aria-label="Animated turbofan engine health monitor"
    >
      {/* ── Outer Card ── */}
      <div style={{
        background: cardBg,
        border: `1px solid ${sevColor}30`,
        borderRadius: 24,
        padding: "28px 32px",
        backdropFilter: "blur(20px)",
        boxShadow: cardShadow,
        position: "relative",
        overflow: "hidden",
        transition: "background 0.3s ease",
      }}>


        {/* Ambient glow per severity */}
        <div style={{
          position: "absolute", top: -80, right: -80,
          width: 300, height: 300,
          background: `radial-gradient(circle, ${sevGlow} 0%, transparent 70%)`,
          pointerEvents: "none",
          transition: "background 1s ease",
        }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: headerTextColor, letterSpacing: "-0.01em" }}>
              Engine #001 — TCN RUL Monitor
            </p>
            <p style={{ fontSize: 11, color: subTextColor, marginTop: 2 }}>
              CFM56-7B Turbofan · 14-sensor array · Live telemetry
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 99,
            background: `${sevColor}18`, border: `1px solid ${sevColor}40`,
            fontSize: 11, fontWeight: 800, color: sevColor,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: sevColor,
              boxShadow: `0 0 6px ${sevColor}`,
              display: "inline-block",
              animation: severity !== "normal" ? "pulseRing 2s ease-out infinite" : undefined,
            }} />
            {severity === "critical" ? "CRITICAL" : severity === "warning" ? "WARNING" : "NOMINAL"}
          </div>
        </div>

        {/* ── Engine SVG Illustration ── */}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <svg
            width="380"
            height="200"
            viewBox="0 0 380 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ maxWidth: "100%", filter: `drop-shadow(0 0 20px ${sevColor}20)` }}
            aria-hidden="true"
          >
            {/* ── Engine casing (outer nacelle) ── */}
            <ellipse cx="190" cy="100" rx="170" ry="70" stroke="rgba(148,163,184,0.2)" strokeWidth="1.5" fill={engineCasingFill} />
            <ellipse cx="190" cy="100" rx="155" ry="58" stroke="rgba(148,163,184,0.12)" strokeWidth="1" fill={engineInnerFill} />

            {/* ── Fan blades (rotating) ── */}
            <g transform={`rotate(${rotation}, 65, 100)`}>
              {Array.from({ length: 8 }, (_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                const x1 = 65 + Math.cos(angle) * 12;
                const y1 = 100 + Math.sin(angle) * 12;
                const x2 = 65 + Math.cos(angle) * 50;
                const y2 = 100 + Math.sin(angle) * 50;
                return (
                  <line key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={`rgba(6,182,212,0.7)`}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                );
              })}
              {/* Hub */}
              <circle cx="65" cy="100" r="14" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="1.5" />
              <circle cx="65" cy="100" r="6" fill="#06b6d4" fillOpacity="0.6" />
            </g>

            {/* ── Fan outer ring ── */}
            <circle cx="65" cy="100" r="52" stroke="rgba(6,182,212,0.25)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />

            {/* ── Compressor section ── */}
            {[110, 130, 150, 168].map((x, i) => (
              <g key={i}>
                <line x1={x} y1={100 - 38 + i * 4} x2={x} y2={100 + 38 - i * 4}
                  stroke="rgba(99,102,241,0.5)" strokeWidth="2.5" strokeLinecap="round" />
                {/* Compressor blades */}
                {[-1, 0, 1].map(offset => (
                  <line key={offset}
                    x1={x - 4} y1={100 + offset * 18}
                    x2={x + 4} y2={100 + offset * 14}
                    stroke="rgba(99,102,241,0.6)" strokeWidth="1.5" strokeLinecap="round"
                  />
                ))}
              </g>
            ))}

            {/* ── Combustion chamber ── */}
            <rect x="175" y="65" width="55" height="70" rx="4"
              fill="none" stroke={`rgba(245,158,11,0.4)`} strokeWidth="1.5" />
            {/* Flame corona */}
            <ellipse cx="202" cy="100" rx="18" ry="25"
              fill={`rgba(245,158,11,0.08)`} stroke={`rgba(245,158,11,0.3)`} strokeWidth="1" />
            <ellipse cx="202" cy="100" rx="10" ry="16"
              fill={`rgba(239,68,68,0.12)`} stroke={`rgba(239,68,68,0.35)`} strokeWidth="1" />
            {/* Igniter sparks */}
            <circle cx="202" cy="100" r="3" fill="#f59e0b" fillOpacity="0.8" />

            {/* ── Turbine section ── */}
            <g transform={`rotate(${-rotation * 0.7}, 265, 100)`}>
              {Array.from({ length: 6 }, (_, i) => {
                const angle = (i * 60) * Math.PI / 180;
                const x1 = 265 + Math.cos(angle) * 10;
                const y1 = 100 + Math.sin(angle) * 10;
                const x2 = 265 + Math.cos(angle) * 36;
                const y2 = 100 + Math.sin(angle) * 36;
                return (
                  <line key={i}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={sevColor}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{ opacity: 0.8 }}
                  />
                );
              })}
              <circle cx="265" cy="100" r="11" fill={`${sevColor}18`} stroke={sevColor} strokeWidth="1.5" />
              <circle cx="265" cy="100" r="5" fill={sevColor} fillOpacity="0.7" />
            </g>

            {/* ── Exhaust nozzle ── */}
            <path d="M 305 68 L 360 80 L 360 120 L 305 132 Z"
              fill={exhauseFill} stroke="rgba(148,163,184,0.2)" strokeWidth="1" />
            {/* Exhaust heat shimmer */}
            {[0, 1, 2].map(i => (
              <line key={i}
                x1={345 + i * 6} y1={90}
                x2={355 + i * 4} y2={110}
                stroke={`rgba(245,158,11,${0.15 - i * 0.04})`}
                strokeWidth="2" strokeLinecap="round"
                style={{ animation: `float ${1.2 + i * 0.3}s ease-in-out infinite` }}
              />
            ))}

            {/* ── Sensor data points on casing ── */}
            {[
              { x: 100, y: 52, label: "T3", value: "641°R", color: "#06b6d4" },
              { x: 200, y: 42, label: "P7", value: "14.6psi", color: "#a855f7" },
              { x: 295, y: 54, label: "T4", value: `${(sevColor === "#ef4444" ? 1589 + Math.sin(Date.now() * 0.001) * 20 : 1489).toFixed(0)}°R`, color: sevColor },
            ].map(({ x, y, label, value, color }) => (
              <g key={label}>
                {/* Connector line */}
                <line x1={x} y1={y + 6} x2={x} y2={70} stroke={`${color}40`} strokeWidth="1" strokeDasharray="3 2" />
                {/* Label box */}
                <rect x={x - 24} y={y - 14} width={50} height={20} rx="4"
                  fill={sensorBoxFill} stroke={`${color}50`} strokeWidth="1" />
                <text x={x + 1} y={y - 2} textAnchor="middle" fontSize="7" fill={color} fontWeight="700" fontFamily="monospace">
                  {label}: {value}
                </text>
              </g>
            ))}

            {/* ── RUL arc indicator (bottom) ── */}
            <g transform="translate(190, 185)">
              <text textAnchor="middle" fontSize="8" fill={rulTextColor} fontFamily="monospace" y="0">
                RUL: {rul.toFixed(1)} cycles remaining
              </text>
              {/* Progress bar */}
              <rect x="-80" y="5" width="160" height="4" rx="2" fill={progressBg} />
              <rect x="-80" y="5" width={`${rulPct * 160}`} height="4" rx="2" fill={sevColor}>
                <animate attributeName="width" to={`${rulPct * 160}`} dur="0.3s" fill="freeze" />
              </rect>
            </g>
          </svg>
        </div>

        {/* ── Telemetry KPI Row ── */}
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "RUL", value: `${rul.toFixed(1)} cyc`, color: sevColor },
            { label: "Anom Score", value: `${(anomalyScore * 100).toFixed(0)}%`, color: anomalyScore > 0.6 ? "#ef4444" : anomalyScore > 0.3 ? "#f59e0b" : "#10b981" },
            { label: "Model", value: "TCN+AE", color: "#06b6d4" },
            { label: "Latency", value: `${(11 + Math.sin(Date.now() * 0.0002) * 4).toFixed(0)}ms`, color: "#a855f7" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              flex: 1, padding: "10px 12px",
              background: kpiPanelBg,
              borderRadius: 10, border: `1px solid ${kpiPanelBorder}`,
            }}>
              <p style={{ fontSize: 9, color: kpiLabelColor, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
              <p style={{ fontSize: 13, fontWeight: 800, color, letterSpacing: "-0.01em", fontFamily: "monospace" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
