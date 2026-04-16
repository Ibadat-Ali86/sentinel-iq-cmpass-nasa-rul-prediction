"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight, Cpu, Shield, Zap, Activity, Eye, EyeOff,
  ChevronRight, Lock, User, AlertCircle, CheckCircle2,
} from "lucide-react";
import { OrbitalLoader } from "./orbital-loader";

// ── Animated neural-network canvas ──────────────────────────────────────────
function NeuralCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const COLORS = ["#06b6d4", "#3b82f6", "#a855f7", "#10b981", "#f59e0b"];

    type Node = {
      x: number; y: number; vx: number; vy: number;
      r: number; color: string; alpha: number; pulse: number;
    };

    const nodes: Node[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2.5 + 0.8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * Math.PI * 2,
    }));

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    const draw = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);

      // Connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(6,182,212,${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Nodes with subtle pulse
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0) n.x = W;
        if (n.x > W) n.x = 0;
        if (n.y < 0) n.y = H;
        if (n.y > H) n.y = 0;
        n.pulse += 0.025;

        const pulseR = n.r + Math.sin(n.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.globalAlpha = n.alpha * (0.8 + Math.sin(n.pulse) * 0.2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ── Floating metric badge ────────────────────────────────────────────────────
function MetricBadge({
  icon, label, value, color = "#06b6d4", style = {},
}: { icon: React.ReactNode; label: string; value: string; color?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "rgba(13,21,38,0.85)", backdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12, padding: "10px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      ...style,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: `${color}22`, border: `1px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Quick-access demo role button ────────────────────────────────────────────
function RoleButton({
  label, email, password, color, description, onClick,
}: {
  label: string; email: string; password: string;
  color: string; description: string;
  onClick: (email: string, password: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(email, password)}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", background: `${color}0d`, border: `1px solid ${color}33`,
        borderRadius: 10, padding: "10px 14px", cursor: "pointer",
        transition: "all 200ms ease", textAlign: "left",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = `${color}1a`;
        el.style.borderColor = `${color}55`;
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLButtonElement;
        el.style.background = `${color}0d`;
        el.style.borderColor = `${color}33`;
        el.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 6, background: `${color}22`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <User size={14} style={{ color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{label}</div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 1, fontFamily: "monospace" }}>
          {email}
        </div>
      </div>
      <ChevronRight size={13} style={{ color: "#475569", flexShrink: 0 }} />
    </button>
  );
}

// ── Main SignIn1 component ───────────────────────────────────────────────────
const SignIn1 = () => {
  const router = useRouter();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (isAuthenticated) router.replace("/dashboard"); }, [isAuthenticated, router]);

  const handleSignIn = async (overrideEmail?: string, overridePassword?: string) => {
    const e = overrideEmail ?? email;
    const p = overridePassword ?? password;

    // TESTING MODE: no validation — any credentials work
    setError("");
    setStatus("loading");
    const result = await login(e || "demo@sentineliq.com", p || "demo1234");
    if (result.success) {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      setStatus("idle");
      setError(result.error ?? "An unexpected error occurred.");
    }
  };

  const handleQuickLogin = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
    handleSignIn(e, p);
  };

  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") handleSignIn();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 44px 12px 40px",
    borderRadius: 10, fontSize: 14, fontWeight: 500,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "#f1f5f9",
    outline: "none", transition: "all 200ms ease",
    boxSizing: "border-box",
  };

  const isDemoMode = true; // always true for testing

  return (
    <div style={{
      minHeight: "100dvh", display: "flex",
      background: "#060b11",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* ── Left panel: hero ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex"
        style={{
          flex: "0 0 52%", position: "relative",
          background: "linear-gradient(145deg, #060b11 0%, #0a1628 40%, #0d1f3c 100%)",
          overflow: "hidden", flexDirection: "column",
          justifyContent: "center", alignItems: "flex-start",
          padding: "64px 72px",
        }}
      >
        <NeuralCanvas />

        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.10) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "20%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 64, position: "relative", zIndex: 2 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(6,182,212,0.40)",
          }}>
            <Cpu size={22} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#f1f5f9" }}>SentinelIQ</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>NASA C-MAPSS · Predictive Maintenance</div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 460 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.25)",
            borderRadius: 99, padding: "5px 14px", marginBottom: 24,
          }}>
            <div style={{ width: 7, height: 7, background: "#10b981", borderRadius: "50%", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#06b6d4", fontWeight: 700, letterSpacing: "0.08em" }}>
              TESTING MODE · All Access Enabled
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 3.2vw, 2.8rem)",
            fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em",
            color: "#f1f5f9", marginBottom: 20,
          }}>
            Turbofan Engine{" "}
            <span style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6, #a855f7)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              RUL Intelligence
            </span>
          </h1>

          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, marginBottom: 40 }}>
            Enterprise-grade predictive maintenance powered by TCN deep learning.
            Monitor, diagnose, and schedule — before failures occur.
          </p>

          {/* Floating metric badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <MetricBadge icon={<Activity size={16} />} label="Model Accuracy" value="RMSE ≤ 13 cyc" color="#06b6d4" />
            <MetricBadge icon={<Zap size={16} />} label="Inference Speed" value="< 500 ms" color="#a855f7" />
            <MetricBadge icon={<Shield size={16} />} label="Dataset" value="NASA C-MAPSS" color="#10b981" />
          </div>
        </div>

        {/* Bottom watermark */}
        <div style={{
          position: "absolute", bottom: 32, left: 72, right: 72,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          zIndex: 2,
        }}>
          <span style={{ fontSize: 11, color: "#1e293b", fontWeight: 500 }}>Phase 24 · Production Demo</span>
          <span style={{ fontSize: 11, color: "#1e293b" }}>© 2026 SentinelIQ</span>
        </div>
      </div>

      {/* ── Right panel: form ────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#080d14",
        padding: "48px 32px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle background glow */}
        <div style={{ position: "absolute", top: "20%", right: "15%", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "25%", left: "10%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{
          width: "100%", maxWidth: 420, position: "relative", zIndex: 2,
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
          {/* Mobile logo */}
          <div className="flex lg:hidden" style={{ alignItems: "center", gap: 10, marginBottom: 32, justifyContent: "center" }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Cpu size={18} color="white" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#f1f5f9" }}>SentinelIQ</div>
          </div>

          {/* Testing mode banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 28,
          }}>
            <CheckCircle2 size={15} style={{ color: "#10b981", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Testing Mode Active</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>
                All security checks bypassed — any credentials work
              </div>
            </div>
          </div>

          <h2 style={{
            fontSize: 26, fontWeight: 800, color: "#f1f5f9",
            letterSpacing: "-0.025em", marginBottom: 6,
          }}>
            Sign in to dashboard
          </h2>
          <p style={{ fontSize: 13, color: "#475569", marginBottom: 32 }}>
            Enter any credentials or use a quick-access role below
          </p>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {/* Email field */}
            <div style={{ position: "relative" }}>
              <User size={15} style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#475569", pointerEvents: "none",
              }} />
              <input
                id="login-email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                style={inputStyle}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(6,182,212,0.50)"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(6,182,212,0.10)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.10)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
            </div>

            {/* Password field */}
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#475569", pointerEvents: "none",
              }} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password (any value)"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(6,182,212,0.50)"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px rgba(6,182,212,0.10)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.10)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "#475569", cursor: "pointer",
                  padding: 0, display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#f87171",
              }}>
                <AlertCircle size={13} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Sign-in button / loader */}
            {status === "loading" || status === "success" ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                <OrbitalLoader
                  message={status === "loading" ? "Authenticating access…" : "Welcome! Redirecting…"}
                  className="w-8 h-8"
                />
              </div>
            ) : (
              <button
                id="login-submit"
                type="button"
                onClick={() => handleSignIn()}
                style={{
                  width: "100%", padding: "13px",
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  border: "none", borderRadius: 10, color: "#fff",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: "0 0 24px rgba(6,182,212,0.30)",
                  transition: "all 200ms ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 36px rgba(6,182,212,0.50)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 24px rgba(6,182,212,0.30)";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                }}
              >
                Access Dashboard <ArrowRight size={15} />
              </button>
            )}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <span style={{ fontSize: 11, color: "#334155", fontWeight: 600, whiteSpace: "nowrap" }}>
              OR QUICK-ACCESS AS
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Role quick-access */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 32 }}>
            <RoleButton
              label="Engineer (Full access)"
              email="demo@sentineliq.com"
              password="demo1234"
              color="#06b6d4"
              description="SHAP, anomalies, RUL dashboards"
              onClick={handleQuickLogin}
            />
            <RoleButton
              label="Admin (System management)"
              email="admin@sentineliq.com"
              password="admin1234"
              color="#a855f7"
              description="All features + user management"
              onClick={handleQuickLogin}
            />
            <RoleButton
              label="Operator (Fleet monitor)"
              email="operator@sentineliq.com"
              password="operator1234"
              color="#10b981"
              description="Fleet overview + alerts"
              onClick={handleQuickLogin}
            />
          </div>

          {/* Footer note */}
          <p style={{ fontSize: 11, color: "#1e293b", textAlign: "center", lineHeight: 1.6 }}>
            This is a testing environment. Authentication is fully open.
            <br />
            Swap <code style={{ background: "rgba(255,255,255,0.04)", padding: "1px 4px", borderRadius: 4 }}>AuthContext</code> to real JWT when deploying to production.
          </p>
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
