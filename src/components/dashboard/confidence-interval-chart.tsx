"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CONFIDENCE_ROWS, type ConfidenceRow } from "@/data/forecast-advanced";
import { cn } from "@/lib/utils";

const BLUE = "#38bdf8";
const BAND = "#38bdf8";

function CITooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ConfidenceRow }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const projected = row.projected;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl",
        "text-popover-foreground",
      )}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {projected ? (
          <span className="ml-2 text-orange-500 dark:text-orange-400">
            · ML Forecast
          </span>
        ) : null}
      </p>
      <div className="space-y-0.5">
        <p>
          <span className="font-semibold text-foreground">
            {row.antiRabies}
          </span>{" "}
          <span className="text-muted-foreground">anti-rabies doses</span>
        </p>
        <p className="text-muted-foreground/80">
          Prediction range: {row.lower} – {row.upper} doses
        </p>
      </div>
    </div>
  );
}

export function ConfidenceIntervalChart() {
  return (
    <div className="h-[260px] w-full md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={CONFIDENCE_ROWS}
          margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="ciBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={BAND} stopOpacity={0.2} />
              <stop offset="95%" stopColor={BAND} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-border/80"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "currentColor" }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            width={36}
            domain={["dataMin - 20", "dataMax + 20"]}
          />
          <Tooltip content={<CITooltip />} />
          {/* Upper bound area (rendered first, behind) */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="url(#ciBand)"
            fillOpacity={1}
          />
          {/* Lower bound to "erase" the bottom of the band */}
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="var(--background)"
            fillOpacity={0.85}
          />
          {/* Confidence band borders */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke={BAND}
            strokeWidth={1}
            strokeDasharray="4 3"
            strokeOpacity={0.4}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke={BAND}
            strokeWidth={1}
            strokeDasharray="4 3"
            strokeOpacity={0.4}
            fill="none"
          />
          {/* Median prediction line */}
          <Line
            type="monotone"
            dataKey="antiRabies"
            stroke={BLUE}
            strokeWidth={2.5}
            dot={{
              r: 4,
              fill: BLUE,
              stroke: "var(--background)",
              strokeWidth: 2,
            }}
            activeDot={{ r: 6, fill: BLUE }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
