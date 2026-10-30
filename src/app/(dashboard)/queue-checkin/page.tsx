"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  Building2,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Ticket,
  Dog,
  Cat,
  User,
  MapPin,
  Check,
  Printer,
  Bell,
  Stethoscope,
  LayoutDashboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  checkInPetOwnerToQueue,
  getPetOwnerQueueStatus,
  getTodayDateStr,
  type QueueTicket,
} from "@/lib/cvo-queue";

function QueueCheckinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const todayFormatted = useMemo(() => format(new Date(), "MMMM d, yyyy"), []);

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [isExistingTicket, setIsExistingTicket] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [eligibleAppointments, setEligibleAppointments] = useState<any[]>([]);

  // Check appointment qualification for today
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setLoading(false);
      return;
    }

    const checkEligibilityAndEnroll = async () => {
      setLoading(true);
      setEligibilityError(null);

      const ownerId = user.id;
      const ownerEmail = (user.primaryEmailAddress?.emailAddress || "").toLowerCase();
      const ownerName = user.fullName || user.firstName || "Pet Owner";

      // 1. First, check if pet owner is already checked into today's queue
      const existingStatus = getPetOwnerQueueStatus(ownerId, todayStr);
      if (existingStatus.myTicket) {
        setTicket(existingStatus.myTicket);
        setIsExistingTicket(true);
        setLoading(false);
        return;
      }

      // 2. Query today's confirmed appointments for this pet owner
      const matchingAppointments: any[] = [];
      const seen = new Set<string>();

      // Query Supabase appointments table
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*")
          .eq("date", todayStr)
          .neq("status", "cancelled");

        if (data && !error) {
          data.forEach((apt) => {
            const matchesOwner =
              apt.owner_id === ownerId ||
              (apt.notes && apt.notes.toLowerCase().includes(ownerEmail));

            if (matchesOwner && !seen.has(apt.id)) {
              seen.add(apt.id);
              matchingAppointments.push(apt);
            }
          });
        }
      } catch (err) {
        console.warn("Notice: Querying Supabase appointments for queue check-in:", err);
      }

      // Fallback: check local storage cached appointments
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        if (Array.isArray(local)) {
          local.forEach((l: any) => {
            if (
              l.date === todayStr &&
              l.status !== "cancelled" &&
              !seen.has(l.id) &&
              (l.owner_id === ownerId || (l.notes && l.notes.toLowerCase().includes(ownerEmail)))
            ) {
              seen.add(l.id);
              matchingAppointments.push(l);
            }
          });
        }
      } catch {}

      setEligibleAppointments(matchingAppointments);

      // Check validation condition:
      if (matchingAppointments.length === 0) {
        setEligibilityError(
          "No confirmed appointment found for today. Only pet owners with a pre-scheduled procedure or consultation for today can join the automated queue via QR."
        );
        setLoading(false);
        return;
      }

      // Automatically check in the first appointment
      const primaryApt = matchingAppointments[0];
      const serviceTitle =
        primaryApt.service_id === "spay-neuter"
          ? "Low-Cost / Free Spay & Neuter Surgery"
          : primaryApt.service_id === "vaccination"
          ? "Rabies & Core Preventive Vaccination"
          : "Clinical Consultation";

      const checkInResult = checkInPetOwnerToQueue({
        appointmentId: primaryApt.id,
        ownerId,
        ownerName,
        ownerContact: user.unsafeMetadata?.phoneNumber as string,
        ownerBarangay: (user.unsafeMetadata?.barangay as string) || "Cagayan de Oro City",
        petId: primaryApt.pet_id,
        petName: primaryApt.pet_name || "Pet",
        species: primaryApt.species || "Dog",
        breed: primaryApt.breed,
        serviceId: primaryApt.service_id || "vaccination",
        serviceTitle,
        dateStr: todayStr,
      });

      // Update appointment status to checked-in in Supabase
      try {
        await supabase
          .from("appointments")
          .update({
            status: "checked-in",
            notes: primaryApt.notes
              ? `${primaryApt.notes} | [Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`
              : `[Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`,
          })
          .eq("id", primaryApt.id);
      } catch {}

      setTicket(checkInResult.ticket);
      setIsExistingTicket(checkInResult.isExisting);
      setLoading(false);
    };

    checkEligibilityAndEnroll();
  }, [isLoaded, isSignedIn, user, todayStr, supabase]);

  // Loading State
  if (!isLoaded || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-muted/15">
        <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3 animate-spin border border-emerald-500/20">
          <Loader2 className="size-6" />
        </div>
        <p className="text-sm font-bold text-foreground">Verifying Today&apos;s Appointment...</p>
        <p className="text-xs text-muted-foreground mt-0.5">Connecting to official CVO municipal records</p>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 bg-muted/15">
        <Card className="max-w-md w-full border border-border/80 rounded-3xl shadow-xl p-6 sm:p-8 text-center space-y-4 bg-card">
          <div className="size-13 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <User className="size-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-foreground">Sign In Required</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Please sign in with your SyncVet pet owner account to access your arrival check-in and queue ticket for {todayFormatted}.
            </p>
          </div>
          <Button
            onClick={() => router.push("/sign-in")}
            className="w-full h-10 rounded-xl font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs"
          >
            Sign In to Continue
          </Button>
        </Card>
      </div>
    );
  }

  // Ineligible: No appointment today
  if (eligibilityError) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/15">
        <Card className="max-w-md w-full border border-border/80 rounded-3xl shadow-xl overflow-hidden bg-card">
          <div className="p-5 border-b border-border/60 flex items-center gap-3 bg-muted/30">
            <div className="size-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/25">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Scheduled Booking Required</h2>
              <p className="text-[11px] text-muted-foreground">Carmen Clinic Arrival Desk</p>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {eligibilityError}
            </p>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1.5">
              <span className="text-xs font-bold text-foreground block">
                Next Steps:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                <li>If you are a walk-in pet owner, please approach the triage window for intake.</li>
                <li>If your appointment is scheduled for a future date, please check in on the day of your booking.</li>
                <li>You can book a free sterilization or anti-rabies slot anytime from your dashboard.</li>
              </ul>
            </div>

            <Button
              onClick={() => router.push("/pet-owner")}
              className="w-full h-10 rounded-xl font-bold bg-primary text-primary-foreground cursor-pointer shadow-xs mt-2"
            >
              Return to Pet Owner Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success / Active Queue Ticket View
  const currentStatus = getPetOwnerQueueStatus(user?.id || "", todayStr);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/15 py-6 sm:py-10 px-4 flex flex-col items-center justify-start select-none">
      <div className="max-w-[430px] w-full">
        {/* ── Main Compact Queue Pass Card ── */}
        <Card className="rounded-3xl border border-border/80 shadow-xl overflow-hidden bg-card">
          {/* Header with Top Action Icons */}
          <div className="p-4 sm:p-5 pb-3.5 border-b border-border/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-10 rounded-2xl bg-white p-1 border border-border/80 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <Image
                  src={Logo}
                  alt="City Veterinary Office Seal"
                  width={40}
                  height={40}
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block truncate">
                  Republic of the Philippines • CDO
                </span>
                <h1 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                  City Veterinary Office Clinic Queue
                </h1>
                <p className="text-[10px] text-muted-foreground truncate">
                  Carmen Central Clinic • {todayFormatted}
                </p>
              </div>
            </div>

            {/* Top Action Icons: Live Tracker & Print Slip */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.push("/pet-owner")}
                className="size-8.5 rounded-full border border-border/70 bg-muted/60 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 cursor-pointer shadow-2xs transition-all hover:scale-105 active:scale-95"
                title="View Live Tracker on My Dashboard"
              >
                <LayoutDashboard className="size-4" />
                <span className="sr-only">View Live Tracker</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                className="size-8.5 rounded-full border border-border/70 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs transition-all hover:scale-105 active:scale-95"
                title="Print Slip"
              >
                <Printer className="size-4" />
                <span className="sr-only">Print Slip</span>
              </Button>
            </div>
          </div>

          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {/* ── 1. The Digital Queue Ticket Pass (Hero Boarding Pass) ── */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5 border border-emerald-500/30 relative overflow-hidden shadow-lg space-y-3">
              {/* Subtle Background Watermark */}
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-5 pointer-events-none">
                <Ticket className="size-44 text-white" />
              </div>

              {/* Stub Top: Header & Number */}
              <div className="flex items-start justify-between gap-3 relative z-10">
                <div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-emerald-300">
                    OFFICIAL QUEUE NUMBER
                  </span>
                  <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white drop-shadow-sm mt-0.5">
                    {ticket?.ticketNumber}
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/10 text-emerald-200 border border-white/15">
                    <Clock className="size-3" />
                    <span>{ticket?.checkInTime}</span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Sequence #{ticket?.queueSequence || 1}
                  </p>
                </div>
              </div>

              {/* Perforated Divider Line */}
              <div className="relative z-10 flex items-center gap-2">
                <div className="size-2.5 -ml-6 rounded-full bg-card" />
                <div className="flex-1 border-t-2 border-dashed border-white/20" />
                <div className="size-2.5 -mr-6 rounded-full bg-card" />
              </div>

              {/* Stub Bottom: Patient & Service Info */}
              <div className="relative z-10 grid grid-cols-2 gap-3 text-xs pt-0.5">
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                    Patient (Companion)
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-white truncate mt-0.5 flex items-center gap-1.5">
                    {ticket?.species === "Cat" ? (
                      <Cat className="size-3 text-emerald-300 shrink-0" />
                    ) : (
                      <Dog className="size-3 text-emerald-300 shrink-0" />
                    )}
                    <span>{ticket?.petName}</span>
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    {ticket?.breed || ticket?.species || "Canine"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                    Scheduled Procedure
                  </span>
                  <p className="text-xs font-bold text-emerald-200 truncate mt-0.5">
                    {ticket?.serviceTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {ticket?.ownerBarangay || "Carmen, CDO"}
                  </p>
                </div>
              </div>
            </div>

            {/* ── 2. Live Waiting Room Status ── */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Clock className="size-3 text-primary" />
                  <span>Waiting Room Stream</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Real-Time Updates</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-0.5">
                  <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Now Serving
                  </span>
                  <p className="text-lg sm:text-xl font-black text-foreground font-mono">
                    {currentStatus.nowServing ? currentStatus.nowServing.ticketNumber : "Please Wait"}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate">
                    {currentStatus.nowServing?.consultationRoom || "Consultation Room 1"}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-0.5">
                  <span className="text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Ahead of You
                  </span>
                  <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {currentStatus.isMyTurn ? "0 (You're Next!)" : currentStatus.ticketsAhead}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate font-mono">
                    {currentStatus.isMyTurn ? "Step Up to Desk" : `~${Math.max(5, currentStatus.ticketsAhead * 10)} mins wait`}
                  </p>
                </div>
              </div>

              {/* Journey Steps */}
              <div className="flex items-center gap-1.5 pt-0.5 text-[10px]">
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                  <Check className="size-2.5 stroke-[3]" />
                  <span>Arrived</span>
                </div>
                <div className="flex-1 h-1 rounded-full bg-emerald-500" />
                <div
                  className={`flex items-center gap-1 font-bold shrink-0 ${
                    currentStatus.isMyTurn
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  <span className="size-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[8.5px] font-mono">
                    2
                  </span>
                  <span>In Queue</span>
                </div>
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${
                      currentStatus.isMyTurn ? "w-full bg-blue-500 animate-pulse" : "w-0"
                    }`}
                  />
                </div>
                <div
                  className={`flex items-center gap-1 shrink-0 ${
                    currentStatus.isMyTurn
                      ? "text-blue-600 font-bold"
                      : "text-muted-foreground font-medium"
                  }`}
                >
                  <span className="size-3 rounded-full bg-muted border border-border flex items-center justify-center text-[8.5px]">
                    3
                  </span>
                  <span>Consultation</span>
                </div>
              </div>

              {currentStatus.isMyTurn ? (
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-bold text-center text-xs animate-pulse">
                  🔔 Ticket {ticket?.ticketNumber} called! Please proceed to Consultation Desk 1 with {ticket?.petName}.
                </div>
              ) : (
                <p className="text-[10.5px] text-muted-foreground text-center pt-0.5 leading-relaxed">
                  Please wait in the clinic waiting area. This ticket updates in real-time as each pet is called.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function QueueCheckinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] bg-muted/15 flex flex-col items-center justify-center p-6">
          <Loader2 className="size-6 text-primary animate-spin" />
        </div>
      }
    >
      <QueueCheckinContent />
    </Suspense>
  );
}
