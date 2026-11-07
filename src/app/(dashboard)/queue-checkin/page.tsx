"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { format, isValid } from "date-fns";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  checkInPetOwnerToQueue,
  getPetOwnerQueueStatus,
  getTodayDateStr,
  syncQueueFromSupabase,
  type QueueTicket,
} from "@/lib/cvo-queue";
import { isBeforeClinicOpen } from "@/lib/utils";

function QueueCheckinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
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

      // 0. Verify station QR code date validity (valid on that day only)
      const paramDate = searchParams.get("date");
      if (paramDate && paramDate !== todayStr) {
        let formattedParamDate = paramDate;
        try {
          const parts = paramDate.split("-").map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          if (isValid(d)) formattedParamDate = format(d, "MMMM d, yyyy");
        } catch {}

        setEligibilityError(
          `This Check-in QR code was generated for ${formattedParamDate} and was valid on that day only. If you scan that QR code from another day, it cannot be scanned. Please scan today's active station QR code at the clinic reception desk.`
        );
        setLoading(false);
        return;
      }

      const requestedAppointmentId = searchParams.get("appointmentId");
      const ownerId = user.id;
      const ownerEmail = (user.primaryEmailAddress?.emailAddress || "").toLowerCase();
      const ownerName = user.fullName || user.firstName || "Pet Owner";
      const ownerPhone = (user.unsafeMetadata?.phoneNumber as string) || "";
      const ownerBarangay = (user.unsafeMetadata?.barangay as string) || "Cagayan de Oro City";

      // 0.5 Block scans before clinic opening (8:00 AM)
      if (isBeforeClinicOpen(todayStr)) {
        setEligibilityError(
          `The clinic check-in opens at 8:00 AM. It is currently ${format(
            new Date(),
            "h:mm a"
          )}. Please scan the station QR code at 8:00 AM, when clinic operating hours begin (8:00 AM â€“ 5:00 PM).`
        );
        setLoading(false);
        return;
      }

      // Pull the shared queue from Supabase first so an owner scanning on any
      // device detects their existing ticket instead of creating a duplicate.
      try {
        await syncQueueFromSupabase(todayStr);
      } catch {}

      // 1. First, check if pet owner is already checked into today's queue.
      // A skipped (no-show) ticket does not block re-checking in â€” the owner is
      // issued a fresh ticket at the end of the line by the QR check-in below.
      const existingStatus = getPetOwnerQueueStatus(
        {
          ownerId,
          userName: ownerName,
          userEmail: ownerEmail,
        },
        todayStr
      );
      if (existingStatus.myTicket && existingStatus.myTicket.status !== "skipped") {
        setTicket(existingStatus.myTicket);
        setIsExistingTicket(true);
        setLoading(false);
        return;
      }

      // 2. Query today's confirmed appointments & scheduled consultations for this pet owner
      const matchingItems: any[] = [];
      const seen = new Set<string>();

      // A. Query Supabase appointments table
      let appointmentsFetched = false;
      try {
        const { data, error } = await supabase
          .from("appointments")
          .select("*, users:owner_id(full_name, phone_number, address), pets:pet_id(id, name, species, breed, photo_url)")
          .eq("date", todayStr)
          .neq("status", "cancelled");

        if (!error && data) {
          appointmentsFetched = true;
          data.forEach((apt) => {
            const matchesOwner =
              apt.owner_id === ownerId ||
              (apt.notes && apt.notes.toLowerCase().includes(ownerEmail)) ||
              (apt.users?.full_name && apt.users.full_name.toLowerCase().includes(ownerName.toLowerCase()));

            if (matchesOwner && !seen.has(apt.id)) {
              seen.add(apt.id);
              const petData = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets;
              matchingItems.push({
                type: "appointment",
                id: apt.id,
                pet_id: apt.pet_id || petData?.id,
                pet_name: petData?.name || apt.pet_name || "Pet",
                species: petData?.species || apt.species || "Dog",
                breed: petData?.breed || apt.breed || "",
                petPhotoUrl: petData?.photo_url || apt.photo_url,
                service_id: apt.service_id || "vaccination",
                notes: apt.notes,
                date: apt.date,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Notice: Querying Supabase appointments for queue check-in:", err);
      }

      // B. Fallback: localStorage only when Supabase was unreachable.
      // When Supabase answered, missing rows were deleted by staff, so don't trust the cache.
      if (!appointmentsFetched) {
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
                matchingItems.push({
                  type: "appointment",
                  id: l.id,
                  pet_id: l.pet_id,
                  pet_name: l.pet_name || "Pet",
                  species: l.species || "Dog",
                  breed: l.breed || "",
                  petPhotoUrl: l.petPhotoUrl || l.photoUrl,
                  service_id: l.service_id || "vaccination",
                  notes: l.notes,
                  date: l.date,
                });
              }
            });
          }
        } catch {}
      }

      // C. Query consultations for today (Supabase consultations table)
      let consultsFetched = false;
      try {
        const { data: consults } = await supabase
          .from("consultations")
          .select("*, pets:pet_id(id, name, species, breed, photo_url), users:owner_id(id, full_name, phone_number, address)")
          .eq("date", todayStr)
          .neq("status", "completed")
          .neq("status", "cancelled");

        if (consults && Array.isArray(consults)) {
          consultsFetched = true;
          consults.forEach((c) => {
            const matchesOwner =
              c.owner_id === ownerId ||
              (c.owner_name && (c.owner_name.toLowerCase().includes(ownerName.toLowerCase()) || ownerName.toLowerCase().includes(c.owner_name.toLowerCase()))) ||
              (ownerPhone && c.owner_contact === ownerPhone);

            const encounterId = c.encounter_no || c.id;
            if (matchesOwner && !seen.has(encounterId)) {
              seen.add(encounterId);
              const petData = Array.isArray(c.pets) ? c.pets[0] : c.pets;
              matchingItems.push({
                type: "consultation",
                id: encounterId,
                encounterNo: c.encounter_no,
                pet_id: c.pet_id || petData?.id,
                pet_name: petData?.name || c.pet_name || "Pet",
                species: petData?.species || c.species || "Dog",
                breed: petData?.breed || c.breed || "",
                petPhotoUrl: petData?.photo_url || c.photo_url,
                service_id: "consultation",
                service_title: c.service_type || "Clinical Consultation",
                notes: c.chief_complaint,
                date: c.date,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Notice: Querying Supabase consultations for queue check-in:", err);
      }

      // D. Fallback: local consultations only when Supabase was unreachable.
      // If Supabase answered, missing rows were deleted by staff, so don't trust the cache.
      if (!consultsFetched) {
        try {
          const localConsults = JSON.parse(localStorage.getItem("cvo_consultations_v2") || "[]");
        if (Array.isArray(localConsults)) {
          localConsults.forEach((c: any) => {
            const cDate = c.date || "";
            const isToday = cDate === todayStr || cDate.startsWith(todayStr);
            const matchesOwner =
              c.ownerId === ownerId ||
              (c.ownerName && (c.ownerName.toLowerCase().includes(ownerName.toLowerCase()) || ownerName.toLowerCase().includes(c.ownerName.toLowerCase()))) ||
              (ownerPhone && c.ownerContact === ownerPhone);

            const encounterId = c.encounterNo || c.id;
            if (isToday && c.status !== "completed" && c.status !== "cancelled" && matchesOwner && !seen.has(encounterId)) {
              seen.add(encounterId);
              matchingItems.push({
                type: "consultation",
                id: encounterId,
                encounterNo: c.encounterNo,
                pet_id: c.petId,
                pet_name: c.petName || "Pet",
                species: c.species || "Dog",
                breed: c.breed || "",
                petPhotoUrl: c.photoUrl,
                service_id: "consultation",
                service_title: c.serviceType || "Clinical Consultation",
                notes: c.chiefComplaint,
                date: cDate,
              });
            }
          });
        }
        } catch {}
      }

      setEligibleAppointments(matchingItems);

      // Check validation condition:
      if (matchingItems.length === 0) {
        setEligibilityError(
          "No confirmed appointment or consultation found for today. Only pet owners with a pre-scheduled procedure or consultation for today can join the automated queue via QR."
        );
        setLoading(false);
        return;
      }

      // If the owner scanned a specific appointment pass, check in that exact
      // booking so the correct service (vaccination / spay-neuter / consultation)
      // is queued even when the owner has multiple bookings today.
      const requestedItem = requestedAppointmentId
        ? matchingItems.find(
            (item) => item.type === "appointment" && item.id === requestedAppointmentId
          )
        : undefined;

      if (requestedAppointmentId && !requestedItem) {
        setEligibilityError(
          "The appointment pass you scanned does not match an active booking for today. Please scan today's check-in station QR code or contact the reception desk for assistance."
        );
        setLoading(false);
        return;
      }

      // Automatically check in the scanned appointment, or the first eligible item
      const primaryItem = requestedItem || matchingItems[0];
      const serviceTitle =
        primaryItem.service_id === "spay-neuter"
          ? "Low-Cost / Free Spay & Neuter Surgery"
          : primaryItem.service_id === "vaccination"
          ? "Rabies & Core Preventive Vaccination"
          : "Clinical Consultation";

      const checkInResult = checkInPetOwnerToQueue({
        appointmentId: primaryItem.id,
        encounterNo: primaryItem.encounterNo,
        notes: primaryItem.notes,
        ownerId,
        ownerName,
        ownerContact: ownerPhone,
        ownerBarangay,
        petId: primaryItem.pet_id,
        petName: primaryItem.pet_name || "Pet",
        species: primaryItem.species || "Dog",
        breed: primaryItem.breed,
        petPhotoUrl: primaryItem.petPhotoUrl,
        serviceId: primaryItem.service_id || "vaccination",
        serviceTitle,
        dateStr: todayStr,
        checkedInVia: "qr",
      });

      // Update status in database and localStorage upon scanning QR code
      if (primaryItem.type === "appointment") {
        try {
          await supabase
            .from("appointments")
            .update({
              status: "checked-in",
              notes: primaryItem.notes
                ? `${primaryItem.notes} | [Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`
                : `[Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`,
            })
            .eq("id", primaryItem.id);
        } catch {}

        try {
          const localList = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
          const updatedLocal = localList.map((item: any) =>
            item.id === primaryItem.id
              ? {
                  ...item,
                  status: "checked-in",
                  notes: item.notes
                    ? `${item.notes} | [Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`
                    : `[Checked in: Ticket ${checkInResult.ticket.ticketNumber}]`,
                }
              : item
          );
          localStorage.setItem("syncvet_local_appointments", JSON.stringify(updatedLocal));
        } catch {}
      } else {
        // Consultation check-in
        try {
          await supabase
            .from("consultations")
            .update({ status: "waiting" })
            .or(`id.eq.${primaryItem.id},encounter_no.eq.${primaryItem.id}`);
        } catch {}

        try {
          const localConsults = JSON.parse(localStorage.getItem("cvo_consultations_v2") || "[]");
          const updatedConsults = localConsults.map((c: any) =>
            c.id === primaryItem.id || c.encounterNo === primaryItem.id
              ? { ...c, status: "waiting" }
              : c
          );
          localStorage.setItem("cvo_consultations_v2", JSON.stringify(updatedConsults));
        } catch {}
      }

      // Invalidate queries so that live queues and slot deductions update immediately
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
      window.dispatchEvent(new Event("syncvet-appointment-updated"));
      window.dispatchEvent(new Event("syncvet-queue-updated"));

      setTicket(checkInResult.ticket);
      setIsExistingTicket(checkInResult.isExisting);
      setLoading(false);
    };

    checkEligibilityAndEnroll();
  }, [isLoaded, isSignedIn, user, todayStr, supabase, queryClient]);

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

  // Ineligible or Expired QR
  if (eligibilityError) {
    const isExpiredQr = eligibilityError.includes("valid on that day only") || eligibilityError.includes("expired");

    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 bg-muted/15">
        <Card className="max-w-md w-full border border-border/80 rounded-3xl shadow-xl overflow-hidden bg-card">
          <div className="p-5 border-b border-border/60 flex items-center gap-3 bg-muted/30">
            <div
              className={`size-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isExpiredQr
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25"
              }`}
            >
              {isExpiredQr ? <AlertCircle className="size-5" /> : <ShieldAlert className="size-5" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isExpiredQr ? "Check-in QR Code Expired" : "Scheduled Booking Required"}
              </h2>
              <p className="text-[11px] text-muted-foreground">Carmen Clinic Arrival Desk</p>
            </div>
          </div>

          <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {eligibilityError}
            </p>

            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-1.5">
              <span className="text-xs font-bold text-foreground block">
                {isExpiredQr ? "How to Check-in:" : "Next Steps:"}
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-muted-foreground leading-relaxed">
                {isExpiredQr ? (
                  <>
                    <li>Station QR codes are generated each morning and are valid for that day only.</li>
                    <li>Please locate today&apos;s active Check-in Station QR code standee at the reception window.</li>
                    <li>If you have any difficulty, the attending staff will assist you.</li>
                  </>
                ) : (
                  <>
                    <li>If you are a walk-in pet owner, please approach the triage window for intake.</li>
                    <li>If your appointment is scheduled for a future date, please check in on the day of your booking.</li>
                    <li>You can book a free sterilization or anti-rabies slot anytime from your dashboard.</li>
                  </>
                )}
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
        {/* â”€â”€ Main Compact Queue Pass Card â”€â”€ */}
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
                  Republic of the Philippines â€¢ CDO
                </span>
                <h1 className="text-xs sm:text-sm font-extrabold text-foreground truncate">
                  City Veterinary Office Clinic Queue
                </h1>
                <p className="text-[10px] text-muted-foreground truncate">
                  Carmen Central Clinic â€¢ {todayFormatted}
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
            {/* â”€â”€ 1. The Digital Queue Ticket Pass (Hero Boarding Pass) â”€â”€ */}
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

            {/* â”€â”€ 2. Live Waiting Room Status â”€â”€ */}
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
                    {currentStatus.isMyTurn
                      ? "Called"
                      : currentStatus.isNext
                      ? "0 (You're Next!)"
                      : currentStatus.ticketsAhead}
                  </p>
                  <p className="text-[9.5px] text-muted-foreground truncate font-mono">
                    {currentStatus.isMyTurn
                      ? "Step Up to Desk"
                      : currentStatus.isNext
                      ? "Stay near the desk"
                      : `~${Math.max(5, currentStatus.ticketsAhead * 10)} mins wait`}
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
                      currentStatus.isMyTurn
                        ? "w-full bg-blue-500 animate-pulse"
                        : currentStatus.isNext
                        ? "w-full bg-emerald-500"
                        : "w-0"
                    }`}
                  />
                </div>
                <div
                  className={`flex items-center gap-1 shrink-0 ${
                    currentStatus.isMyTurn
                      ? "text-blue-600 font-bold"
                      : currentStatus.isNext
                      ? "text-emerald-600 dark:text-emerald-400 font-bold"
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
                  ðŸ”” Ticket {ticket?.ticketNumber} called! Please proceed to Consultation Desk 1 with {ticket?.petName}.
                </div>
              ) : currentStatus.isNext ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-center text-xs">
                  âœ… You&apos;re next! Please stay near the desk â€” ticket {ticket?.ticketNumber} will be called shortly.
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
