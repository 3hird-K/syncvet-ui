"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  Stethoscope,
  Syringe,
  Scissors,
  User,
  ShieldCheck,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCVO } from "@/lib/cvo-context";
import { toast } from "sonner";

interface PetOwnerOutreachCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scannedData: string | null;
  pets: Array<{ id: string; name: string; species: string; breed?: string }>;
  ownerName: string;
}

export function PetOwnerOutreachCheckInDialog({
  open,
  onOpenChange,
  scannedData,
  pets,
  ownerName,
}: PetOwnerOutreachCheckInDialogProps) {
  const { recordFieldOpAttendance } = useCVO();
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("Clinical Consultation");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse scanned URL parameters
  const parsedMeta = (() => {
    if (!scannedData) return null;
    try {
      const url = new URL(scannedData, "https://syncvet.cagayan-de-oro.gov.ph");
      return {
        opId: url.searchParams.get("opId") || "FO-2026-OUTREACH",
        barangay: url.searchParams.get("barangay") || "Canitoan",
        date: url.searchParams.get("date") || "2026-10-30",
        vet: url.searchParams.get("vet") || "Dr. Jeon Jungkook, DVM",
        venue: url.searchParams.get("venue") || "Barangay Covered Court",
      };
    } catch {
      return {
        opId: "FO-2026-OUTREACH",
        barangay: "Canitoan",
        date: "2026-10-30",
        vet: "Dr. Jeon Jungkook, DVM",
        venue: "Barangay Covered Court",
      };
    }
  })();

  useEffect(() => {
    if (pets.length > 0 && !selectedPetId) {
      setSelectedPetId(pets[0].id);
    }
  }, [pets, selectedPetId]);

  const handleSubmit = async () => {
    if (!selectedPetId && pets.length > 0) {
      toast.error("Please select a pet");
      return;
    }
    const chosenPet = pets.find((p) => p.id === selectedPetId) || pets[0] || {
      id: "guest-pet",
      name: "My Companion",
      species: "Dog",
    };

    setIsSubmitting(true);
    try {
      await recordFieldOpAttendance({
        opId: parsedMeta?.opId || "FO-2026-OUTREACH",
        barangay: parsedMeta?.barangay || "Canitoan",
        petId: chosenPet.id,
        petName: chosenPet.name,
        ownerName: ownerName || "Pet Guardian",
        species: chosenPet.species,
        serviceType: selectedService,
        vetName: parsedMeta?.vet,
      });

      toast.success("Attendance Verified & Encounter Logged!", {
        description: `Successfully checked in ${chosenPet.name} for ${selectedService} at Barangay ${parsedMeta?.barangay}. Official encounter recorded in pet profile history.`,
      });

      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to record attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!parsedMeta) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden no-scrollbar">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 bg-muted/20 border-b border-border/70 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Field Operation Check-In
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/10 ml-auto font-mono">
              {parsedMeta.opId}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Official community outreach attendance verification station
          </DialogDescription>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Outreach Location & Vet Card */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-extrabold text-sm">
                Barangay {parsedMeta.barangay} Outreach
              </span>
              <Badge variant="outline" className="text-[9.5px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-bold">
                100% Free CVO
              </Badge>
            </div>

            <div className="space-y-1 text-muted-foreground text-[11px]">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3 text-primary shrink-0" />
                <span>{parsedMeta.venue}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3 text-primary shrink-0" />
                <span>Date: {parsedMeta.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="size-3 text-primary shrink-0" />
                <span>Attending: {parsedMeta.vet}</span>
              </div>
            </div>
          </div>

          {/* Form: Select Pet & Service */}
          <div className="space-y-3 text-xs">
            {pets.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="pet-select" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Heart className="size-3 text-rose-500" />
                  <span>Select Companion Brought Today:</span>
                </Label>
                <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                  <SelectTrigger id="pet-select" className="h-9 text-xs bg-muted/20">
                    <SelectValue placeholder="Choose a registered pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.name} ({p.species} • {p.breed || "Local"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="service-select" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Stethoscope className="size-3 text-primary" />
                <span>Service Received on Site:</span>
              </Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger id="service-select" className="h-9 text-xs bg-muted/20">
                  <SelectValue placeholder="Select primary service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Clinical Consultation" className="text-xs">
                    Clinical Consultation (General Exam & Triage)
                  </SelectItem>
                  <SelectItem value="Mass Anti-Rabies Vaccination" className="text-xs">
                    Mass Anti-Rabies Vaccination
                  </SelectItem>
                  <SelectItem value="Free Spay & Neuter (Kapon)" className="text-xs">
                    Free Spay & Neuter (Kapon) Procedure
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Automatic History Notice */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-0.5">
            <span className="font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
              <span>Instant Digital Encounter Record</span>
            </span>
            <p className="leading-relaxed">
              Confirming attendance instantly adds a verified encounter badge to your pet&apos;s <strong>Clinical Encounters & Consultation History</strong> and increments the official barangay deployment headcount.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="size-3.5" />
              <span>Confirm & Record Presence</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
