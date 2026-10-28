"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Scissors,
  Thermometer,
  Scale,
  Calendar,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Heart,
  Pill,
  Sparkles,
  X,
} from "lucide-react";
import { format, addDays, parseISO, isValid } from "date-fns";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useCVO } from "@/lib/cvo-context";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { QueueEncounter } from "@/app/(dashboard)/consultations/page";

interface CompleteSurgeryDialogProps {
  consultation: QueueEncounter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (updated: QueueEncounter) => void;
}

const SURGERY_PROTOCOLS = [
  { id: "spay_ovh", name: "Ovariohysterectomy (Spay) — Ventral Midline Celiotomy", gender: "Female" },
  { id: "neuter_castration", name: "Orchiectomy / Castration (Neuter) — Prescrotal/Scrotal", gender: "Male" },
  { id: "feline_flank_spay", name: "Feline Flank Ovariohysterectomy (Spay)", gender: "Female" },
  { id: "feline_scrotal_castration", name: "Feline Closed Scrotal Castration (Neuter)", gender: "Male" },
];

const CVO_SURGEONS = [
  "Dr. Elena Santos, DVM (CVO Lead Surgeon)",
  "Dr. Helen Ann P. Tacandong, DVM (CVO Surgeon)",
  "Dr. Sarah Chen, DVM (CVO Surgeon)",
  "Dr. Mark Velez, DVM (CVO Surgeon)",
];

