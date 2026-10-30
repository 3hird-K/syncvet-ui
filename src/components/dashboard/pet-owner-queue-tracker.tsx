"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  Bell,
  BellRing,
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

let activeChimeContext: AudioContext | null = null;

export function stopClinicCallingChime() {
  if (activeChimeContext) {
    try {
      activeChimeContext.close();
    } catch {}
    activeChimeContext = null;
  }
}

/**
 * Plays an authentic, warm clinic announcement chime ("Ding-Dong")
 * repeated 8 times with acoustic tubular bell harmonics, mallet strike, and low-pass filter.
 */
function playClinicCallingChime(repeatCount = 8) {
  if (typeof window === "undefined") return;
  try {
    stopClinicCallingChime();

    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    activeChimeContext = ctx;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    // Warm master filter to remove digital harshness and give rich acoustic bell resonance
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2500, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.5, ctx.currentTime);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Each Ding-Dong cycle: G5 (783.99 Hz) -> C5 (523.25 Hz)
    const cycleInterval = 1.35; // seconds between cycles

    for (let i = 0; i < repeatCount; i++) {
      const cycleStart = ctx.currentTime + i * cycleInterval;

      const chimeTones = [
        { baseFreq: 783.99, offset: 0, duration: 0.85, volume: 0.5 },
        { baseFreq: 523.25, offset: 0.36, duration: 1.25, volume: 0.62 },
      ];

      chimeTones.forEach(({ baseFreq, offset, duration, volume }) => {
        const startTime = cycleStart + offset;

        // 1. Fundamental tone (warm sine)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(baseFreq, startTime);

        gain1.gain.setValueAtTime(0, startTime);
        gain1.gain.linearRampToValueAtTime(volume, startTime + 0.015);
        gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc1.connect(gain1);
        gain1.connect(filter);
        osc1.start(startTime);
        osc1.stop(startTime + duration);

        // 2. Harmonic overtone (octave shimmer at 2x frequency)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(baseFreq * 2, startTime);

        gain2.gain.setValueAtTime(0, startTime);
        gain2.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.01);
        gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.5);

        osc2.connect(gain2);
        gain2.connect(filter);
        osc2.start(startTime);
        osc2.stop(startTime + duration * 0.5);

        // 3. Third partial bell ring (2.76x physical chime bar overtone)
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = "sine";
        osc3.frequency.setValueAtTime(baseFreq * 2.76, startTime);

        gain3.gain.setValueAtTime(0, startTime);
        gain3.gain.linearRampToValueAtTime(volume * 0.1, startTime + 0.008);
        gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.3);

        osc3.connect(gain3);
        gain3.connect(filter);
        osc3.start(startTime);
        osc3.stop(startTime + duration * 0.3);

        // 4. Subtle percussive mallet strike impulse
        const strikeOsc = ctx.createOscillator();
        const strikeGain = ctx.createGain();
        strikeOsc.type = "triangle";
        strikeOsc.frequency.setValueAtTime(baseFreq * 4, startTime);

        strikeGain.gain.setValueAtTime(volume * 0.12, startTime);
        strikeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.02);

        strikeOsc.connect(strikeGain);
        strikeGain.connect(filter);
        strikeOsc.start(startTime);
        strikeOsc.stop(startTime + 0.025);
      });
    }

    // Auto-clean after all 8 repetitions finish
    const totalTimeMs = (repeatCount * cycleInterval + 1.8) * 1000;
    setTimeout(() => {
      if (activeChimeContext === ctx) {
        try {
          ctx.close();
        } catch {}
        activeChimeContext = null;
      }
    }, totalTimeMs);
  } catch (err) {
    console.warn("Chime playback notice:", err);
  }
}

/**
 * Short, warm test chime when user clicks the speaker button
 */
function playTestChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2600, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.4, ctx.currentTime);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Warm single chime note (A5 - 880Hz with soft overtone)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.55);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);

    // Harmonic ring
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1760, ctx.currentTime);

    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);

    osc2.connect(gain2);
    gain2.connect(filter);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.3);

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 700);
  } catch {}
}

