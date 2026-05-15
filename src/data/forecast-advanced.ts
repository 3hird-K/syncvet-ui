/**
 * Advanced forecast data for the SyncVet Predictive Resource module.
 *
 * Aligned with the study scope:
 *   "SyncVet: A Web and Mobile-Based Animal Health Management System
 *    with Predictive Resource Forecasting for the CDO Veterinary Office"
 *
 * Key study pillars:
 *  - Anti-rabies vaccination drives at the barangay level
 *  - Vaccine stock inventory (Anti-Rabies / Parvovirus)
 *  - Field team deployment & mobile offline-first capture
 *  - Barangay-level risk scoring for resource allocation
 */

import { RESOURCE_FORECAST_SUMMARY, MAY_FORECAST_ROW } from "./resource-forecast";

/* ────────────────────────────────────────────────────────
   1.  VACCINATION CONFIDENCE INTERVAL (Anti-Rabies Doses)
   ──────────────────────────────────────────────────────── */

export type ConfidenceRow = {
  month: string;
  antiRabies: number;
  lower: number;
  upper: number;
  projected?: boolean;
};

/**
 * Confidence band for anti-rabies vaccination doses administered.
 * Uses ±8% for historical months (Jan–Apr) and ±25% for the May projection
 * to show the widening uncertainty of the ML forecast.
 */
export const CONFIDENCE_ROWS: ConfidenceRow[] = RESOURCE_FORECAST_SUMMARY.map(
  (r) => {
    const margin = r.projected ? 0.25 : 0.08;
    return {
      month: r.month,
      antiRabies: r.vaccination,
      lower: Math.round(r.vaccination * (1 - margin)),
      upper: Math.round(r.vaccination * (1 + margin)),
      projected: r.projected,
    };
  },
);

/* ────────────────────────────────────────────────────────
   2.  BARANGAY RISK SCORING HEATMAP
   ──────────────────────────────────────────────────────── */

export type BarangayRiskCell = {
  barangay: string;
  metric: string;
  value: number; // 0-100 risk score
};

/** Representative barangays from CDO districts covered by the Veterinary Office */
const BARANGAYS = [
  "Lapasan",
  "Carmen",
  "Bulua",
  "Macasandig",
  "Kauswagan",
  "Patag",
  "Gusa",
  "Iponan",
];

/** Risk dimensions evaluated per barangay for resource allocation */
const RISK_METRICS = [
  "Rabies Cases",
  "Unvaccinated Pets",
  "Stray Population",
  "Coverage Gap",
];

/**
 * Deterministic synthetic risk scores per barangay-metric pair.
 * Simulates real barangay-level risk data the CVO would compute from
 * SyncVet's pet registry and vaccination records.
 */
function syntheticRisk(bIdx: number, mIdx: number): number {
  const baseRisk: Record<string, number[]> = {
    "Rabies Cases":     [72, 45, 88, 35, 60, 28, 52, 80],
    "Unvaccinated Pets":[65, 55, 78, 42, 70, 38, 48, 85],
    "Stray Population": [80, 50, 92, 40, 75, 32, 58, 90],
    "Coverage Gap":     [58, 38, 82, 30, 55, 22, 42, 76],
  };
  const metric = RISK_METRICS[mIdx]!;
  const base = baseRisk[metric]?.[bIdx] ?? 50;
  const jitter = ((bIdx * 7 + mIdx * 13) % 11) - 5;
  return Math.max(0, Math.min(100, Math.round(base + jitter)));
}

export const BARANGAY_RISK_DATA: BarangayRiskCell[] = BARANGAYS.flatMap(
  (barangay, bi) =>
    RISK_METRICS.map((metric, mi) => ({
      barangay,
      metric,
      value: syntheticRisk(bi, mi),
    })),
);

export { BARANGAYS as HEATMAP_BARANGAYS, RISK_METRICS as HEATMAP_RISK_METRICS };

/* ────────────────────────────────────────────────────────
   3.  VACCINATION TREND DECOMPOSITION
   ──────────────────────────────────────────────────────── */

export type DecompositionRow = {
  month: string;
  baseline: number;
  seasonal: number;
  campaignDrive: number;
  total: number;
};

/**
 * Decomposes anti-rabies vaccination volume into:
 *  - Baseline: steady-state clinic vaccinations
 *  - Seasonal: weather/school-calendar-driven demand
 *  - Campaign Drive: scheduled CVO field vaccination campaigns
 */
export const DECOMPOSITION_ROWS: DecompositionRow[] = [
  { month: "Jan", baseline: 52, seasonal: 12,  campaignDrive: 34, total: 98 },
  { month: "Feb", baseline: 52, seasonal: 18,  campaignDrive: 38, total: 108 },
  { month: "Mar", baseline: 52, seasonal: 28,  campaignDrive: 41, total: 121 },
  { month: "Apr", baseline: 52, seasonal: 32,  campaignDrive: 48, total: 132 },
  { month: "May", baseline: 52, seasonal: 36,  campaignDrive: 57, total: 145 },
];

/* ────────────────────────────────────────────────────────
   4.  VACCINE STOCK vs. FORECASTED DEMAND
   ──────────────────────────────────────────────────────── */

export type VaccineStockRow = {
  vaccine: string;
  forecastDoses: number;
  currentStock: number;
  color: string;
};

/**
 * Compares May forecasted demand against current vaccine inventory.
 * These are the primary vaccine types managed by the CDO Vet Office.
 */
export const VACCINE_STOCK_DATA: VaccineStockRow[] = [
  {
    vaccine: "Anti-Rabies (Canine)",
    forecastDoses: Math.round(MAY_FORECAST_ROW.vaccination * 0.6),
    currentStock: 110,
    color: "#38bdf8",
  },
  {
    vaccine: "Anti-Rabies (Feline)",
    forecastDoses: Math.round(MAY_FORECAST_ROW.vaccination * 0.25),
    currentStock: 50,
    color: "#06b6d4",
  },
  {
    vaccine: "Anti-Parvovirus",
    forecastDoses: Math.round(MAY_FORECAST_ROW.spayNeuter * 0.8),
    currentStock: 55,
    color: "#f97316",
  },
  {
    vaccine: "Deworming Doses",
    forecastDoses: Math.round(MAY_FORECAST_ROW.walkIn * 0.7),
    currentStock: 60,
    color: "#a855f7",
  },
];
