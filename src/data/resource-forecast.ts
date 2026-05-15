/**
 * Demo monthly volumes for SyncVet predictive resource planning (CDO Vet Office).
 * May values are illustrative projections from the Jan–Apr trend.
 */
export type ResourceMonthRow = {
  month: string;
  spayNeuter: number;
  vaccination: number;
  walkIn: number;
  projected?: boolean;
};

const JAN_APR: ResourceMonthRow[] = [
  { month: "Jan", spayNeuter: 36, vaccination: 98, walkIn: 52 },
  { month: "Feb", spayNeuter: 40, vaccination: 108, walkIn: 55 },
  { month: "Mar", spayNeuter: 44, vaccination: 121, walkIn: 61 },
  { month: "Apr", spayNeuter: 47, vaccination: 132, walkIn: 66 },
];

function projectNext(values: number[]): number {
  const n = values.length;
  if (n < 2) return Math.round(values[0] ?? 0);
  const last = values[n - 1]!;
  const prev = values[n - 2]!;
  return Math.max(0, Math.round(last + (last - prev) * 1.05));
}

const may: ResourceMonthRow = {
  month: "May (pred.)",
  spayNeuter: projectNext(JAN_APR.map((r) => r.spayNeuter)),
  vaccination: projectNext(JAN_APR.map((r) => r.vaccination)),
  walkIn: projectNext(JAN_APR.map((r) => r.walkIn)),
  projected: true,
};

export const RESOURCE_FORECAST_SUMMARY: ResourceMonthRow[] = [...JAN_APR, may];

export const RESOURCE_FORECAST_CHART_ROWS = RESOURCE_FORECAST_SUMMARY;

/** For pie / radial: May only — relative workload mix */
export function getMayForecastMix() {
  const total = may.spayNeuter + may.vaccination + may.walkIn;
  return [
    {
      name: "Spay/neuter",
      value: may.spayNeuter,
      fill: "#f97316",
      pct: total ? Math.round((may.spayNeuter / total) * 100) : 0,
    },
    {
      name: "Vaccination",
      value: may.vaccination,
      fill: "#38bdf8",
      pct: total ? Math.round((may.vaccination / total) * 100) : 0,
    },
    {
      name: "Walk-ins",
      value: may.walkIn,
      fill: "#a855f7",
      pct: total ? Math.round((may.walkIn / total) * 100) : 0,
    },
  ];
}

export { may as MAY_FORECAST_ROW };
