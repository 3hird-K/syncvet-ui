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
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {row.vaccine}
              </span>
              <span className="tabular-nums text-muted-foreground">
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
                <span className="mx-1 text-muted-foreground/40">need /</span>
                <span>{row.currentStock}</span>
                <span className="ml-0.5 text-muted-foreground/40">
                  {" "}
                  in stock
                </span>
                <span className="ml-1.5 text-[10px] text-muted-foreground/60">
                  ({pct}%)
                </span>
              </span>
            </div>

            {/* Bullet bar */}
            <div className="relative h-5 w-full overflow-hidden rounded-md bg-muted/30">
              {/* Stock zone backgrounds */}
              <div
                className="absolute inset-y-0 left-0 rounded-md opacity-10"
                style={{ width: "70%", background: "#22c55e" }}
              />
              <div
                className="absolute inset-y-0 rounded-md opacity-10"
                style={{ left: "70%", width: "15%", background: "#f59e0b" }}
              />
              <div
                className="absolute inset-y-0 rounded-md opacity-10"
                style={{ left: "85%", width: "15%", background: "#ef4444" }}
              />

              {/* Forecasted demand bar */}
              <div
                className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${row.color}cc, ${row.color})`,
                  boxShadow: `0 0 12px ${row.color}40`,
                }}
              />

              {/* Stock limit marker */}
              <div
                className="absolute inset-y-0 w-0.5 bg-foreground/80"
                style={{ left: "100%" }}
                title={`Current stock: ${row.currentStock} doses`}
              />

              {/* 85% warning threshold */}
              <div
                className="absolute inset-y-0 w-px bg-amber-500/60"
                style={{ left: "85%" }}
              />
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: isOverDemand
                    ? "#ef4444"
                    : isNearStockout
                    ? "#f59e0b"
                    : "#22c55e",
                }}
              />
              <span className="text-muted-foreground">
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
      <div className="flex items-center justify-center gap-5 border-t border-border/40 pt-3 text-[9px] font-medium text-muted-foreground/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-emerald-500/40" />
          Adequate (&lt;70%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-amber-500/40" />
          Low Stock (70-85%)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-sm bg-red-500/40" />
          Critical (&gt;85%)
        </span>
      </div>
    </div>
  );
}
