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


// ── Main SignIn1 component ───────────────────────────────────────────────────
const SignIn1 = () => {
  const router = useRouter();
  const { login, signup, isAuthenticated } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (isAuthenticated) router.replace("/dashboard"); }, [isAuthenticated, router]);

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length > 0) {
      if (password.length >= 8) score += 1;
      if (/[A-Z]/.test(password)) score += 1;
      if (/[0-9]/.test(password)) score += 1;
      if (/[^a-zA-Z0-9]/.test(password)) score += 1;
    }
    return score; 
  };
  const strength = password ? getPasswordStrength() : 0;
  const strengthLabels = ["Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["#ef4444", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

  const validateForm = () => {
    if (!isLogin && !name.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
      return false;
    }
    if (!isLogin && password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return false;
    }
    if (!isLogin && strength < 2) {
      setError("Password is too weak. Please add numbers or uppercase letters.");
      return false;
    }
    return true;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    
    setError("");
    setStatus("loading");
    
    let result;
    if (isLogin) {
      result = await login(email, password);
    } else {
      result = await signup(name, email, password);
    }
    
    if (result.success) {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 800);
    } else {
      setStatus("idle");
      
      const errMsg = result.error?.toLowerCase() || "";
      if (!isLogin && (errMsg.includes("already exists") || errMsg.includes("in use"))) {
        setIsLogin(true);
        setError("An account with this email already exists. Please sign in.");
      } else {
        setError(result.error ?? "An unexpected error occurred.");
      }
    }
  };
  const handleKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === "Enter") handleSignIn();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 44px 12px 40px",
    borderRadius: 10, fontSize: 14, fontWeight: 500,
    background: "var(--surface-secondary)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    outline: "none", transition: "all 200ms ease",
    boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100dvh", display: "flex",
      background: "var(--surface-primary)",
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
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
            borderRadius: 99, padding: "5px 14px", marginBottom: 24,
          }}>
            <Shield size={11} style={{ color: "#10b981" }} />
            <span style={{ fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: "0.08em" }}>
              SECURE PLATFORM
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(2rem, 3.2vw, 2.8rem)",
            fontWeight: 800, lineHeight: 1.15, letterSpacing: "-0.03em",
            color: "#f1f5f9", marginBottom: 20,
          }}>
            Turbofan Engine{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500">
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
        background: "var(--surface-primary)",
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
            <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text-primary)" }}>SentinelIQ</div>
          </div>

          <div style={{ marginBottom: 28 }} />

          <h2 style={{
            fontSize: 26, fontWeight: 800, color: "var(--text-primary)",
            letterSpacing: "-0.025em", marginBottom: 6,
          }}>
            {isLogin ? "Sign in to dashboard" : "Create your account"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 32 }}>
            {isLogin ? "Enter your credentials to securely access the platform." : "Sign up to access the predictive maintenance tools."}
          </p>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {/* Name field (Sign Up only) */}
            {!isLogin && (
              <div style={{ position: "relative", animation: "fadeSlideIn 200ms ease" }}>
                <User size={15} style={{
                  position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-tertiary)", pointerEvents: "none",
                }} />
                <input
                  id="signup-name"
                  type="text"
                  placeholder="Full Name"
                  autoComplete="name"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(""); }}
                  onKeyDown={handleKeyDown}
                  style={inputStyle}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--color-primary)"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border-default)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
                />
              </div>
            )}

            {/* Email field */}
            <div style={{ position: "relative" }}>
              <User size={15} style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-tertiary)", pointerEvents: "none",
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
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--color-primary)"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border-default)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
            </div>

            {/* Password field */}
            <div style={{ position: "relative" }}>
              <Lock size={15} style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "var(--text-tertiary)", pointerEvents: "none",
              }} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                autoComplete="current-password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                style={{ ...inputStyle, paddingRight: 44 }}
                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "var(--color-primary)"; (e.target as HTMLInputElement).style.boxShadow = "0 0 0 3px var(--focus-ring)"; }}
                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "var(--border-default)"; (e.target as HTMLInputElement).style.boxShadow = "none"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", color: "var(--text-tertiary)", cursor: "pointer",
                  padding: 0, display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {!isLogin && password && (
              <div style={{ marginTop: 4, marginBottom: 8, animation: "fadeSlideIn 200ms ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6, color: "var(--text-tertiary)" }}>
                  <span>Password strength</span>
                  <span style={{ color: strengthColors[strength], fontWeight: 600 }}>{strengthLabels[strength]}</span>
                </div>
                <div style={{ display: "flex", gap: 4, height: 4 }}>
                  {[1, 2, 3, 4].map((point) => (
                    <div key={point} style={{
                      flex: 1, borderRadius: 2,
                      background: strength >= point ? strengthColors[strength] : "var(--border-default)",
                      transition: "all 300ms ease"
                    }} />
                  ))}
                </div>
              </div>
            )}

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
                {isLogin ? "Access Dashboard" : "Create Account"} <ArrowRight size={15} />
              </button>
            )}
          </div>

          <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", marginTop: 10 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              style={{
                background: "none", border: "none", padding: 0,
                color: "var(--color-primary)", fontWeight: 600, cursor: "pointer",
                textDecoration: "underline", textUnderlineOffset: 2
              }}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          {/* End of Form */}
        </div>
      </div>
    </div>
  );
};

export { SignIn1 };