export function CompleteSurgeryDialog({
  consultation,
  open,
  onOpenChange,
  onCompleted,
}: CompleteSurgeryDialogProps) {
  const { addAuditLog } = useCVO();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Pre-surgical clearance
  const [temperatureC, setTemperatureC] = useState("38.2");
  const [weightKg, setWeightKg] = useState("8.5");
  const [fastingVerified, setFastingVerified] = useState(true);
  const [cardiopulmonaryClear, setCardiopulmonaryClear] = useState(true);
  const [eligibilityConfirmed, setEligibilityConfirmed] = useState(true);

  // Surgical details
  const [procedureType, setProcedureType] = useState(SURGERY_PROTOCOLS[0].name);
  const [operatingSurgeon, setOperatingSurgeon] = useState(CVO_SURGEONS[0]);
  const [postCareInstructions, setPostCareInstructions] = useState(
    "Wear Elizabethan collar (E-collar) 24/7 for 7-10 days. Keep surgical incision dry and clean."
  );
  const [surgicalNotes, setSurgicalNotes] = useState("");

  // Follow-up Suture Check: 7 to 10 days later
  const [followUpDate, setFollowUpDate] = useState(() => format(addDays(new Date(), 8), "yyyy-MM-dd"));
  const followUpDisplay = useMemo(() => {
    try {
      const parsed = parseISO(followUpDate);
      if (isValid(parsed)) return format(parsed, "MMMM d, yyyy");
      return followUpDate;
    } catch {
      return followUpDate;
    }
  }, [followUpDate]);

  useEffect(() => {
    if (consultation) {
      if (consultation.vitals?.weightKg && consultation.vitals.weightKg > 0) {
        setWeightKg(String(consultation.vitals.weightKg));
      }
      if (consultation.vitals?.temperatureC && consultation.vitals.temperatureC > 0) {
        setTemperatureC(String(consultation.vitals.temperatureC));
      }
      // Infer female vs male if mentioned or default to female spay
      const breedOrName = (consultation.breed + " " + consultation.petName).toLowerCase();
      if (breedOrName.includes("male") || breedOrName.includes("boy")) {
        setProcedureType(SURGERY_PROTOCOLS[1].name);
      } else {
        setProcedureType(SURGERY_PROTOCOLS[0].name);
      }
    }
  }, [consultation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultation) return;

    if (!fastingVerified) {
      toast.error("Pre-surgical fasting (minimum 8-12 hours) must be confirmed to proceed with surgery safely.");
      return;
    }

    if (!cardiopulmonaryClear) {
      toast.error("Cardiopulmonary clearance is required prior to general anesthesia.");
      return;
    }

    setSubmitting(true);
    const supabase = getPublicSupabaseClient();
    const rawAppointmentId = consultation.id.startsWith("proc-") ? consultation.id.replace("proc-", "") : consultation.id;
    const certNo = `CVO-KAPON-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      // 1. Update Pet Record in Supabase to permanently mark as spayed/neutered
      if (consultation.petId) {
        await supabase
          .from("pets")
          .update({
            is_spayed_neutered: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", consultation.petId);
      }

      // 2. Update appointments table to 'completed' with surgical notes
      const clinicalNotes = `Kapon Surgery Completed (${procedureType}). Operating Surgeon: ${operatingSurgeon}. Suture removal: ${followUpDisplay}.${postCareInstructions ? ` Post-care: ${postCareInstructions}.` : ""}${surgicalNotes ? ` Notes: ${surgicalNotes}.` : ""} Cert #${certNo}.`;

      try {
        await supabase
          .from("appointments")
          .update({
            status: "completed",
            notes: clinicalNotes,
          })
          .eq("id", rawAppointmentId);
      } catch (aptErr) {
        console.warn("Appointments update notice:", aptErr);
      }

      // 3. Update service_transactions
      try {
        await supabase
          .from("service_transactions")
          .update({
            status: "completed",
            detail: `Completed ${procedureType}. Post-op recovery verified. Follow-up: ${followUpDisplay}.`,
          })
          .or(`reference_id.eq.${rawAppointmentId},id.eq.${rawAppointmentId}`);
      } catch (txErr) {
        console.warn("Service transaction update notice:", txErr);
      }

      // 4. Update local storage appointments cache
      try {
        const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
        const updatedLocal = local.map((l: any) =>
          l.id === rawAppointmentId
            ? { ...l, status: "completed", notes: clinicalNotes }
            : l
        );
        localStorage.setItem("syncvet_local_appointments", JSON.stringify(updatedLocal));

        const assignedVets = JSON.parse(localStorage.getItem("syncvet_assigned_vets") || "{}");
        assignedVets[rawAppointmentId] = operatingSurgeon;
        if (consultation.id) assignedVets[consultation.id] = operatingSurgeon;
        if (consultation.encounterNo) assignedVets[consultation.encounterNo] = operatingSurgeon;
        if (consultation.petId) assignedVets[consultation.petId] = operatingSurgeon;
        localStorage.setItem("syncvet_assigned_vets", JSON.stringify(assignedVets));
      } catch {}

      // 5. Log to CVO audit trail
      addAuditLog({
        user: operatingSurgeon,
        role: "Veterinarian",
        action: "Executed Spay & Neuter Surgery",
        entity: "Sterilization",
        recordId: certNo,
        details: `Performed ${procedureType} on ${consultation.petName}. Post-op recovery confirmed. Incision check scheduled for ${followUpDisplay}.`,
      });

      // 7. Invalidate caches
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-queue"] });
      queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
      queryClient.invalidateQueries({ queryKey: ["queue-pets"] });
      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });

      toast.success("Spay & Neuter Surgery Protocol Completed!", {
        description: `${consultation.petName} successfully sterilized (${procedureType}). Record updated to Sterilized / Spayed / Neutered. Follow-up check: ${followUpDisplay}.`,
      });

      const updatedEncounter: QueueEncounter = {
        ...consultation,
        status: "completed",
        vetName: operatingSurgeon,
        treatment: `Performed ${procedureType}`,
        medication: "Post-op analgesia spray & recovery care",
        dosageInstructions: `Incision check and suture assessment on ${followUpDisplay}. ${postCareInstructions}`,
        veterinarianNotes: clinicalNotes,
      };

      onCompleted?.(updatedEncounter);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Surgery protocol completion error:", err);
      toast.error("Failed to complete surgery protocol. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!consultation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 bg-background rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-0 pb-3 border-b border-border/60 !pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Scissors className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <span>Spay & Neuter (Kapon) Record</span>
                  <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/10">
                    Sterilization
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Record surgical details and certify sterilization completion.
                </DialogDescription>
              </div>
            </div>

            {/* Action Buttons: Save button beside the X button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                form="complete-surgery-form"
                size="sm"
                disabled={submitting || !fastingVerified || !cardiopulmonaryClear}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Complete Surgery</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all"
                title="Close"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form id="complete-surgery-form" onSubmit={handleSubmit} className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            {/* ── LEFT COLUMN ── */}
            <div className="space-y-3.5">
              {/* Patient Profile Strip */}
              <div className="px-3.5 py-2 rounded-lg bg-muted/25 border border-border/60 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{consultation.petName}</span>
                  <span className="text-muted-foreground font-medium">
                    ({consultation.species} • {consultation.breed})
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground border-border/60">
                  {consultation.encounterNo}
                </Badge>
              </div>

              {/* SECTION 1: Pre-Surgical Triage & Fasting Clearance */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> 1. Pre-Surgical Clearance & Fasting
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Scale className="size-3 text-muted-foreground" /> Weight (kg) *
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="h-8 text-xs font-mono font-semibold pr-7"
                        required
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground">kg</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                      <Thermometer className="size-3 text-muted-foreground" /> Temperature (°C) *
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        value={temperatureC}
                        onChange={(e) => setTemperatureC(e.target.value)}
                        className="h-8 text-xs font-mono pr-7"
                        required
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground">°C</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1 border-t border-border/50 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fastingVerified}
                      onChange={(e) => setFastingVerified(e.target.checked)}
                      className="size-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-foreground font-medium">
                      Fasting verified (8–12 hrs no food prior to surgery)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={cardiopulmonaryClear}
                      onChange={(e) => setCardiopulmonaryClear(e.target.checked)}
                      className="size-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-foreground">
                      Cardiopulmonary clearance normal (heart rhythm & lungs clear)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eligibilityConfirmed}
                      onChange={(e) => setEligibilityConfirmed(e.target.checked)}
                      className="size-3.5 rounded border-input text-primary focus:ring-primary cursor-pointer"
                    />
                    <span className="text-foreground">
                      Patient fit for surgery (non-pregnant / not in active heat)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="space-y-3.5">
              {/* SECTION 2: Surgical Details & Post-Op Plan */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Scissors className="size-3.5 text-primary" /> 2. Surgical Details & Post-Op Plan
                </span>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Surgical Procedure *</Label>
                  <Select value={procedureType} onValueChange={setProcedureType}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SURGERY_PROTOCOLS.map((p) => (
                        <SelectItem key={p.id} value={p.name} className="text-xs py-1.5 cursor-pointer">
                          {p.name} ({p.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground">Attending Surgeon</Label>
                    <Select value={operatingSurgeon} onValueChange={setOperatingSurgeon}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CVO_SURGEONS.map((vet) => (
                          <SelectItem key={vet} value={vet} className="text-xs py-1.5 cursor-pointer">
                            {vet}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Calendar className="size-3 text-primary" /> Suture Removal Date
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-normal">7–10 days</span>
                    </div>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Post-Care Directives for Owner</Label>
                  <Textarea
                    value={postCareInstructions}
                    onChange={(e) => setPostCareInstructions(e.target.value)}
                    rows={2}
                    className="!text-xs md:!text-xs text-xs md:text-xs leading-normal bg-background min-h-[46px] resize-none py-1.5 px-2.5"
                    placeholder="e.g. Keep incision clean & dry, wear E-collar for 7-10 days"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-foreground">Veterinarian Clinical Notes (Optional)</Label>
                  <Textarea
                    value={surgicalNotes}
                    onChange={(e) => setSurgicalNotes(e.target.value)}
                    rows={2}
                    className="!text-xs md:!text-xs text-xs md:text-xs leading-normal bg-background min-h-[46px] resize-none py-1.5 px-2.5"
                    placeholder="Any surgical findings or observations..."
                  />
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
