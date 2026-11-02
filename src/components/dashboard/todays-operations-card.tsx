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
  Syringe,
  Scissors,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isTodayDate, cn, isClinicQueueClosed, isConsultationOverdue } from "@/lib/utils";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { useQuery } from "@tanstack/react-query";
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

  // Fetch pets to match profile pictures across all tickets and consultations
  const { data: allPets } = useQuery({
    queryKey: ["todays-operations-pets"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data } = await supabase
          .from("pets")
          .select("id, name, species, breed, photo_url, avatar_url");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const getPetPhoto = (petId?: string, petName?: string, fallbackUrl?: string) => {
    if (fallbackUrl) return fallbackUrl;
    if (!allPets || allPets.length === 0) return null;
    const match = allPets.find(
      (p) =>
        (petId && p.id === petId) ||
        (petName && p.name?.toLowerCase().trim() === petName.toLowerCase().trim())
    );
    return match?.photo_url || match?.avatar_url || null;
  };

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

  // Check if today's clinic queue has automatically closed (6:00 PM cut-off)
  const isClosed = isClinicQueueClosed(todayStr);

  // Filter consultations strictly for today
  const todaysConsultations = useMemo(
    () => consultations.filter((c) => isTodayDate(c.date)),
    [consultations]
  );

  const displayedConsultations = viewMode === "today" ? todaysConsultations : consultations;

  // After 6:00 PM or when closed, items do not belong in today's active queue
  const activeQueueTickets = isClosed
    ? []
    : queueState.activeTickets.filter(
        (t) => t.status === "waiting" || t.status === "in-consultation"
      );

  // Displayed tickets in the primary active queue (exclude overdue)
  const displayedTickets = activeQueueTickets;

  const qrCheckinCount = activeQueueTickets.filter((t) => t.serviceId !== "consultation").length;
  const consultationQueueCount = activeQueueTickets.filter((t) => t.serviceId === "consultation").length;
  const totalActive = activeQueueTickets.length;

  // Consultations not yet in queueState.activeTickets (exclude overdue in today's queue)
  const unqueuedConsultations = useMemo(() => {
    if (viewMode === "all") return displayedConsultations;
    if (isClosed) return []; // After 6:00 PM cutoff, all unattended encounters are overdue and not in active queue
    return displayedConsultations.filter(
      (c) =>
        !isConsultationOverdue(c.date, c.status) &&
        c.status !== "completed" &&
        !queueState.activeTickets.some(
          (t) =>
            t.appointmentId === (c.encounterNo || c.id) ||
            t.encounterNo === c.encounterNo ||
            (t.serviceId === "consultation" &&
              t.petName.toLowerCase().trim() === (c.petName || "").toLowerCase().trim() &&
              t.ownerName.toLowerCase().trim() === (c.ownerName || "").toLowerCase().trim())
        )
    );
  }, [viewMode, displayedConsultations, queueState.activeTickets, isClosed]);

  // Overall overdue counts
  const overdueTickets = queueState.activeTickets.filter((t) => t.status === "overdue");
  const overdueConsultations = displayedConsultations.filter((c) => isConsultationOverdue(c.date, c.status));
  const overdueCount = overdueTickets.length + overdueConsultations.length;

  const handleCallTicket = (ticketNumber: string, petName: string) => {
    if (isClosed) {
      toast.warning("Clinic queue closed at 6:00 PM. Calling is disabled.");
      return;
    }
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

  const getStatusBadge = (status: string, isOverdueItem: boolean = false) => {
    if (isOverdueItem || status === "overdue") {
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-700 pointer-events-none select-none shadow-none gap-1"
        >
          <Clock className="size-2.5 text-rose-600" />
          Overdue
        </Badge>
      );
    }
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
                  isClosed ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold gap-1 px-2 py-0.5 pointer-events-none select-none shadow-none"
                    >
                      <Clock className="size-2.5 text-amber-600" /> Closed (6:00 PM Cut-off)
                    </Badge>
                  ) : (
                    <span className="flex size-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Queue Active" />
                  )
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
                {todayFormatted} • {isClosed ? "Transactions closed at 6:00 PM (8:00 AM – 5:00 PM)" : "Clinical consultations & QR Check-in"}
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
        {/* Closed notice banner */}
        {isClosed && viewMode === "today" && (
          <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
            <Clock className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-[11px] leading-tight">Clinic Transactions Closed (6:00 PM Cut-off)</p>
              <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-normal">
                Operating transactions (8:00 AM – 5:00 PM) automatically closed at 6:00 PM. All unattended patients remaining in today&apos;s schedule have been marked as <strong>Overdue</strong>.
              </p>
            </div>
          </div>
        )}

        {viewMode === "today" && displayedTickets.length > 0 && (
          <div className="space-y-2 mb-2">
            <div className="flex items-center justify-between">
              <span className={cn(
                "text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5",
                isClosed ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
              )}>
                {isClosed ? <Clock className="size-3.5 text-amber-600" /> : <QrCode className="size-3.5 text-primary" />}
                <span>
                  {isClosed
                    ? `Today's Schedule & Encounters (${displayedTickets.length})`
                    : `Today's Clinic Queue (${displayedTickets.length})`}
                </span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {isClosed ? (
                  <>Queue Status: <strong className="text-amber-600 dark:text-amber-400 font-semibold">Closed (0 Active)</strong></>
                ) : (
                  <>Now Serving: <strong className="text-blue-600 dark:text-blue-400">{queueState.nowServingTicketNumber || "None"}</strong></>
                )}
              </span>
            </div>

            {displayedTickets.map((t) => {
              const category = getCategoryForTicket(t);
              const encounterUrl = getEncounterUrl(
                t.encounterNo || t.appointmentId || t.ticketNumber,
                t.petName,
                category,
                t.ticketNumber
              );
              const petPhoto = getPetPhoto(t.petId, t.petName, t.petPhotoUrl);

              const serviceIcon =
                category === "vaccination" ? (
                  <Syringe className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : category === "spay-neuter" ? (
                  <Scissors className="size-3 text-purple-600 dark:text-purple-400 shrink-0" />
                ) : (
                  <Stethoscope className="size-3 text-blue-600 dark:text-blue-400 shrink-0" />
                );

              return (
                <div
                  key={t.id}
                  onClick={() => router.push(encounterUrl)}
                  className="p-3 sm:p-3.5 rounded-2xl border border-border/80 bg-card hover:border-primary/40 hover:bg-muted/15 hover:shadow-xs transition-all space-y-2 cursor-pointer shadow-2xs group relative"
                  title="Click to view and fill up clinical record / findings"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Queue Number + Pet Avatar + Pet & Owner Details */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Ticket Number Pill */}
                      <span className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-xl shrink-0 shadow-2xs">
                        {t.ticketNumber}
                      </span>

                      {/* Pet Avatar */}
                      <PetAvatar
                        photoUrl={petPhoto}
                        species={t.species}
                        name={t.petName}
                        size="md"
                        className="size-11 sm:size-12 shrink-0 ring-2 ring-primary/15 shadow-xs"
                      />

                      {/* Info */}
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                            {t.petName}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                            {t.species || "Pet"}
                          </span>
                          {t.encounterNo && (
                            <span className="font-mono text-[9px] text-muted-foreground/75 font-medium px-1.5 py-0.5 rounded bg-muted/40 border border-border/40">
                              {t.encounterNo}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                          <span className="truncate">
                            Owner: <strong className="text-foreground font-semibold">{t.ownerName}</strong>
                            {t.ownerBarangay ? ` (${t.ownerBarangay})` : ""}
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-foreground/80 shrink-0">
                            {serviceIcon}
                            <span className="truncate max-w-[180px] sm:max-w-[260px]">{t.serviceTitle}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status, Call Button, Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      {getStatusBadge(t.status)}
                      {t.status === "waiting" && !isClosed && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCallTicket(t.ticketNumber, t.petName);
                          }}
                          className="h-7 px-2.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer shadow-xs gap-1.5 active:scale-95 transition-transform"
                        >
                          <Bell className="size-3" /> Call Next
                        </Button>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all ml-0.5" />
                    </div>
                  </div>

                  {/* Notes / Reason */}
                  {t.notes && (
                    <div className="pt-1.5 border-t border-border/40 flex items-center gap-2 text-[11px]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                        Reason:
                      </span>
                      <p className="text-muted-foreground italic truncate bg-muted/30 px-2 py-0.5 rounded-md border border-border/30 text-[11px]">
                        &ldquo;{t.notes}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {unqueuedConsultations.length === 0 && displayedTickets.length === 0 ? (
          /* Minimalist Clean Empty State */
          <div className="flex-1 flex flex-col items-center justify-center py-9 px-4 text-center space-y-2.5">
            <div className="size-10 rounded-xl bg-muted/50 border border-border/60 text-muted-foreground/60 flex items-center justify-center">
              <Stethoscope className="size-5" />
            </div>

            <div className="space-y-1 max-w-xs">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                {viewMode === "today"
                  ? (isClosed ? "Clinic transactions closed for today" : "Queue is clear today")
                  : "No encounters recorded"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {viewMode === "today"
                  ? (isClosed
                      ? "Daily clinic transactions (8:00 AM – 5:00 PM) closed at 6:00 PM. Unattended patients have been recorded as Overdue in the Clinical Ledger."
                      : "No active patient tickets or consultations queued today. New arrivals and consultations appear here automatically.")
                  : "No clinical encounters found in records."}
              </p>
            </div>
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
                const petPhoto = getPetPhoto(c.petId, c.petName, c.photoUrl);

                return (
                  <Link
                    key={c.id}
                    href={encounterUrl}
                    className="block p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/20 hover:border-primary/40 transition-all space-y-1.5 group cursor-pointer shadow-2xs"
                    title="Click to view and fill up clinical record / findings"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PetAvatar
                          photoUrl={petPhoto}
                          species={c.species}
                          name={c.petName}
                          size="sm"
                          className="size-9 shrink-0 ring-1 ring-primary/20 shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                              {c.petName}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              • {c.species} {c.breed ? `(${c.breed})` : ""}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground/70">
                              {c.encounterNo}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">
                            Owner: <span className="font-semibold text-foreground">{c.ownerName}</span> {c.ownerBarangay ? `(${c.ownerBarangay})` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right flex items-center gap-1.5">
                        {getStatusBadge(c.status, isConsultationOverdue(c.date, c.status))}
                        <ChevronRight className="size-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                      <span className="truncate italic text-muted-foreground/80 max-w-[240px]">
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
            {isClosed && viewMode === "today" ? (
              <>
                Queue: <strong className="text-amber-600 dark:text-amber-400 font-semibold">Closed (6:00 PM Cut-off)</strong>
                {overdueCount > 0 && (
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 ml-1 font-semibold">
                    • {overdueCount} Overdue
                  </span>
                )}
              </>
            ) : (
              <>
                Queue: <strong className="text-foreground">{totalActive} active</strong>
                {activeQueueTickets.length > 0 && (
                  <span className="text-[10px] text-muted-foreground ml-1">
                    ({qrCheckinCount} QR check-in{qrCheckinCount === 1 ? "" : "s"}
                    {consultationQueueCount > 0 ? `, ${consultationQueueCount} consultation${consultationQueueCount === 1 ? "" : "s"}` : ""})
                  </span>
                )}
              </>
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
