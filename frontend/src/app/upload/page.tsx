"use client";

import { useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import {
  Upload, FileText, XCircle, Loader2, CheckCircle2,
  AlertTriangle, BarChart2, Cpu, Download, RefreshCw,
  Info, FileUp, Activity,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell,
} from "recharts";
import { useInferenceContext } from "@/context/InferenceContext";
import type { EngineUnit } from "@/types/sentineliq";

/* ── Types ─────────────────────────────────────────────────────────────────── */
type UploadStatus = "idle" | "dragging" | "processing" | "done" | "error";
type Severity = "normal" | "warning" | "critical";

interface UnitResult {
  unit: number;
  rul: number;
  severity: Severity;
  confidence_lower: number;
  confidence_upper: number;
  anomaly_score: number;
  model: string;
  inference_ms: number;
  trend: { cycle: number; rul: number }[];
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const SEV_COLOR: Record<Severity, string> = {
  normal: "#10b981",
  warning: "#f59e0b",
  critical: "#ef4444",
};
const SEV_BG: Record<Severity, string> = {
  normal: "rgba(16,185,129,0.1)",
  warning: "rgba(245,158,11,0.1)",
  critical: "rgba(239,68,68,0.1)",
};
const SEV_LABEL: Record<Severity, string> = {
  normal: "NOMINAL",
  warning: "WARNING",
  critical: "CRITICAL",
};

function mockRunInference(fileName: string): Promise<UnitResult[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(Array.from({ length: 8 }, (_, i) => {
        const unit = i + 1;
        const rul = parseFloat(Math.max(2, 118 - i * 14 + Math.random() * 18).toFixed(1));
        const sev: Severity = rul < 15 ? "critical" : rul < 45 ? "warning" : "normal";
        const trend = Array.from({ length: 20 }, (_, j) => ({
          cycle: j + 1,
          rul: parseFloat(Math.max(0, rul + (20 - j) * 3.5 - Math.sin(j * 0.4) * 4).toFixed(1)),
        }));
        return {
          unit, rul, severity: sev,
          confidence_lower: parseFloat(Math.max(0, rul - 5).toFixed(1)),
          confidence_upper: parseFloat((rul + 5).toFixed(1)),
          anomaly_score: parseFloat(Math.min(1, 0.05 + (1 - rul / 130) * 0.85).toFixed(3)),
          model: "TCN Ensemble",
          inference_ms: parseFloat((11 + Math.random() * 9).toFixed(1)),
          trend,
        };
      }));
    }, 2200);
  });
}

