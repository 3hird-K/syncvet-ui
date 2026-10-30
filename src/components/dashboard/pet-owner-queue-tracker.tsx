"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Clock,
  QrCode,
  CheckCircle2,
  Volume2,
  VolumeX,
  RotateCcw,
  Camera,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPetOwnerQueueStatus,
  getTodayDateStr,
  checkInPetOwnerToQueue,
  resetPetOwnerQueue,
  removeQueueTicket,
} from "@/lib/cvo-queue";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScanQueueQrDialog } from "./scan-queue-qr-dialog";

interface PetOwnerQueueTrackerProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  userContact?: string;
  userBarangay?: string;
  todayAppointments: any[];
}

export function PetOwnerQueueTracker({
  userId,
  userEmail,
  userName,
  userContact,
  userBarangay,
  todayAppointments = [],
}: PetOwnerQueueTrackerProps) {
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [queueInfo, setQueueInfo] = useState(() =>
    getPetOwnerQueueStatus(userId, todayStr)
  );
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync with queue updates
  useEffect(() => {
    const handleUpdate = () => {
      setQueueInfo(getPetOwnerQueueStatus(userId, todayStr));
    };
    window.addEventListener("syncvet-queue-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("syncvet-queue-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [userId, todayStr]);

  // Audio alert when called ("It's your turn!")
  useEffect(() => {
    if (queueInfo.isMyTurn && soundEnabled) {
      toast.info(`🔔 IT'S YOUR TURN! Please proceed to the clinic desk with ${queueInfo.myTicket?.petName}.`, {
        duration: 8000,
      });
    }
  }, [queueInfo.isMyTurn, soundEnabled, queueInfo.myTicket?.petName]);

  // If user has no appointment today and is not in queue, do not show anything
  const hasAppointmentToday = todayAppointments.length > 0;
  const isCheckedIn = Boolean(queueInfo.myTicket);

  if (!hasAppointmentToday && !isCheckedIn) {
    return null;
  }

  // Handle Quick Arrival Check-in
  const handleQuickCheckin = async (appointment: any) => {
    try {
      const serviceTitle =
        appointment.service_id === "spay-neuter"
          ? "Spay / Neuter Surgery"
          : appointment.service_id === "vaccination"
          ? "Anti-Rabies Vaccination"
          : "Clinical Consultation";

      const result = checkInPetOwnerToQueue({
        appointmentId: appointment.id,
        ownerId: userId,
        ownerName: userName || "Pet Owner",
        ownerContact: userContact,
        ownerBarangay: userBarangay || "Cagayan de Oro City",
        petId: appointment.pet_id,
        petName: appointment.pet_name || "Pet",
        serviceId: appointment.service_id || "vaccination",
        serviceTitle,
        dateStr: todayStr,
      });

      // Update appointment in Supabase
      try {
        await supabase
          .from("appointments")
          .update({
            status: "checked-in",
            notes: appointment.notes
              ? `${appointment.notes} | [Checked in: Ticket ${result.ticket.ticketNumber}]`
              : `[Checked in: Ticket ${result.ticket.ticketNumber}]`,
          })
          .eq("id", appointment.id);
      } catch {}

      setQueueInfo(getPetOwnerQueueStatus(userId, todayStr));
      toast.success(`Check-in confirmed! Your queue number is ${result.ticket.ticketNumber}.`);
    } catch (err: any) {
      toast.error("Failed to check in: " + err.message);
    }
  };

  // Reset / Clear ticket for testing or leaving queue
  const handleResetQueue = () => {
    if (queueInfo.myTicket) {
      removeQueueTicket(queueInfo.myTicket.ticketNumber, todayStr);
    } else {
      resetPetOwnerQueue(userId, todayStr);
    }
    setQueueInfo(getPetOwnerQueueStatus(userId, todayStr));
    toast.info("Queue ticket cleared. You can scan the QR code to check in again.");
  };

  // ═════════════════════════════════════════════════════════════════════
  // STATE 1: Scheduled appointment today, NOT YET CHECKED IN
  // ═════════════════════════════════════════════════════════════════════
  if (!isCheckedIn && hasAppointmentToday) {
    const primaryApt = todayAppointments[0];
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <QrCode className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground text-xs sm:text-sm">
                Today&apos;s Clinic Visit: {primaryApt.pet_name}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium px-1.5 py-0.5 rounded bg-emerald-500/15">
                Ready for Check-In
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Scan reception QR standee at Carmen Clinic to receive your live queue ticket.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ScanQueueQrDialog
            trigger={
              <Button
                size="sm"
                className="h-7 px-2.5 text-xs font-semibold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
              >
                <Camera className="size-3" />
                <span>Scan QR</span>
              </Button>
            }
          />

          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleQuickCheckin(primaryApt)}
            className="h-7 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
            title="1-tap check-in if you are already at the counter"
          >
            <CheckCircle2 className="size-3 text-emerald-600" />
            <span>Check In</span>
          </Button>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // STATE 2: ACTIVE QUEUE TICKET (MINIMALIST REDESIGN)
  // ═════════════════════════════════════════════════════════════════════
  const { myTicket, nowServing, ticketsAhead, isMyTurn } = queueInfo;
  const isNextInLine = !isMyTurn && ticketsAhead === 0;

  return (
    <div className="relative group transition-all duration-200">
      <div
        className={cn(
          "rounded-xl border px-3.5 py-2.5 sm:px-4 sm:py-3 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs",
          isMyTurn
            ? "border-blue-500/30 bg-blue-500/5"
            : isNextInLine
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border/60 bg-muted/20"
        )}
      >
        {/* Left: Ticket & Pet Info */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Minimalist Ticket Badge */}
          <div
            className={cn(
              "font-mono font-bold text-xs px-2.5 py-1 rounded-lg border shrink-0 flex items-center gap-1.5",
              isMyTurn
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
                : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
            )}
          >
            <span className="text-[10px] opacity-70 tracking-wider">TICKET</span>
            <span className="text-sm font-extrabold">{myTicket?.ticketNumber}</span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-foreground truncate text-xs sm:text-sm">
                {myTicket?.petName}
              </span>
              <span className="text-[11px] text-muted-foreground font-normal">
                • {myTicket?.serviceTitle}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              Checked in at {myTicket?.checkInTime} · Carmen Main Clinic
            </p>
          </div>
        </div>

        {/* Right: Live Queue Status & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2 shrink-0">
              <span
                className={cn(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isMyTurn ? "bg-blue-400" : "bg-emerald-400"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex rounded-full size-2",
                  isMyTurn ? "bg-blue-500" : "bg-emerald-500"
                )}
              />
            </span>

            {isMyTurn ? (
              <div className="text-left">
                <span className="font-bold text-blue-700 dark:text-blue-300 text-xs">
                  Your Turn Now!
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Proceed to Desk 1 (Room 1)
                </span>
              </div>
            ) : isNextInLine ? (
              <div className="text-left">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 text-xs">
                  Next in Line
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  0 ahead · Ready near Desk 1
                </span>
              </div>
            ) : (
              <div className="text-left">
                <span className="font-medium text-foreground text-xs">
                  In Queue: <strong>{ticketsAhead} ahead</strong>
                </span>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  Now calling #{nowServing?.ticketNumber || "—"} (~{ticketsAhead * 10}m)
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1 pl-2 border-l border-border/50">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
              title={soundEnabled ? "Mute chime" : "Unmute chime"}
            >
              {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleResetQueue}
              className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Leave queue / Clear ticket"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
