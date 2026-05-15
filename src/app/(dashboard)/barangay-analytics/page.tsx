"use client";

import {
  MapPin,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { ConfidenceIntervalChart } from "@/components/dashboard/confidence-interval-chart";
import { BarangayRiskHeatmap } from "@/components/dashboard/resource-heatmap";
import { TrendDecompositionChart } from "@/components/dashboard/trend-decomposition-chart";
import { VaccineStockGauge } from "@/components/dashboard/capacity-gauge";

const metrics: PageMetric[] = [
  {
    title: "Barangays Monitored",
    value: "80",
    icon: MapPin,
    gradient: "from-emerald-500/5",
    iconClass: "text-emerald-400",
    badge: "City-wide",
    badgeClass: "text-emerald-400 bg-emerald-400/10",
    sub: "CDO jurisdictional areas",
  },
  {
    title: "High-Risk Areas",
    value: "8",
    icon: ShieldAlert,
    gradient: "from-red-500/5",
    iconClass: "text-red-400",
    badge: "Priority",
    badgeClass: "text-red-400 bg-red-400/10",
    sub: "Elevated rabies risk",
  },
  {
    title: "Forecast Accuracy",
    value: "87%",
    icon: Target,
    gradient: "from-blue-500/5",
    iconClass: "text-blue-400",
    badge: "ML Model v2.1",
    badgeClass: "text-blue-400 bg-blue-400/10",
    sub: "Last 90-day MAPE",
  },
  {
    title: "Growth Trend",
    value: "+12%",
    icon: TrendingUp,
    gradient: "from-primary/5",
    iconClass: "text-primary",
    badge: "Month-over-Month",
    badgeClass: "text-primary bg-primary/10",
    sub: "Vaccination volume",
  },
];

export default function BarangayAnalyticsPage() {
  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Resource Planning Module"
        title="Barangay Analytics"
        subtitle={
          <>
            <span className="text-foreground">Predictive resource forecasting</span> and barangay-level risk scoring powered by ML analysis of historical data.
          </>
        }
        actions={
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm shadow-emerald-500/10"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            ML Model Active
          </Badge>
        }
      />

      <PageMetricCards metrics={metrics} />

      {/* ── Confidence + Decomposition Row ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Anti-Rabies Forecast Confidence
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              Predicted anti-rabies vaccination doses with upper/lower bounds — shaded band shows the ML model&apos;s 80% confidence interval for May demand.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfidenceIntervalChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Vaccination Demand Decomposition
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              Anti-rabies volume broken into clinic walk-ins, seasonal demand, and CVO field vaccination drives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendDecompositionChart />
          </CardContent>
        </Card>
      </div>

      {/* ── Heatmap + Stock Row ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Barangay Risk Scoring
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              Risk assessment across CDO barangays — prioritizes field vaccination deployment based on rabies cases, unvaccinated pets, stray population, and coverage gaps.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarangayRiskHeatmap />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold">
              Vaccine Stock vs. Demand
            </CardTitle>
            <CardDescription className="text-[11px] text-muted-foreground/60">
              May forecasted dose consumption measured against current inventory — flags vaccines nearing stockout for timely procurement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VaccineStockGauge />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
