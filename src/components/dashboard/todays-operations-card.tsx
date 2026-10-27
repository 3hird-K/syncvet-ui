"use client";

import { useState, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useCVO } from "@/lib/cvo-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Stethoscope,
  Clock,
  ArrowRight,
  Plus,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { cn, isTodayDate } from "@/lib/utils";

export function TodaysOperationsCard() {
  const { consultations } = useCVO();
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  // Strictly filter consultations for today
  const todaysConsultations = useMemo(
    () => consultations.filter((c) => isTodayDate(c.date)),
    [consultations]
  );

  const displayedConsultations = viewMode === "today" ? todaysConsultations : consultations;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-consultation":
        return <Badge className="text-[9px] bg-blue-500/15 text-blue-500 hover:bg-blue-500/25">In Consultation</Badge>;
      case "treatment":
        return <Badge className="text-[9px] bg-purple-500/15 text-purple-500 hover:bg-purple-500/25">Treatment</Badge>;
      case "completed":
        return <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25">Completed</Badge>;
      case "waiting":
      default:
        return <Badge className="text-[9px] bg-amber-500/15 text-amber-500 hover:bg-amber-500/25">Waiting</Badge>;
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) return format(parsed, "MMM d, yyyy");
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0 flex-1">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground leading-snug">
                  Today&apos;s Clinic Operations & Queue
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/5">
                  {format(new Date(), "MMMM d, yyyy")}
                </Badge>
              </div>
              <CardDescription className="text-[11px] text-muted-foreground/80 mt-1 line-clamp-2 sm:line-clamp-none">
                Real-time walk-in clinical consultations, examinations, and treatment encounters for today
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Filter Pills */}
            <div className="flex items-center p-0.5 rounded-lg bg-muted/40 border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("today")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "today"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Today ({todaysConsultations.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer",
                  viewMode === "all"
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Encounters ({consultations.length})
              </button>
            </div>

            <Link href="/consultations" className="shrink-0">
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1 cursor-pointer">
                <Plus className="size-3" /> New Encounter
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {displayedConsultations.length === 0 ? (
          <div className="py-8 text-center border border-dashed rounded-lg border-border/80 bg-muted/10 space-y-2">
            <Stethoscope className="size-6 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              {viewMode === "today"
                ? `No Clinic Encounters Recorded Today (${format(new Date(), "MMMM d, yyyy")})`
                : "No Clinical Encounters Recorded"}
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {viewMode === "today"
                ? "The walk-in queue for today is currently clear. Encounters logged today will appear here in real time."
                : "No walk-in consultation encounters recorded in database yet. Click \"New Encounter\" to log one."}
            </p>
            {viewMode === "today" && consultations.length > 0 && (
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode("all")}
                  className="h-7 text-xs font-medium cursor-pointer"
                >
                  View Prior Encounters ({consultations.length})
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayedConsultations.slice(0, 6).map((c) => {
              const isToday = isTodayDate(c.date);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Stethoscope className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-foreground">{c.petName}</span>
                        <span className="text-[10px] text-muted-foreground">({c.species} • {c.breed})</span>
                        <span className="font-mono text-[9px] text-muted-foreground/60">{c.encounterNo}</span>
                        {isToday ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-bold"
                          >
                            Today
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-medium"
                          >
                            {formatDateDisplay(c.date)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Owner: <span className="font-medium text-foreground">{c.ownerName}</span> ({c.ownerBarangay}) • Complaint: {c.chiefComplaint}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        Attending: {c.vetName} • Date: {formatDateDisplay(c.date)} • Time: {c.time}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 pl-2 text-right space-y-1">
                    {getStatusBadge(c.status)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

