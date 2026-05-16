"use client";

import {
  BARANGAY_RISK_DATA,
  HEATMAP_BARANGAYS,
  HEATMAP_RISK_METRICS,
} from "@/data/forecast-advanced";

/**
 * Maps 0-100 risk score to a color.
 * Green (low risk) → Amber (moderate) → Red (high risk)
 */
function riskColor(value: number): string {
  if (value < 30) return `hsl(142, 76%, 36%)`; // Emerald
  if (value < 55) return `hsl(45, 93%, 44%)`;  // Amber
  if (value < 75) return `hsl(24, 94%, 50%)`;  // Orange
  return `hsl(0, 84%, 45%)`;                   // Red
}

function riskLabel(value: number): string {
  if (value >= 75) return "High Risk";
  if (value >= 55) return "Elevated";
  if (value >= 30) return "Moderate";
  return "Low Risk";
}

export function BarangayRiskHeatmap() {
  return (
    <div className="w-full space-y-3">
      <div className="overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
        <div className="min-w-[650px] space-y-3">
          {/* Header row (risk metrics) */}
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `90px repeat(${HEATMAP_RISK_METRICS.length}, 1fr)`,
            }}
          >
            <div /> {/* empty corner */}
            {HEATMAP_RISK_METRICS.map((m) => (
              <div
                key={m}
                className="text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-tight"
              >
                {m}
              </div>
            ))}
          </div>

          {/* Grid rows — one per barangay */}
          {HEATMAP_BARANGAYS.map((brgy) => (
            <div
              key={brgy}
              className="grid gap-1.5"
              style={{
                gridTemplateColumns: `90px repeat(${HEATMAP_RISK_METRICS.length}, 1fr)`,
              }}
            >
              <div className="flex items-center text-[10px] font-bold text-muted-foreground truncate pr-2">
                {brgy}
              </div>
              {HEATMAP_RISK_METRICS.map((metric) => {
                const cell = BARANGAY_RISK_DATA.find(
                  (c) => c.barangay === brgy && c.metric === metric,
                );
                const v = cell?.value ?? 0;
                return (
                  <div
                    key={`${brgy}-${metric}`}
                    title={`${brgy} — ${metric}: ${v}/100 (${riskLabel(v)})`}
                    className="group relative flex items-center justify-center rounded-lg border border-border/30 text-[11px] font-bold tabular-nums transition-all duration-200 hover:scale-[1.03] hover:shadow-lg cursor-default shadow-sm"
                    style={{
                      background: riskColor(v),
                      height: 38,
                      color: "white",
                    }}
                  >
                    {v}
                    {/* Hover tooltip */}
                    <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[10px] font-bold text-popover-foreground shadow-xl opacity-0 transition-opacity group-hover:opacity-100 border border-border z-30">
                      {riskLabel(v)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-4 border-t border-border/50">
        {[
          { label: "Low Risk", color: riskColor(15) },
          { label: "Moderate", color: riskColor(40) },
          { label: "Elevated", color: riskColor(65) },
          { label: "High Risk", color: riskColor(90) },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full shadow-sm"
              style={{ background: item.color }}
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
