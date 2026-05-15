"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getMayForecastMix } from "@/data/resource-forecast";
import { cn } from "@/lib/utils";

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; payload?: { pct?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  const pct = p.payload?.pct;
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl",
        "text-popover-foreground",
      )}
    >
      <p className="font-semibold">{p.name}</p>
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">{p.value}</span> cases
        {pct != null ? <span className="text-muted-foreground"> · {pct}% of May mix</span> : null}
      </p>
    </div>
  );
}

export function MayForecastPie() {
  const data = getMayForecastMix();

  return (
    <div className="flex h-[300px] w-full flex-col md:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="48%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<PieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="-mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {data.map((d) => (
          <span key={d.name} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: d.fill }} />
            {d.name}{" "}
            <span className="tabular-nums text-foreground">{d.pct}%</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        May projected mix — dogs & cats combined (demo)
      </p>
    </div>
  );
}
