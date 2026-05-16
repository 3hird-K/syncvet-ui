"use client";

import { VACCINE_STOCK_DATA } from "@/data/forecast-advanced";

/**
 * Vaccine Stock vs. Forecasted Demand gauge.
 * Shows each vaccine type's predicted May consumption against current inventory,
 * helping the CDO Vet Office reorder before stockouts.
 */
export function VaccineStockGauge() {
  return (
    <div className="w-full space-y-5">
      {VACCINE_STOCK_DATA.map((row) => {
        const pct = Math.min(
          100,
          Math.round((row.forecastDoses / row.currentStock) * 100),
        );
        const isNearStockout = pct >= 85;
        const isOverDemand = pct >= 95;

        return (
          <div key={row.vaccine} className="space-y-1.5">
            {/* Labels row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-xs">
              <span className="font-bold text-foreground truncate">
                {row.vaccine}
              </span>
              <div className="flex items-center gap-1 tabular-nums text-muted-foreground/80 flex-wrap">
                <span
                  className="font-bold"
                  style={{
                    color: isOverDemand
                      ? "#ef4444"
                      : isNearStockout
                      ? "#f59e0b"
                      : row.color,
                  }}
                >
                  {row.forecastDoses}
                </span>
                <span className="text-[10px] opacity-40">need /</span>
                <span className="font-semibold">{row.currentStock}</span>
                <span className="text-[10px] opacity-40">stock</span>
                <span className="ml-auto sm:ml-1 text-[10px] font-bold text-muted-foreground/60">
                  ({pct}%)
                </span>
              </div>
            </div>

            {/* Bullet bar */}
            <div className="relative h-6 w-full overflow-hidden rounded-lg bg-muted/20 border border-border/5">
              {/* Stock zone backgrounds */}
              <div
                className="absolute inset-y-0 left-0 opacity-10"
                style={{ width: "70%", background: "#22c55e" }}
              />
              <div
                className="absolute inset-y-0 opacity-10"
                style={{ left: "70%", width: "15%", background: "#f59e0b" }}
              />
              <div
                className="absolute inset-y-0 opacity-10"
                style={{ left: "85%", width: "15%", background: "#ef4444" }}
              />

              {/* Forecasted demand bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-1000 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${row.color}bb, ${row.color})`,
                  boxShadow: `0 0 15px ${row.color}30`,
                }}
              />

              {/* Stock limit marker */}
              <div
                className="absolute inset-y-0 w-1 bg-foreground/30"
                style={{ left: "100%" }}
              />

              {/* 85% warning threshold */}
              <div
                className="absolute inset-y-0 w-px bg-amber-500/40"
                style={{ left: "85%" }}
              />
            </div>

            {/* Status indicator */}
            <div className="flex items-start gap-2 text-[10px] leading-tight">
              <span
                className="mt-1 size-1.5 shrink-0 rounded-full animate-pulse"
                style={{
                  background: isOverDemand
                    ? "#ef4444"
                    : isNearStockout
                    ? "#f59e0b"
                    : "#22c55e",
                }}
              />
              <span className="font-medium text-muted-foreground/80">
                {isOverDemand
                  ? "Stock may run out — reorder immediately"
                  : isNearStockout
                  ? "Nearing stockout — schedule procurement"
                  : "Sufficient stock for projected demand"}
              </span>
            </div>
          </div>
        );
      })}

      {/* Footer legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border/40 pt-4">
        {[
          { label: "Adequate", color: "#22c55e", sub: "<70%" },
          { label: "Low Stock", color: "#f59e0b", sub: "70-85%" },
          { label: "Critical", color: "#ef4444", sub: ">85%" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-sm opacity-50"
              style={{ background: item.color }}
            />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-none">
                {item.label}
              </span>
              <span className="text-[8px] font-medium text-muted-foreground/40 mt-0.5">
                {item.sub}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
