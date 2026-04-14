"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/Sidebar";
import { Cpu } from "lucide-react";

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)", flexDirection: "column", gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 24px rgba(6,182,212,0.4)",
      }}>
        <Cpu size={24} color="white" className="animate-spin-slow" />
      </div>
      <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading SentinelIQ...</p>
    </div>
  );
}

/**
 * DashboardLayout — wraps all protected pages.
 * Handles auth redirect, sidebar rendering, and ambient background.
 * Usage: wrap any page content in <DashboardLayout>...</DashboardLayout>
 */
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return <LoadingScreen />;

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: "var(--bg)",
    }}>
      {/* Ambient glows */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: 0, left: "25%",
          width: 384, height: 384, borderRadius: "50%",
          background: "rgba(6,182,212,0.04)", filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: 0, right: "25%",
          width: 384, height: 384, borderRadius: "50%",
          background: "rgba(59,130,246,0.04)", filter: "blur(60px)",
        }} />
      </div>

      <Sidebar />

      <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}