/* ── Mini spark chart ───────────────────────────────────────────────────────── */
function MiniTrend({ data, color }: { data: { cycle: number; rul: number }[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="rul" stroke={color} strokeWidth={1.5}
          fill={`url(#spark-${color.replace("#", "")})`} dot={false} isAnimationActive />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   PAGE
   ══════════════════════════════════════════════════════════════════════════════ */
export default function UploadPage() {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UnitResult[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<UnitResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setUploadedData, clearUploadedData } = useInferenceContext();

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const runInference = useCallback(async (name: string) => {
    setUploadStatus("processing");
    setProgress(0);
    setResults([]);

    // Fake progress
    let p = 0;
    const progressInterval = setInterval(() => {
      p += Math.random() * 12 + 3;
      if (p >= 95) { clearInterval(progressInterval); }
      setProgress(Math.min(p, 95));
    }, 120);

    const res = await mockRunInference(name);
    clearInterval(progressInterval);
    setProgress(100);

    setTimeout(() => {
      setResults(res);
      setSelectedUnit(res[0]);
      setUploadStatus("done");

      // Global context map
      const contextUnits: EngineUnit[] = res.map(r => ({
        unit_id: r.unit,
        predicted_rul: r.rul,
        severity: r.severity,
        anomaly_score: r.anomaly_score,
        anomaly_severity: r.severity,
        recommendation: `Analysis from ${name}. Requires monitoring.`,
        model_used: r.model,
        inference_time_ms: r.inference_ms,
        timestamp: new Date().toISOString()
      }));
      setUploadedData(name, contextUnits);
    }, 300);
  }, [setUploadedData]);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(csv|txt|zip|parquet)$/i)) {
      setErrorMsg(`Unsupported format "${file.name.split(".").pop()}". Use CSV, TXT, Parquet, or ZIP.`);
      setUploadStatus("error");
      return;
    }
    setFileName(file.name);
    setFileSize(formatSize(file.size));
    runInference(file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setUploadStatus("idle");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setUploadStatus("idle"); setFileName(""); setFileSize("");
    setProgress(0); setResults([]); setErrorMsg(""); setSelectedUnit(null);
    clearUploadedData();
    if (inputRef.current) inputRef.current.value = "";
  };

  /* ── Derived stats ─────────────────────────────────────────────────────── */
  const critCount = results.filter(r => r.severity === "critical").length;
  const warnCount = results.filter(r => r.severity === "warning").length;
  const normCount = results.filter(r => r.severity === "normal").length;
  const avgRUL = results.length ? results.reduce((s, r) => s + r.rul, 0) / results.length : 0;
  const avgMs = results.length ? results.reduce((s, r) => s + r.inference_ms, 0) / results.length : 0;

  const distData = [
    { name: "Normal", value: normCount, color: "#10b981" },
    { name: "Warning", value: warnCount, color: "#f59e0b" },
    { name: "Critical", value: critCount, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <DashboardLayout>
      <div id="main-content" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar
          title="Data Upload & Analysis"
          subtitle="Upload NASA C-MAPSS sensor data · Run TCN ensemble inference"
          lastUpdated={null}
          backendOnline={false}
          onRefresh={reset}
        />

        <main style={{ flex: 1, overflowY: "auto", padding: "1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* ── Dataset Format Guide ───────────────────────────────────── */}
          <div className="animate-fade-up" style={{
            background: "var(--surface-secondary)",
            border: "1px solid var(--border-light)",
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: "var(--elevation-2)",
          }}>
            {/* Guide header */}
            <div style={{
              padding: "20px 24px",
              borderBottom: "1px solid var(--border-default)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "var(--surface-tertiary)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "linear-gradient(135deg, rgba(6,182,212,0.2), rgba(59,130,246,0.15))",
                  border: "1px solid rgba(6,182,212,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Info size={18} color="#06b6d4" />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                    Dataset Format Specification
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                    NASA C-MAPSS compatible · CSV · TXT · Parquet · ZIP up to 50 MB
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { label: "FD001-style Sample", file: "sentineliq_test_FD001_style_sample.csv" },
                  { label: "FD003-style Sample", file: "sentineliq_test_FD003_style_sample.csv" },
                ].map(({ label, file }) => (
                  <a
                    key={file}
                    href={`/test_datasets/${file}`}
                    download={file}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 14px", borderRadius: 8,
                      background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)",
                      color: "#06b6d4", fontSize: 11, fontWeight: 700, textDecoration: "none",
                      transition: "all 150ms ease", cursor: "pointer",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.18)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(6,182,212,0.1)";
                    }}
                  >
                    <Download size={12} /> {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Overview pills */}
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid var(--border-default)",
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            }}>
              {[
                { icon: "📋", label: "26 columns total", desc: "5 metadata + 21 sensors" },
                { icon: "🔢", label: "CSV / space-separated", desc: "With header row" },
                { icon: "🔁", label: "Multi-unit supported", desc: "Multiple engines per file" },
                { icon: "📈", label: "Cycles start at 1", desc: "Per-unit cycle index" },
              ].map(({ icon, label, desc }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--surface-primary)", border: "1px solid var(--border-subtle)",
                  flex: "1 1 180px",
                }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{label}</p>
                    <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 1 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Column schema table */}
            <div style={{ padding: "20px 24px" }}>
              <p style={{
                fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              }}>
                Column Schema
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {/* Metadata columns */}
                <div style={{
                  background: "var(--surface-primary)", borderRadius: 12,
                  border: "1px solid var(--border-default)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
                    background: "rgba(99,102,241,0.07)",
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6366f1" }}>
                      📌 Metadata Columns (1–5)
                    </p>
                  </div>
                  {[
                    { col: "unit", type: "int", desc: "Engine unit ID (1-indexed)" },
                    { col: "cycle", type: "int", desc: "Operational cycle (starts at 1)" },
                    { col: "op_setting_1", type: "float", desc: "Altitude proxy (~0.0 for sea-level)" },
                    { col: "op_setting_2", type: "float", desc: "Mach number proxy (~0.0)" },
                    { col: "op_setting_3", type: "float", desc: "Throttle resolver angle (~100)" },
                  ].map(({ col, type, desc }) => (
                    <div key={col} style={{
                      padding: "9px 14px", borderBottom: "1px solid var(--border-muted)",
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 11, color: "#6366f1",
                        fontWeight: 700, flexShrink: 0, minWidth: 120,
                      }}>{col}</span>
                      <span style={{
                        fontSize: 10, color: "var(--text-tertiary)",
                        background: "rgba(99,102,241,0.12)", borderRadius: 4, padding: "1px 6px",
                        flexShrink: 0,
                      }}>{type}</span>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5 }}>{desc}</span>
                    </div>
                  ))}
                </div>

                {/* Sensor columns */}
                <div style={{
                  background: "var(--surface-primary)", borderRadius: 12,
                  border: "1px solid var(--border-default)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)",
                    background: "var(--color-info-bg)",
                  }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4" }}>
                      📡 Sensor Columns (s1–s21)
                    </p>
                  </div>
                  <div style={{ overflowY: "auto", maxHeight: 260 }}>
                    {[
                      { col: "s1", desc: "Fan inlet total temperature (°R)" },
                      { col: "s2", desc: "LPC outlet total temperature (°R)" },
                      { col: "s3", desc: "HPC outlet total temperature (°R)" },
                      { col: "s4", desc: "LPT outlet total temperature (°R)" },
                      { col: "s5", desc: "Fan inlet pressure (psia)" },
                      { col: "s6", desc: "Bypass-duct total pressure (psia)" },
                      { col: "s7", desc: "HPC outlet total pressure (psia)" },
                      { col: "s8", desc: "Physical fan speed (rpm)" },
                      { col: "s9", desc: "Physical core speed (rpm)" },
                      { col: "s10", desc: "Engine pressure ratio" },
                      { col: "s11", desc: "HPC outlet static pressure (psia)" },
                      { col: "s12", desc: "Fuel flow / Ps30 ratio (pps/psia)" },
                      { col: "s13", desc: "Corrected fan speed (rpm)" },
                      { col: "s14", desc: "Corrected core speed (rpm)" },
                      { col: "s15", desc: "Bypass ratio" },
                      { col: "s16", desc: "Burner fuel-air ratio" },
                      { col: "s17", desc: "Bleed enthalpy" },
                      { col: "s18", desc: "Required fan speed" },
                      { col: "s19", desc: "Required fan conversion speed" },
                      { col: "s20", desc: "HP turbines cool air flow" },
                      { col: "s21", desc: "LP turbines cool air flow" },
                    ].map(({ col, desc }) => (
                      <div key={col} style={{
                        padding: "7px 14px", borderBottom: "1px solid var(--border-muted)",
                        display: "flex", alignItems: "center", gap: 10,
                      }}>
                        <span style={{
                          fontFamily: "monospace", fontSize: 11, color: "#06b6d4",
                          fontWeight: 700, flexShrink: 0, minWidth: 36,
                        }}>{col}</span>
                        <span style={{
                          fontSize: 10, color: "var(--text-tertiary)",
                          background: "rgba(6,182,212,0.10)", borderRadius: 4, padding: "1px 6px",
                          flexShrink: 0,
                        }}>float</span>
                        <span style={{ fontSize: 10.5, color: "var(--text-secondary)", lineHeight: 1.4 }}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Example row */}
              <div style={{ marginTop: 16 }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)",
                  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
                }}>
                  Example CSV Header + Row
                </p>
                <div style={{
                  background: "var(--surface-primary)", borderRadius: 10,
                  border: "1px solid var(--border-default)",
                  padding: "14px 16px", overflow: "auto",
                }}>
                  <pre style={{
                    fontFamily: "monospace", fontSize: 10, lineHeight: 1.8,
                    color: "var(--text-secondary)", margin: 0, whiteSpace: "pre",
                  }}>
{`unit,cycle,op_setting_1,op_setting_2,op_setting_3,s1,s2,s3,...,s21
1,1,0.0002,-0.0001,100.01,518.62,641.71,1589.48,...,23.40
1,2,0.0001,0.0001,99.99,518.68,641.78,1589.58,...,23.41
...
2,1,-0.0002,0.0003,100.03,518.61,641.69,1589.47,...,23.40`}
                  </pre>
                </div>
              </div>

              {/* RUL note */}
              <div style={{
                marginTop: 14, padding: "12px 16px", borderRadius: 10,
                background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <AlertTriangle size={14} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 3 }}>
                    RUL Column — Not Required
                  </p>
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                    Do <strong style={{ color: "var(--text-secondary)" }}>not</strong> include a RUL column in your input file.
                    RUL is the model&apos;s output, computed as: <code style={{ fontFamily: "monospace", color: "#06b6d4", background: "rgba(6,182,212,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                    max_cycle_for_unit − current_cycle</code>.
                    The model infers it from raw sensor sequences.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Drop Zone ─────────────────────────────────────────────────── */}
          {(uploadStatus === "idle" || uploadStatus === "error" || uploadStatus === "dragging") && (
            <div
              className="animate-fade-up"
              onDragOver={e => { e.preventDefault(); setUploadStatus("dragging"); }}
              onDragLeave={() => setUploadStatus("idle")}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              style={{
                border: `2px dashed ${uploadStatus === "dragging" ? "var(--color-info)" : uploadStatus === "error" ? "var(--color-critical)" : "var(--border-emphasis)"}`,
                borderRadius: 16,
                padding: "3.5rem 2rem",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: "pointer", gap: 16, textAlign: "center",
                background: uploadStatus === "dragging"
                  ? "var(--color-info-bg)"
                  : "var(--surface-secondary)",
                transition: "all 250ms ease",
              }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.txt,.zip,.parquet"
                onChange={handleInputChange}
                style={{ display: "none" }}
              />
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: uploadStatus === "error" ? "rgba(239,68,68,0.1)" : "rgba(6,182,212,0.1)",
                border: `1px solid ${uploadStatus === "error" ? "rgba(239,68,68,0.3)" : "rgba(6,182,212,0.25)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: uploadStatus === "error" ? "#ef4444" : "#06b6d4",
              }}>
                {uploadStatus === "error"
                  ? <XCircle size={32} />
                  : uploadStatus === "dragging"
                    ? <FileUp size={32} />
                    : <Upload size={32} />
                }
              </div>

              {uploadStatus === "error" ? (
                <>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>Upload Error</p>
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{errorMsg}</p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); reset(); }} style={{
                    padding: "9px 22px", borderRadius: 8, cursor: "pointer",
                    border: "1px solid rgba(239,68,68,0.4)",
                    background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: 13, fontWeight: 700,
                  }}>Try Again</button>
                </>
              ) : (
                <>
                  <div>
                    <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                      {uploadStatus === "dragging" ? "Release to upload your data" : "Drop sensor data here, or click to browse"}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
                      NASA C-MAPSS CSV · TXT · Parquet · ZIP up to 50 MB
                    </p>
                  </div>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 22px", borderRadius: 9,
                    background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                    color: "white", fontSize: 14, fontWeight: 700,
                    boxShadow: "0 0 18px rgba(6,182,212,0.25)",
                  }}>
                    <FileText size={15} /> Browse Files
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Processing State ───────────────────────────────────────────── */}
          {uploadStatus === "processing" && (
            <div className="animate-fade-up" style={{
              textAlign: "center", padding: "3rem 2rem",
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 16,
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <Loader2 size={28} style={{ color: "#06b6d4", animation: "spinSlow 1s linear infinite" }} />
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                Running TCN Ensemble Inference…
              </p>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 28 }}>
                {fileName} · {fileSize} · Pre-processing sensor sequences
              </p>
              <div style={{
                height: 8, background: "var(--surface-tertiary)", borderRadius: 99,
                overflow: "hidden", maxWidth: 400, margin: "0 auto",
              }}>
                <div style={{
                  height: "100%", borderRadius: 99,
                  background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                  width: `${progress}%`,
                  transition: "width 200ms ease",
                  boxShadow: "0 0 8px rgba(6,182,212,0.6)",
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400, margin: "8px auto 0" }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {progress < 30 ? "Loading sequence data…" : progress < 60 ? "Running TCN forward pass…" : progress < 90 ? "Computing SHAP attributions…" : "Finalizing predictions…"}
                </span>
                <span style={{ fontSize: 11, color: "#06b6d4", fontWeight: 700 }}>{progress.toFixed(0)}%</span>
              </div>
            </div>
          )}

          {/* ── Results ─────────────────────────────────────────────────────── */}
          {uploadStatus === "done" && results.length > 0 && (
            <>
              {/* Results header */}
              <div className="animate-fade-up" style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CheckCircle2 size={18} color="white" />
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                      Inference Complete · {results.length} Engine Units
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {fileName} · Avg {avgMs.toFixed(1)}ms · TCN Ensemble
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={reset} style={{
                    padding: "8px 16px", borderRadius: 8,
                    border: "1px solid var(--border)", background: "var(--bg-card)",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "all 150ms ease",
                  }}>
                    <RefreshCw size={13} /> New Upload
                  </button>
                  <button style={{
                    padding: "8px 16px", borderRadius: 8,
                    border: "1px solid rgba(6,182,212,0.3)",
                    background: "rgba(6,182,212,0.08)",
                    color: "#06b6d4", cursor: "pointer", fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {/* KPI strip */}
              <div className="animate-fade-up delay-100" style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem",
              }}>
                {[
                  { label: "Critical", value: critCount, color: "#ef4444", icon: <AlertTriangle size={18} /> },
                  { label: "Warning", value: warnCount, color: "#f59e0b", icon: <Activity size={18} /> },
                  { label: "Nominal", value: normCount, color: "#10b981", icon: <CheckCircle2 size={18} /> },
                  { label: "Avg RUL", value: `${avgRUL.toFixed(1)} cyc`, color: "#06b6d4", icon: <BarChart2 size={18} /> },
                  { label: "Avg Latency", value: `${avgMs.toFixed(1)}ms`, color: "#a855f7", icon: <Cpu size={18} /> },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{
                    padding: "16px", borderRadius: 12,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color }}>
                      {icon}
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                    </div>
                    <p style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: "-0.02em" }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Results grid + detail panel */}
              <div className="animate-fade-up delay-200" style={{
                display: "grid", gridTemplateColumns: selectedUnit ? "1fr 360px" : "1fr",
                gap: "1.25rem", alignItems: "start",
              }}>
                {/* Unit cards grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
                  {results.map(r => (
                    <button
                      key={r.unit}
                      onClick={() => setSelectedUnit(prev => prev?.unit === r.unit ? null : r)}
                      style={{
                        padding: "16px", borderRadius: 14, cursor: "pointer", textAlign: "left",
                        background: selectedUnit?.unit === r.unit ? `${SEV_BG[r.severity]}` : "var(--bg-card)",
                        border: `1px solid ${selectedUnit?.unit === r.unit ? SEV_COLOR[r.severity] + "50" : "var(--border)"}`,
                        boxShadow: r.severity === "critical" ? "0 0 14px rgba(239,68,68,0.12)" : "none",
                        transition: "all 200ms ease",
                      }}
                      onMouseEnter={e => {
                        if (selectedUnit?.unit !== r.unit) {
                          (e.currentTarget as HTMLElement).style.borderColor = SEV_COLOR[r.severity] + "40";
                        }
                      }}
                      onMouseLeave={e => {
                        if (selectedUnit?.unit !== r.unit) {
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        }
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em" }}>
                          ENGINE #{String(r.unit).padStart(3, "0")}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px",
                          borderRadius: 99,
                          background: SEV_BG[r.severity], color: SEV_COLOR[r.severity],
                          border: `1px solid ${SEV_COLOR[r.severity]}40`,
                        }}>
                          {SEV_LABEL[r.severity]}
                        </span>
                      </div>
                      <p style={{ fontSize: 32, fontWeight: 800, color: SEV_COLOR[r.severity], lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 2 }}>
                        {r.rul.toFixed(0)}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        cycles remaining
                      </p>
                      <MiniTrend data={r.trend} color={SEV_COLOR[r.severity]} />
                    </button>
                  ))}
                </div>

                {/* Selected unit detail */}
                {selectedUnit && (
                  <div style={{
                    background: "var(--bg-card)", border: `1px solid ${SEV_COLOR[selectedUnit.severity]}30`,
                    borderRadius: 16, padding: "20px", position: "sticky", top: 0,
                    boxShadow: `0 0 24px ${SEV_COLOR[selectedUnit.severity]}10`,
                  }} className="animate-scale-in">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>
                          Engine #{String(selectedUnit.unit).padStart(3, "0")}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Detailed Analysis</p>
                      </div>
                      <span style={{
                        padding: "4px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800,
                        background: SEV_BG[selectedUnit.severity], color: SEV_COLOR[selectedUnit.severity],
                        border: `1px solid ${SEV_COLOR[selectedUnit.severity]}40`,
                        letterSpacing: "0.06em",
                      }}>
                        {SEV_LABEL[selectedUnit.severity]}
                      </span>
                    </div>

                    {/* RUL */}
                    <div style={{ textAlign: "center", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                      <p style={{ fontSize: 56, fontWeight: 800, color: SEV_COLOR[selectedUnit.severity], lineHeight: 1, letterSpacing: "-0.03em" }}>
                        {selectedUnit.rul.toFixed(1)}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        Predicted RUL (cycles)
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                        CI: {selectedUnit.confidence_lower}–{selectedUnit.confidence_upper} cycles
                      </p>
                    </div>

                    {/* Metrics */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", padding: "16px 0", borderBottom: "1px solid var(--border)" }}>
                      {[
                        { label: "Anomaly Score", value: selectedUnit.anomaly_score.toFixed(3), color: selectedUnit.anomaly_score > 0.7 ? "#ef4444" : selectedUnit.anomaly_score > 0.4 ? "#f59e0b" : "#10b981" },
                        { label: "Inference", value: `${selectedUnit.inference_ms}ms`, color: "#06b6d4" },
                        { label: "Model", value: selectedUnit.model, color: "var(--text-secondary)" },
                        { label: "Dataset", value: "FD001", color: "var(--text-secondary)" },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ padding: "10px 12px", background: "var(--surface-tertiary)", borderRadius: 8 }}>
                          <p style={{ fontSize: 10, color: "var(--text-tertiary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color }}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Trend */}
                    <div style={{ paddingTop: 16 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                        RUL Trend
                      </p>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={selectedUnit.trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="detail-trend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={SEV_COLOR[selectedUnit.severity]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={SEV_COLOR[selectedUnit.severity]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="cycle" tick={{ fill: "var(--text-subtle)", fontSize: 9 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "var(--text-subtle)", fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                          <Tooltip
                            contentStyle={{ background: "var(--bg-card-2)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 11 }}
                            formatter={(v: number) => [`${v.toFixed(1)} cyc`, "RUL"]}
                          />
                          <Area type="monotone" dataKey="rul"
                            stroke={SEV_COLOR[selectedUnit.severity]} strokeWidth={2}
                            fill="url(#detail-trend)" dot={false} isAnimationActive />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Severity distribution mini bar */}
                    {distData.length > 0 && (
                      <div style={{ paddingTop: 16, borderTop: "1px solid var(--border)" }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                          Fleet Distribution
                        </p>
                        <ResponsiveContainer width="100%" height={70}>
                          <BarChart data={distData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: "var(--text-subtle)", fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {distData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </main>
      </div>
    </DashboardLayout>
  );
}
