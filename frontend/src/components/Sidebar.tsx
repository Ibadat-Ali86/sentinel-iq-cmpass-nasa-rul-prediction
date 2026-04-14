"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, AlertTriangle, BarChart3, Calendar, Activity,
  Cpu, ChevronRight, Sun, Moon, LogOut, Menu, X, Bell, Upload,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { getRoleLabel, getRoleBadgeClass } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Fleet overview" },
  { href: "/upload", label: "Data Upload", icon: Upload, desc: "Run model inference" },
  { href: "/anomalies", label: "Anomaly Alerts", icon: AlertTriangle, desc: "Real-time alerts" },
  { href: "/shap",      label: "Feature Importance", icon: BarChart3, desc: "SHAP analysis" },
  { href: "/maintenance", label: "Maintenance", icon: Calendar, desc: "Work order queue" },
  { href: "/health",    label: "System Health", icon: Activity, desc: "Model status" },
];


function UserAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 3,
      background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "white",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const [mobileOpen, setMobileOpen] = useState(false);

  const criticalCount = unreadCount;

  const sidebar = (
    <aside style={{
      width: 256, flexShrink: 0, display: "flex", flexDirection: "column",
      background: "var(--bg-card)", borderRight: "1px solid var(--border)",
      height: "100%", position: "relative", zIndex: 20,
    }}>
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 20px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(6,182,212,0.3)",
            position: "relative",
          }}>
            <Cpu size={18} color="white" className="animate-spin-slow" />
            <span style={{
              position: "absolute", top: -2, right: -2,
              width: 10, height: 10, borderRadius: "50%",
              background: "#10b981", border: "2px solid var(--bg-card)",
            }} className="animate-pulse-ring" />
          </div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 14, color: "var(--text)", lineHeight: 1 }}>SentinelIQ</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>RUL Monitoring Platform</p>
          </div>
        </Link>

        {/* Mobile close */}
        <button className="lg:hidden" onClick={() => setMobileOpen(false)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--text-muted)", padding: 4,
        }}>
          <X size={18} />
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-subtle)", fontWeight: 600, padding: "4px 10px 8px" }}>
          Navigation
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          const showBadge = href === "/anomalies" && criticalCount > 0;

          return (
            <Link key={href} href={href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px 9px 14px",
                borderRadius: 9, textDecoration: "none",
                background: active ? "var(--accent-glow)" : "transparent",
                border: `1px solid ${active ? "rgba(6,182,212,0.25)" : "transparent"}`,
                color: active ? "var(--accent)" : "var(--text-secondary)",
                transition: "all var(--duration-fast) ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-primary)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}}
            >
              {/* Active left bar indicator */}
              {active && (
                <span style={{
                  position: "absolute", left: 0, top: "20%", bottom: "20%",
                  width: 3, borderRadius: "0 3px 3px 0",
                  background: "var(--accent)",
                }} />
              )}
              <Icon size={16} style={{ flexShrink: 0, color: active ? "var(--accent)" : "inherit" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: active ? 700 : 500, lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{desc}</p>
              </div>
              {showBadge && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                  background: "var(--color-critical-bg)", color: "var(--color-critical)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}>
                  {criticalCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Notifications quick link ─────────────────────────────── */}
      {criticalCount > 0 && (
        <div style={{
          margin: "0 10px", padding: "10px 12px", borderRadius: 10,
          background: "var(--critical-bg)", border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
        }} className="animate-scale-in">
          <Bell size={14} style={{ color: "var(--critical)", flexShrink: 0 }} className="animate-notification-bounce" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--critical)" }}>
              {criticalCount} Unread Alert{criticalCount !== 1 ? "s" : ""}
            </p>
            <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Critical engines require attention</p>
          </div>
        </div>
      )}

      {/* ── Theme toggle ─────────────────────────────────────────── */}
      <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)" }}>
        <button onClick={toggleTheme} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 9, border: "none",
          background: "transparent", cursor: "pointer",
          color: "var(--text-muted)", transition: "all 150ms ease",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <div style={{
            width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 400ms ease",
          }} className={theme === "dark" ? "" : "animate-spin-slow"}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </div>
          <span style={{ fontSize: 13, fontWeight: 500 }}>
            {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </span>
        </button>
      </div>

      {/* ── User profile ─────────────────────────────────────────── */}
      {user && (
        <div style={{
          padding: "12px 10px", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <UserAvatar name={user.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.name}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <span className={getRoleBadgeClass(user.role)} style={{
                fontSize: 10, padding: "1px 6px", borderRadius: 99, fontWeight: 600,
              }}>
                {getRoleLabel(user.role)}
              </span>
            </div>
          </div>
          <button onClick={logout} title="Sign out" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-subtle)", padding: 6, borderRadius: 6,
            transition: "all 150ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--critical)"; e.currentTarget.style.background = "var(--critical-bg)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-subtle)"; e.currentTarget.style.background = "transparent"; }}
          >
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: "8px 20px", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 10, color: "var(--text-subtle)", textAlign: "center" }}>
          SentinelIQ v2.0 · NASA C-MAPSS
        </p>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        style={{
          position: "fixed", top: 16, left: 16, zIndex: 50,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "8px", cursor: "pointer",
          color: "var(--text)",
        }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden"
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 30,
            background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* Desktop sidebar — always visible */}
      <div className="hidden lg:block" style={{ height: "100%" }}>
        {sidebar}
      </div>

      {/* Mobile sidebar — slides in */}
      <div
        className="fixed lg:hidden"
        style={{
          top: 0, left: 0, bottom: 0, zIndex: 40,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 250ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {sidebar}
      </div>
    </>
  );
}
