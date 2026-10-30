"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Clock,
  Phone,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlotCapacityManagerDialog } from "@/components/dashboard/slot-capacity-manager-dialog";
import {
  getSlotConfiguration,
  getCapacityForDate,
  type SlotConfiguration,
} from "@/lib/cvo-slots";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface CVOClinicInfoCardProps {
  vaxSlots?: number;
  surgerySlots?: number;
  isStaff?: boolean;
  currentUserRole?: string;
  onBookProcedureClick?: () => void;
  onRequestConsultationClick?: () => void;
}

export function CVOClinicInfoCard({
  vaxSlots,
  surgerySlots,
  isStaff: propIsStaff,
  currentUserRole: propUserRole,
  onBookProcedureClick,
}: CVOClinicInfoCardProps) {
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotConfig, setSlotConfig] = useState<SlotConfiguration>(() => getSlotConfiguration());

  const queryClient = useQueryClient();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  // Fetch today's booked appointments in real time across all pet owners to compute deducted quota
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["cvo-today-appointments-quota", todayStr],
    queryFn: async () => {
      const items: Array<{ id: string; service_id: string; status: string; date: string }> = [];
      const seen = new Set<string>();

      // 1. Supabase appointments table for today
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("id, date, service_id, status")
          .eq("date", todayStr)
          .neq("status", "cancelled");

        if (data && !error) {
          data.forEach((apt) => {
            if (!seen.has(apt.id)) {
              seen.add(apt.id);
              items.push({
                id: apt.id,
                date: apt.date,
                service_id: apt.service_id,
                status: apt.status || "confirmed",
              });
            }
          });
        }
      } catch (err) {
        console.warn("Notice: Real-time quota fetching appointments:", err);
      }

      // 2. Local storage cache fallback (immediate reflection if pet owner just booked locally)
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        if (Array.isArray(local)) {
          local.forEach((l: any) => {
            if (l.date === todayStr && l.status !== "cancelled" && !seen.has(l.id)) {
              seen.add(l.id);
              items.push({
                id: l.id,
                date: l.date,
                service_id: l.service_id,
                status: l.status || "confirmed",
              });
            }
          });
        }
      } catch {}

      return items;
    },
    staleTime: 5_000,
    refetchInterval: 15_000, // automatic background heartbeat poll
  });

  // Supabase Realtime subscription: update slots live when pet owners book, cancel, or reschedule
  useEffect(() => {
    const channelName = "cvo-quota-realtime";
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_transactions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
        }
      )
      .subscribe();

    const handleConfigOrBookingUpdate = () => {
      setSlotConfig(getSlotConfiguration());
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
    };

    window.addEventListener("cvo-slot-config-updated", handleConfigOrBookingUpdate);
    window.addEventListener("syncvet-appointment-updated", handleConfigOrBookingUpdate);
    window.addEventListener("cvo-appointment-created", handleConfigOrBookingUpdate);
    window.addEventListener("storage", handleConfigOrBookingUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("cvo-slot-config-updated", handleConfigOrBookingUpdate);
      window.removeEventListener("syncvet-appointment-updated", handleConfigOrBookingUpdate);
      window.removeEventListener("cvo-appointment-created", handleConfigOrBookingUpdate);
      window.removeEventListener("storage", handleConfigOrBookingUpdate);
    };
  }, [supabase, queryClient]);

  const { user } = useUser();
  const userEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";

  const resolvedRole = normalizeSyncVetRole(
    propUserRole ||
    (user?.publicMetadata?.role as string) ||
    (user?.unsafeMetadata?.roleTitle as string) ||
    (isAdminEmail ? "Administrator" : undefined)
  );

  const canEdit =
    propIsStaff ??
    (isAdminEmail ||
      resolvedRole === "Administrator" ||
      resolvedRole === "Veterinarian");

  // Determine base capacity for today (respects date overrides or custom configured defaults)
  const baseVaxCapacity = getCapacityForDate(today, "vaccination", slotConfig) ?? vaxSlots ?? 10;
  const baseSurgeryCapacity = getCapacityForDate(today, "spay-neuter", slotConfig) ?? surgerySlots ?? 5;

  // Real-time deduction: count active non-cancelled booked procedures for today
  const bookedVaxCount = todayAppointments.filter((apt) => {
    const s = (apt.service_id || "").toLowerCase();
    return (s === "vaccination" || s.includes("vax") || s.includes("rabies")) && apt.status !== "cancelled";
  }).length;

  const bookedSurgeryCount = todayAppointments.filter((apt) => {
    const s = (apt.service_id || "").toLowerCase();
    return (s === "spay-neuter" || s.includes("spay") || s.includes("neuter") || s.includes("kapon")) && apt.status !== "cancelled";
  }).length;

  // Live remaining slots after pet owner deductions
  const remainingVaxSlots = Math.max(0, baseVaxCapacity - bookedVaxCount);
  const remainingSurgerySlots = Math.max(0, baseSurgeryCapacity - bookedSurgeryCount);

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
        <CardHeader className="p-3.5 sm:p-4 md:p-5 pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 sm:size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <Building2 className="size-4 sm:size-4.5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-tight">
                  CVO Clinic & Services
                </CardTitle>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
                  Carmen Headquarters & Free Care
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold shrink-0 gap-1.5 ml-auto sm:ml-0"
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Walk-in Open
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-3.5 sm:p-4 space-y-4 text-xs">
          {/* Clinic Hours & Address */}
          <div className="space-y-2.5 rounded-xl bg-muted/25 p-3 border border-border/60">
            <div className="flex items-start gap-2.5 text-muted-foreground">
              <Clock className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-xs">Mon – Fri, 8:00 AM – 5:00 PM</p>
                <p className="text-[11px] text-muted-foreground">General walk-ins & vaccination</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-muted-foreground pt-2 border-t border-border/40">
              <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-xs">CVO Complex, J.V. Seriña St., Carmen, CDO</p>
                <p className="text-[11px] text-muted-foreground">City Veterinary Office Main Clinic</p>
              </div>
            </div>
          </div>

          {/* Free Municipal Quotas (Live Real-Time Deducted Slots) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Daily Municipal Quotas
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSlotDialogOpen(true)}
                    className="h-5 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    title="Modify daily municipal procedure quotas"
                  >
                    <Pencil className="size-2.5" />
                    <span>Edit Slots</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  100% Free for CDO
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Rabies Vax */}
              <div
                onClick={canEdit ? () => setSlotDialogOpen(true) : onBookProcedureClick}
                className={cn(
                  "p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-1 relative transition-all",
                  remainingVaxSlots === 0 && "border-amber-500/40 bg-amber-500/10",
                  canEdit && "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:shadow-xs group",
                  !canEdit && onBookProcedureClick && "cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/10"
                )}
                title={canEdit ? "Click to edit Rabies Vaccination quota" : onBookProcedureClick ? "Click to schedule procedure" : undefined}
              >
                {canEdit ? (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                      <Pencil className="size-2" /> Edit
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                )}
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                  Rabies Vax
                </span>
                <p className="text-xl font-extrabold text-foreground tracking-tight flex items-baseline gap-1">
                  <span className={cn(remainingVaxSlots === 0 && "text-amber-600 dark:text-amber-400")}>
                    {remainingVaxSlots}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {bookedVaxCount > 0 ? `of ${baseVaxCapacity} Slots` : "Slots"}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {remainingVaxSlots === 0
                    ? "Quota filled for today"
                    : bookedVaxCount > 0
                    ? `${bookedVaxCount} queued · Walk-in queue`
                    : "Walk-in daily queue"}
                </p>
              </div>

              {/* Spay / Neuter */}
              <div
                onClick={canEdit ? () => setSlotDialogOpen(true) : onBookProcedureClick}
                className={cn(
                  "p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-1 relative transition-all",
                  remainingSurgerySlots === 0 && "border-rose-500/40 bg-rose-500/10",
                  canEdit && "cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:shadow-xs group",
                  !canEdit && onBookProcedureClick && "cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/10"
                )}
                title={canEdit ? "Click to edit Spay & Neuter quota" : onBookProcedureClick ? "Click to schedule procedure" : undefined}
              >
                {canEdit ? (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-800 dark:text-indigo-200">
                      <Pencil className="size-2" /> Edit
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-medium text-indigo-600 dark:text-indigo-400">
                      <span className="size-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                )}
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block">
                  Spay / Neuter
                </span>
                <p className="text-xl font-extrabold text-foreground tracking-tight flex items-baseline gap-1">
                  <span className={cn(remainingSurgerySlots === 0 && "text-rose-600 dark:text-rose-400")}>
                    {remainingSurgerySlots}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {bookedSurgeryCount > 0 ? `of ${baseSurgeryCapacity} Slots` : "Slots"}
                  </span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {remainingSurgerySlots === 0
                    ? "Fully booked today"
                    : bookedSurgeryCount > 0
                    ? `${bookedSurgeryCount} booked today · By scheduled slot`
                    : "By scheduled slot"}
                </p>
              </div>
            </div>
          </div>

          {/* Rabies Bite Center Helpline */}
          <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-amber-600" />
                Bite Center & Emergency
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
                24/7 Hotline
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In case of bite exposure, immediately wash wound with soap and running water for 15 minutes, then report to CVO.
            </p>
            <div className="flex items-center gap-2 pt-1 font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
              <a href="tel:0888573180" className="hover:underline hover:text-foreground transition-colors">
                (088) 857-3180
              </a>
              <span className="text-muted-foreground">•</span>
              <a href="tel:911" className="hover:underline hover:text-foreground transition-colors">
                CDRRMD 911
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quota Management Dialog */}
      <SlotCapacityManagerDialog
        open={slotDialogOpen}
        onOpenChange={setSlotDialogOpen}
        isStaff={canEdit}
        userRole={resolvedRole}
      />
    </>
  );
}