interface PetOwnerQueueTrackerProps {
  userId: string;
  userEmail?: string;
  userName?: string;
  userContact?: string;
  userBarangay?: string;
  todayAppointments: any[];
  todayConsultations?: any[];
}

export function PetOwnerQueueTracker({
  userId,
  userEmail,
  userName,
  userContact,
  userBarangay,
  todayAppointments = [],
  todayConsultations = [],
}: PetOwnerQueueTrackerProps) {
  const todayStr = useMemo(() => getTodayDateStr(), []);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const lookupOptions = useMemo(
    () => ({
      ownerId: userId,
      userName: userName,
      userEmail: userEmail,
      petNames: [
        ...todayAppointments.map((a) => a.pet_name || a.petName).filter(Boolean),
        ...(todayConsultations || []).map((c) => c.petName || c.pet_name).filter(Boolean),
      ],
      encounterNos: (todayConsultations || []).map((c) => c.encounterNo || c.encounter_no).filter(Boolean),
      appointmentIds: todayAppointments.map((a) => a.id).filter(Boolean),
    }),
    [userId, userName, userEmail, todayAppointments, todayConsultations]
  );

  const [queueInfo, setQueueInfo] = useState(() =>
    getPetOwnerQueueStatus(lookupOptions, todayStr)
  );
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastChimedTicketRef = useRef<string | null>(null);

  const isCalled = Boolean(
    queueInfo.isMyTurn ||
      queueInfo.isInConsultation ||
      (queueInfo.myTicket && queueInfo.nowServing?.ticketNumber === queueInfo.myTicket.ticketNumber)
  );

  // Sync with queue updates and Supabase realtime broadcast
  useEffect(() => {
    const handleUpdate = () => {
      setQueueInfo(getPetOwnerQueueStatus(lookupOptions, todayStr));
    };

    // Immediate check
    handleUpdate();

    window.addEventListener("syncvet-queue-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    // Cross-device and cross-browser Supabase broadcast channel
    const channel = supabase
      .channel("cvo-queue-realtime-channel")
      .on("broadcast", { event: "queue_state_updated" }, (payload) => {
        if (payload?.payload?.date === todayStr) {
          try {
            localStorage.setItem(
              `syncvet_daily_queue_${todayStr}`,
              JSON.stringify(payload.payload)
            );
          } catch {}
          setQueueInfo(getPetOwnerQueueStatus(lookupOptions, todayStr));
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("syncvet-queue-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [lookupOptions, todayStr, supabase]);

  // Audio calling chime & toast alert when ticket is called (repeats 8 times)
  useEffect(() => {
    const currentTicketNo = queueInfo.myTicket?.ticketNumber;
    if (isCalled && currentTicketNo && lastChimedTicketRef.current !== currentTicketNo) {
      lastChimedTicketRef.current = currentTicketNo;
      if (soundEnabled) {
        playClinicCallingChime(8);
      }
      toast.info(
        `Ticket ${currentTicketNo} is called. Please proceed to the clinic desk with ${
          queueInfo.myTicket?.petName || "your pet"
        }.`,
        {
          duration: 14000,
          action: {
            label: "Hear Chime (8x)",
            onClick: () => playClinicCallingChime(8),
          },
        }
      );
    } else if (!isCalled) {
      lastChimedTicketRef.current = null;
      stopClinicCallingChime();
    }
  }, [
    isCalled,
    queueInfo.myTicket?.ticketNumber,
    queueInfo.myTicket?.petName,
    soundEnabled,
  ]);

  // Toggle chime sound with preview tone
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      playTestChime();
      toast.success("Chime sound enabled. Test tone played.");
    } else {
      stopClinicCallingChime();
      toast.info("Chime sound muted.");
    }
  };

  // If user has no appointment today, no consultation today, and is not in queue, do not show anything
  const hasAppointmentToday = todayAppointments.length > 0;
  const hasConsultationToday = todayConsultations.length > 0;
  const isCheckedIn = Boolean(queueInfo.myTicket);

  if (!hasAppointmentToday && !hasConsultationToday && !isCheckedIn) {
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

      setQueueInfo(getPetOwnerQueueStatus(lookupOptions, todayStr));
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
    setQueueInfo(getPetOwnerQueueStatus(lookupOptions, todayStr));
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
  const { myTicket, nowServing, ticketsAhead, isMyTurn, isInConsultation } = queueInfo;
  const isNextInLine = !isCalled && ticketsAhead === 0;

  return (
    <div className="relative group transition-all duration-300">
      <div
        className={cn(
          "rounded-2xl border transition-all duration-300 overflow-hidden shadow-2xs",
          isCalled
            ? "border-primary/40 bg-gradient-to-b from-primary/[0.08] via-primary/[0.02] to-transparent shadow-sm ring-1 ring-primary/25"
            : isNextInLine
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border/60 bg-muted/20"
        )}
      >
        {/* ── Integrated Calling Notice Banner ── */}
        {isCalled && (
          <div className="px-3.5 py-2.5 sm:px-4 sm:py-2.5 border-b border-primary/20 bg-primary/10 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Premium Primary Squircle Icon */}
              <div className="flex items-center justify-center size-8 rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25 shrink-0">
                <BellRing className="size-4 text-primary-foreground" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-foreground text-xs sm:text-sm tracking-tight">
                    YOU ARE BEING CALLED NOW
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-2xs">
                    {myTicket?.ticketNumber}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  Please proceed to {myTicket?.consultationRoom || "Desk 1"} with {myTicket?.petName}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSound}
              className={cn(
                "size-8 rounded-xl border transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-2xs",
                soundEnabled
                  ? "bg-card border-primary/35 text-primary hover:bg-primary/10"
                  : "bg-muted/70 border-border/70 text-muted-foreground hover:text-foreground"
              )}
              title={soundEnabled ? "Mute calling chime (8x)" : "Enable calling chime (8x)"}
            >
              {soundEnabled ? (
                <Volume2 className="size-4 text-primary" />
              ) : (
                <VolumeX className="size-4" />
              )}
            </button>
          </div>
        )}

        {/* ── Main Ticket Row ── */}
        <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-stretch justify-between gap-3 text-xs">
          {/* Left: Ticket & Pet Info */}
          <div className="flex items-stretch gap-3 min-w-0">
            {/* Full-height Ticket Stub Badge */}
            <div
              className={cn(
                "font-mono font-bold rounded-xl border shrink-0 flex flex-col items-center justify-center px-3 py-1.5 self-stretch min-w-[72px]",
                isCalled
                  ? "bg-primary/15 text-primary border-primary/35"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
              )}
            >
              <span className="text-[9px] uppercase tracking-wider opacity-70 font-semibold leading-none mb-1">
                TICKET
              </span>
              <span className="text-base font-black tracking-tight leading-none">
                {myTicket?.ticketNumber}
              </span>
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground truncate text-xs sm:text-sm">
                  {myTicket?.petName}
                </span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  • {myTicket?.serviceTitle}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                Checked in at {myTicket?.checkInTime} · Carmen Main Clinic
              </p>
            </div>
          </div>

          {/* Right: Live Queue Status & Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
            <div className="flex items-center gap-2">
              {isCalled ? (
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-primary text-xs sm:text-sm">
                      Now Calling You!
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-primary text-primary-foreground shadow-2xs">
                      Proceed
                    </span>
                  </div>
                  <span className="text-[11px] text-foreground font-medium block truncate max-w-[240px]">
                    {myTicket?.consultationRoom || "Desk 1 (Room 1)"} · {myTicket?.servingVet || "Veterinarian Ready"}
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

            {/* Quick Actions (only show single sound icon when not called, avoids duplicate) */}
            <div className="flex items-center gap-1 pl-2 border-l border-border/50">
              {!isCalled && (
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={cn(
                    "p-1.5 rounded-md transition-colors cursor-pointer",
                    soundEnabled
                      ? "text-primary bg-primary/15 hover:bg-primary/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  title={soundEnabled ? "Chime sound enabled (click to test tone or mute)" : "Chime sound muted (click to enable)"}
                >
                  {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
                </button>
              )}
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
    </div>
  );
}
