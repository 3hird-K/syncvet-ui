"use client";

import { useState, useEffect, useMemo } from "react";
import { format, parseISO, isValid, startOfDay } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Pencil,
  Save,
  X,
  Loader2,
  Syringe,
  Scissors,
  MapPin,
  CalendarClock,
  Info,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { ProcedureDatePicker } from "@/components/dashboard/procedure-date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  type ProcedureServiceType,
  calculateSlotStatus,
  useSlotConfiguration,
} from "@/lib/cvo-slots";

interface EditAppointmentDialogProps {
  appointment: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Split stored notes of the form "Some note (Contact: 09XX...)" or "Contact: 09XX..." */
function parseAppointmentNotes(raw?: string | null): { body: string; contact: string } {
  if (!raw) return { body: "", contact: "" };
  const suffix = raw.match(/^([\s\S]*?)\s*\(Contact:\s*([^)]*)\)\s*$/);
  if (suffix) return { body: suffix[1].trim(), contact: suffix[2].trim() };
  const alone = raw.match(/^Contact:\s*([^)]*)$/);
  if (alone) return { body: "", contact: alone[1].trim() };
  return { body: raw, contact: "" };
}

export function EditAppointmentDialog({
  appointment,
  open,
  onOpenChange,
  onUpdated,
}: EditAppointmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState("");

  const queryClient = useQueryClient();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const { slotConfig } = useSlotConfiguration();

  const appointmentId: string | undefined = appointment?.id;
  const serviceType: ProcedureServiceType =
    appointment?.service_id === "spay-neuter" ? "spay-neuter" : "vaccination";
  const isVaccination = serviceType === "vaccination";
  const serviceLabel = isVaccination ? "Rabies Vaccination" : "Spay & Neuter";
  const petName: string =
    appointment?.pets?.name || appointment?.pet_name || "Pet";
  const petSpecies: string | undefined = appointment?.pets?.species;
  const petBreed: string | undefined = appointment?.pets?.breed;
  const photoUrl: string | undefined = appointment?.pets?.photo_url;

  // Fetch all booked appointments to compute live slot availability (excludes the appointment being edited)
  const { data: bookedAppointments = [] } = useQuery({
    queryKey: ["procedure-appointments-slots-edit", appointmentId],
    enabled: open && Boolean(appointmentId),
    refetchInterval: open ? 15000 : false,
    queryFn: async () => {
      const items: Array<{
        id: string;
        date: string;
        service_id: string;
        status: string;
        pet_id?: string;
        pet_name?: string;
      }> = [];
      const seen = new Set<string>();

      try {
        const { data } = await supabase
          .from("appointments")
          .select("id, date, service_id, status, pet_id, pet_name")
          .neq("status", "cancelled");
        data?.forEach((d: any) => {
          if (seen.has(d.id)) return;
          seen.add(d.id);
          items.push({
            id: d.id,
            date: String(d.date || "").split("T")[0],
            service_id: d.service_id,
            status: d.status || "confirmed",
            pet_id: d.pet_id,
            pet_name: d.pet_name,
          });
        });
      } catch {
        // ignore
      }

      try {
        const { data: txData } = await supabase
          .from("service_transactions")
          .select("id, reference_id, date, transaction_type, status, title, pet_id")
          .in("transaction_type", ["Vaccination Booking", "Spay & Neuter Booking"])
          .neq("status", "cancelled");
        txData?.forEach((tx: any) => {
          const refId = tx.reference_id || tx.id;
          if (seen.has(refId)) return;
          seen.add(refId);
          items.push({
            id: refId,
            date: tx.date ? String(tx.date).split("T")[0] : "",
            service_id: tx.transaction_type === "Vaccination Booking" ? "vaccination" : "spay-neuter",
            status: tx.status || "confirmed",
            pet_id: tx.pet_id,
          });
        });
      } catch {
        // ignore
      }

      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        local.forEach((l: any) => {
          if (seen.has(l.id) || l.status === "cancelled") return;
          seen.add(l.id);
          items.push({
            id: l.id,
            date: l.date ? String(l.date).split("T")[0] : "",
            service_id: l.service_id,
            status: l.status || "confirmed",
            pet_id: l.pet_id,
            pet_name: l.pet_name,
          });
        });
      } catch {
        // ignore
      }

      // Exclude the appointment currently being edited so its own slot is not counted against capacity
      return items.filter((i) => i.id !== appointmentId);
    },
  });

  // Same-day conflict detection: the pet's other active procedure on a date blocks that day (clinical safety rule)
  const conflictingAppointment = useMemo(() => {
    if (!appointment) return undefined;
    const otherService = isVaccination ? "spay-neuter" : "vaccination";
    const today = todayStr();
    const targetPetId = String(appointment?.pet_id || appointment?.pets?.id || "").toLowerCase();
    const targetPetName = String(petName || "").toLowerCase().trim();

    return bookedAppointments.find((b) => {
      if (b.service_id !== otherService) return false;
      if (b.status === "cancelled" || b.status === "completed" || b.status === "missed") return false;
      const d = (b.date || "").split("T")[0];
      if (!d || d < today) return false;
      const matchId =
        targetPetId && b.pet_id && String(b.pet_id).toLowerCase() === targetPetId;
      const matchName =
        targetPetName && b.pet_name && String(b.pet_name).toLowerCase().trim() === targetPetName;
      return Boolean(matchId || matchName);
    });
  }, [bookedAppointments, appointment, isVaccination, petName]);

  const conflictDateStr = conflictingAppointment?.date
    ? String(conflictingAppointment.date).split("T")[0]
    : undefined;
  const conflictServiceTitle = isVaccination ? "Spay & Neuter" : "Vaccination";

  // Initialize form state whenever a different appointment is loaded / dialog opens
  useEffect(() => {
    if (!appointment) return;
    const raw = String(appointment.date || "").split("T")[0];
    try {
      const parsed = parseISO(raw);
      setAppointmentDate(isValid(parsed) ? parsed : undefined);
    } catch {
      setAppointmentDate(undefined);
    }
    const { body } = parseAppointmentNotes(appointment.notes);
    setNotes(body);
  }, [appointment]);

  if (!appointment) return null;

  const isUnofficial =
    !appointment.queue_ticket &&
    !["checked-in", "in-consultation", "treatment", "completed", "cancelled", "missed"].includes(
      String(appointment.status || "")
    );

  const isSameDayConflict = Boolean(
    appointmentDate &&
      conflictDateStr &&
      format(appointmentDate, "yyyy-MM-dd") === conflictDateStr
  );

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointmentDate) {
      toast.error("Please pick an available Monday–Friday date");
      return;
    }

    if (isSameDayConflict) {
      toast.error("Same-Day Procedure Conflict", {
        description: `${petName} already has a ${conflictServiceTitle} scheduled on ${conflictDateStr}. Surgery and vaccination must never be performed on the same day.`,
      });
      return;
    }

    // Verify slot availability one last time before saving
    const status = calculateSlotStatus({
      date: appointmentDate,
      service: serviceType,
      bookedAppointments,
      config: slotConfig,
    });
    if (!status.isAvailable) {
      toast.error(
        status.isClosedToday
          ? "Same-day booking is open from 8:00 AM to 5:00 PM (Monday – Friday). Operating hours have ended for today."
          : "Sorry! This date is not available. Please choose another date."
      );
      return;
    }

    setLoading(true);

    const formattedDate = format(appointmentDate, "yyyy-MM-dd");
    // Preserve any contact previously stored in the notes (no longer editable here)
    const storedContact = parseAppointmentNotes(appointment.notes).contact;
    const contactValue = storedContact || "N/A";
    const combinedNotes = notes.trim()
      ? `${notes.trim()} (Contact: ${contactValue})`
      : `Contact: ${contactValue}`;
    const dateChanged = formattedDate !== String(appointment.date || "").split("T")[0];

    try {
      // 1. Update the appointments table (no-op if this booking only exists in service_transactions)
      const { error: apptError } = await supabase
        .from("appointments")
        .update({
          date: formattedDate,
          notes: combinedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", appointmentId);
      if (apptError) {
        console.warn("Appointment update notice:", apptError.message);
      }

      // 2. Update the linked municipal record in service_transactions
      try {
        await supabase
          .from("service_transactions")
          .update({
            date: formattedDate,
            detail: `Scheduled on ${format(appointmentDate, "PPP")}${
              notes.trim() ? ` • Note: ${notes.trim()}` : ""
            }`,
          })
          .or(`reference_id.eq.${appointmentId},id.eq.${appointmentId}`);
      } catch (txErr) {
        console.warn("Transaction update notice:", txErr);
      }

      // 3. Sync localStorage cache
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const updated = local.map((item: any) =>
          item.id === appointmentId || item.reference_id === appointmentId
            ? { ...item, date: formattedDate, notes: combinedNotes }
            : item
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(updated));
      } catch {
        // ignore
      }

      // Invalidate caches so every view refreshes in real time
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots-edit"] });
      queryClient.invalidateQueries({ queryKey: ["user-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("syncvet-appointment-updated"));
      }

      toast.success(
        dateChanged ? "Appointment Rescheduled" : "Appointment Updated",
        {
          description: dateChanged
            ? `${petName}'s ${serviceLabel} booking was moved to ${format(
                appointmentDate,
                "EEEE, MMMM d, yyyy"
              )}.`
            : `${petName}'s ${serviceLabel} booking details were saved.`,
        }
      );

      onUpdated?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Edit appointment error:", err);
      toast.error(err?.message || "Failed to update appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-xl p-5 sm:p-6 bg-background rounded-2xl shadow-xl overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-h-[90vh]"
      >
        <DialogHeader className="border-b pb-3 space-y-1 pr-0 sm:pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary font-bold min-w-0">
              <Pencil className="size-4.5 shrink-0" />
              <DialogTitle className="text-base sm:text-lg truncate">Edit Appointment</DialogTitle>
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                #{String(appointmentId || "").slice(0, 8).toUpperCase()}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="submit"
                form="edit-appointment-form"
                variant="ghost"
                size="icon"
                disabled={loading}
                className={cn(
                  "size-8 rounded-full border border-border/60 transition-all shadow-xs cursor-pointer",
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:scale-105 active:scale-95"
                )}
                title="Save Changes"
                aria-label="Save Changes"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all hover:scale-105 active:scale-95"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <DialogDescription asChild>
            <div className="mt-1.5 flex w-full items-center gap-2.5 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <PetAvatar
                photoUrl={photoUrl}
                species={petSpecies}
                name={petName}
                size="xs"
                className="size-6 shrink-0"
              />
              <span className="min-w-0 flex-1 leading-snug">
                Reschedule or update details for <strong className="text-foreground">{petName}</strong>
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form id="edit-appointment-form" onSubmit={handleUpdate} className="space-y-4 pt-2">
          {/* Read-only booking summary */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-border/70 bg-card/60">
            <div
              className={cn(
                "size-10 rounded-xl flex items-center justify-center shrink-0",
                isVaccination
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-indigo-500/10 text-indigo-600"
              )}
            >
              {isVaccination ? <Syringe className="size-5" /> : <Scissors className="size-5" />}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                <span>{serviceLabel} Booking</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0 h-4",
                    isUnofficial
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/35"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                  )}
                >
                  {isUnofficial ? "UNOFFICIAL" : String(appointment.status || "confirmed").toUpperCase()}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {appointment.location
                    ? String(appointment.location).replace("City Veterinary Office - ", "CVO ")
                    : "CVO Carmen Central Clinic"}
                </span>
              </p>
            </div>
          </div>

          {/* Unofficial reservation reminder */}
          {isUnofficial && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[11px] text-amber-950 dark:text-amber-200">
              <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                This is an unofficial reservation. It stays unofficial after editing — scan the station
                QR code on the day of your booking to join Today&apos;s Clinic Queue.
              </p>
            </div>
          )}

          {/* Date & slot selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 pb-0.5">
              <Label className="text-[10.5px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="size-3.5 text-primary" />
                Appointment Date *
              </Label>
              <Badge
                variant="outline"
                className="text-[9px] font-semibold text-primary border-primary/30 h-auto py-0.5 px-1.5 shrink-0 whitespace-nowrap"
              >
                Mon – Fri • 8AM – 5PM
              </Badge>
            </div>

            <ProcedureDatePicker
              date={appointmentDate}
              setDate={setAppointmentDate}
              service={serviceType}
              bookedAppointments={bookedAppointments}
              conflictDate={conflictDateStr}
              conflictServiceTitle={conflictServiceTitle}
              conflictPetName={petName}
              placeholder="Pick an available weekday"
              config={slotConfig}
            />

            {/* Same-day procedure conflict warning (Veterinary Safety Rule) */}
            {isSameDayConflict && conflictDateStr && (
              <div className="p-3 rounded-xl border border-destructive/50 bg-destructive/10 text-[11px] text-destructive space-y-1 animate-in fade-in-0">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>Same-Day Procedure Conflict</span>
                </div>
                <p className="leading-relaxed">
                  {petName} already has a {conflictServiceTitle} scheduled on {conflictDateStr}.
                  Surgery and vaccination must never be performed on the same day. Please pick
                  another date.
                </p>
              </div>
            )}

            {/* Clinical advisory when picking a date within 7 days of the other procedure */}
            {conflictDateStr &&
              appointmentDate &&
              !isSameDayConflict &&
              Math.abs(
                Math.round(
                  (startOfDay(appointmentDate).getTime() -
                    startOfDay(parseISO(conflictDateStr)).getTime()) /
                    86400000
                )
              ) < 7 && (
                <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    This date is within 7 days of {petName}&apos;s {conflictServiceTitle} booking (
                    {conflictDateStr}). Consider separating the procedures for a safer recovery and
                    accurate vaccine-reaction monitoring.
                  </p>
                </div>
              )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notes / Reason for Visit
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add context, symptoms, or special instructions for the clinic..."
              rows={2}
              className="text-xs sm:text-sm rounded-xl p-3 resize-y min-h-[64px] bg-background"
            />
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}
