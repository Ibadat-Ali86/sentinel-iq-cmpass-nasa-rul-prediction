"use client";

import { useState } from "react";
import { Cpu, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { validateUnitId, validateCycle, formatCycles, getRULUrgency, getSeverityConfig } from "@/lib/utils";
import type { Severity } from "@/types/sentineliq";

interface PredictResult {
  unit_id: number;
  predicted_rul: number;
  severity: Severity;
  confidence_lower: number;
  confidence_upper: number;
  model: string;
  inference_ms: number;
}

function mockPredict(unitId: number, cycle: number): Promise<PredictResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const base = 125 - cycle * 0.8 + (unitId % 7) * 3;
      const rul = Math.max(0, base + (Math.random() - 0.5) * 8);
      const severity: Severity = rul < 10 ? "critical" : rul < 35 ? "warning" : "normal";
      resolve({
        unit_id: unitId,
        predicted_rul: parseFloat(rul.toFixed(1)),
        severity,
        confidence_lower: parseFloat(Math.max(0, rul - 6).toFixed(1)),
        confidence_upper: parseFloat((rul + 6).toFixed(1)),
        model: "TCN Ensemble",
        inference_ms: parseFloat((10 + Math.random() * 8).toFixed(1)),
      });
    }, 800);
  });
}

export function PredictForm() {
  const [open, setOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [cycle, setCycle] = useState("");
  const [dataset, setDataset] = useState("FD001");
  const [errors, setErrors] = useState<{ unitId?: string; cycle?: string }>({});
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<PredictResult | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    const uid = validateUnitId(unitId);
    const cyc = validateCycle(cycle);
    if (uid) e.unitId = uid;
    if (cyc) e.cycle = cyc;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setStatus("loading");
    setResult(null);
    try {
      const res = await mockPredict(parseInt(unitId), parseInt(cycle));
      setResult(res);
      setStatus("done");
    } catch {
      setStatus("idle");
    }
  };

  const reset = () => { setStatus("idle"); setResult(null); };

  const sev = result ? getSeverityConfig(result.severity) : null;

  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden",
    }}>
      {/* Collapsible header */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
          color: "var(--text)", transition: "background 150ms ease",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
        onMouseLeave={e => (e.currentTarget.style.background = "none")}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Cpu size={16} color="white" />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Manual RUL Prediction</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Submit sensor readings to get an instant RUL forecast
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
      </button>

      {/* Collapsible body */}
      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid var(--border)" }} className="animate-fade-up">
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "1rem", marginTop: 16, alignItems: "end" }}>
            {/* Unit ID */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
                Unit ID <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(1 – 100)</span>
              </label>
              <input
                type="number" min={1} max={100} value={unitId}
                onChange={e => { setUnitId(e.target.value); setErrors(p => ({ ...p, unitId: undefined })); reset(); }}
                placeholder="e.g. 42"
                className="input-glow"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14 }}
              />
              {errors.unitId && (
                <p style={{ color: "var(--critical)", fontSize: 11, marginTop: 4 }} className="animate-fade-up">
                  {errors.unitId}
                </p>
              )}
            </div>

            {/* Cycle */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
                Current Cycle <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(1 – 500)</span>
              </label>
              <input
                type="number" min={1} max={500} value={cycle}
                onChange={e => { setCycle(e.target.value); setErrors(p => ({ ...p, cycle: undefined })); reset(); }}
                placeholder="e.g. 150"
                className="input-glow"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14 }}
              />
              {errors.cycle && (
                <p style={{ color: "var(--critical)", fontSize: 11, marginTop: 4 }} className="animate-fade-up">
                  {errors.cycle}
                </p>
              )}
            </div>

            {/* Dataset */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>
                Dataset
              </label>
              <select
                value={dataset}
                onChange={e => setDataset(e.target.value)}
                className="input-glow"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14 }}
              >
                {["FD001", "FD002", "FD003", "FD004"].map(d => (
                  <option key={d} value={d}>{d} — {d === "FD001" ? "1 condition · 1 mode" : d === "FD002" ? "6 conditions · 1 mode" : d === "FD003" ? "1 condition · 2 modes" : "6 conditions · 2 modes"}</option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "loading"}
              className="hover-btn-primary"
              style={{
                padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
                color: "white", fontWeight: 700, fontSize: 14,
                display: "flex", alignItems: "center", gap: 6,
                whiteSpace: "nowrap",
                boxShadow: "0 0 16px rgba(6,182,212,0.25)",
              }}
            >
              {status === "loading" ? (
                <><Loader2 size={14} style={{ animation: "spinSlow 0.8s linear infinite" }} /> Predicting...</>
              ) : (
                <><Cpu size={14} /> Run Prediction</>
              )}
            </button>
          </form>

          {/* Result card */}
          {status === "done" && result && sev && (
            <div style={{
              marginTop: 16, padding: "16px", borderRadius: 10,
              background: sev.bgClass.replace("bg-[", "").replace("]", ""),
              border: `1px solid ${result.severity === "critical" ? "rgba(239,68,68,0.25)" : result.severity === "warning" ? "rgba(245,158,11,0.25)" : "rgba(16,185,129,0.25)"}`,
            }} className="animate-scale-in">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {result.severity === "normal"
                    ? <CheckCircle2 size={20} style={{ color: "var(--success)", flexShrink: 0 }} />
                    : <AlertTriangle size={20} style={{ color: result.severity === "critical" ? "var(--critical)" : "var(--warning)", flexShrink: 0 }} />
                  }
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      Engine #{String(result.unit_id).padStart(3, "0")} · {formatCycles(result.predicted_rul)}
                    </p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 3 }}>
                      {getRULUrgency(result.predicted_rul)}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <span className={sev.badgeClass} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99 }}>
                    {sev.shortLabel}
                  </span>
                  <p style={{ fontSize: 10, color: "var(--text-subtle)", marginTop: 4 }}>
                    Confidence: {result.confidence_lower}–{result.confidence_upper} cycles
                  </p>
                  <p style={{ fontSize: 10, color: "var(--text-subtle)" }}>
                    {result.model} · {result.inference_ms}ms
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
