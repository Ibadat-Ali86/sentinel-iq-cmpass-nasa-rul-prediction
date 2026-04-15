"use client";

// ───────────────────────────────────────────────────────────────────────────
// MAINTENANCE GANTT CHART — SentinelIQ Design System V2.0
// Draggable Gantt bars with 30-min snap grid and conflict indicators.
// ───────────────────────────────────────────────────────────────────────────

import { useState, useRef, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface GanttTask {
  id: number;
  label: string;
  /** Start hour offset from base (0 = day start) */
  start: number;
  /** Duration in hours */
  duration: number;
  severity: "critical" | "warning" | "normal";
  done?: boolean;
}

interface GanttChartProps {
  tasks: GanttTask[];
  /** Total hours to display (default 24) */
  totalHours?: number;
  /** Base hour (e.g. 8 = 08:00) */
  baseHour?: number;
  onTaskMove?: (id: number, newStart: number) => void;
  onTaskComplete?: (id: number) => void;
}

const SNAP_STEP = 0.5; // 30-min snap
const ROW_HEIGHT = 52;
const HEADER_HEIGHT = 36;
const LABEL_WIDTH = 100;

function severityColor(s: "critical" | "warning" | "normal"): string {
  if (s === "critical") return "#ef4444";
  if (s === "warning")  return "#f59e0b";
  return "#10b981";
}

function severityBg(s: "critical" | "warning" | "normal"): string {
  if (s === "critical") return "rgba(239,68,68,0.16)";
  if (s === "warning")  return "rgba(245,158,11,0.14)";
  return "rgba(16,185,129,0.12)";
}

function formatHour(h: number): string {
  const hours = Math.floor(h);
  const mins = (h - hours) * 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function hasConflict(tasks: GanttTask[], current: GanttTask): boolean {
  return tasks.some(t => {
    if (t.id === current.id || t.done) return false;
    return current.start < t.start + t.duration && current.start + current.duration > t.start;
  });
}

export function MaintenanceGanttChart({
  tasks: initialTasks,
  totalHours = 16,
  baseHour = 6,
  onTaskMove,
  onTaskComplete,
}: GanttChartProps) {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const pxPerHour = (trackRef.current?.clientWidth ?? 600) / totalHours;

  const handleMouseDown = useCallback((e: React.MouseEvent, id: number, currentStartPx: number) => {
    e.preventDefault();
    setDragging(id);
    setDragOffset(e.clientX - currentStartPx);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging === null || !trackRef.current) return;
    const trackRect = trackRef.current.getBoundingClientRect();

    // Calculate px position relative to track
    const rawPx = e.clientX - trackRect.left - LABEL_WIDTH;
    const rawHours = rawPx / (trackRect.width / totalHours);
    // Snap to 30-min grid
    const snapped = Math.max(0, Math.min(totalHours - 1, Math.round(rawHours / SNAP_STEP) * SNAP_STEP));

    setTasks(prev => prev.map(t => t.id === dragging ? { ...t, start: snapped } : t));
  }, [dragging, totalHours]);

  const handleMouseUp = useCallback(() => {
    if (dragging !== null) {
      const task = tasks.find(t => t.id === dragging);
      if (task) onTaskMove?.(dragging, task.start);
    }
    setDragging(null);
  }, [dragging, tasks, onTaskMove]);

  const hourMarkers = Array.from({ length: totalHours + 1 }, (_, i) => baseHour + i);

  return (
    <div
      style={{
        background: "var(--surface-secondary)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        boxShadow: "var(--elevation-1)",
        userSelect: "none",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* ── Chart Header ─────────────────────────────────────────── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        gap: 10,
      }}>
        <Clock size={16} style={{ color: "var(--accent)" }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Maintenance Gantt Schedule
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            Drag bars to reschedule · 30-min snap · Red borders = conflict
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {[
            { color: "#ef4444", label: "Critical" },
            { color: "#f59e0b", label: "Warning" },
            { color: "#10b981", label: "Scheduled" },
          ].map(({ color, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 99,
              background: `${color}15`, border: `1px solid ${color}30`,
              fontSize: 11, fontWeight: 600, color,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Timeline Grid ─────────────────────────────────────────── */}
      <div style={{ padding: "12px 16px 16px" }}>
        {/* Hour markers row */}
        <div style={{ display: "flex", marginLeft: LABEL_WIDTH, marginBottom: 4 }} ref={trackRef}>
          {hourMarkers.map((h, i) => (
            <div
              key={h}
              style={{
                flex: i < totalHours ? 1 : 0,
                fontSize: 10,
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-jetbrains, monospace)",
                fontWeight: 600,
                letterSpacing: "0.02em",
                textAlign: "left",
              }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Row separator */}
        <div style={{ marginLeft: LABEL_WIDTH, height: 1, background: "var(--border-subtle)", marginBottom: 8 }} />

        {/* Task rows */}
        {tasks.map((task) => {
          const conflict = hasConflict(tasks, task);
          const color = severityColor(task.severity);
          const bg = severityBg(task.severity);
          const isDragging = dragging === task.id;

          // Positions as percentage of total width
          const startPct = (task.start / totalHours) * 100;
          const widthPct = (task.duration / totalHours) * 100;

          return (
            <div
              key={task.id}
              style={{
                display: "flex",
                alignItems: "center",
                height: ROW_HEIGHT,
                position: "relative",
              }}
            >
              {/* Label */}
              <div style={{
                width: LABEL_WIDTH,
                flexShrink: 0,
                paddingRight: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}>
                {task.done ? (
                  <CheckCircle2 size={12} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                ) : task.severity === "critical" ? (
                  <span className="animate-pulse-ring" style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: color, flexShrink: 0, display: "inline-block",
                  }} />
                ) : (
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                )}
                <span style={{
                  fontSize: 11, fontFamily: "monospace", fontWeight: 700,
                  color: task.done ? "var(--text-tertiary)" : "var(--text-primary)",
                  textDecoration: task.done ? "line-through" : "none",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {task.label}
                </span>
              </div>

              {/* Track area */}
              <div style={{
                flex: 1, height: 36,
                position: "relative",
                background: "var(--surface-tertiary)",
                borderRadius: 6,
                overflow: "visible",
              }}>
                {/* Grid lines (every 2 hours) */}
                {Array.from({ length: Math.floor(totalHours / 2) }, (_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: `${((i + 1) * 2 / totalHours) * 100}%`,
                    top: 0, bottom: 0,
                    width: 1,
                    background: "var(--border-subtle)",
                    pointerEvents: "none",
                  }} />
                ))}

                {/* Gantt bar */}
                {!task.done && (
                  <div
                    onMouseDown={(e) => handleMouseDown(e, task.id, (task.start / totalHours) * (trackRef.current?.clientWidth ?? 600))}
                    title={`${task.label}: ${formatHour(baseHour + task.start)} – ${formatHour(baseHour + task.start + task.duration)}\nDrag to reschedule`}
                    style={{
                      position: "absolute",
                      left: `${startPct}%`,
                      width: `${Math.max(widthPct, 2)}%`,
                      top: 4, bottom: 4,
                      background: bg,
                      border: `1.5px solid ${conflict ? "#ef4444" : color}`,
                      borderRadius: 5,
                      cursor: isDragging ? "grabbing" : "grab",
                      transition: isDragging ? "none" : "all 0.15s ease",
                      boxShadow: isDragging
                        ? `0 4px 16px ${color}40`
                        : conflict
                        ? `0 0 0 2px rgba(239,68,68,0.4)`
                        : "none",
                      display: "flex",
                      alignItems: "center",
                      paddingLeft: 8,
                      overflow: "hidden",
                      zIndex: isDragging ? 10 : 1,
                      opacity: task.done ? 0.4 : 1,
                    }}
                  >
                    {/* Task label inside bar */}
                    <span style={{
                      fontSize: 10, fontWeight: 700, color,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {formatHour(baseHour + task.start)}
                    </span>
                    {conflict && (
                      <AlertTriangle size={11} style={{ color: "#ef4444", marginLeft: "auto", marginRight: 6, flexShrink: 0 }} />
                    )}
                  </div>
                )}

                {/* Done bar (strikethrough style) */}
                {task.done && (
                  <div style={{
                    position: "absolute",
                    left: `${startPct}%`,
                    width: `${Math.max(widthPct, 2)}%`,
                    top: 4, bottom: 4,
                    background: "var(--surface-overlay)",
                    border: `1.5px solid var(--border-default)`,
                    borderRadius: 5,
                    opacity: 0.5,
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 8,
                  }}>
                    <span style={{ fontSize: 10, color: "var(--text-tertiary)", fontWeight: 600 }}>Done</span>
                  </div>
                )}
              </div>

              {/* Complete button */}
              <button
                onClick={() => {
                  setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !t.done } : t));
                  onTaskComplete?.(task.id);
                }}
                title={task.done ? "Unmark as done" : "Mark as done"}
                style={{
                  marginLeft: 8, width: 28, height: 28, flexShrink: 0,
                  borderRadius: 8, border: "1px solid var(--border-default)",
                  background: task.done ? "var(--color-success-bg)" : "var(--surface-tertiary)",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: task.done ? "var(--color-success)" : "var(--text-tertiary)",
                  transition: "all var(--duration-fast) ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-success)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; }}
              >
                <CheckCircle2 size={13} />
              </button>
            </div>
          );
        })}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>
            <CheckCircle2 size={28} style={{ opacity: 0.3, margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontSize: 14 }}>No maintenance scheduled</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Helper to convert maintenance rows to Gantt tasks */
export function rowsToGanttTasks(rows: Array<{
  unit_id: number;
  predicted_rul: number;
  severity: "critical" | "warning" | "normal";
  recommended_action: string;
}>): GanttTask[] {
  return rows.slice(0, 8).map((row, i) => ({
    id: row.unit_id,
    label: `#${String(row.unit_id).padStart(3, "0")}`,
    start: (i * 1.5) % 14,
    duration: row.severity === "critical" ? 2 : row.severity === "warning" ? 1.5 : 1,
    severity: row.severity,
    done: false,
  }));
}
