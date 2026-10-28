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
  PawPrint,
  CheckCircle2,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { isTodayDate } from "@/lib/utils";

export function TodaysOperationsCard() {
  const { consultations } = useCVO();
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  // Filter consultations strictly for today
  const todaysConsultations = useMemo(
    () => consultations.filter((c) => isTodayDate(c.date)),
    [consultations]
  );

  const displayedConsultations = viewMode === "today" ? todaysConsultations : consultations;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-consultation":
        return (
          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 gap-1">
            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
            In Consultation
          </Badge>
        );
      case "treatment":
        return (
          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 gap-1">
            <Activity className="size-2.5" />
            Treatment
          </Badge>
        );
      case "completed":
        return (
          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 gap-1">
            <CheckCircle2 className="size-2.5 text-emerald-600" />
            Completed
          </Badge>
        );
      case "waiting":
      default:
        return (
          <Badge className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 gap-1">
            <Clock className="size-2.5 text-amber-600" />
            Waiting
          </Badge>
        );
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

  const todayFormatted = format(new Date(), "MMMM d, yyyy");

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col h-full">
      {/* ── Minimalist Clean Header ── */}
      <CardHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/50 bg-muted/15">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Clock className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  {viewMode === "today" ? "Today's Clinic Queue" : "All Clinic Encounters"}
                </CardTitle>
                {viewMode === "today" ? (
                  <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Queue Active" />
                ) : (
                  <button
                    type="button"
                    onClick={() => setViewMode("today")}
                    className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                  >
                    ← Back to Today
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {todayFormatted} • Walk-in clinical triage
              </p>
            </div>
          </div>

          {/* Single Primary Action Button */}
          <Link href="/consultations" className="shrink-0">
            <Button
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>New Encounter</span>
            </Button>
          </Link>
        </div>
      </CardHeader>

      {/* ── Content Section ── */}
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        {displayedConsultations.length === 0 ? (
          /* Minimalist Clean Empty State (No duplicate buttons) */
          <div className="flex-1 flex flex-col items-center justify-center py-9 px-4 text-center space-y-2.5">
            <div className="size-10 rounded-xl bg-muted/50 border border-border/60 text-muted-foreground/60 flex items-center justify-center">
              <Stethoscope className="size-5" />
            </div>

            <div className="space-y-1 max-w-xs">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {viewMode === "today" ? "Queue is clear today" : "No encounters recorded"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {viewMode === "today"
                  ? "No walk-in consultations logged yet. New intakes encoded today will appear here in real time."
                  : "No clinical encounters found in records."}
              </p>
            </div>

            {viewMode === "today" && consultations.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className="text-[11px] text-primary font-medium hover:underline cursor-pointer pt-1 flex items-center gap-1"
              >
                <span>View prior encounters ({consultations.length})</span>
                <ArrowRight className="size-3" />
              </button>
            )}
          </div>
        ) : (
          /* Populated Consultation Encounters List */
          <div className="space-y-2">
            {displayedConsultations.slice(0, 5).map((c) => (
              <div
                key={c.id}
                className="p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-all space-y-1.5 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <PawPrint className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                          {c.petName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          • {c.species} ({c.breed})
                        </span>
                        <span className="font-mono text-[9px] text-muted-foreground/70">
                          {c.encounterNo}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Owner: <span className="font-medium text-foreground">{c.ownerName}</span> ({c.ownerBarangay})
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {getStatusBadge(c.status)}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground">
                  <span className="truncate italic text-muted-foreground/80 max-w-[220px]">
                    {c.chiefComplaint || "Routine consultation"}
                  </span>
                  <span className="shrink-0 font-mono text-[10px]">
                    {c.time || formatDateDisplay(c.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Minimal Footer */}
        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Queue: <strong className="text-foreground">{todaysConsultations.length} active</strong>
          </span>
          <Link
            href="/consultations"
            className="font-medium text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <span>Clinical Ledger</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
