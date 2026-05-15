import { MetricCards } from "@/components/dashboard/metric-cards";
import { ServiceImpactChart } from "@/components/dashboard/service-impact-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { PredictiveForecastBarChart } from "@/components/dashboard/predictive-forecast-bar-chart";
import { MayForecastPie } from "@/components/dashboard/may-forecast-pie";
import { AprilVsMayHorizontalChart } from "@/components/dashboard/april-vs-may-horizontal-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex-1 space-y-4 p-6 pt-6 bg-background min-h-screen text-foreground">
      {/* ── Header ── */}
      <DashboardHeader />

      {/* ── Metric cards ── */}
      <MetricCards />

      {/* ── Chart + Activity row ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg font-bold tracking-tight text-foreground">
              Service Impact Analysis
            </CardTitle>
            <CardDescription className="text-[11px] font-medium text-muted-foreground/60">
              Analyzing correlations between pet registrations, field work, and clinical labor for the CDO Veterinary Office.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ServiceImpactChart />
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* ── Predictive forecast ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold tracking-tight text-foreground">
            Predictive Resource Forecast
          </CardTitle>
          <CardDescription className="text-[11px] font-medium text-muted-foreground/60">
            ML-driven forecasting predicting current month demand based on historical data patterns from previous months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                Monthly volume — grouped comparison
              </p>
              <PredictiveForecastBarChart />
            </div>
            <div className="border-t pt-4 lg:col-span-2 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
              <p className="mb-3 text-xs font-medium text-muted-foreground">
                May projected mix
              </p>
              <MayForecastPie />
            </div>
          </div>
          <AprilVsMayHorizontalChart />
        </CardContent>
      </Card>
    </div>
  );
}
