"use client";

import { useState } from "react";
import { Plus, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCVO } from "@/lib/cvo-context";
import { cvoBarangays, type CVOAnimalControlCase } from "@/data/cvo-store";
import { toast } from "sonner";

export function NewAnimalControlDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAnimalControlCase } = useCVO();

  const [animalDescription, setAnimalDescription] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat" | "Livestock">("Dog");
  const [breedEstimate, setBreedEstimate] = useState("Aspin (Native Cross)");
  const [color, setColor] = useState("Brown with white chest");
  const [estimatedAge, setEstimatedAge] = useState("2 - 3 years");
  const [gender, setGender] = useState<"Male" | "Female" | "Unknown">("Male");
  const [barangay, setBarangay] = useState("Carmen");
  const [specificLocation, setSpecificLocation] = useState("");
  const [reason, setReason] = useState<
    "Stray Roaming" | "Rabies Observation (Bite Incident)" | "Animal Cruelty Rescue" | "Public Safety Complaint"
  >("Stray Roaming");
  const [intakeOfficer, setIntakeOfficer] = useState("Officer Mark Velez");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalDescription || !specificLocation) {
      toast.error("Please fill in Animal Description and Specific Location");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      const timeStr = new Intl.DateTimeFormat("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

      const c = addAnimalControlCase({
        animalDescription,
        species,
        breedEstimate,
        color,
        estimatedAge,
        gender,
        dateCaptured: today,
        captureTime: timeStr,
        barangay,
        specificLocation,
        reason,
        impoundingFacility: "CVO Animal Impounding Facility — Brgy. Agusan",
        intakeOfficer,
        status: "impounded",
        holdingDaysElapsed: 0,
        maxHoldingDays: reason.includes("Bite") ? 14 : 5,
        timeline: [
          {
            timestamp: `${today} ${timeStr}`,
            stage: "Intake & Apprehension",
            officer: intakeOfficer,
            notes: notes || `Humane apprehension in Barangay ${barangay}. Admitted for ${reason}.`,
          },
        ],
      });

      setLoading(false);
      setOpen(false);
      toast.success("Impound Case Logged", {
        description: `Case ${c.caseId} recorded at CVO Impounding Facility.`,
      });

      setAnimalDescription("");
      setSpecificLocation("");
      setNotes("");
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
          <Plus className="size-3.5" /> Log Animal Intake
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <ShieldAlert className="size-5" />
              <DialogTitle className="text-lg font-bold">Animal Control & Impound Intake</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Record stray apprehension, rabies bite observation quarantine, or animal welfare rescue cases.
            </DialogDescription>
          </DialogHeader>

          {/* Reason & Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Reason for Intake *</Label>
              <Select value={reason} onValueChange={(v: any) => setReason(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stray Roaming">Stray Roaming (Public Space)</SelectItem>
                  <SelectItem value="Rabies Observation (Bite Incident)">Rabies Observation (Bite Incident - 14 Days)</SelectItem>
                  <SelectItem value="Animal Cruelty Rescue">Animal Cruelty Rescue / Neglect</SelectItem>
                  <SelectItem value="Public Safety Complaint">Public Safety Complaint / Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Barangay Apprehended</Label>
              <Select value={barangay} onValueChange={setBarangay}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {cvoBarangays.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Specific Apprehension Location *</Label>
            <Input
              value={specificLocation}
              onChange={(e) => setSpecificLocation(e.target.value)}
              placeholder="e.g. Near Carmen Market, Vamenta Blvd / Corrales Ave"
              required
              className="h-8 text-xs"
            />
          </div>

          {/* Animal Physical Description */}
          <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Animal Identification & Physical Description
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Species</Label>
                <Select value={species} onValueChange={(v: any) => setSpecies(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                    <SelectItem value="Livestock">Livestock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Gender</Label>
                <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimated Age</Label>
                <Input
                  value={estimatedAge}
                  onChange={(e) => setEstimatedAge(e.target.value)}
                  placeholder="e.g. 2 years"
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Animal Description / Marks *</Label>
              <Input
                value={animalDescription}
                onChange={(e) => setAnimalDescription(e.target.value)}
                placeholder="e.g. Adult brown Aspin, black muzzle, white left paw, red nylon rope around neck"
                required
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Officer & Intake Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Intake Officer</Label>
              <Select value={intakeOfficer} onValueChange={setIntakeOfficer}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Officer Mark Velez">Officer Mark Velez</SelectItem>
                  <SelectItem value="Officer Jay Ramos">Officer Jay Ramos</SelectItem>
                  <SelectItem value="Dr. Elena Santos, DVM">Dr. Elena Santos, DVM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Impound Facility</Label>
              <Input
                disabled
                value="CVO Impounding Facility — Brgy. Agusan"
                className="h-8 text-xs bg-muted/40"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Intake Notes / Health State</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Physical condition, aggressive demeanor, presence of wounds, or collar tags..."
              className="text-xs min-h-[60px]"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save Case Record"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
