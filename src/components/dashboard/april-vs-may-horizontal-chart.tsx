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
import { RESOURCE_FORECAST_SUMMARY } from "@/data/resource-forecast";
import { cn } from "@/lib/utils";

const apr = RESOURCE_FORECAST_SUMMARY[3]!;
const may = RESOURCE_FORECAST_SUMMARY[4]!;

const comparisonRows = [
  {
    metric: "Spay/neuter",
    april: apr.spayNeuter,
    mayForecast: may.spayNeuter,
  },
  {
    metric: "Vaccination",
    april: apr.vaccination,
    mayForecast: may.vaccination,
  },
  {
    metric: "Walk-ins",
    april: apr.walkIn,
    mayForecast: may.walkIn,
  },
];

function HBarTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
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
        {label}
      </p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.name)} className="flex justify-between gap-8 text-muted-foreground">
            <span>{p.name}</span>
            <span className="font-semibold tabular-nums text-foreground">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Side-by-side horizontal bars: April actual vs May forecast (different chart type). */
export function AprilVsMayHorizontalChart() {
  return (
    <div className="w-full border-t border-border/60 pt-10 md:pt-12">
      <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground md:text-[13px]">
        April actual vs May forecast
      </p>
      <div className="h-[160px] w-full md:h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={comparisonRows}
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barGap={4}
            barCategoryGap="15%"
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/80" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" />
            <YAxis
              type="category"
              dataKey="metric"
              width={88}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<HBarTooltip />} cursor={false} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
              formatter={(v) => <span className="text-muted-foreground">{String(v)}</span>}
            />
            <Bar
              dataKey="april"
              name="April (actual)"
              fill="#64748b"
              radius={[0, 4, 4, 0]}
              barSize={12}
            />
            <Bar
              dataKey="mayForecast"
              name="May (forecast)"
              fill="#f97316"
              radius={[0, 4, 4, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
