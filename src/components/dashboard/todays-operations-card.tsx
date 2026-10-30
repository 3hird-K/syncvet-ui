"use client";

import { useState, useMemo, useEffect } from "react";
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
  QrCode,
  Bell,
  Volume2,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isTodayDate } from "@/lib/utils";
import { DailyQueueQrDialog } from "@/components/dashboard/daily-queue-qr-dialog";
import {
  getDailyQueue,
  callQueueTicket,
  completeQueueTicket,
  getTodayDateStr,
  syncQueueFromSupabase,
  syncConsultationsToQueue,
  type QueueTicket,
} from "@/lib/cvo-queue";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function TodaysOperationsCard() {
  const router = useRouter();
  const { consultations, updateConsultationStatus } = useCVO();
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [queueState, setQueueState] = useState(() => getDailyQueue(todayStr));

  const getCategoryForConsultation = (c: any): "consultation" | "vaccination" | "spay-neuter" => {
    const service = (c.serviceType || "").toLowerCase();
    const complaint = (c.chiefComplaint || "").toLowerCase();
    const diagnosis = (c.diagnosis || "").toLowerCase();
    const treatment = (c.treatment || "").toLowerCase();

    if (
      service.includes("vax") ||
      service.includes("vaccin") ||
      complaint.includes("vax") ||
      complaint.includes("vaccin") ||
      diagnosis.includes("rabies") ||
      treatment.includes("rabies")
    ) {
      return "vaccination";
    }
    if (
      service.includes("spay") ||
      service.includes("neuter") ||
      service.includes("kapon") ||
      complaint.includes("spay") ||
      complaint.includes("neuter") ||
      complaint.includes("kapon")
    ) {
      return "spay-neuter";
    }
    return "consultation";
  };

  const getCategoryForTicket = (t: QueueTicket): "consultation" | "vaccination" | "spay-neuter" => {
    if (t.serviceId === "vaccination") return "vaccination";
    if (t.serviceId === "spay-neuter") return "spay-neuter";
    const title = (t.serviceTitle || "").toLowerCase();
    if (title.includes("vax") || title.includes("vaccin") || title.includes("rabies")) return "vaccination";
    if (title.includes("spay") || title.includes("neuter") || title.includes("kapon")) return "spay-neuter";
    return "consultation";
  };

  const getEncounterUrl = (encounterNo: string, petName: string, category: string, ticketNumber?: string) => {
    const params = new URLSearchParams();
    if (encounterNo) params.set("encounterNo", encounterNo);
    if (petName) params.set("pet", petName);
    if (category) params.set("category", category);
    if (ticketNumber) params.set("ticket", ticketNumber);
    params.set("action", "fill");
    return `/consultations?${params.toString()}`;
  };

  useEffect(() => {
    // 1. Initial sync with Supabase appointments & CVO consultations
    syncQueueFromSupabase(todayStr).then(() => {
      const synced = syncConsultationsToQueue(consultations, todayStr);
      setQueueState(synced);
    });

    const handleUpdate = () => {
      setQueueState(getDailyQueue(todayStr));
    };
    window.addEventListener("syncvet-queue-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    // 2. Realtime subscription to appointments & queue broadcast across devices
    const supabase = getPublicSupabaseClient();
    const channel = supabase
      .channel("cvo-queue-realtime-card")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          syncQueueFromSupabase(todayStr).then(() => {
            const synced = syncConsultationsToQueue(consultations, todayStr);
            setQueueState(synced);
          });
        }
      )
      .on(
        "broadcast",
        { event: "queue_state_updated" },
        (payload) => {
          if (payload?.payload?.date === todayStr) {
            setQueueState(payload.payload);
          }
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("syncvet-queue-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [todayStr, consultations]);

  // Keep synced whenever consultations change
  useEffect(() => {
    if (consultations && consultations.length > 0) {
      const synced = syncConsultationsToQueue(consultations, todayStr);
      setQueueState(synced);
    }
  }, [consultations, todayStr]);

  // Filter consultations strictly for today
  const todaysConsultations = useMemo(
    () => consultations.filter((c) => isTodayDate(c.date)),
    [consultations]
  );

  const displayedConsultations = viewMode === "today" ? todaysConsultations : consultations;
  const activeQueueTickets = queueState.activeTickets.filter((t) => t.status !== "completed");
  const qrCheckinCount = activeQueueTickets.filter((t) => t.serviceId !== "consultation").length;
  const consultationQueueCount = activeQueueTickets.filter((t) => t.serviceId === "consultation").length;
  const totalActive = activeQueueTickets.length;

  // Consultations not yet in activeQueueTickets (e.g. historical from other days when in "all" mode)
  const unqueuedConsultations = useMemo(() => {
    if (viewMode === "all") return displayedConsultations;
    return displayedConsultations.filter(
      (c) =>
        !activeQueueTickets.some(
          (t) =>
            t.appointmentId === (c.encounterNo || c.id) ||
            t.encounterNo === c.encounterNo ||
            (t.serviceId === "consultation" &&
              t.petName.toLowerCase().trim() === (c.petName || "").toLowerCase().trim() &&
              t.ownerName.toLowerCase().trim() === (c.ownerName || "").toLowerCase().trim())
        )
    );
  }, [viewMode, displayedConsultations, activeQueueTickets]);

  const handleCallTicket = (ticketNumber: string, petName: string) => {
    callQueueTicket(ticketNumber, "Dr. Helen Ann P. Tacandong, DVM", "Consultation Desk 1");
    const ticket = queueState.activeTickets.find((t) => t.ticketNumber === ticketNumber);
    if (ticket?.serviceId === "consultation") {
      const matched = consultations.find(
        (c) => c.encounterNo === ticket.appointmentId || c.id === ticket.appointmentId || c.encounterNo === ticket.encounterNo
      );
      if (matched) {
        updateConsultationStatus(matched.id, "in-consultation");
      }
    }
    toast.info(`Calling Ticket ${ticketNumber} (${petName})! Broadcast sent to pet owner.`);
  };

  const handleCompleteTicket = (ticketNumber: string, petName: string) => {
    completeQueueTicket(ticketNumber);
    const ticket = queueState.activeTickets.find((t) => t.ticketNumber === ticketNumber);
    if (ticket?.serviceId === "consultation") {
      const matched = consultations.find(
        (c) => c.encounterNo === ticket.appointmentId || c.id === ticket.appointmentId || c.encounterNo === ticket.encounterNo
      );
      if (matched) {
        updateConsultationStatus(matched.id, "completed");
      }
    }
    toast.success(`Ticket ${ticketNumber} (${petName}) completed.`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-consultation":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-700 pointer-events-none select-none shadow-none gap-1"
          >
            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
            In Consultation
          </Badge>
        );
      case "treatment":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-700 pointer-events-none select-none shadow-none gap-1"
          >
            <Activity className="size-2.5 text-purple-600" />
            Treatment
          </Badge>
        );
      case "completed":
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-700 pointer-events-none select-none shadow-none gap-1"
          >
            <CheckCircle2 className="size-2.5 text-emerald-600" />
            Completed
          </Badge>
        );
      case "waiting":
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-700 pointer-events-none select-none shadow-none gap-1"
          >
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
        <div className="flex flex-wrap items-center justify-between gap-3">
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
                {todayFormatted} • Clinical consultations & QR Check-in
              </p>
            </div>
          </div>

          {/* Action Button: Check-in QR Station */}
          <div className="flex items-center gap-2 shrink-0">
            <DailyQueueQrDialog isStaff={true} />
          </div>
        </div>
      </CardHeader>

      {/* ── Content Section ── */}
      <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        {viewMode === "today" && activeQueueTickets.length > 0 && (
          <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <QrCode className="size-3.5 text-primary" />
                <span>
                  Today&apos;s Clinic Queue ({activeQueueTickets.length})
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Now Serving: <strong className="text-blue-600 dark:text-blue-400">{queueState.nowServingTicketNumber || "None"}</strong>
              </span>
            </div>

            {activeQueueTickets.map((t) => {
              const category = getCategoryForTicket(t);
              const encounterUrl = getEncounterUrl(
                t.encounterNo || t.appointmentId || t.ticketNumber,
                t.petName,
                category,
                t.ticketNumber
              );

              return (
                <div
                  key={t.id}
                  onClick={() => router.push(encounterUrl)}
                  className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-all space-y-1.5 cursor-pointer shadow-2xs group"
                  title="Click to view and fill up clinical record / findings"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs font-mono font-black text-emerald-800 dark:text-emerald-200 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md shrink-0">
                        {t.ticketNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {t.petName} <span className="font-normal text-muted-foreground">({t.species})</span>
                          {t.encounterNo && (
                            <span className="ml-1.5 font-mono text-[9px] text-muted-foreground/80 font-normal">
                              {t.encounterNo}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          Owner: <strong className="text-foreground">{t.ownerName}</strong>
                          {t.ownerBarangay ? ` (${t.ownerBarangay})` : ""} • {t.serviceTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {getStatusBadge(t.status)}
                      {t.status === "waiting" && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallTicket(t.ticketNumber, t.petName);
                          }}
                          className="h-6 px-2 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer"
                        >
                          <Bell className="size-2.5 mr-1" /> Call Next
                        </Button>
                      )}
                      <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-0.5" />
                    </div>
                  </div>

                  {t.notes && (
                    <p className="text-[10.5px] text-muted-foreground italic pl-2 border-l-2 border-emerald-500/40 line-clamp-1">
                      &quot;{t.notes}&quot;
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {unqueuedConsultations.length === 0 && activeQueueTickets.length === 0 ? (
          /* Minimalist Clean Empty State */
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
                  ? "No active patient tickets or consultations queued today. New arrivals and consultations appear here automatically."
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
          /* Unqueued / Historical Consultations (when in 'all' mode or prior records) */
          unqueuedConsultations.length > 0 && (
            <div className="space-y-2">
              {viewMode === "all" && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Stethoscope className="size-3.5 text-primary" />
                    <span>Historical Clinical Ledger ({unqueuedConsultations.length})</span>
                  </span>
                </div>
              )}
              {unqueuedConsultations.slice(0, 5).map((c) => {
                const category = getCategoryForConsultation(c);
                const encounterUrl = getEncounterUrl(
                  c.encounterNo || c.id,
                  c.petName,
                  category
                );

                return (
                  <Link
                    key={c.id}
                    href={encounterUrl}
                    className="block p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all space-y-1.5 group cursor-pointer shadow-2xs"
                    title="Click to view and fill up clinical record / findings"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
                      <div className="shrink-0 text-right flex items-center gap-1.5">
                        {getStatusBadge(c.status)}
                        <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* Minimal Footer */}
        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Queue: <strong className="text-foreground">{totalActive} active</strong>
            {activeQueueTickets.length > 0 && (
              <span className="text-[10px] text-muted-foreground ml-1">
                ({qrCheckinCount} QR check-in{qrCheckinCount === 1 ? "" : "s"}
                {consultationQueueCount > 0 ? `, ${consultationQueueCount} consultation${consultationQueueCount === 1 ? "" : "s"}` : ""})
              </span>
            )}
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
