"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from "recharts";
import type { RULTrendPoint } from "@/types/sentineliq";
import { TrendingDown } from "lucide-react";

interface RULTrendChartProps {
  data: RULTrendPoint[];
  unit_id: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string | number;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-800/95 border border-slate-700 px-3 py-2.5 shadow-xl min-w-[140px]">
      <p className="text-[10px] text-slate-400 mb-1.5">Cycle {label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs font-medium text-white">
          {p.name === "rul" ? "RUL" : "Anomaly"}:{" "}
          <span className={p.name === "rul" ? "text-cyan-400" : "text-amber-400"}>
            {p.name === "rul" ? `${p.value} cycles` : `${(p.value * 100).toFixed(0)}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

export function RULTrendChart({ data, unit_id }: RULTrendChartProps) {
  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-700/50 p-5 flex flex-col">
      <div className="flex items-center gap-2 mb-4 shrink-0">
        <TrendingDown className="h-4 w-4 text-cyan-400" />
        <h2 className="text-sm font-semibold text-white">
          RUL Trend — Engine #{unit_id.toString().padStart(3, "0")}
        </h2>
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-0.5 w-4 rounded bg-cyan-400" />
            RUL
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-0.5 w-4 rounded bg-amber-400" />
            Anomaly
          </span>
        </div>
      </div>

      <div className="h-48 min-h-[192px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="rulGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e293b" strokeDasharray="4 4" />
            <XAxis
              dataKey="cycle"
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              yAxisId="rul"
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="anomaly"
              orientation="right"
              domain={[0, 1]}
              tick={{ fill: "#475569", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* critical RUL threshold */}
            <ReferenceLine yAxisId="rul" y={10} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.5} />
            <ReferenceLine yAxisId="rul" y={30} stroke="#f59e0b" strokeDasharray="4 4" strokeOpacity={0.4} />
            <Area
              yAxisId="rul"
              type="monotone"
              dataKey="rul"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#rulGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#06b6d4" }}
            />
            <Area
              yAxisId="anomaly"
              type="monotone"
              dataKey="anomaly_score"
              stroke="#f59e0b"
              strokeWidth={1.5}
              fill="url(#anomGrad)"
              dot={false}
              activeDot={{ r: 3, fill: "#f59e0b" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-[10px] text-slate-600 text-center">
        Dashed lines: Warning (30 cycles) · Critical (10 cycles)
      </p>
    </div>
  );
}
