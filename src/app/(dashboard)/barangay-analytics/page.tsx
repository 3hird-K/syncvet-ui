"use client";

import {
  MapPin,
  ShieldAlert,
  Target,
  TrendingUp,
  Flame,
  Truck,
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
import { BarangayRiskHeatmap } from "@/components/dashboard/resource-heatmap";
import { PredictiveForecastBarChart } from "@/components/dashboard/predictive-forecast-bar-chart";
import { MayForecastPie } from "@/components/dashboard/may-forecast-pie";
import { AprilVsMayHorizontalChart } from "@/components/dashboard/april-vs-may-horizontal-chart";

import { useCVO } from "@/lib/cvo-context";

export default function BarangayAnalyticsPage() {
  const { consultations, animalControlCases, fieldOperations } = useCVO();

  const activeDeployments = fieldOperations.filter((o) => o.status === "in-progress").length;
  const biteBarangays = new Set(
    animalControlCases
      .filter((c) => c.reason.toLowerCase().includes("bite") || c.reason.toLowerCase().includes("rabies"))
      .map((c) => c.barangay)
  );

  const activeBarangays = new Set(
    [
      ...consultations.map((c) => c.ownerBarangay),
      ...animalControlCases.map((a) => a.barangay),
      ...fieldOperations.map((f) => f.barangay),
    ].filter(Boolean)
  );

  const coveragePercent = Math.round((activeBarangays.size / 80) * 100);

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
      title: "Elevated Risk Zones",
      value: `${biteBarangays.size}`,
      icon: ShieldAlert,
      gradient: "from-red-500/5",
      iconClass: "text-red-400",
      badge: biteBarangays.size > 0 ? "Bite Surveillance" : "Clear",
      badgeClass: biteBarangays.size > 0 ? "text-red-400 bg-red-400/10" : "text-emerald-400 bg-emerald-400/10",
      sub: "Active bite quarantine zones",
    },
    {
      title: "Active Field Deployments",
      value: `${activeDeployments}`,
      icon: Truck,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-400",
      badge: activeDeployments > 0 ? "Active Drives" : "Standby",
      badgeClass: activeDeployments > 0 ? "text-blue-400 bg-blue-400/10" : "text-muted-foreground bg-muted/20",
      sub: "Mobile outreach units",
    },
    {
      title: "Geographic Reach",
      value: `${coveragePercent}%`,
      icon: TrendingUp,
      gradient: "from-primary/5",
      iconClass: "text-primary",
      badge: `${activeBarangays.size} of 80 Barangays`,
      badgeClass: "text-primary bg-primary/10",
      sub: "Target: 70% city-wide",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle="Geographical & Community Analytics"
        title="Barangay Risk Analytics"
        subtitle={
          <>
            Geographical risk assessment across 80 Cagayan de Oro barangays to prioritize <span className="text-foreground">mobile field vaccination drives</span> and rabies containment.
          </>
        }
        actions={
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 px-4 py-1.5 font-bold uppercase tracking-wider text-[10px] shadow-sm"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Surveillance Active
          </Badge>
        }
      />

      <PageMetricCards metrics={metrics} />

      {/* ── Barangay Risk Heatmap ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">
            Barangay Risk Scoring & Vaccination Coverage Gaps
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground/80">
            Composite risk scoring based on reported bite incidents, unvaccinated pet populations, and days since last municipal drive.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BarangayRiskHeatmap />
        </CardContent>
      </Card>

      {/* ── Field Operations Volume by Barangay ── */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">
            Municipal Deployment Volume Comparison
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground/80">
            Monthly volume outputs comparing field team mobile vaccinations against clinic walk-in encounters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PredictiveForecastBarChart />
            </div>
            <div className="border-t pt-4 lg:col-span-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <MayForecastPie />
            </div>
          </div>
          <AprilVsMayHorizontalChart />
        </CardContent>
      </Card>
    </div>
  );
}
