"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Cpu, Activity, AlertTriangle, Calendar, BarChart3,
  ArrowRight, ChevronRight, Shield, Zap, Target,
  Star, CheckCircle2, TrendingDown, Upload,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { SparklesText } from "@/components/ui/sparkles-text";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

// ── Mock data for live charts ─────────────────────────────────────────────────
const heroChartData = Array.from({ length: 30 }, (_, i) => ({
  cycle: i + 1,
  rul: Math.max(0, 125 - i * 3.8 - Math.sin(i * 0.4) * 4),
  anomaly: Math.min(1, 0.05 + i * 0.029 + Math.cos(i * 0.3) * 0.03),
}));

const anomalyData = [
  { name: "Normal", value: 72, color: "#10b981" },
  { name: "Warning", value: 20, color: "#f59e0b" },
  { name: "Critical", value: 8, color: "#ef4444" },
];

const maintenanceData = [
  { label: "Failure Cost", value: 50000 },
  { label: "Prevent Cost", value: 5000 },
];

// ── Particle canvas background ────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; alpha: number; color: string;
    }

    const COLORS = ["#06b6d4", "#3b82f6", "#a855f7", "#10b981"];
    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 2 + 0.5,
      alpha: Math.random() * 0.4 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(6,182,212,${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace(")", `,${p.alpha})`).replace("rgb", "rgba").replace("#", "");
        // use hex+alpha approach
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 1,
      }}
    />
  );
}

// ── Typewriter hook ───────────────────────────────────────────────────────────
function useTypewriter(words: string[], speed = 80, pause = 1800) {
  const [displayed, setDisplayed] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx % words.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        setCharIdx(c => c + 1);
      }, speed);
    } else if (!deleting && charIdx > current.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && charIdx > 0) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx - 1));
        setCharIdx(c => c - 1);
      }, speed / 2);
    } else {
      setDeleting(false);
      setWordIdx(i => i + 1);
    }
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return displayed;
}

// ── Animated counter component ─────────────────────────────────────────────────
function AnimatedCounter({
  target, suffix = "", duration = 1500, decimals = 0,
}: { target: number; suffix?: string; duration?: number; decimals?: number }) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(parseFloat((eased * target).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, decimals]);

  return <span ref={ref}>{value.toFixed(decimals)}{suffix}</span>;
}

// ── Scroll reveal component ──────────────────────────────────────────────────
function ScrollReveal({
  children, delay = 0, className = "",
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: scrolled ? "rgba(8,13,20,0.96)" : "rgba(8,13,20,0.7)",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent",
        transition: "background 300ms ease, border-color 300ms ease",
      }}
    >
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 24px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 16px rgba(6,182,212,0.4)",
            flexShrink: 0,
          }}>
            <Cpu size={18} color="white" className="animate-spin-slow" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9", lineHeight: 1 }}>SentinelIQ</p>
            <p style={{ fontSize: 10, color: "#64748b", marginTop: 2, lineHeight: 1 }}>NASA C-MAPSS · RUL Platform</p>
          </div>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex" style={{ alignItems: "center", gap: 32 }}>
          {["Features", "Performance", "How It Works", "Technology", "Try It"].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
              style={{ fontSize: 13, color: "#94a3b8", textDecoration: "none", transition: "color 150ms ease", fontWeight: 500 }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f1f5f9")}
              onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
            >{item}</a>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/login" style={{
            fontSize: 13, color: "#94a3b8", textDecoration: "none",
            padding: "7px 14px", transition: "color 150ms ease", fontWeight: 500,
            display: "none",
          }}
            className="hidden md:block"
            onMouseEnter={e => (e.currentTarget.style.color = "#f1f5f9")}
            onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
          >Sign In</Link>
          <Link href="/login" className="hover-btn-primary" style={{
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            color: "white", textDecoration: "none", borderRadius: 8,
            padding: "8px 18px", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 6,
            boxShadow: "0 0 16px rgba(6,182,212,0.25)",
          }}>
            Get Started <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

