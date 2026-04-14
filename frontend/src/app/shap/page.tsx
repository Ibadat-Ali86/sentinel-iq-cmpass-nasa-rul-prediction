"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Topbar } from "@/components/Topbar";
import { SHAPChart } from "@/components/SHAPChart";
import { useInferenceContext } from "@/context/InferenceContext";
import { useLiveUnits } from "@/hooks/useLiveUnits";
import { getMockSHAPData } from "@/lib/api";
import { Info, RefreshCw } from "lucide-react";
import { getSensorLabel } from "@/lib/utils";

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  sensor_9:  "Exhaust Gas Temperature — Fan pressure ratio, strong RUL predictor in FD001/FD003",
  sensor_14: "HPT Coolant Bleed — Physical fan speed, correlated with late-stage degradation",
  sensor_4:  "LPT Outlet Temperature — Burner fuel–air ratio, rises sharply near failure",
  sensor_11: "Corrected Fan Speed — Core speed ratio, second fan shaft degradation proxy",
  sensor_7:  "HPT Pressure Ratio — Total temperature at HPT outlet, thermal stress indicator",
  sensor_12: "Corrected Compressor Speed — normalised to sea-level conditions",
  sensor_2:  "LPC Outlet Temperature — Compressor health indicator",
  sensor_15: "HPC Efficiency Loss — Drops as HPT blades degrade",
  sensor_17: "LPC Corrected Airflow — Drops with increased leakage paths",
  sensor_20: "Combustion Pressure Deviation — Increases to compensate blade wear",
};

export default function SHAPPage() {
  const { lastUpdated } = useLiveUnits(60000);
  const { uploadedDataset } = useInferenceContext();
  const [data, setData] = useState(() => getMockSHAPData());
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const refresh = () => setData(getMockSHAPData());

  return (
    <DashboardLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Topbar title="Feature Importance"
          subtitle="SHAP DeepExplainer — sensor contributions to TCN RUL predictions"
          lastUpdated={lastUpdated} backendOnline={false} onRefresh={refresh} />

        <main style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="animate-fade-up" style={{
            padding: "14px 16px", borderRadius: 12,
            background: "var(--accent-glow)", border: "1px solid rgba(6,182,212,0.25)",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <Info size={16} style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--accent)", marginBottom: 4 }}>About SHAP Feature Importance</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                SHAP quantifies how much each sensor contributes to the TCN's RUL prediction. Higher importance means the model
                relies more heavily on that sensor. Values shown are mean absolute SHAP values across the test fleet.
              </p>
            </div>
          </div>

          <div className="animate-fade-up delay-100" style={{ minHeight: 620 }}>
            <SHAPChart data={data} title={`Global SHAP Summary — ${uploadedDataset ? "TCN on " + uploadedDataset : "TCN Ensemble (FD001 + FD003)"}`} />
          </div>

          <div className="animate-fade-up delay-200" style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Sensor Feature Reference</h2>
              <button onClick={refresh} style={{
                display: "flex", alignItems: "center", gap: 6, fontSize: 12,
                color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer",
              }}>
                <RefreshCw size={12} /> Resample
              </button>
            </div>
            <div>
              {data.map((d, i) => {
                const pct = Math.round(d.importance * 100);
                const selected = selectedFeature === d.feature;
                return (
                  <button key={d.feature}
                    onClick={() => setSelectedFeature(selected ? null : d.feature)}
                    className="hover-alert-row"
                    style={{
                      width: "100%", textAlign: "left", padding: "12px 18px",
                      borderBottom: "1px solid var(--border)", display: "flex",
                      alignItems: "center", gap: 14, background: selected ? "var(--bg-hover)" : "transparent",
                      border: "none", cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-subtle)", fontFamily: "monospace", width: 20, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ width: 160, flexShrink: 0 }}>
                      <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>{d.feature}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>{getSensorLabel(d.feature)}</p>
                    </div>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg, #06b6d4, #6366f1)", transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text)", fontWeight: 600, width: 44, textAlign: "right", flexShrink: 0 }}>
                        {d.importance.toFixed(3)}
                      </span>
                    </div>
                    {selected && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)", maxWidth: 260, textAlign: "right", lineHeight: 1.5 }}>
                        {FEATURE_DESCRIPTIONS[d.feature] ?? "No description available."}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </DashboardLayout>
  );
}
