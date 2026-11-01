"use client";

import { useState, useEffect } from "react";
import { Loader2, Edit3, CheckCircle2, FileCheck2, Stethoscope, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { useCVO } from "@/lib/cvo-context";
import { cn } from "@/lib/utils";
import { type CVOConsultation } from "@/data/cvo-store";

interface EditPetOwnerConsultationDialogProps {
  consultation: CVOConsultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditPetOwnerConsultationDialog({
  consultation,
  open,
  onOpenChange,
  onUpdated,
}: EditPetOwnerConsultationDialogProps) {
  const [loading, setLoading] = useState(false);
  const { updateConsultation } = useCVO();

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [services, setServices] = useState({
    healthy: true,
    vitamins: true,
    deworming: true,
    farmManagement: false,
    consultation: true,
  });

  useEffect(() => {
    if (!consultation) return;
    setChiefComplaint(consultation.chiefComplaint || "");
    setContactNumber(consultation.ownerContact || "");
    if (consultation.servicesRequested) {
      setServices({
        healthy: Boolean(consultation.servicesRequested.healthy),
        vitamins: Boolean(consultation.servicesRequested.vitamins),
        deworming: Boolean(consultation.servicesRequested.deworming),
        farmManagement: Boolean(consultation.servicesRequested.farmManagement),
        consultation: Boolean(consultation.servicesRequested.consultation),
      });
    }
  }, [consultation]);

  if (!consultation) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      toast.error("Please provide a reason or observed symptoms.");
      return;
    }

    setLoading(true);

    try {
      updateConsultation(consultation.id, {
        chiefComplaint: chiefComplaint.trim(),
        symptoms: [chiefComplaint.trim()],
        ownerContact: contactNumber.trim(),
        servicesRequested: services,
        veterinarianNotes: `Owner updated: ${chiefComplaint.trim()}`,
      });

      toast.success("Consultation Request Updated", {
        description: `Encounter #${consultation.encounterNo} has been updated.`,
      });

      if (onUpdated) onUpdated();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to update consultation request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg p-5 sm:p-6 bg-background rounded-2xl shadow-xl overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-h-[90vh]">
        <DialogHeader className="border-b pb-3 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-primary font-bold min-w-0">
              <Edit3 className="size-4.5 shrink-0" />
              <DialogTitle className="text-base sm:text-lg truncate">Edit Consultation Request</DialogTitle>
              <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                #{consultation.encounterNo}
              </Badge>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="submit"
                form="edit-pet-owner-consultation-form"
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
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </div>

          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
            <PetAvatar species={consultation.species} name={consultation.petName} size="xs" className="size-5 shrink-0" />
            <span>Update reason for visit or requested services for <strong className="text-foreground">{consultation.petName}</strong> ({consultation.species})</span>
          </DialogDescription>
        </DialogHeader>

        <form id="edit-pet-owner-consultation-form" onSubmit={handleUpdate} className="space-y-4 pt-2">
          {/* Services Requested */}
          <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-card/60">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-emerald-600" />
              Services Requested
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
              {[
                { id: "healthy", label: "HEALTHY" },
                { id: "vitamins", label: "VITAMINS" },
                { id: "deworming", label: "DEWORMING" },
                { id: "farmManagement", label: "FARM MGMT" },
                { id: "consultation", label: "CONSULTATION" },
              ].map((svc) => (
                <label
                  key={svc.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                    services[svc.id as keyof typeof services]
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/60 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(services[svc.id as keyof typeof services])}
                    onChange={(e) =>
                      setServices({ ...services, [svc.id]: e.target.checked })
                    }
                    className="size-3.5 rounded accent-primary cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] truncate">{svc.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Chief Complaint / Symptoms */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-primary" />
              Observed Symptoms & Reason for Visit *
            </Label>
            <Textarea
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe your pet's current symptoms, condition, or reason for visit..."
              rows={3}
              required
              className="text-xs sm:text-sm rounded-xl p-3 resize-y min-h-[75px] bg-background"
            />
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Contact Number</Label>
            <Input
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="09XX-XXX-XXXX"
              className="h-8.5 text-xs rounded-xl bg-background"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
