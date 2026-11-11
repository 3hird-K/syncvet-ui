"use client";

import { useEffect, useState } from "react";
import {
  TrendingDown,
  LineChart,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  Package,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MonthlyProjection {
  month: string;
  projectedDemand: number;
  seasonFactor: string;
  multiplier: number;
  projectedEndStock: number;
  suggestedProcurement: number;
}

interface ForecastItem {
  itemId: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  minimumStock: number;
  predictedDailyDemand: number;
  predicted30DayDemand: number;
  daysUntilStockout: number;
  recommendedReorder: number;
  expirationDate: string;
  daysToExpiration?: number;
  isAtRiskOfExpiring?: boolean;
  urgency: "HEALTHY" | "WARNING" | "CRITICAL";
  monthlyProjections?: MonthlyProjection[];
}

interface ForecastPayload {
  model: string;
  generatedAt: string;
  metrics: {
    mae: number;
    r2Score: number;
  };
  forecasts: ForecastItem[];
  refreshedVia?: string;
}

export function InventoryForecastCard() {
  const [data, setData] = useState<ForecastPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"daily" | "monthly">("daily");

  const fetchForecast = async (isUserTriggered = false) => {
    setLoading(true);
    let toastId: string | number | undefined;

    if (isUserTriggered) {
      toastId = toast.loading("Updating stock estimates with latest records...");
    }

    try {
      const res = isUserTriggered
        ? await fetch("/api/inventory/forecast", { method: "POST" })
        : await fetch("/api/inventory/forecast");

      if (res.ok) {
        const json = await res.json();
        setData(json);

        if (isUserTriggered) {
          toast.success("Stock Forecast Updated", {
            id: toastId,
            description: "Updated with latest clinic inventory and visit records.",
          });
        }
      } else {
        if (isUserTriggered) {
          toast.error("Could not update forecast", { id: toastId });
        }
      }
    } catch {
      if (isUserTriggered) {
        toast.error("Network error while updating forecast", { id: toastId });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(false);
  }, []);

  if (!data || !data.forecasts || data.forecasts.length === 0) {
    return null;
  }

  const criticalItems = data.forecasts.filter((f) => f.urgency === "CRITICAL");
  const expiringItems = data.forecasts.filter((f) => f.isAtRiskOfExpiring);

  return (
    <Card className="border-indigo-500/20 bg-linear-to-br from-indigo-500/5 via-background to-muted/20 shadow-xs">
      <CardHeader className="px-6 py-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                <LineChart className="size-4" />
              </span>
              <CardTitle className="text-base font-semibold tracking-tight text-foreground">
                Smart Stock & Demand Forecast
              </CardTitle>
              <Badge variant="outline" className="text-[11px] font-normal border-indigo-500/30 text-indigo-500 bg-indigo-500/10">
                Automated Estimates
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Estimates daily medicine and vaccine usage based on past clinic visits and tells you when to reorder before running out.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle: Daily vs Monthly */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("daily")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs",
                  viewMode === "daily"
                    ? "bg-background text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Daily Usage
              </button>
              <button
                type="button"
                onClick={() => setViewMode("monthly")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs",
                  viewMode === "monthly"
                    ? "bg-background text-foreground font-medium shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="size-3 text-indigo-500" />
                Monthly Needs
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchForecast(true)}
              disabled={loading}
              className="h-8 text-xs cursor-pointer gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-5 pt-1 space-y-4">
        {/* VIEW 1: DAILY USAGE */}
        {viewMode === "daily" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.forecasts.slice(0, 6).map((item) => {
              const isCritical = item.urgency === "CRITICAL";
              const isWarning = item.urgency === "WARNING";

              let badgeText = `${item.daysUntilStockout} days supply left`;
              if (item.daysUntilStockout <= 0) {
                badgeText = "Out of Stock";
              } else if (isCritical) {
                badgeText = `Runs out in ~${item.daysUntilStockout} days`;
              } else if (isWarning) {
                badgeText = `~${item.daysUntilStockout} days remaining`;
              }

              return (
                <div
                  key={item.itemId + item.name}
                  className="flex flex-col justify-between p-3.5 rounded-lg border bg-card/60 backdrop-blur-xs transition-all hover:border-indigo-500/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-xs text-foreground line-clamp-1" title={item.name}>
                        {item.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 font-medium px-1.5 py-0.2 ${
                          isCritical
                            ? "border-rose-500/30 text-rose-500 bg-rose-500/10"
                            : isWarning
                            ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                            : "border-emerald-500/30 text-emerald-500 bg-emerald-500/10"
                        }`}
                      >
                        {badgeText}
                      </Badge>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Current In-Stock</span>
                        <span className="font-semibold text-foreground text-xs">{item.currentStock} {item.unit}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground/80">Estimated Daily Use</span>
                        <span className="font-semibold text-indigo-500 text-xs">~{item.predictedDailyDemand} {item.unit} / day</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3 text-muted-foreground/70" />
                      Needed this month: <strong className="text-foreground">{item.predicted30DayDemand} {item.unit}</strong>
                    </span>

                    {item.recommendedReorder > 0 ? (
                      <span className="text-indigo-500 font-medium text-[11px]">
                        Order: +{item.recommendedReorder} {item.unit}
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-medium text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="size-3" />
                        Sufficient
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW 2: MONTHLY NEEDS */
          <div className="space-y-3">
            <div className="rounded-lg border bg-card/60 backdrop-blur-xs overflow-hidden">
              <div className="p-3 bg-muted/30 border-b flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Package className="size-3.5 text-indigo-500" />
                  Medicine / Vaccine Name
                </span>
                <span>Next 4 Months: Expected Usage & Order Recommendations</span>
              </div>

              <div className="divide-y divide-border/50">
                {data.forecasts.slice(0, 6).map((item) => (
                  <div key={item.itemId + item.name} className="p-3.5 hover:bg-muted/10 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground">
                          {item.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                          In Storage: {item.currentStock} {item.unit}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        Normal clinic usage: <strong className="text-foreground">~{item.predictedDailyDemand} {item.unit} / day</strong>
                      </span>
                    </div>

                    {/* Monthly Timeline Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(item.monthlyProjections || []).map((m, idx) => {
                        const isSurge = m.multiplier > 1.5;
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "p-2.5 rounded-md border text-xs flex flex-col justify-between",
                              isSurge
                                ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                                : "border-border/60 bg-muted/20"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-[11px] text-foreground">{m.month}</span>
                              {isSurge && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/40 text-amber-500 bg-amber-500/10">
                                  Peak Demand Season
                                </Badge>
                              )}
                            </div>

                            <div className="mt-2 space-y-0.5">
                              <div className="text-[11px] text-muted-foreground">
                                Expected Use: <strong className="text-foreground">{m.projectedDemand} {item.unit}</strong>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate" title={m.seasonFactor}>
                                {m.seasonFactor.replace("Surge (2.1x)", "Campaign Month")}
                              </div>
                            </div>

                            <div className="mt-2 pt-1.5 border-t border-border/40 text-[10px] flex items-center justify-between">
                              <span className="text-muted-foreground">Order Needed:</span>
                              <span className={m.suggestedProcurement > 0 ? "font-semibold text-indigo-500" : "text-emerald-500"}>
                                {m.suggestedProcurement > 0 ? `+${m.suggestedProcurement} ${item.unit}` : "Covered"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Forecast summary bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5 text-indigo-400" />
              Estimate Margin: <strong className="text-foreground">±{Math.round(data.metrics.mae || 1)} dose(s)</strong>
            </span>
            {criticalItems.length > 0 && (
              <span className="flex items-center gap-1 text-rose-500 font-medium">
                <AlertTriangle className="size-3.5" />
                {criticalItems.length} item(s) running low soon
              </span>
            )}
            {expiringItems.length > 0 && (
              <span className="flex items-center gap-1 text-amber-500 font-medium">
                <TrendingDown className="size-3.5" />
                {expiringItems.length} batch(es) at risk of expiring before use
              </span>
            )}
          </div>
          <span className="text-[11px]">
            Last updated: {new Date(data.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
