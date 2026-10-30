"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isValid, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
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
  CalendarClock,
  ChevronRight,
  Phone,
  User,
  PawPrint,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import { getPetVaccinationStatus } from "@/lib/vaccination-rules";
import { PetPassportHeroCard } from "@/components/dashboard/pet-passport-hero-card";
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
  rescheduleAppointmentId?: string;
  ownerProfile?: {
    name?: string;
    contact?: string;
    barangay?: string;
  };
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  embedded?: boolean;
  onCancel?: () => void;
  hidePetSelector?: boolean;
}

export function ScheduleProcedureDialog({
  initialService = "vaccination",
  initialPet,
  pets = [],
  rescheduleAppointmentId,
  ownerProfile,
  trigger,
  onSuccess,
  embedded = false,
  onCancel,
  hidePetSelector = false,
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
        pets?: any;
        owner_id?: string;
      }> = [];
      const seen = new Set<string>();

      const todayStart = startOfDay(new Date());
      const unpersistedMissedList: Array<{ id: string; service_id: string; date: string }> = [];

      // 1. appointments table
      try {
        const { data } = await supabase
          .from("appointments")
          .select("id, date, service_id, status, pet_id, pet_name, owner_id, pets:pet_id(id, name, species, breed, photo_url)")
          .neq("status", "cancelled");

        if (data) {
          data.forEach((d: any) => {
            if (!seen.has(d.id)) {
              seen.add(d.id);
              let effStatus = d.status || "confirmed";
              try {
                const parsed = parseISO(d.date);
                if (
                  isValid(parsed) &&
                  isBefore(startOfDay(parsed), todayStart) &&
                  effStatus !== "completed" &&
                  effStatus !== "cancelled"
                ) {
                  effStatus = "missed";
                  if (d.status !== "missed") {
                    unpersistedMissedList.push({ id: d.id, service_id: d.service_id, date: d.date });
                  }
                }
              } catch {}

              const petData = Array.isArray(d.pets) ? d.pets[0] : d.pets;
              const resolvedPetName = petData?.name || d.pet_name;
              items.push({
                id: d.id,
                date: d.date,
                service_id: d.service_id,
                status: effStatus,
                pet_id: d.pet_id || petData?.id || undefined,
                pets: petData,
                pet_name: resolvedPetName,
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
          .select("id, reference_id, date, transaction_type, status, title, owner_id, pet_id, pets:pet_id(id, name, species, breed, photo_url)")
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
          .neq("status", "cancelled");

        if (txData) {
          txData.forEach((tx: any) => {
            const refId = tx.reference_id || tx.id;
            if (!seen.has(refId)) {
              seen.add(refId);
              const petData = Array.isArray(tx.pets) ? tx.pets[0] : tx.pets;
              const petNameMatch = petData?.name || (tx.title && tx.title.includes(" for ")
                ? tx.title.split(" for ").slice(1).join(" for ").trim()
                : (tx.title || "").trim());
              const serviceType = tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter";
              const dateVal = tx.date ? tx.date.split("T")[0] : "";
              let effStatus = tx.status || "confirmed";
              try {
                if (dateVal) {
                  const parsed = parseISO(dateVal);
                  if (
                    isValid(parsed) &&
                    isBefore(startOfDay(parsed), todayStart) &&
                    effStatus !== "completed" &&
                    effStatus !== "cancelled"
                  ) {
                    effStatus = "missed";
                    if (tx.status !== "missed") {
                      unpersistedMissedList.push({ id: refId, service_id: serviceType, date: dateVal });
                    }
                  }
                }
              } catch {}

              items.push({
                id: refId,
                date: dateVal,
                service_id: serviceType,
                status: effStatus,
                pet_id: tx.pet_id || petData?.id || undefined,
                pets: petData,
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
            let effStatus = l.status || "confirmed";
            try {
              if (l.date) {
                const parsed = parseISO(l.date);
                if (
                  isValid(parsed) &&
                  isBefore(startOfDay(parsed), todayStart) &&
                  effStatus !== "completed" &&
                  effStatus !== "cancelled"
                ) {
                  effStatus = "missed";
                }
              }
            } catch {}

            items.push({
              id: l.id,
              date: l.date,
              service_id: l.service_id,
              status: effStatus,
              pet_id: l.pet_id,
              pet_name: l.pet_name,
              owner_id: l.owner_id,
            });
          }
        });
      } catch (e) {
        // ignore
      }

      // Asynchronously persist any past unattended appointments as 'missed'
      if (unpersistedMissedList.length > 0) {
        (async () => {
          for (const m of unpersistedMissedList) {
            try {
              await supabase
                .from("appointments")
                .update({
                  status: "missed",
                  notes: "Unattended scheduled appointment. Pet owner requested to reschedule.",
                })
                .eq("id", m.id);
            } catch {}
            try {
              await supabase
                .from("service_transactions")
                .update({ status: "missed" })
                .or(`reference_id.eq.${m.id},id.eq.${m.id}`);
            } catch {}
          }
          try {
            const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
            let localChanged = false;
            const updated = local.map((item: any) => {
              if (unpersistedMissedList.some((m) => m.id === item.id) && item.status !== "missed") {
                localChanged = true;
                return {
                  ...item,
                  status: "missed",
                  notes: "Unattended scheduled appointment. Pet owner requested to reschedule.",
                };
              }
              return item;
            });
            if (localChanged) {
              localStorage.setItem("syncvet_local_appointments", JSON.stringify(updated));
              window.dispatchEvent(new Event("syncvet-appointment-updated"));
            }
          } catch {}
        })();
      }

      return items;
    },
    enabled: open || embedded,
    refetchInterval: (open || embedded) ? 15000 : false, // Poll every 15s while modal is open
  });

  // Realtime subscription for live appointments & procedure slots
  useEffect(() => {
    if (!open && !embedded) return;
    const channel = supabase
      .channel("realtime-procedure-slots")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
          queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, embedded, supabase, queryClient]);

  // Selected pet object
  const currentPet = useMemo(() => {
    return (
      pets.find((p) => String(p.id) === String(selectedPetId)) ||
      pets.find((p) => p.name?.toLowerCase() === selectedPetId?.toLowerCase()) ||
      pets.find((p) => String(p.id) === String(initialPet?.id)) ||
      initialPet ||
      pets[0]
    );
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
      if (rescheduleAppointmentId && appt.id === rescheduleAppointmentId) return false;
      if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "missed") return false;
      try {
        const parsed = parseISO(appt.date);
        if (isValid(parsed) && isBefore(startOfDay(parsed), startOfDay(new Date()))) {
          return false;
        }
      } catch {}

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      return (
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName)
      );
    });
  }, [bookedAppointments, currentPet, rescheduleAppointmentId]);

  const isVaccinationScheduled = Boolean(existingVaccinationAppointment);

  // Check specifically if spay & neuter is already scheduled for currentPet
  const existingSpayNeuterAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      if (appt.service_id !== "spay-neuter") return false;
      if (rescheduleAppointmentId && appt.id === rescheduleAppointmentId) return false;
      if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "missed") return false;
      try {
        const parsed = parseISO(appt.date);
        if (isValid(parsed) && isBefore(startOfDay(parsed), startOfDay(new Date()))) {
          return false;
        }
      } catch {}

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      return (
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName)
      );
    });
  }, [bookedAppointments, currentPet, rescheduleAppointmentId]);

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

  // Opposite procedure conflict check (Same-day surgery & vaccination safety rule)
  const conflictingOtherAppointment = useMemo(() => {
    if (service === "vaccination") {
      return existingSpayNeuterAppointment;
    } else {
      return existingVaccinationAppointment;
    }
  }, [service, existingSpayNeuterAppointment, existingVaccinationAppointment]);

  const conflictingServiceTitle = service === "vaccination" ? "Spay & Neuter" : "Vaccination";

  const conflictingDateStr = useMemo(() => {
    if (!conflictingOtherAppointment?.date) return "";
    return conflictingOtherAppointment.date.split("T")[0];
  }, [conflictingOtherAppointment]);

  const conflictingDateFormatted = useMemo(() => {
    if (!conflictingOtherAppointment?.date) return "";
    try {
      const parsed = parseISO(conflictingOtherAppointment.date);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM d, yyyy");
      return conflictingOtherAppointment.date;
    } catch {
      return conflictingOtherAppointment.date;
    }
  }, [conflictingOtherAppointment]);

  // Check if selected appointmentDate matches the conflicting date (STRICT BLOCK)
  const isSameDayConflict = useMemo(() => {
    if (!appointmentDate || !conflictingDateStr) return false;
    const pickedStr = format(appointmentDate, "yyyy-MM-dd");
    return pickedStr === conflictingDateStr;
  }, [appointmentDate, conflictingDateStr]);

  // Check if selected appointmentDate is within 7 days of the other procedure (CLINICAL ADVISORY)
  const isWithinRecoveryWindow = useMemo(() => {
    if (!appointmentDate || !conflictingDateStr || isSameDayConflict) return false;
    try {
      const otherDate = parseISO(conflictingDateStr);
      if (!isValid(otherDate)) return false;
      const diffDays = Math.abs(differenceInCalendarDays(appointmentDate, otherDate));
      return diffDays > 0 && diffDays < 7;
    } catch {
      return false;
    }
  }, [appointmentDate, conflictingDateStr, isSameDayConflict]);

  // Check if selected appointmentDate is currently unavailable (e.g. fully booked or same-day closed)
  const isSelectedDateUnavailable = useMemo(() => {
    if (!appointmentDate) return false;
    const status = calculateSlotStatus({
      date: appointmentDate,
      service,
      bookedAppointments,
    });
    return !status.isAvailable;
  }, [appointmentDate, service, bookedAppointments]);

  // Auto-switch active service to spay-neuter if vaccination is already scheduled
  useEffect(() => {
    if (isVaccinationScheduled && service === "vaccination") {
      setService("spay-neuter");
    }
  }, [isVaccinationScheduled, service]);

  // Prevent duplicate appointment scheduling: check if currentPet ALREADY has an active UPCOMING appointment for the active service
  const existingUpcomingAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      // Must match procedure service
      if (appt.service_id !== service) return false;
      // If currently rescheduling this specific appointment, exclude it
      if (rescheduleAppointmentId && appt.id === rescheduleAppointmentId) return false;
      // Must be active (not cancelled, not completed, not missed)
      if (appt.status === "cancelled" || appt.status === "completed" || appt.status === "missed") return false;

      // Must be upcoming: today or in the future. Past appointments are not upcoming!
      try {
        const parsed = parseISO(appt.date);
        if (isValid(parsed) && isBefore(startOfDay(parsed), startOfDay(new Date()))) {
          return false;
        }
      } catch {}

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      const isSamePet =
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName);

      return isSamePet;
    });
  }, [bookedAppointments, currentPet, service, rescheduleAppointmentId]);

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

  // Check if currentPet has an unattended / missed appointment for this service that needs rescheduling
  const existingMissedAppointment = useMemo(() => {
    if (!currentPet) return null;
    const targetPetId = (currentPet.id || "").toLowerCase().trim();
    const targetPetName = (currentPet.name || "").toLowerCase().trim();

    return bookedAppointments.find((appt) => {
      if (appt.service_id !== service) return false;
      if (appt.status === "cancelled" || appt.status === "completed") return false;

      let isPastDate = false;
      try {
        const parsed = parseISO(appt.date);
        if (isValid(parsed) && isBefore(startOfDay(parsed), startOfDay(new Date()))) {
          isPastDate = true;
        }
      } catch {}

      const isMissed = appt.status === "missed" || isPastDate;
      if (!isMissed) return false;

      const apptPetId = (appt.pet_id || "").toLowerCase().trim();
      const apptPetName = (appt.pet_name || "").toLowerCase().trim();

      return (
        (targetPetId && apptPetId && targetPetId === apptPetId) ||
        (targetPetName && apptPetName && targetPetName === apptPetName)
      );
    });
  }, [bookedAppointments, currentPet, service]);

  const existingMissedDateFormatted = useMemo(() => {
    if (!existingMissedAppointment?.date) return "";
    try {
      const parsed = parseISO(existingMissedAppointment.date);
      if (isValid(parsed)) return format(parsed, "EEEE, MMMM d, yyyy");
      return existingMissedAppointment.date;
    } catch {
      return existingMissedAppointment.date;
    }
  }, [existingMissedAppointment]);

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
      if (initialPet?.id) {
        setSelectedPetId(initialPet.id);
      } else if (pets.length > 0 && (!selectedPetId || !pets.some((p) => String(p.id) === String(selectedPetId)))) {
        setSelectedPetId(pets[0].id);
      }
      if (ownerProfile?.contact && !ownerContact) setOwnerContact(ownerProfile.contact);
    }
  };

  // Sync initial pet when dialog opens or when embedded
  useEffect(() => {
    if (open || embedded) {
      if (initialPet?.id) {
        setSelectedPetId(initialPet.id);
      } else if (pets.length > 0 && (!selectedPetId || !pets.some((p) => String(p.id) === String(selectedPetId)))) {
        setSelectedPetId(pets[0].id);
      }
    }
  }, [open, embedded, initialPet?.id]);

  const isPetAlreadySterilized =
    service === "spay-neuter" &&
    Boolean(currentPet?.is_spayed_neutered || currentPet?.sterilized || currentPet?.isSpayedNeutered);

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

    if (isSameDayConflict) {
      toast.error("Same-Day Procedure Conflict Blocked", {
        description: `${currentPet.name} already has a ${conflictingServiceTitle} scheduled on ${conflictingDateFormatted}. In veterinary clinical safety guidelines, general anesthesia surgery and vaccination cannot be performed on the same day.`,
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
        toast.error(
          status.isClosedToday
            ? "Same-day booking is open from 8:00 AM to 5:00 PM (Monday – Friday). Operating hours have ended for today."
            : "Sorry! This date is not available. Please choose another date."
        );
        setSubmitting(false);
        return;
      }

      // Fetch or ensure user's database ID
      let ownerDbId = user.id;
      const userEmail = user.primaryEmailAddress?.emailAddress || "";
      const { data: dbUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", userEmail)
        .maybeSingle();

      if (dbUser?.id) {
        ownerDbId = dbUser.id;
      } else if (userEmail) {
        // Ensure user exists in users table so foreign key won't fail
        const { data: newUser } = await supabase
          .from("users")
          .upsert({
            id: user.id,
            email: userEmail,
            full_name: user.fullName || "Citizen Pet Owner",
            role: "Citizen",
          })
          .select("id")
          .maybeSingle();
        if (newUser?.id) {
          ownerDbId = newUser.id;
        }
      }

      // Verify pet_id exists in Supabase pets table to prevent foreign key errors
      let validPetId: string | null = null;
      if (currentPet.id) {
        const { data: dbPet } = await supabase
          .from("pets")
          .select("id")
          .eq("id", currentPet.id)
          .maybeSingle();
        if (dbPet?.id) {
          validPetId = dbPet.id;
        } else {
          // Check if pet exists by owner and name
          const { data: matchedPet } = await supabase
            .from("pets")
            .select("id")
            .eq("owner_id", ownerDbId)
            .ilike("name", currentPet.name.trim())
            .maybeSingle();
          if (matchedPet?.id) {
            validPetId = matchedPet.id;
          }
        }
      }

      const generatedApptId = `apt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      let createdAppointmentId = generatedApptId;

      // 1. Insert directly into Supabase appointments table in real-time
      const { data: newAppointment, error: apptError } = await supabase
        .from("appointments")
        .insert({
          id: generatedApptId,
          owner_id: ownerDbId,
          pet_id: validPetId,
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
        console.error("Appointments table insert error:", apptError);
        toast.error(`Appointment booking failed: ${apptError.message}`);
        setSubmitting(false);
        return;
      }

      if (newAppointment?.id) {
        createdAppointmentId = newAppointment.id;
      }

      // 2. Insert into service_transactions for verified municipal records
      try {
        await supabase.from("service_transactions").insert({
          owner_id: ownerDbId,
          pet_id: validPetId,
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

      // 4. If rescheduling or resolving an unattended appointment, mark previous missed appointment as cancelled/superseded
      const effectiveRescheduleId = rescheduleAppointmentId || existingMissedAppointment?.id;
      if (effectiveRescheduleId) {
        try {
          await supabase
            .from("appointments")
            .update({ status: "cancelled", notes: `Rescheduled to ${formattedDate}` })
            .eq("id", effectiveRescheduleId);

          await supabase
            .from("service_transactions")
            .update({ status: "cancelled" })
            .or(`reference_id.eq.${effectiveRescheduleId},id.eq.${effectiveRescheduleId}`);

          const localList = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
          const updatedLocal = localList.map((item: any) =>
            item.id === effectiveRescheduleId
              ? { ...item, status: "cancelled", notes: `Rescheduled to ${formattedDate}` }
              : item
          );
          localStorage.setItem("syncvet_local_appointments", JSON.stringify(updatedLocal));
        } catch (rErr) {
          console.warn("Notice: Old appointment cancellation update:", rErr);
        }
      }

      // Invalidate queries so lists update in real time
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
      window.dispatchEvent(new Event("syncvet-appointment-updated"));

      toast.success(
        effectiveRescheduleId
          ? `Appointment successfully rescheduled! New booking for ${currentPet.name} is on ${format(
              appointmentDate,
              "MMMM d, yyyy"
            )}.`
          : `Appointment confirmed! Scheduled ${serviceConfig.shortTitle} for ${currentPet.name} on ${format(
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

  const formContent = (
    <form onSubmit={handleBookingSubmit} className="space-y-5 pt-1">
      {/* ── SECTION 1: Service Selection ── */}
      <div className="space-y-2">
        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          1. Select Municipal Veterinary Service *
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Vaccination Card */}
          <div
            onClick={() => !isVaccinationScheduled && handleServiceChange("vaccination")}
            className={cn(
              "p-2.5 sm:p-3 rounded-xl border-2 transition-all flex flex-col justify-between space-y-1.5 relative select-none",
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
                    "size-7 rounded-lg flex items-center justify-center shrink-0",
                    isVaccinationScheduled
                      ? "bg-muted text-muted-foreground"
                      : "bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  <Syringe className="size-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground">Vaccination</h4>
                    {isVaccinationScheduled && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 h-4 font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                      >
                        Already Scheduled
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Anti-Rabies & Core Immunization</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0 h-4",
                  isVaccinationScheduled
                    ? "bg-muted text-muted-foreground border-border/60"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                )}
              >
                10 Slots / Day
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {isVaccinationScheduled
                ? `Confirmed on ${existingVaccinationDateFormatted}. Double booking is disabled.`
                : "Annual rabies vaccine & health certificate validation."}
            </p>
          </div>

          {/* Spay & Neuter Card */}
          <div
            onClick={() => !isSpayNeuterScheduled && handleServiceChange("spay-neuter")}
            className={cn(
              "p-2.5 sm:p-3 rounded-xl border-2 transition-all flex flex-col justify-between space-y-1.5 relative select-none",
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
                    "size-7 rounded-lg flex items-center justify-center shrink-0",
                    isSpayNeuterScheduled
                      ? "bg-muted text-muted-foreground"
                      : "bg-indigo-500/10 text-indigo-600"
                  )}
                >
                  <Scissors className="size-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground">Spay & Neuter</h4>
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
                  <p className="text-[10px] text-muted-foreground">Kapon / Sterilization Surgery</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-bold px-1.5 py-0 h-4",
                  isSpayNeuterScheduled
                    ? "bg-muted text-muted-foreground border-border/60"
                    : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                )}
              >
                5 Slots / Day
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {isSpayNeuterScheduled
                ? `Confirmed on ${existingSpayNeuterDateFormatted}. Double booking is disabled.`
                : "Surgical procedure with licensed veterinary anesthesia team."}
            </p>
          </div>
        </div>
      </div>

          {/* ── SECTION 2: Pet Selection (Hidden if hidePetSelector is true) ── */}
          {!hidePetSelector && (
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
                <div className="space-y-3">
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger className="h-9 rounded-lg bg-background border-input/80 text-xs font-medium">
                      <SelectValue placeholder="Choose a registered pet" />
                    </SelectTrigger>
                    <SelectContent className="z-[90] rounded-lg text-xs">
                      {pets.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer py-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <PawPrint className="size-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-xs">{p.name}</span>
                            <span className="text-muted-foreground text-[11px]">
                              ({p.species} • {p.breed} • {p.weightKg || p.weight_kg || "?"} kg)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {currentPet && (
                    <div className="pt-1">
                      <PetPassportHeroCard
                        pet={currentPet}
                        allPets={pets}
                        onSelectPet={(id) => setSelectedPetId(id)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
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

            {/* Notice if pet had an unattended/missed appointment that needs rescheduling */}
            {existingMissedAppointment && !existingUpcomingAppointment && (
              <div className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 text-xs text-amber-950 dark:text-amber-200 space-y-2 animate-in fade-in-0 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <CalendarClock className="size-4 shrink-0 text-amber-600" />
                    <span>Unattended Schedule — Reschedule Required</span>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold px-1.5 py-0 h-4.5"
                  >
                    Missed Schedule
                  </Badge>
                </div>
                <p className="leading-relaxed">
                  <strong>{currentPet?.name}</strong> did not attend their scheduled {serviceConfig.shortTitle} appointment on{" "}
                  <strong className="underline text-foreground">{existingMissedDateFormatted}</strong>.
                  Please choose a new available clinic date below to automatically reschedule your pet&apos;s slot.
                </p>
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
              conflictDate={conflictingDateStr}
              conflictServiceTitle={conflictingServiceTitle}
              conflictPetName={currentPet?.name}
              placeholder={`Pick an available weekday for ${serviceConfig.shortTitle}`}
            />

            {/* Same-day procedure conflict warning (Veterinary Safety Rule) */}
            {isSameDayConflict && (
              <div className="p-3.5 rounded-xl border border-destructive/50 bg-destructive/10 text-xs text-destructive space-y-1.5 animate-in fade-in-0 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="size-4 shrink-0 text-destructive" />
                  <span>Same-Day Procedure Conflict (Clinical Safety Rule)</span>
                </div>
                <p className="leading-relaxed">
                  <strong>{currentPet?.name}</strong> already has an active <strong>{conflictingServiceTitle}</strong> scheduled on{" "}
                  <strong className="underline">{conflictingDateFormatted}</strong>.
                </p>
                <p className="leading-relaxed text-[11px] opacity-90">
                  In veterinary clinical medicine, general anesthesia surgery and routine vaccinations must <strong>never occur on the same day</strong>. Surgery temporarily suppresses immune response, and administering vaccines simultaneously creates severe diagnostic confusion between surgical/anesthetic complications and adverse vaccine reactions.
                </p>
                <p className="font-semibold text-[11px]">
                  Please pick an alternate weekday separated from {conflictingDateFormatted}.
                </p>
              </div>
            )}

            {/* 7-day separation clinical advisory */}
            {isWithinRecoveryWindow && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 animate-in fade-in-0">
                <Info className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">
                    Clinical Advisory: 7–14 Day Separation Recommended
                  </p>
                  <p className="leading-relaxed text-muted-foreground text-[11px]">
                    {currentPet?.name}&apos;s scheduled {conflictingServiceTitle} is on {conflictingDateFormatted}. While permitted, veterinarians recommend allowing at least 1 to 2 weeks between surgery and vaccination for optimal immune recovery.
                  </p>
                </div>
              </div>
            )}
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
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onCancel?.();
                }}
                className="w-full sm:w-auto text-xs rounded-lg h-8 px-3 cursor-pointer"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={
                  submitting ||
                  !checklistConfirmed ||
                  !appointmentDate ||
                  isSelectedDateUnavailable ||
                  pets.length === 0 ||
                  isVaccinationBlocked ||
                  isAlreadyScheduled ||
                  isSameDayConflict
                }
                className="w-full sm:w-auto text-xs font-bold rounded-lg h-8 px-4 gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Booking Slot...</span>
                  </>
                ) : isSelectedDateUnavailable ? (
                  <>
                    <AlertCircle className="size-3.5" />
                    <span>Date Closed / Unavailable</span>
                  </>
                ) : isSameDayConflict ? (
                  <>
                    <ShieldAlert className="size-3.5" />
                    <span>Blocked: Same-Day {conflictingServiceTitle} Conflict</span>
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
                ) : (existingMissedAppointment || rescheduleAppointmentId) ? (
                  <>
                    <CalendarClock className="size-3.5" />
                    <span>Reschedule Missed {serviceConfig.shortTitle} Slot</span>
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
  );

  if (embedded) {
    return formContent;
  }

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
                {rescheduleAppointmentId
                  ? "Reschedule Procedure Appointment"
                  : "City Veterinary Office Procedure Scheduler"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {rescheduleAppointmentId
                  ? `Select a new municipal clinic appointment date for ${currentPet?.name || "your pet"} (Monday – Friday)`
                  : "Book official municipal appointments with live daily capacity limits (Monday – Friday)"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {formContent}
      </DialogContent>
    </Dialog>
  );
}
