"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Cpu, Activity, AlertTriangle, Calendar, BarChart3,
  ArrowRight, ChevronRight, Shield, Zap, Target,
  Star, CheckCircle2, TrendingDown, Upload, Sun, Moon, Menu, X,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { SparklesText } from "@/components/ui/sparkles-text";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { TurbofanEngineHero } from "@/components/ui/turbofan-engine-hero";
import { useTheme } from "@/context/ThemeContext";
import { fetchHealth } from "@/lib/api";

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
function ParticleCanvas({ isDark }: { isDark: boolean }) {
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

    const DARK_COLORS = ["#06b6d4", "#3b82f6", "#a855f7", "#10b981"];
    const LIGHT_COLORS = ["#0891b2", "#2563eb", "#7c3aed", "#059669"];
    const COLORS = isDark ? DARK_COLORS : LIGHT_COLORS;

    const particles: Particle[] = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.2 + 0.6,
      alpha: isDark ? Math.random() * 0.5 + 0.15 : Math.random() * 0.3 + 0.08,
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

      // Connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            const lineAlpha = isDark
              ? 0.12 * (1 - dist / 130)
              : 0.07 * (1 - dist / 130);
            ctx.strokeStyle = `rgba(6,182,212,${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
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
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 2,
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
      { threshold: 0.08 }
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
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.4,0,0.2,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ── Navigation ────────────────────────────────────────────────────────────────
function LandingNav({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Close mobile menu on route change / resize
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const navBg = isDark
    ? (scrolled ? "rgba(8,13,20,0.96)" : "rgba(8,13,20,0.72)")
    : (scrolled ? "rgba(248,250,252,0.96)" : "rgba(248,250,252,0.80)");

  const navBorder = scrolled
    ? (isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,23,42,0.10)")
    : "1px solid transparent";

  const textColor = isDark ? "#94a3b8" : "#64748b";
  const textHover = isDark ? "#f1f5f9" : "#0f172a";
  const logoText = isDark ? "#f1f5f9" : "#0f172a";

  const navLinks = ["Features", "Performance", "How It Works", "Technology"];

  return (
    <>
      <nav
        id="main-nav"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: navBg,
          borderBottom: navBorder,
          transition: "background 300ms ease, border-color 300ms ease",
        }}
      >
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 20px",
          height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 16px rgba(6,182,212,0.40)",
              flexShrink: 0,
            }}>
              <Cpu size={18} color="white" className="animate-spin-slow" />
            </div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 15, color: logoText, lineHeight: 1 }}>SentinelIQ</p>
              <p style={{ fontSize: 10, color: textColor, marginTop: 2, lineHeight: 1 }}>NASA C-MAPSS · RUL Platform</p>
            </div>
          </div>

          {/* Desktop nav links */}
          <div
            className="hidden md:flex"
            style={{ alignItems: "center", gap: 28 }}
          >
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
                style={{
                  fontSize: 13, color: textColor,
                  textDecoration: "none", transition: "color 150ms ease", fontWeight: 500,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = textHover)}
                onMouseLeave={e => (e.currentTarget.style.color = textColor)}
              >{item}</a>
            ))}
          </div>

          {/* Right CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Theme toggle */}
            <button
              id="landing-theme-toggle"
              onClick={onToggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: textColor,
                transition: "all 200ms ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = textHover;
                (e.currentTarget as HTMLButtonElement).style.background = isDark
                  ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = textColor;
                (e.currentTarget as HTMLButtonElement).style.background = isDark
                  ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
              }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Sign in — desktop only */}
            <Link
              href="/login"
              className="hidden md:block"
              style={{
                fontSize: 13, color: textColor, textDecoration: "none",
                padding: "7px 14px", transition: "color 150ms ease", fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.color = textHover)}
              onMouseLeave={e => (e.currentTarget.style.color = textColor)}
            >Sign In</Link>

            {/* Get started CTA */}
            <Link href="/login" className="hover-btn-primary hidden md:flex" style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "white", textDecoration: "none", borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 700,
              alignItems: "center", gap: 6,
              boxShadow: "0 0 16px rgba(6,182,212,0.28)",
            }}>
              Get Started <ArrowRight size={13} />
            </Link>

            {/* Mobile hamburger */}
            <button
              id="landing-mobile-menu-toggle"
              className="flex md:hidden"
              onClick={() => setMobileMenuOpen(v => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
                border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid rgba(15,23,42,0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: textColor,
                transition: "all 200ms ease",
              }}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div
            id="landing-mobile-menu"
            className="flex md:hidden"
            style={{
              flexDirection: "column",
              padding: "12px 20px 20px",
              background: isDark ? "rgba(8,13,20,0.98)" : "rgba(248,250,252,0.98)",
              borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)",
              gap: 4,
              animation: "slideDown 0.2s ease both",
            }}
          >
            {navLinks.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block", padding: "11px 14px",
                  fontSize: 15, color: isDark ? "#cbd5e1" : "#475569",
                  fontWeight: 500, textDecoration: "none",
                  borderRadius: 8, transition: "all 150ms ease",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background =
                    isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
                  (e.currentTarget as HTMLAnchorElement).style.color = isDark ? "#f1f5f9" : "#0f172a";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                  (e.currentTarget as HTMLAnchorElement).style.color = isDark ? "#cbd5e1" : "#475569";
                }}
              >{item}</a>
            ))}
            <div style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)", marginTop: 8, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "11px",
                  border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(15,23,42,0.12)",
                  borderRadius: 8, fontSize: 14, color: isDark ? "#94a3b8" : "#64748b",
                  textDecoration: "none", fontWeight: 500,
                }}
              >Sign In</Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px",
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  borderRadius: 8, fontSize: 14, color: "white",
                  textDecoration: "none", fontWeight: 700,
                  boxShadow: "0 0 16px rgba(6,182,212,0.28)",
                }}
              >
                Enter Dashboard <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const [heroLoaded, setHeroLoaded] = useState(false);
  const typeText = useTypewriter(
    ["Before It Happens.", "With Confidence.", "In Real-Time.", "At Scale."],
    75, 2000
  );

  useEffect(() => {
    const t = setTimeout(() => setHeroLoaded(true), 100);
    
    // Silently ping the Hugging Face space to wake it up while the user reads the page
    fetchHealth().catch(() => {
      // Intentionally ignoring errors here, it's just a background warmup ping
      console.log("Warmup ping fired...");
    });
    
    return () => clearTimeout(t);
  }, []);

  // ── Dynamic theme colors ──────────────────────────────────────────────────
  const bg = isDark ? "#080d14" : "#f0f4f8";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";
  const textMuted = isDark ? "#64748b" : "#94a3b8";
  const cardBg = isDark ? "rgba(13,21,38,0.90)" : "rgba(255,255,255,0.92)";
  const cardBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)";
  const sectionBorder = isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)";
  const statsBg = isDark ? "rgba(13,21,38,0.90)" : "rgba(255,255,255,0.88)";

  return (
    <div
      id="landing-page"
      style={{ background: bg, color: textPrimary, minHeight: "100vh", overflowX: "hidden" }}
    >
      <LandingNav isDark={isDark} onToggleTheme={toggleTheme} />

      {/* ════════════════════════════════════════════════════════════ HERO */}
      <section
        id="hero"
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          position: "relative", paddingTop: 80, overflow: "hidden",
        }}
      >
        {/* Geometric glow background */}
        <HeroGeometric className="opacity-100 z-0" />

        {/* Particle network canvas */}
        <ParticleCanvas isDark={isDark} />

        {/* Ambient orbs */}
        <div className="orb-1" style={{ top: "10%", left: "5%" }} />
        <div className="orb-2" style={{ top: "30%", right: "8%" }} />
        <div className="orb-3" style={{ bottom: "15%", left: "32%" }} />

        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3,
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(30,45,69,0.5) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(15,23,42,0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px", opacity: 0.4,
          pointerEvents: "none",
        }} />

        {/* Bottom fade for section transition */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 180, zIndex: 4,
          background: isDark
            ? "linear-gradient(to bottom, transparent, #080d14)"
            : "linear-gradient(to bottom, transparent, #f0f4f8)",
          pointerEvents: "none",
        }} />

        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "0 24px",
          width: "100%", position: "relative", zIndex: 10,
        }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "center" }}
            className="md:two-col-hero"
          >
            {/* Left: text content */}
            <div style={{ textAlign: "center" }} className="hero-text-col">
              {/* Live badge */}
              <div style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(16px)",
                transition: "opacity 0.5s ease, transform 0.5s ease",
              }}>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: isDark ? "rgba(6,182,212,0.10)" : "rgba(8,145,178,0.08)",
                  border: isDark ? "1px solid rgba(6,182,212,0.30)" : "1px solid rgba(8,145,178,0.25)",
                  borderRadius: 99, padding: "6px 16px", marginBottom: 28,
                }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981" }} className="animate-pulse-ring" />
                  <span style={{ fontSize: 12, color: isDark ? "#06b6d4" : "#0891b2", fontWeight: 700, letterSpacing: "0.06em" }}>
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
                  fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
                  fontWeight: 800, lineHeight: 1.1,
                  marginBottom: "1.2rem", letterSpacing: "-0.03em",
                }} className="flex flex-col items-center">
                  <SparklesText text="Predict Engine Failure" />
                  <span className={`bg-clip-text text-transparent bg-gradient-to-br ${isDark ? "from-cyan-500 via-blue-500 to-purple-500" : "from-cyan-600 via-blue-600 to-purple-600"}`} style={{
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

              {/* Sub-copy */}
              <div style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s",
              }}>
                <p style={{
                  fontSize: "1.05rem", color: isDark ? "#e2e8f0" : "#475569", lineHeight: 1.75,
                  maxWidth: 520, margin: "0 auto 2rem", fontWeight: 500
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
                  boxShadow: "0 0 28px rgba(6,182,212,0.40)",
                }}>
                  Enter Dashboard <ArrowRight size={16} />
                </Link>
                <Link href="/upload" className="hover-btn-ghost" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: isDark ? "1px solid rgba(255,100,100,0.0)" : "1px solid rgba(15,23,42,0.15)",
                  background: isDark ? "rgba(255,255,255,0.08)" : "transparent",
                  color: isDark ? "#ffffff" : textSecondary,
                  textDecoration: "none", padding: "13px 26px", borderRadius: 10,
                  fontWeight: 600, fontSize: 15,
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
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, color: textMuted, fontSize: 12 }}>
                    <span style={{ color: isDark ? "#06b6d4" : "#0891b2" }}>{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Turbofan Engine 3D Hero Visual */}
            <div
              className="hero-chart-col"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? "translateX(0)" : "translateX(30px)",
                transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
              }}
            >
              <TurbofanEngineHero
                rul={38.4}
                anomalyScore={0.72}
                isLoaded={heroLoaded}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ STATS STRIP */}
      <section id="performance" style={{ padding: "5rem 0", borderTop: `1px solid ${sectionBorder}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", textAlign: "center" }}>
              {[
                { value: 13, suffix: " cycles", label: "Best RMSE", desc: "TCN ensemble accuracy", color: isDark ? "#06b6d4" : "#0891b2" },
                { value: 88, suffix: "%", label: "F1 Score", desc: "Anomaly detection accuracy", color: "#10b981" },
                { value: 500, suffix: "ms", label: "Max Inference", desc: "End-to-end prediction time", color: "#a855f7" },
                { value: 4, suffix: "", label: "Failure Modes", desc: "HPC · LPT · Fan · Seal", color: "#f59e0b" },
              ].map(({ value, suffix, label, desc, color, decimals = 0 } : { value: number; suffix: string; label: string; desc: string; color: string; decimals?: number }) => (
                <div key={label} style={{
                  padding: "2rem 1.5rem",
                  background: statsBg, borderRadius: 14,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: isDark ? "none" : "0 2px 12px rgba(15,23,42,0.05)",
                  transition: "transform 250ms ease, box-shadow 250ms ease",
                }} className="hover-stat-card">
                  <div style={{ fontSize: "clamp(2.2rem, 4vw, 3rem)", fontWeight: 800, color, letterSpacing: "-0.03em" }}>
                    <AnimatedCounter target={value} suffix={suffix} decimals={decimals} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8, color: textPrimary }}>{label}</div>
                  <div style={{ fontSize: 12, color: textSecondary, marginTop: 4 }}>{desc}</div>
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
              <p style={{ fontSize: 12, color: isDark ? "#06b6d4" : "#0891b2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                Capabilities
              </p>
              <h2 className={`bg-clip-text text-transparent bg-gradient-to-br ${isDark ? "from-slate-100 to-slate-400" : "from-slate-900 to-slate-600"}`} style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em",
                display: "inline-block"
              }}>
                Everything your fleet needs
              </h2>
              <p style={{ fontSize: 16, color: isDark ? "#cbd5e1" : "#475569", marginTop: 14, maxWidth: 520, margin: "14px auto 0", fontWeight: 500 }}>
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
                      <YAxis type="category" dataKey="label" tick={{ fill: textSecondary, fontSize: 10 }} axisLine={false} tickLine={false} />
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
                  background: cardBg,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: isDark ? "none" : "0 2px 16px rgba(15,23,42,0.06)",
                  borderRadius: 18, padding: "1.75rem", height: "100%",
                  position: "relative",
                }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color, marginBottom: 18,
                  }} className="feature-icon">
                    {icon}
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: textPrimary }}>{title}</h3>
                  <p style={{ fontSize: 13, color, fontWeight: 600, marginBottom: 10 }}>{subtitle}</p>
                  <p style={{ fontSize: 13, color: isDark ? "#cbd5e1" : textSecondary, lineHeight: 1.7, marginBottom: 18, fontWeight: 500 }}>{desc}</p>
                  <div style={{ borderTop: `1px solid ${cardBorder}`, paddingTop: 16 }}>
                    {chart}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ HOW IT WORKS */}
      <section id="how-it-works" style={{ padding: "6rem 0", borderTop: `1px solid ${sectionBorder}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p style={{ fontSize: 12, color: isDark ? "#06b6d4" : "#0891b2", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                How It Works
              </p>
              <h2 className={`bg-clip-text text-transparent bg-gradient-to-br ${isDark ? "from-slate-100 to-slate-400" : "from-slate-900 to-slate-600"}`} style={{
                fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em",
                display: "inline-block"
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
                color: isDark ? "#06b6d4" : "#0891b2",
              },
              {
                step: "02",
                icon: <BarChart3 size={28} />,
                title: "Multi-Model Inference",
                desc: "TCN ensemble + BiLSTM + Multi-Task TCN run in parallel. Isolation Forest and Autoencoder score anomalies. SHAP DeepExplainer traces root causes.",
                color: isDark ? "#3b82f6" : "#2563eb",
              },
              {
                step: "03",
                icon: <CheckCircle2 size={28} />,
                title: "Actionable Decisions",
                desc: "MILP scheduler optimises maintenance windows. NL root-cause reports generated per unit. Dashboard alerts operators in real-time.",
                color: isDark ? "#a855f7" : "#7c3aed",
              },
            ].map(({ step, icon, title, desc, color }, i) => (
              <ScrollReveal key={step} delay={i * 150}>
                <div style={{
                  textAlign: "center", padding: "2rem",
                  background: cardBg, borderRadius: 18,
                  border: `1px solid ${cardBorder}`,
                  boxShadow: isDark ? "none" : "0 2px 12px rgba(15,23,42,0.05)",
                }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: "50%",
                    background: `${color}15`, border: `2px solid ${color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color, margin: "0 auto 1.25rem",
                    boxShadow: `0 0 28px ${color}28`,
                  }}>
                    {icon}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color,
                    textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10,
                  }}>{step}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: textPrimary }}>{title}</h3>
                  <p style={{ fontSize: 14, color: isDark ? "#cbd5e1" : textSecondary, lineHeight: 1.7, fontWeight: 500 }}>{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ TECH STRIP */}
      <section id="technology" style={{ padding: "4rem 0", borderTop: `1px solid ${sectionBorder}`, overflow: "hidden" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <ScrollReveal>
            <p style={{ textAlign: "center", fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "2rem", fontWeight: 600 }}>
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
                    background: cardBg, border: `1px solid ${cardBorder}`,
                    fontSize: 13, fontWeight: 500, color: textSecondary,
                    whiteSpace: "nowrap",
                  }}>
                    <Cpu size={12} style={{ color: isDark ? "#06b6d4" : "#0891b2" }} />
                    {tech}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ FINAL CTA */}
      <section id="try-it" style={{ padding: "6rem 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <ScrollReveal>
            <div style={{
              background: isDark
                ? "linear-gradient(135deg, rgba(6,182,212,0.08), rgba(59,130,246,0.08))"
                : "linear-gradient(135deg, rgba(8,145,178,0.06), rgba(37,99,235,0.06))",
              border: isDark ? "1px solid rgba(6,182,212,0.20)" : "1px solid rgba(8,145,178,0.15)",
              borderRadius: 24, padding: "4rem 3rem",
              boxShadow: isDark ? "0 0 80px rgba(6,182,212,0.06)" : "0 8px 40px rgba(15,23,42,0.06)",
              position: "relative", overflow: "hidden",
            }}>
              <div className="orb-1" style={{ top: "-60%", left: "10%", opacity: 0.35 }} />
              <h2 className={`bg-clip-text text-transparent bg-gradient-to-br ${isDark ? "from-slate-100 to-slate-400" : "from-slate-900 to-slate-600"}`} style={{
                fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800,
                letterSpacing: "-0.03em", marginBottom: "1rem", position: "relative",
                display: "inline-block"
              }}>
                Start monitoring your fleet today
              </h2>
              <p style={{ fontSize: 16, color: isDark ? "#e2e8f0" : textSecondary, marginBottom: "2.5rem", lineHeight: 1.7, position: "relative", fontWeight: 500 }}>
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
                  border: isDark ? "1px solid rgba(255,255,255,0.0)" : "1px solid rgba(15,23,42,0.15)",
                  background: isDark ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isDark ? "#ffffff" : textSecondary,
                  textDecoration: "none", padding: "14px 28px", borderRadius: 12,
                  fontWeight: 600, fontSize: 15,
                }} className="hover-btn-ghost">
                  <Upload size={15} /> Try Live Upload
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${sectionBorder}`, padding: "2.5rem 0" }}>
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
              <span style={{ fontSize: 13, color: textMuted, fontWeight: 500 }}>SentinelIQ v2.0 · NASA C-MAPSS Platform</span>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <a
                href="https://github.com/Ibadat-Ali86/sentinel-iq-cmpass-nasa-rul-prediction"
                target="_blank" rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: textMuted, textDecoration: "none", transition: "color 150ms ease" }}
                onMouseEnter={e => (e.currentTarget.style.color = textSecondary)}
                onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
              >
                <Star size={13} /> GitHub
              </a>
              <Link href="/login" style={{ fontSize: 13, color: textMuted, textDecoration: "none", transition: "color 150ms ease", fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = textSecondary)}
                onMouseLeave={e => (e.currentTarget.style.color = textMuted)}
              >Sign In</Link>
            </div>
            <p style={{ fontSize: 12, color: textMuted }}>© 2026 Ibadat Ali · MIT License</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