// DataUploadSection has been removed — see /upload dashboard page

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [heroLoaded, setHeroLoaded] = useState(false);
  const typeText = useTypewriter(
    ["Before It Happens.", "With Confidence.", "In Real-Time.", "At Scale."],
    75, 2000
  );

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="dark bg-[#080d14]" style={{ color: "#f1f5f9", minHeight: "100vh", overflowX: "hidden" }}>
      <LandingNav />

      {/* ════════════════════════════════════════════════════════════ HERO */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        position: "relative", paddingTop: 80, overflow: "hidden",
      }}>
        {/* Geometric Background requested by user, visible only on landing page */}
        <HeroGeometric badge="SentinelIQ UI" title1="Elevate Your" title2="Digital Vision" className="opacity-100 z-0" />

        {/* Particle canvas */}
        <ParticleCanvas />

        {/* Ambient orbs */}
        <div className="orb-1" style={{ top: "10%", left: "5%", zIndex: 1 }} />
        <div className="orb-2" style={{ top: "30%", right: "10%", zIndex: 1 }} />
        <div className="orb-3" style={{ bottom: "20%", left: "30%", zIndex: 1 }} />

        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          backgroundImage: "radial-gradient(circle, rgba(30,45,69,0.5) 1px, transparent 1px)",
          backgroundSize: "32px 32px", opacity: 0.35,
        }} />

        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          width: "100%", position: "relative", zIndex: 10,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "3rem",
            alignItems: "center",
          }}
            className="md:two-col-hero"
          >

            {/* Left: text */}
            <div style={{ textAlign: "center" }} className="hero-text-col">
              {/* Badge */}
              <div style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "var(--accent-glow)", border: "1px solid rgba(6,182,212,0.3)",
                  borderRadius: 99, padding: "6px 16px", marginBottom: 28,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} className="animate-pulse-ring" />
                  <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.06em" }}>
                    NASA C-MAPSS Certified · Phase 24 Live
                  </span>
                </div>
              </div>

              {/* Headline */}
              <div style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s",
              }}>
                <h1 style={{
                  fontSize: "clamp(2.6rem, 6vw, 4.2rem)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginBottom: "1.2rem",
                  letterSpacing: "-0.03em",
                }} className="flex flex-col items-center">
                  <SparklesText text="Predict Engine Failure" />
                  <span style={{
                    background: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #a855f7 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    display: "block", minHeight: "1.2em",
                  }}>
                    {typeText}
                    <span style={{
                      display: "inline-block", width: 3, height: "0.85em",
                      background: "#06b6d4", marginLeft: 2, verticalAlign: "middle",
                      animation: "blinkCursor 1s step-end infinite",
                    }} />
                  </span>
                </h1>
              </div>

              <div style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s",
              }}>
                <p style={{
                  fontSize: "1.1rem", color: "#94a3b8", lineHeight: 1.75,
                  maxWidth: 520, margin: "0 auto 2rem",
                }}>
                  Industrial-grade predictive maintenance powered by TCN deep learning.
                  Monitor your turbofan fleet in real-time with SHAP explainability and
                  MILP-optimized maintenance scheduling.
                </p>
              </div>

              {/* CTAs */}
              <div style={{
                display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 0.4s, transform 0.6s ease 0.4s",
              }}>
                <Link href="/login" className="hover-btn-primary" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color: "white", textDecoration: "none",
                  padding: "13px 26px", borderRadius: 10,
                  fontWeight: 700, fontSize: 15,
                  boxShadow: "0 0 24px rgba(6,182,212,0.35)",
                }}>
                  Enter Dashboard <ArrowRight size={16} />
                </Link>
                <Link href="/upload" className="hover-btn-ghost" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8",
                  textDecoration: "none", padding: "13px 26px", borderRadius: 10,
                  fontWeight: 600, fontSize: 15, background: "transparent",
                }}>
                  <Upload size={15} /> Try Live Upload
                </Link>
              </div>

              {/* Trust badges */}
              <div style={{
                display: "flex", gap: 20, marginTop: 32, flexWrap: "wrap", justifyContent: "center",
                opacity: heroLoaded ? 1 : 0,
                transition: "opacity 0.6s ease 0.55s",
              }}>
                {[
                  { icon: <Shield size={13} />, label: "NASA C-MAPSS Dataset" },
                  { icon: <Zap size={13} />, label: "< 500ms Inference" },
                  { icon: <Target size={13} />, label: "RMSE ≤ 13 Cycles" },
                ].map(({ icon, label }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 12 }}>
                    <span style={{ color: "var(--accent)" }}>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: live chart — hidden on mobile; shown from md */}
            <div
              className="hero-chart-col [perspective:1200px]"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateX(0)" : "translateX(30px)",
                transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
                display: "none",
              }}
            >
              <div className="[transform:rotateX(20deg)_rotateY(-10deg)] hover:[transform:rotateX(0deg)_rotateY(0deg)] transition-all duration-700 ease-out lg:-mr-12">
                <div className="relative skew-x-[.15rad] hover:skew-x-0 transition-all duration-700 ease-out">
                  <div style={{
                    background: "rgba(13,21,38,0.95)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 20, padding: "24px",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(6,182,212,0.06)",
                    backdropFilter: "blur(20px)",
                  }}>
                    {/* Card header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Engine #001 — RUL Degradation</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>30-cycle forecast · TCN ensemble model</p>
                  </div>
                  <div style={{
                    padding: "4px 10px", borderRadius: 99,
                    background: "rgba(239,68,68,0.12)", color: "#ef4444",
                    fontSize: 11, fontWeight: 700,
                    border: "1px solid rgba(239,68,68,0.25)",
                  }} className="animate-pulse-ring">
                    8 Cycles Remaining
                  </div>
                </div>

                <ResponsiveContainer width="100%" height={200} minWidth={0}>
                  <AreaChart data={heroChartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="hero-rul-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="cycle" tick={{ fill: "var(--text-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      contentStyle={{ background: "#0d1526", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v.toFixed(1)} cycles`, "RUL Remaining"]}
                      labelFormatter={(l) => `Cycle ${l}`}
                    />
                    <Area type="monotone" dataKey="rul" stroke="#06b6d4" strokeWidth={2}
                      fill="url(#hero-rul-grad)" isAnimationActive animationDuration={1500} />
                  </AreaChart>
                </ResponsiveContainer>

                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  {[
                    { label: "Current RUL", value: "8.4 cycles", color: "#ef4444" },
                    { label: "Anomaly Score", value: "0.81 Critical", color: "#ef4444" },
                    { label: "Model", value: "TCN Ensemble", color: "#06b6d4" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      flex: 1, padding: "10px 12px",
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <p style={{ fontSize: 10, color: "#64748b", marginBottom: 4, letterSpacing: "0.04em" }}>{label.toUpperCase()}</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

      {/* ════════════════════════════════════════════════════════════ STATS STRIP */}
      <section id="performance" style={{ padding: "5rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", textAlign: "center" }}>
              {[
                { value: 13, suffix: " cycles", label: "Best RMSE", desc: "TCN ensemble accuracy", color: "var(--accent)" },
                { value: 88, suffix: "%", label: "F1 Score", desc: "Anomaly detection accuracy", color: "#10b981", decimals: 0 },
                { value: 500, suffix: "ms", label: "Max Inference", desc: "End-to-end prediction time", color: "#a855f7" },
                { value: 4, suffix: "", label: "Failure Modes", desc: "HPC · LPT · Fan · Seal", color: "#f59e0b" },
              ].map(({ value, suffix, label, desc, color, decimals = 0 }) => (
                <div key={label} style={{
                  padding: "2rem 1.5rem",
                  background: "rgba(13,21,38,0.9)", borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "transform 250ms ease, box-shadow 250ms ease",
                }} className="hover-stat-card">
                  <div style={{ fontSize: "clamp(2.2rem, 4vw, 3rem)", fontWeight: 800, color, letterSpacing: "-0.03em" }}>
                    <AnimatedCounter target={value} suffix={suffix} decimals={decimals} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, color: "#f1f5f9" }}>{label}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>


      {/* ════════════════════════════════════════════════════════════ FEATURES */}
      <section id="features" style={{ padding: "6rem 0", background: "transparent" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                Capabilities
              </p>
              <h2 style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Everything your fleet needs
              </h2>
              <p style={{ fontSize: 16, color: "#94a3b8", marginTop: 14, maxWidth: 520, margin: "14px auto 0" }}>
                From raw sensor data to actionable maintenance decisions — fully automated.
              </p>
            </div>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              {
                icon: <TrendingDown size={24} />,
                title: "RUL Prediction",
                subtitle: "Know exactly how many cycles remain",
                desc: "TCN ensemble model achieves RMSE ≤ 13 cycles on NASA C-MAPSS. Bidirectional LSTM baseline included for comparison.",
                chart: (
                  <ResponsiveContainer width="100%" height={100} minWidth={1} minHeight={1}>
                    <AreaChart data={heroChartData.slice(0, 15)} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="feat-rul" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="rul" stroke="#06b6d4" strokeWidth={2}
                        fill="url(#feat-rul)" isAnimationActive animationDuration={2000} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ),
                color: "#06b6d4",
                delay: 0,
              },
              {
                icon: <AlertTriangle size={24} />,
                title: "Anomaly Detection",
                subtitle: "Catch failures before thresholds breach",
                desc: "Isolation Forest + Autoencoder ensemble achieves F1 ≥ 0.88. Real-time anomaly scoring with SHAP attribution.",
                chart: (
                  <ResponsiveContainer width="100%" height={100} minWidth={1} minHeight={1}>
                    <BarChart data={anomalyData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={2000}>
                        {anomalyData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ),
                color: "#f59e0b",
                delay: 150,
              },
              {
                icon: <Calendar size={24} />,
                title: "Maintenance Optimizer",
                subtitle: "MILP scheduling saves 10× failure cost",
                desc: "PuLP MILP solver optimizes maintenance windows. Preventive cost $5K vs failure cost $50K — maximise fleet availability.",
                chart: (
                  <ResponsiveContainer width="100%" height={100} minWidth={1} minHeight={1}>
                    <BarChart data={maintenanceData} layout="vertical" margin={{ top: 4, right: 0, bottom: 0, left: 60 }}>
                      <XAxis type="number" hide />
                      <YAxis type="category" dataKey="label" tick={{ fill: "var(--text-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={2000}>
                        <Cell fill="#ef4444" fillOpacity={0.85} />
                        <Cell fill="#10b981" fillOpacity={0.85} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ),
                color: "#10b981",
                delay: 300,
              },
            ].map(({ icon, title, subtitle, desc, chart, color, delay }) => (
              <ScrollReveal key={title} delay={delay}>
                <div className="hover-feature-card" style={{
                  background: "rgba(13,21,38,0.9)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 18, padding: "1.75rem", height: "100%",
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color, marginBottom: 18,
                  }} className="feature-icon">
                    {icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: "#f1f5f9" }}>{title}</h3>
                  <p style={{ fontSize: 13, color, fontWeight: 600, marginBottom: 10 }}>{subtitle}</p>
                  <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, marginBottom: 18 }}>{desc}</p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
                    {chart}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "6rem 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p style={{ fontSize: 12, color: "#06b6d4", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                How It Works
              </p>
              <h2 style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em",
                background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                From sensor to decision in 3 steps
              </h2>
            </div>
          </ScrollReveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2rem", position: "relative" }}>
            {[
              {
                step: "01",
                icon: <Activity size={28} />,
                title: "Sensor Ingestion",
                desc: "21 raw sensor readings per cycle from NASA C-MAPSS turbofan engines. Feature engineering computes RUL labels and normalises operating conditions.",
                color: "#06b6d4",
              },
              {
                step: "02",
                icon: <BarChart3 size={28} />,
                title: "Multi-Model Inference",
                desc: "TCN ensemble + BiLSTM + Multi-Task TCN run in parallel. Isolation Forest and Autoencoder score anomalies. SHAP DeepExplainer traces root causes.",
                color: "#3b82f6",
              },
              {
                step: "03",
                icon: <CheckCircle2 size={28} />,
                title: "Actionable Decisions",
                desc: "MILP scheduler optimises maintenance windows. NL root-cause reports generated per unit. Dashboard alerts operators in real-time.",
                color: "#a855f7",
              },
            ].map(({ step, icon, title, desc, color }, i) => (
              <ScrollReveal key={step} delay={i * 150}>
                <div style={{
                  textAlign: "center", padding: "2rem",
                  background: "rgba(13,21,38,0.6)", borderRadius: 18,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: `${color}15`, border: `2px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color, margin: "0 auto 1.25rem", fontSize: 28,
                    boxShadow: `0 0 24px ${color}25`,
                  }}>
                    {icon}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color,
                    textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10,
                  }}>{step}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: "#f1f5f9" }}>{title}</h3>
                  <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ TECH STRIP */}
      <section id="technology" style={{ padding: "4rem 0", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <p style={{ textAlign: "center", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2rem", fontWeight: 600 }}>
              Powered By
            </p>
          </ScrollReveal>
          <div style={{ overflow: "hidden" }}>
            <div className="marquee-track">
              {[...Array(2)].map((_, pass) =>
                ["PyTorch", "NASA C-MAPSS", "TCN Ensemble", "SHAP DeepExplainer", "PuLP MILP", "FastAPI", "Next.js 15", "PostgreSQL", "Isolation Forest", "Autoencoder"].map((tech) => (
                  <div key={`${pass}-${tech}`} style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "8px 22px", borderRadius: 99,
                    background: "rgba(13,21,38,0.9)", border: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 13, fontWeight: 500, color: "#94a3b8",
                    whiteSpace: "nowrap",
                  }}>
                    <Cpu size={12} style={{ color: "var(--accent)" }} />
                    {tech}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Data upload moved to /upload dashboard page */}

      {/* ════════════════════════════════════════════════════════════ FINAL CTA */}
      <section style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <ScrollReveal>
            <div style={{
              background: "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))",
              border: "1px solid rgba(6,182,212,0.2)",
              borderRadius: 24, padding: "4rem 3rem",
              boxShadow: "0 0 80px rgba(6,182,212,0.06)",
              position: "relative", overflow: "hidden",
            }}>
              <div className="orb-1" style={{ top: "-60%", left: "10%", opacity: 0.4 }} />
              <h2 style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800,
                letterSpacing: "-0.03em", marginBottom: "1rem", position: "relative",
                background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                Start monitoring your fleet today
              </h2>
              <p style={{ fontSize: 16, color: "#94a3b8", marginBottom: "2.5rem", lineHeight: 1.7, position: "relative" }}>
                Predict failures before they happen. Reduce maintenance costs.<br />
                Keep your turbofan fleet operational.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
                <Link href="/login" className="hover-btn-primary" style={{
                  display: "inline-flex", alignItems: "center", gap: 10,
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  color: "white", textDecoration: "none",
                  padding: "14px 32px", borderRadius: 12,
                  fontWeight: 700, fontSize: 16,
                  boxShadow: "0 0 32px rgba(6,182,212,0.35)",
                }}>
                  Enter Dashboard <ChevronRight size={18} />
                </Link>
                <Link href="/upload" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid rgba(255,255,255,0.15)", color: "#94a3b8",
                  textDecoration: "none", padding: "14px 28px", borderRadius: 12,
                  fontWeight: 600, fontSize: 15, background: "transparent",
                }} className="hover-btn-ghost">
                  <Upload size={15} /> Try Live Upload
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "2.5rem 0" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Cpu size={14} color="white" />
              </div>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>SentinelIQ v2.0 · NASA C-MAPSS Platform</span>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <a href="https://github.com/Ibadat-Ali86/sentinel-iq-cmpass-nasa-rul-prediction"
                target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", textDecoration: "none", transition: "color 150ms ease" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
              >
                <Star size={13} /> GitHub
              </a>
              <Link href="/login" style={{ fontSize: 13, color: "#64748b", textDecoration: "none", transition: "color 150ms ease", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}
              >Sign In</Link>
            </div>
            <p style={{ fontSize: 12, color: "#334155" }}>© 2026 Ibadat Ali · MIT License</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
