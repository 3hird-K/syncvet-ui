"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ORANGE = "#f97316";
const BLUE = "#3b82f6";
const CYAN = "#06b6d4";

const chartData = [
  { date: "Apr 14", users: 1, tasks: 2, hours: 3 },
  { date: "Apr 18", users: 2, tasks: 3, hours: 3.5 },
  { date: "Apr 22", users: 3, tasks: 3.8, hours: 4 },
  { date: "Apr 26", users: 3.5, tasks: 4.2, hours: 4.5 },
  { date: "Apr 30", users: 4, tasks: 5, hours: 5 },
  { date: "May 04", users: 5, tasks: 8, hours: 10 },
  { date: "May 08", users: 6, tasks: 11, hours: 21 },
  { date: "May 12", users: 7, tasks: 12, hours: 22 },
  { date: "May 14", users: 7.5, tasks: 12.5, hours: 22.5 },
];

type ChartRow = (typeof chartData)[number];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ChartRow }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="space-y-0.5">
        <p>
          <span className="font-semibold" style={{ color: ORANGE }}>
            {row.users}
          </span>{" "}
          <span className="text-muted-foreground">pet registrations</span>
        </p>
        <p>
          <span className="font-semibold" style={{ color: BLUE }}>
            {row.tasks}
          </span>{" "}
          <span className="text-muted-foreground">vaccination doses</span>
        </p>
        <p>
          <span className="font-semibold" style={{ color: CYAN }}>
            {row.hours}
          </span>{" "}
          <span className="text-muted-foreground">field activity logs</span>
        </p>
      </div>
    </div>
  );
}

export function ServiceImpactChart() {
  return (
    <div className="space-y-4">
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
          >
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={ORANGE} stopOpacity={0.3} />
                <stop offset="95%" stopColor={ORANGE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillTasks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={BLUE} stopOpacity={0.25} />
                <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CYAN} stopOpacity={0.25} />
                <stop offset="95%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-border"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              className="fill-muted-foreground"
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              stroke={ORANGE}
              strokeWidth={2}
              fill="url(#fillUsers)"
            />
            <Area
              type="monotone"
              dataKey="tasks"
              stroke={BLUE}
              strokeWidth={2}
              fill="url(#fillTasks)"
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke={CYAN}
              strokeWidth={2}
              fill="url(#fillHours)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2 rounded-full"
            style={{ background: ORANGE }}
          />
          Pet Registrations
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: BLUE }} />
          Vaccination Doses
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: CYAN }} />
          Field Activity Logs
        </span>
      </div>
    </div>
  );
}
