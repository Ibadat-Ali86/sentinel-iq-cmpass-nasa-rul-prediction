"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface HeroGeometricProps {
  badge?: string;
  title1?: string;
  title2?: string;
  className?: string;
}

export function HeroGeometric({ className }: HeroGeometricProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // In dark mode: orbs blend with screen, vivid opacity.
  // In light mode: use multiply/normal blend so orbs are visible on white background;
  //                reduce opacity so they don't overpower the light layout.
  const orbBlend: React.CSSProperties["mixBlendMode"] = isDark ? "screen" : "multiply";

  return (
    <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>

      {/* ── Primary cyan orb — top-left ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: isDark ? [0.55, 0.75, 0.55] : [0.28, 0.40, 0.28],
          scale: [1, 1.07, 1],
          x: [0, 30, -20, 0],
          y: [0, -25, 15, 0],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "-15%",
          left: "-8%",
          width: 680,
          height: 680,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle at 40% 40%, rgba(6,182,212,0.55) 0%, rgba(6,182,212,0.25) 35%, transparent 70%)"
            : "radial-gradient(circle at 40% 40%, rgba(8,145,178,0.22) 0%, rgba(8,145,178,0.10) 35%, transparent 70%)",
          filter: "blur(90px)",
          mixBlendMode: orbBlend,
        }}
      />

      {/* ── Secondary blue orb — right side ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: isDark ? [0.45, 0.65, 0.45] : [0.22, 0.35, 0.22],
          scale: [1, 1.10, 1],
          x: [0, -40, 25, 0],
          y: [0, 20, -15, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        style={{
          position: "absolute",
          top: "20%",
          right: "-12%",
          width: 580,
          height: 580,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle at 60% 40%, rgba(59,130,246,0.50) 0%, rgba(59,130,246,0.20) 40%, transparent 70%)"
            : "radial-gradient(circle at 60% 40%, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.08) 40%, transparent 70%)",
          filter: "blur(80px)",
          mixBlendMode: orbBlend,
        }}
      />

      {/* ── Tertiary purple orb — bottom-center ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{
          opacity: isDark ? [0.35, 0.55, 0.35] : [0.18, 0.30, 0.18],
          scale: [1, 1.06, 1],
          x: [0, 20, -30, 0],
          y: [0, 30, -10, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "28%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: isDark
            ? "radial-gradient(circle at 50% 50%, rgba(168,85,247,0.42) 0%, rgba(168,85,247,0.16) 40%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0.06) 40%, transparent 70%)",
          filter: "blur(70px)",
          mixBlendMode: orbBlend,
        }}
      />

      {/* ── Rotating diagonal accent shape ─────────────────────────────── */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          top: "30%",
          left: "55%",
          width: 220,
          height: 220,
          borderRadius: "30% 70% 70% 30% / 30% 30% 70% 70%",
          background: isDark
            ? "linear-gradient(135deg, rgba(6,182,212,0.18) 0%, rgba(59,130,246,0.12) 100%)"
            : "linear-gradient(135deg, rgba(8,145,178,0.10) 0%, rgba(37,99,235,0.06) 100%)",
          filter: "blur(30px)",
          opacity: isDark ? 0.6 : 0.4,
          mixBlendMode: orbBlend,
        }}
      />

      {/* ── Dot grid overlay ────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(148,163,184,0.22) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(15,23,42,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: isDark ? 0.40 : 0.25,
        }}
      />

      {/* ── Vignette — dark mode: dark edges; light mode: no dark overlay ── */}
      {isDark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 30%, rgba(8,13,20,0.55) 100%)",
          }}
        />
      )}
    </div>
  );
}
