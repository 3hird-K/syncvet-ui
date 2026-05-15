"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RESOURCE_FORECAST_CHART_ROWS } from "@/data/resource-forecast";
import { cn } from "@/lib/utils";

const BAR_ORANGE = "#f97316";
const BAR_BLUE = "#38bdf8";
const BAR_VIOLET = "#a855f7";

function BarTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
}) {
  if (!active || !payload?.length) return null;
  const projected = String(label).includes("May");
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
          <span className="ml-2 text-orange-500 dark:text-orange-400">· Forecast</span>
        ) : null}
      </p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.name)} className="flex justify-between gap-6 text-muted-foreground">
            <span>{p.name}</span>
            <span className="font-semibold tabular-nums text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PredictiveForecastBarChart() {
  return (
    <div className="h-[300px] w-full md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={RESOURCE_FORECAST_CHART_ROWS}
          margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          barGap={2}
          barCategoryGap="18%"
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" vertical={false} />
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
          <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.35)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => (
              <span className="text-muted-foreground capitalize">{String(value)}</span>
            )}
          />
          <Bar
            dataKey="spayNeuter"
            name="Spay/neuter"
            fill={BAR_ORANGE}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="vaccination"
            name="Vaccination"
            fill={BAR_BLUE}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="walkIn"
            name="Walk-ins"
            fill={BAR_VIOLET}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
