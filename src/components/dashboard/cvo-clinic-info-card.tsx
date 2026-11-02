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
  useSlotConfiguration,
  type SlotConfiguration,
} from "@/lib/cvo-slots";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { getDailyQueue } from "@/lib/cvo-queue";

interface CVOClinicInfoCardProps {
  vaxSlots?: number;
  surgerySlots?: number;
  isStaff?: boolean;
  currentUserRole?: string;
  onBookProcedureClick?: () => void;
  onRequestConsultationClick?: () => void;
  hideQuotasAndEmergency?: boolean;
  showQuotas?: boolean;
  hideEmergency?: boolean;
}

export function CVOClinicInfoCard({
  vaxSlots,
  surgerySlots,
  isStaff: propIsStaff,
  currentUserRole: propUserRole,
  onBookProcedureClick,
  hideQuotasAndEmergency = false,
  showQuotas,
  hideEmergency = false,
}: CVOClinicInfoCardProps) {
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const { slotConfig } = useSlotConfiguration();

  const isQuotasVisible = showQuotas !== undefined ? showQuotas : !hideQuotasAndEmergency;
  const isEmergencyVisible = !hideEmergency && (!hideQuotasAndEmergency || showQuotas);

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
    const channelName = `cvo-clinic-card-${Math.random().toString(36).substring(2, 9)}`;
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

  // Real-time deduction: procedures are deducted when pet owners scan QR code (checked-in / in queue)
  const dailyQueue = getDailyQueue(todayStr);
  const queueCheckedInIds = new Set(
    dailyQueue.activeTickets.map((t) => t.appointmentId).filter(Boolean)
  );

  const isCheckedInProcedure = (apt: any) => {
    return (
      apt.status === "checked-in" ||
      apt.status === "in-consultation" ||
      apt.status === "completed" ||
      apt.status === "serving" ||
      (apt.notes && apt.notes.includes("[Checked in")) ||
      queueCheckedInIds.has(apt.id)
    );
  };

  const bookedVaxCount =
    todayAppointments.filter((apt) => {
      const s = (apt.service_id || "").toLowerCase();
      return (s === "vaccination" || s.includes("vax") || s.includes("rabies")) && isCheckedInProcedure(apt);
    }).length +
    dailyQueue.activeTickets.filter(
      (t) =>
        (t.serviceId === "vaccination" ||
          t.serviceTitle?.toLowerCase().includes("vax") ||
          t.serviceTitle?.toLowerCase().includes("rabies")) &&
        !todayAppointments.some((a) => a.id === t.appointmentId)
    ).length;

  const bookedSurgeryCount =
    todayAppointments.filter((apt) => {
      const s = (apt.service_id || "").toLowerCase();
      return (s === "spay-neuter" || s.includes("spay") || s.includes("neuter") || s.includes("kapon")) && isCheckedInProcedure(apt);
    }).length +
    dailyQueue.activeTickets.filter(
      (t) =>
        (t.serviceId === "spay-neuter" ||
          t.serviceTitle?.toLowerCase().includes("spay") ||
          t.serviceTitle?.toLowerCase().includes("neuter") ||
          t.serviceTitle?.toLowerCase().includes("kapon")) &&
        !todayAppointments.some((a) => a.id === t.appointmentId)
    ).length;

  // Live remaining slots after pet owner deductions upon scanning QR
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



          {/* Rabies Bite Center Helpline */}
          {isEmergencyVisible && (
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
          )}
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
