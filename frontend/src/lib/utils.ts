import { type ClassValue, clsx } from "clsx";

// clsx not installed — inline implementation
export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat(Infinity)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Severity helpers ──────────────────────────────────────────────────────────

export type Severity = "normal" | "warning" | "critical";

export interface SeverityConfig {
  label: string;          // "Critical — Take Offline"
  shortLabel: string;     // "Critical"
  action: string;         // "Immediate overhaul required"
  color: string;          // Tailwind/CSS color name
  bgClass: string;
  textClass: string;
  badgeClass: string;
}

export function getSeverityConfig(severity: Severity): SeverityConfig {
  switch (severity) {
    case "critical":
      return {
        label: "Critical — Take Offline Immediately",
        shortLabel: "Critical",
        action: "Immediate overhaul required — remove from service",
        color: "critical",
        bgClass: "bg-[var(--critical-bg)]",
        textClass: "text-[var(--critical)]",
        badgeClass: "badge-critical",
      };
    case "warning":
      return {
        label: "Warning — Inspect Within 48 Hours",
        shortLabel: "Warning",
        action: "Schedule inspection and parts check within 48 hours",
        color: "warning",
        bgClass: "bg-[var(--warning-bg)]",
        textClass: "text-[var(--warning)]",
        badgeClass: "badge-warning",
      };
    default:
      return {
        label: "Normal — Fully Operational",
        shortLabel: "Normal",
        action: "Continue normal operation — no action required",
        color: "success",
        bgClass: "bg-[var(--success-bg)]",
        textClass: "text-[var(--success)]",
        badgeClass: "badge-normal",
      };
  }
}

// ── RUL formatting ────────────────────────────────────────────────────────────

export function formatCycles(rul: number): string {
  if (rul <= 0) return "0 cycles — FAILED";
  if (rul < 10) return `${rul.toFixed(1)} cycles remaining — CRITICAL`;
  if (rul < 30) return `${Math.round(rul)} cycles remaining`;
  return `${Math.round(rul)} cycles remaining`;
}

export function formatCyclesShort(rul: number): string {
  if (rul <= 0) return "Failed";
  if (rul < 10) return `${rul.toFixed(1)} cyc`;
  return `${Math.round(rul)} cyc`;
}

export function getRULUrgency(rul: number): string {
  if (rul <= 0) return "Engine has failed — immediate replacement needed";
  if (rul < 10) return "Less than 10 cycles remaining — ground immediately";
  if (rul < 30) return "Under 30 cycles — schedule overhaul this week";
  if (rul < 60) return "Under 60 cycles — plan maintenance within the month";
  return "Sufficient life remaining — continue monitoring";
}

// ── Sensor name mapping ───────────────────────────────────────────────────────

export const SENSOR_LABELS: Record<string, string> = {
  sensor_1:  "Fan Inlet Temperature (°R)",
  sensor_2:  "Low-Pressure Compressor Outlet Temperature (°R)",
  sensor_3:  "High-Pressure Compressor Outlet Temperature (°R)",
  sensor_4:  "Low-Pressure Turbine Outlet Temperature (°R)",
  sensor_5:  "Low-Pressure Compressor Outlet Pressure (psia)",
  sensor_6:  "High-Pressure Compressor Outlet Pressure (psia)",
  sensor_7:  "High-Pressure Turbine Pressure Ratio",
  sensor_8:  "Physical Fan Speed (rpm)",
  sensor_9:  "Exhaust Gas Temperature — EGT (°R)",
  sensor_10: "Burner Fuel-Air Ratio",
  sensor_11: "Corrected Fan Speed (rpm)",
  sensor_12: "Corrected Compressor Speed (rpm)",
  sensor_13: "By-Pass Ratio",
  sensor_14: "High-Pressure Turbine Coolant Bleed Flow",
  sensor_15: "High-Pressure Turbine Efficiency Loss",
  sensor_16: "Low-Pressure Turbine Efficiency Loss",
  sensor_17: "Low-Pressure Compressor Corrected Inlet Airflow",
  sensor_18: "High-Pressure Compressor Corrected Airflow",
  sensor_19: "High-Pressure Compressor Corrected Speed",
  sensor_20: "Combustion Chamber Pressure Deviation (psia)",
  sensor_21: "Fan Vibration Index",
};

export function getSensorLabel(key: string): string {
  return SENSOR_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Anomaly messages ──────────────────────────────────────────────────────────

export function getAnomalyMessage(score: number): string {
  if (score >= 0.9) return "Severe anomaly — multiple sensor deviations detected";
  if (score >= 0.7) return "Critical anomaly — reconstruction error exceeds safety threshold";
  if (score >= 0.5) return "Moderate anomaly — elevated sensor deviation patterns";
  if (score >= 0.3) return "Mild anomaly — slight deviation from baseline operation";
  return "Normal — within expected operating range";
}

export function getAnomalyLabel(score: number): string {
  if (score >= 0.7) return "Anomaly Detected — Reconstruction Error Elevated";
  if (score >= 0.3) return "Elevated Sensor Deviation — Monitor Closely";
  return "Normal Sensor Pattern";
}

// ── Time formatting ───────────────────────────────────────────────────────────

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Number formatting ─────────────────────────────────────────────────────────

export function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)} µs`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

// ── Validation helpers ────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email address is required.";
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return "Please enter a valid email address.";
  return null;
}

export function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export function validateUnitId(id: string): string | null {
  const n = parseInt(id, 10);
  if (isNaN(n)) return "Unit ID must be a number.";
  if (n < 1 || n > 100) return "Unit ID must be between 1 and 100.";
  return null;
}

export function validateCycle(cycle: string): string | null {
  const n = parseInt(cycle, 10);
  if (isNaN(n)) return "Cycle number must be a number.";
  if (n < 1) return "Cycle number must be at least 1.";
  if (n > 500) return "Cycle number cannot exceed 500.";
  return null;
}

// ── Role display ──────────────────────────────────────────────────────────────

export function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":    return "Administrator";
    case "engineer": return "Maintenance Engineer";
    case "operator": return "Fleet Operator";
    default:         return role;
  }
}

export function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":    return "badge-critical";
    case "engineer": return "badge-warning";
    default:         return "badge-normal";
  }
}
