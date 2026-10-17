"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isValid } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  Syringe,
  Scissors,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Phone,
  User,
  PawPrint,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { getPetVaccinationStatus } from "@/lib/vaccination-rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  type ProcedureServiceType,
  PROCEDURE_SERVICES,
  getSlotConfiguration,
  calculateSlotStatus,
} from "@/lib/cvo-slots";
import { ProcedureDatePicker } from "./procedure-date-picker";

interface ScheduleProcedureDialogProps {
  initialService?: ProcedureServiceType;
  initialPet?: any;
  pets?: any[];
  ownerProfile?: {
    name?: string;
    contact?: string;
    barangay?: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ScheduleProcedureDialog({
  initialService = "vaccination",
  initialPet,
  pets = [],
  ownerProfile,
  trigger,
  onSuccess,
}: ScheduleProcedureDialogProps) {
  const [open, setOpen] = useState(false);
  const [service, setService] = useState<ProcedureServiceType>(initialService);
  const [selectedPetId, setSelectedPetId] = useState<string>(initialPet?.id || "");
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [ownerContact, setOwnerContact] = useState<string>(ownerProfile?.contact || "");
  const [notes, setNotes] = useState<string>("");
  const [checklistConfirmed, setChecklistConfirmed] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const { user } = useUser();
  const queryClient = useQueryClient();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Fetch all existing booked appointments to compute live slots
  // Fetch all existing booked appointments to compute live slots & detect duplicate bookings
  const { data: bookedAppointments = [] } = useQuery({
    queryKey: ["procedure-appointments-slots"],
    queryFn: async () => {
      const items: Array<{
        id: string;
        date: string;
        service_id: string;
        status: string;
        pet_id?: string;
        pet_name?: string;
        owner_id?: string;
      }> = [];
      const seen = new Set<string>();

      // 1. appointments table
      try {
        const { data } = await supabase
          .from("appointments")
          .select("id, date, service_id, status, pet_id, pet_name, owner_id")
          .neq("status", "cancelled");

        if (data) {
          data.forEach((d) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              items.push({
                id: d.id,
                date: d.date,
                service_id: d.service_id,
                status: d.status,
                pet_id: d.pet_id || undefined,
                pet_name: d.pet_name,
                owner_id: d.owner_id,
              });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // 2. service_transactions table (fallback for slots & duplicate prevention)
      try {
        const { data: txData } = await supabase
          .from("service_transactions")
          .select("id, reference_id, date, transaction_type, status, title, owner_id")
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
          .neq("status", "cancelled");

        if (txData) {
          txData.forEach((tx: any) => {
            const refId = tx.reference_id || tx.id;
            if (!seen.has(refId)) {
              seen.add(refId);
              const petNameMatch = tx.title && tx.title.includes(" for ")
                ? tx.title.split(" for ").slice(1).join(" for ").trim()
                : (tx.title || "").trim();
              items.push({
                id: refId,
                date: tx.date ? tx.date.split("T")[0] : "",
                service_id: tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter",
                status: tx.status || "confirmed",
                pet_name: petNameMatch,
                owner_id: tx.owner_id,
              });
            }
          });
        }
      } catch (e) {
        // ignore
      }

      // 3. localStorage cache
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        local.forEach((l: any) => {
          if (!seen.has(l.id) && l.status !== "cancelled") {
            seen.add(l.id);
            items.push({
              id: l.id,
              date: l.date,
              service_id: l.service_id,
              status: l.status,
              pet_id: l.pet_id,
              pet_name: l.pet_name,
              owner_id: l.owner_id,
            });
          }
        });
      } catch (e) {
        // ignore
      }

      return items;
    },
    enabled: open,
    refetchInterval: open ? 15000 : false, // Poll every 15s while modal is open
  });

  // Selected pet object
  const currentPet = useMemo(() => {
    return pets.find((p) => p.id === selectedPetId) || initialPet || pets[0];
  }, [pets, selectedPetId, initialPet]);

  // Annual vaccination validity & 2-week reminder rule check
  const vaccinationStatus = useMemo(() => {
    return getPetVaccinationStatus(currentPet);
  }, [currentPet]);

  const isVaccinationBlocked =
    service === "vaccination" && !vaccinationStatus.canBookVaccination;

  // Check specifically if vaccination is already scheduled for currentPet
  const existingVaccinationAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      if (appt.service_id !== "vaccination") return false;
      if (appt.status === "cancelled" || appt.status === "completed") return false;

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      return (
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName)
      );
    });
  }, [bookedAppointments, currentPet]);

  const isVaccinationScheduled = Boolean(existingVaccinationAppointment);

  // Check specifically if spay & neuter is already scheduled for currentPet
  const existingSpayNeuterAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      if (appt.service_id !== "spay-neuter") return false;
      if (appt.status === "cancelled" || appt.status === "completed") return false;

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      return (
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName)
      );
    });
  }, [bookedAppointments, currentPet]);

  const isSpayNeuterScheduled = Boolean(existingSpayNeuterAppointment);

  // Formatted date of existing vaccination appointment
  const existingVaccinationDateFormatted = useMemo(() => {
    if (!existingVaccinationAppointment?.date) return "";
    try {
      const parsed = parseISO(existingVaccinationAppointment.date);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM d, yyyy");
      return existingVaccinationAppointment.date;
    } catch {
      return existingVaccinationAppointment.date;
    }
  }, [existingVaccinationAppointment]);

  // Formatted date of existing spay/neuter appointment
  const existingSpayNeuterDateFormatted = useMemo(() => {
    if (!existingSpayNeuterAppointment?.date) return "";
    try {
      const parsed = parseISO(existingSpayNeuterAppointment.date);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM d, yyyy");
      return existingSpayNeuterAppointment.date;
    } catch {
      return existingSpayNeuterAppointment.date;
    }
  }, [existingSpayNeuterAppointment]);

  // Auto-switch active service to spay-neuter if vaccination is already scheduled
  useEffect(() => {
    if (isVaccinationScheduled && service === "vaccination") {
      setService("spay-neuter");
    }
  }, [isVaccinationScheduled, service]);

  // Prevent duplicate appointment scheduling: check if currentPet ALREADY has an active appointment for the active service
  const existingUpcomingAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      // Must match procedure service
      if (appt.service_id !== service) return false;
      // Must be active (not cancelled, not completed)
      if (appt.status === "cancelled" || appt.status === "completed") return false;

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      const isSamePet =
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName);

      return isSamePet;
    });
  }, [bookedAppointments, currentPet, service]);

  const isAlreadyScheduled = Boolean(existingUpcomingAppointment);

  const existingApptDateFormatted = useMemo(() => {
    if (!existingUpcomingAppointment?.date) return "";
    try {
      const parsed = parseISO(existingUpcomingAppointment.date);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM d, yyyy");
      return existingUpcomingAppointment.date;
    } catch {
      return existingUpcomingAppointment.date;
    }
  }, [existingUpcomingAppointment]);

  const serviceConfig = PROCEDURE_SERVICES[service];

  const handleServiceChange = (newService: ProcedureServiceType) => {
    if (newService === "vaccination" && isVaccinationScheduled) {
      toast.info("Vaccination Already Scheduled", {
        description: `${currentPet?.name || "This pet"} already has an active vaccination appointment scheduled for ${existingVaccinationDateFormatted}. Double booking is disabled.`,
      });
      return;
    }
    if (newService === "spay-neuter" && isSpayNeuterScheduled) {
      toast.info("Spay & Neuter Already Scheduled", {
        description: `${currentPet?.name || "This pet"} already has an active spay & neuter appointment scheduled for ${existingSpayNeuterDateFormatted}. Double booking is disabled.`,
      });
      return;
    }
    setService(newService);
  };

  // Reset or initialize on open
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      if (initialPet?.id) setSelectedPetId(initialPet.id);
      else if (pets.length > 0 && !selectedPetId) setSelectedPetId(pets[0].id);
      if (ownerProfile?.contact && !ownerContact) setOwnerContact(ownerProfile.contact);
    }
  };

  const isPetAlreadySterilized =
    service === "spay-neuter" &&
    Boolean(currentPet?.is_spayed_neutered || currentPet?.sterilized);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to schedule an appointment");
      return;
    }

    if (!currentPet) {
      toast.error("Please select a registered pet for this procedure");
      return;
    }

    if (isVaccinationBlocked) {
      toast.error("Vaccination Not Due", {
        description: vaccinationStatus.reason,
      });
      return;
    }

    if (isAlreadyScheduled && existingUpcomingAppointment) {
      toast.error("Duplicate Appointment Blocked", {
        description: `${currentPet.name} already has an active ${serviceConfig.shortTitle} appointment scheduled on ${existingApptDateFormatted}. Pets cannot be scheduled twice for the same procedure.`,
      });
      return;
    }

    if (!appointmentDate) {
      toast.error("Please pick an available Monday–Friday date");
      return;
    }

    if (!checklistConfirmed) {
      toast.error("Please acknowledge the pre-procedure requirements");
      return;
    }

    setSubmitting(true);

    try {
      const formattedDate = format(appointmentDate, "yyyy-MM-dd");

      // Verify slot availability one last time before submitting
      const status = calculateSlotStatus({
        date: appointmentDate,
        service,
        bookedAppointments,
      });

      if (!status.isAvailable) {
        toast.error("Sorry! This date just became fully booked. Please choose another date.");
        setSubmitting(false);
        return;
      }

      // Fetch user's database ID
      let ownerDbId = user.id;
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.primaryEmailAddress?.emailAddress || "")
        .maybeSingle();

      if (dbUser?.id) {
        ownerDbId = dbUser.id;
      }

      const generatedApptId = `appt-${Date.now()}`;
      let createdAppointmentId = generatedApptId;

      // 1. Insert into appointments table (with resilient error catching so RLS does not crash the form)
      try {
        const { data: newAppointment, error: apptError } = await supabase
          .from("appointments")
          .insert({
            owner_id: ownerDbId,
            pet_id: currentPet.id || null,
            pet_name: currentPet.name,
            service_id: service,
            date: formattedDate,
            time_slot: "morning",
            status: "confirmed",
            location: "City Veterinary Office - Carmen Central Clinic",
            notes: notes
              ? `${notes} (Contact: ${ownerContact || "N/A"})`
              : `Contact: ${ownerContact || "N/A"}`,
          })
          .select()
          .maybeSingle();

        if (apptError) {
          console.warn("Appointments table insert note (will use service_transactions):", apptError.message);
        } else if (newAppointment?.id) {
          createdAppointmentId = newAppointment.id;
        }
      } catch (insertErr) {
        console.warn("Non-fatal appointments insert exception:", insertErr);
      }

      // 2. Insert into service_transactions for verified municipal records
      try {
        await supabase.from("service_transactions").insert({
          owner_id: ownerDbId,
          transaction_no: `TXN-${Date.now().toString().slice(-6)}`,
          transaction_type: service === "vaccination" ? "Vaccination Booking" : "Spay & Neuter Booking",
          title: `${serviceConfig.shortTitle} for ${currentPet.name}`,
          detail: `Scheduled on ${format(appointmentDate, "PPP")}${notes ? ` • Note: ${notes}` : ""}`,
          date: formattedDate,
          status: "confirmed",
          reference_id: createdAppointmentId,
        });
      } catch (txErr) {
        console.warn("Non-fatal transaction logging notice:", txErr);
      }

      // 3. Save to localStorage appointments cache for instant real-time synchronization
      try {
        const localList = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        localList.push({
          id: createdAppointmentId,
          owner_id: ownerDbId,
          pet_id: currentPet.id || null,
          pet_name: currentPet.name,
          service_id: service,
          date: formattedDate,
          time_slot: "morning",
          status: "confirmed",
          location: "City Veterinary Office - Carmen Central Clinic",
          notes: notes
            ? `${notes} (Contact: ${ownerContact || "N/A"})`
            : `Contact: ${ownerContact || "N/A"}`,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(localList));
      } catch (e) {
        // ignore
      }

      // Invalidate queries so lists update in real time
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });

      toast.success(
        `Appointment confirmed! Scheduled ${serviceConfig.shortTitle} for ${currentPet.name} on ${format(
          appointmentDate,
          "MMMM d, yyyy"
        )}.`
      );

      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err?.message || "Failed to schedule appointment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button className="gap-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl shadow-xs cursor-pointer">
            <Calendar className="size-3.5" />
            <span>Schedule Procedure</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-background rounded-2xl shadow-xl">
        <DialogHeader className="space-y-1.5 pb-2 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              {service === "vaccination" ? (
                <Syringe className="size-5" />
              ) : (
                <Scissors className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                City Veterinary Office Procedure Scheduler
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Book official municipal appointments with live daily capacity limits (Monday – Friday)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleBookingSubmit} className="space-y-5 pt-3">
          {/* ── SECTION 1: Service Selection ── */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              1. Select Municipal Veterinary Service *
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vaccination Card */}
              <div
                onClick={() => !isVaccinationScheduled && handleServiceChange("vaccination")}
                className={cn(
                  "p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 relative select-none",
                  isVaccinationScheduled
                    ? "opacity-55 cursor-not-allowed bg-muted/40 border-dashed border-border/80"
                    : service === "vaccination"
                    ? "border-primary bg-primary/5 shadow-2xs cursor-pointer ring-2 ring-primary/20"
                    : "border-border/80 bg-card hover:border-border hover:bg-muted/30 cursor-pointer"
                )}
                title={
                  isVaccinationScheduled
                    ? `${currentPet?.name || "Pet"} already has an active vaccination appointment on ${existingVaccinationDateFormatted}`
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-8 rounded-xl flex items-center justify-center shrink-0",
                        isVaccinationScheduled
                          ? "bg-muted text-muted-foreground"
                          : "bg-emerald-500/10 text-emerald-600"
                      )}
                    >
                      <Syringe className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">Vaccination</h4>
                        {isVaccinationScheduled && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          >
                            Already Scheduled
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Anti-Rabies & Core Immunization</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold",
                      isVaccinationScheduled
                        ? "bg-muted text-muted-foreground border-border/60"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    )}
                  >
                    10 Slots / Day
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isVaccinationScheduled
                    ? `Confirmed on ${existingVaccinationDateFormatted}. Double booking is disabled.`
                    : "Annual rabies vaccine & health certificate validation."}
                </p>
              </div>

              {/* Spay & Neuter Card */}
              <div
                onClick={() => !isSpayNeuterScheduled && handleServiceChange("spay-neuter")}
                className={cn(
                  "p-3.5 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-2 relative select-none",
                  isSpayNeuterScheduled
                    ? "opacity-55 cursor-not-allowed bg-muted/40 border-dashed border-border/80"
                    : service === "spay-neuter"
                    ? "border-primary bg-primary/5 shadow-2xs cursor-pointer ring-2 ring-primary/20"
                    : "border-border/80 bg-card hover:border-border hover:bg-muted/30 cursor-pointer"
                )}
                title={
                  isSpayNeuterScheduled
                    ? `${currentPet?.name || "Pet"} already has an active spay & neuter appointment on ${existingSpayNeuterDateFormatted}`
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-8 rounded-xl flex items-center justify-center shrink-0",
                        isSpayNeuterScheduled
                          ? "bg-muted text-muted-foreground"
                          : "bg-indigo-500/10 text-indigo-600"
                      )}
                    >
                      <Scissors className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-sm text-foreground">Spay & Neuter</h4>
                        {isSpayNeuterScheduled ? (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-4 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                          >
                            Already Scheduled
                          </Badge>
                        ) : isVaccinationScheduled && service === "spay-neuter" ? (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/15 text-primary border-primary/20"
                          >
                            Active Procedure
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Kapon / Sterilization Surgery</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold",
                      isSpayNeuterScheduled
                        ? "bg-muted text-muted-foreground border-border/60"
                        : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                    )}
                  >
                    5 Slots / Day
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isSpayNeuterScheduled
                    ? `Confirmed on ${existingSpayNeuterDateFormatted}. Double booking is disabled.`
                    : "Surgical procedure with licensed veterinary anesthesia team."}
                </p>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Pet Selection ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Select Pet for Procedure *
              </Label>
              {pets.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {pets.length} registered pet{pets.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {pets.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-200">
                You have no registered pets yet. Please register your pet in the Pet Registry tab first before scheduling.
              </div>
            ) : (
              <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                <SelectTrigger className="h-11 rounded-xl bg-background border-input/80 text-xs sm:text-sm font-semibold">
                  <SelectValue placeholder="Choose a registered pet" />
                </SelectTrigger>
                <SelectContent className="z-[90] rounded-xl">
                  {pets.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm cursor-pointer py-2">
                      <div className="flex items-center gap-2">
                        <PawPrint className="size-3.5 text-primary" />
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-muted-foreground">
                          ({p.species} • {p.breed} • {p.weightKg || p.weight_kg || "?"} kg)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Warning if pet is already neutered */}
            {isPetAlreadySterilized && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 animate-in fade-in-0">
                <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Note:</strong> {currentPet?.name} is already registered as Spayed/Neutered in their digital health record. If you are scheduling a follow-up or re-examination, you may proceed.
                </p>
              </div>
            )}

            {/* Notice if vaccination is already valid (disabled until 2 weeks before due date) */}
            {isVaccinationBlocked && (
              <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs text-emerald-950 dark:text-emerald-200 space-y-1 animate-in fade-in-0">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                  <span>Annual Vaccination Up To Date</span>
                </div>
                <p className="leading-relaxed">
                  {vaccinationStatus.reason}
                </p>
              </div>
            )}

            {/* Reminder alert if vaccination booster is due within 2 weeks */}
            {service === "vaccination" && vaccinationStatus.isDueSoon && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 space-y-1 animate-in fade-in-0">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>Annual Booster Due Soon (2-Week Renewal Window Open)</span>
                </div>
                <p className="leading-relaxed">
                  {vaccinationStatus.reason}
                </p>
              </div>
            )}

            {/* Informational notice when vaccination is already scheduled and procedure switched to Spay & Neuter */}
            {isVaccinationScheduled && service === "spay-neuter" && (
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-2.5 animate-in fade-in-0 shadow-2xs">
                <Info className="size-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">
                    Vaccination Already Scheduled ({existingVaccinationDateFormatted})
                  </p>
                  <p className="leading-relaxed text-muted-foreground text-[11px]">
                    <strong>{currentPet?.name}</strong> already has an active confirmed Vaccination appointment. Double booking is disabled, and the active procedure has been switched to <strong>Spay & Neuter</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Warning if pet is ALREADY scheduled for this procedure */}
            {isAlreadyScheduled && existingUpcomingAppointment && (
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 space-y-1.5 animate-in fade-in-0 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>Already Scheduled for {serviceConfig.shortTitle}</span>
                </div>
                <p className="leading-relaxed">
                  <strong>{currentPet?.name}</strong> already has an active upcoming {serviceConfig.shortTitle} appointment scheduled on{" "}
                  <strong className="underline text-foreground">{existingApptDateFormatted}</strong>.
                  Municipal guidelines do not allow duplicate bookings for the same procedure. If you wish to reschedule, please cancel the existing appointment in your Appointments tab first.
                </p>
              </div>
            )}
          </div>

          {/* ── SECTION 3: Date & Slot Selection ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Choose Appointment Date (Monday – Friday) *
              </Label>
              <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
                {serviceConfig.operatingHours}
              </Badge>
            </div>

            <ProcedureDatePicker
              date={appointmentDate}
              setDate={setAppointmentDate}
              service={service}
              bookedAppointments={bookedAppointments}
              placeholder={`Pick an available weekday for ${serviceConfig.shortTitle}`}
            />
          </div>

          {/* ── SECTION 4: Pre-procedure Guidelines & Mandatory Check ── */}
          <div className="space-y-2 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" />
              4. Pre-Procedure Clinical Requirements ({serviceConfig.shortTitle})
            </h4>

            <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
              {serviceConfig.prepGuidelines.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2 border-t border-border/60">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-foreground select-none">
                <input
                  type="checkbox"
                  checked={checklistConfirmed}
                  onChange={(e) => setChecklistConfirmed(e.target.checked)}
                  className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                />
                <span>I confirm that my pet meets these health criteria and I will follow prep guidelines.</span>
              </label>
            </div>
          </div>

          {/* ── SECTION 6: Owner Contact & Special Notes ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Contact Phone Number</Label>
              <Input
                value={ownerContact}
                onChange={(e) => setOwnerContact(e.target.value)}
                placeholder="e.g. 0917-xxx-xxxx"
                className="h-10 text-xs sm:text-sm rounded-xl bg-background"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Special Clinical Notes (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergies, prior medication, temperament..."
                className="h-10 text-xs sm:text-sm rounded-xl bg-background"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-primary" />
              <span>Free municipal service provided by Cagayan de Oro City Veterinary Office.</span>
            </p>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto text-xs rounded-xl"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  submitting ||
                  !checklistConfirmed ||
                  !appointmentDate ||
                  pets.length === 0 ||
                  isVaccinationBlocked ||
                  isAlreadyScheduled
                }
                className="w-full sm:w-auto text-xs font-bold rounded-xl gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Booking Slot...</span>
                  </>
                ) : isAlreadyScheduled ? (
                  <>
                    <AlertTriangle className="size-3.5" />
                    <span>Already Scheduled for {currentPet?.name}</span>
                  </>
                ) : isVaccinationBlocked ? (
                  <>
                    <ShieldCheck className="size-3.5" />
                    <span>Vaccination Not Due (Protected)</span>
                  </>
                ) : (
                  <>
                    <Calendar className="size-3.5" />
                    <span>Confirm {serviceConfig.shortTitle} Slot</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
