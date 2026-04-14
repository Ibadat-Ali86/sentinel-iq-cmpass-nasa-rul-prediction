"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { RefreshCw, Wifi, WifiOff, Sun, Moon, Bell, X, CheckCheck } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { timeAgo } from "@/lib/utils";

interface TopbarProps {
  title: string;
  subtitle?: string;
  lastUpdated?: Date | null;
  backendOnline?: boolean;
  onRefresh?: () => void;
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { notifications, markAllRead, markRead, clearAll } = useNotifications();
  const levelColor = { critical: "var(--critical)", warning: "var(--warning)", info: "var(--accent)" };
  const levelBg = { critical: "var(--critical-bg)", warning: "var(--warning-bg)", info: "var(--accent-glow)" };

  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0,
      width: 360, maxHeight: 480, borderRadius: 14,
      background: "var(--bg-card)", border: "1px solid var(--border)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
      zIndex: 100, overflow: "hidden",
      animation: "scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Notifications</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={markAllRead} title="Mark all read" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 11, display: "flex", alignItems: "center", gap: 4,
            transition: "color 150ms ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <CheckCheck size={12} /> All read
          </button>
          <button onClick={clearAll} title="Clear all" style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", fontSize: 11, transition: "color 150ms ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--critical)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >Clear</button>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
          }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", maxHeight: 400 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            No notifications
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id}
              onClick={() => markRead(n.id)}
              className="hover-alert-row"
              style={{
                padding: "12px 16px", borderBottom: "1px solid var(--border)",
                display: "flex", gap: 12, cursor: "pointer",
                opacity: n.read ? 0.6 : 1,
              }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50", marginTop: 5, flexShrink: 0,
                background: n.read ? "var(--text-subtle)" : levelColor[n.level],
              }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{n.title}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{n.message}</p>
                <p style={{ fontSize: 10, color: "var(--text-subtle)", marginTop: 4 }}>{timeAgo(n.timestamp.toISOString())}</p>
              </div>
              {!n.read && (
                <div style={{
                  width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: levelColor[n.level],
                }} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function Topbar({ title, subtitle, lastUpdated, backendOnline = false, onRefresh }: TopbarProps) {
  const [timeStr, setTimeStr] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (lastUpdated) setTimeStr(lastUpdated.toLocaleTimeString());
  }, [lastUpdated]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifs]);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <header className="topbar">
      {/* Left: title */}
      <div>
        <h1 className="topbar__title">{title}</h1>
        {subtitle && (
          <p className="topbar__subtitle">{subtitle}</p>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Backend status pill — de-emphasized in demo mode */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: backendOnline ? "4px 10px" : "3px 9px",
          borderRadius: 99,
          fontSize: backendOnline ? 12 : 11,
          fontWeight: 600,
          background: backendOnline ? "var(--color-success-bg)" : "transparent",
          color: backendOnline ? "var(--color-success)" : "var(--text-tertiary)",
          border: `1px solid ${backendOnline ? "rgba(34,197,94,0.3)" : "var(--border-subtle)"}`,
          opacity: backendOnline ? 1 : 0.75,
        }}>
          {backendOnline ? (
            <>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-success)" }} className="animate-pulse-ring" />
              <Wifi size={11} /> Live
            </>
          ) : (
            <>
              <WifiOff size={11} /> Demo
            </>
          )}
        </div>

        {/* Last updated */}
        {timeStr && (
          <span style={{ fontSize: 11, color: "var(--text-subtle)" }}>Updated {timeStr}</span>
        )}

        {/* Refresh */}
        {onRefresh && (
          <button onClick={handleRefresh} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: "var(--bg-hover)", border: "1px solid var(--border)",
            color: "var(--text-muted)", cursor: "pointer",
            transition: "all 150ms ease",
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <RefreshCw size={13} style={{ transition: "transform 600ms ease", transform: spinning ? "rotate(360deg)" : "rotate(0deg)" }} />
            Refresh
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          aria-pressed={theme === "light"}
          style={{
            width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border-default)",
            background: "var(--surface-tertiary)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-tertiary)", transition: "all var(--duration-fast) ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notification bell */}
        <div style={{ position: "relative" }} ref={panelRef}>
          <button
            onClick={() => setShowNotifs((p) => !p)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={showNotifs}
            className={unreadCount > 0 ? "animate-notification-bounce" : ""}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid var(--border-default)",
              background: showNotifs ? "var(--accent-glow)" : "var(--surface-tertiary)",
              cursor: "pointer", position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-tertiary)", transition: "all var(--duration-fast) ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={e => { if (!showNotifs) { e.currentTarget.style.color = "var(--text-tertiary)"; e.currentTarget.style.borderColor = "var(--border-default)"; }}}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                width: 16, height: 16, borderRadius: "50%",
                background: "var(--critical)", color: "white",
                fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--bg-card)",
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && <NotificationPanel onClose={() => setShowNotifs(false)} />}
        </div>

        {/* User avatar */}
        {user && (
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "5px 10px 5px 6px", borderRadius: 99,
              background: "var(--bg-hover)", border: "1px solid var(--border)",
              cursor: "pointer", transition: "all 150ms ease",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 99,
                background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "white",
              }}>
                {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", lineHeight: 1 }}>{user.name.split(" ")[0]}</p>
                <p style={{ fontSize: 10, color: "var(--text-subtle)", lineHeight: 1, marginTop: 1 }}>{user.role}</p>
              </div>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
