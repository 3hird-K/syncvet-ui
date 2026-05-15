"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DECOMPOSITION_ROWS,
  type DecompositionRow,
} from "@/data/forecast-advanced";
import { cn } from "@/lib/utils";

const COLOR_BASELINE = "#64748b";
const COLOR_SEASON = "#38bdf8";
const COLOR_CAMPAIGN = "#10b981";

function DecompTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl",
        "text-popover-foreground",
      )}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label} — Anti-Rabies Demand Breakdown
      </p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li
            key={String(p.name)}
            className="flex justify-between gap-6 text-muted-foreground"
          >
            <span>{p.name}</span>
            <span className="font-semibold tabular-nums text-foreground">
              {p.value} doses
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendDecompositionChart() {
  return (
    <div className="h-[260px] w-full md:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={DECOMPOSITION_ROWS}
          margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
          stackOffset="none"
        >
          <defs>
            <linearGradient id="decompBaseline" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={COLOR_BASELINE}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={COLOR_BASELINE}
                stopOpacity={0.05}
              />
            </linearGradient>
            <linearGradient id="decompSeason" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={COLOR_SEASON}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={COLOR_SEASON}
                stopOpacity={0.05}
              />
            </linearGradient>
            <linearGradient id="decompCampaign" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={COLOR_CAMPAIGN}
                stopOpacity={0.35}
              />
              <stop
                offset="95%"
                stopColor={COLOR_CAMPAIGN}
                stopOpacity={0.05}
              />
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
          />
          <Tooltip content={<DecompTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => (
              <span className="text-muted-foreground">{String(value)}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="baseline"
            name="Clinic Walk-ins"
            stackId="decomp"
            stroke={COLOR_BASELINE}
            strokeWidth={1.5}
            fill="url(#decompBaseline)"
          />
          <Area
            type="monotone"
            dataKey="seasonal"
            name="Seasonal Demand"
            stackId="decomp"
            stroke={COLOR_SEASON}
            strokeWidth={1.5}
            fill="url(#decompSeason)"
          />
          <Area
            type="monotone"
            dataKey="campaignDrive"
            name="CVO Field Drives"
            stackId="decomp"
            stroke={COLOR_CAMPAIGN}
            strokeWidth={1.5}
            fill="url(#decompCampaign)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
