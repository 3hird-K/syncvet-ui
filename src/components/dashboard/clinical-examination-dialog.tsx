"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Stethoscope,
  Heart,
  Pill,
  CheckCircle2,
  FileCheck2,
  Calendar,
  User,
  Scale,
  Thermometer,
  ShieldCheck,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { type CVOConsultation } from "@/data/cvo-store";
import { useCVO } from "@/lib/cvo-context";
import { CVO_CLINICAL_SYSTEMS } from "./pet-owner-consultation-dialog";
import { useUser } from "@clerk/nextjs";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";

interface ClinicalExaminationDialogProps {
  consultation: CVOConsultation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updated: CVOConsultation) => void;
}

export function ClinicalExaminationDialog({
  consultation,
  open,
  onOpenChange,
  onSaved,
}: ClinicalExaminationDialogProps) {
  const { updateConsultation, activeRoleView } = useCVO();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  // Vitals
  const [weightKg, setWeightKg] = useState("10");
  const [temperatureC, setTemperatureC] = useState("38.5");
  const [heartRateBpm, setHeartRateBpm] = useState("110");
  const [mucousMembrane, setMucousMembrane] = useState<"Normal (Pink)" | "Pale" | "Congested" | "Jaundiced">("Normal (Pink)");

  // 12 Clinical Systems
  const [observedSigns, setObservedSigns] = useState<{ [category: string]: string[] }>({
    mentation: ["BAR / QAR"],
    eyes: [],
    ears: [],
    mouthTeethGums: [],
    skinCoat: [],
    neurologic: [],
    respiratoryLungs: [],
    cardiacHeart: [],
    gastrointestinal: [],
    abdomen: [],
    urogenital: [],
    musculoskeletal: [],
  });

  // Clinical findings (Matches physical CVO Sheet)
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medication, setMedication] = useState("");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [status, setStatus] = useState<CVOConsultation["status"]>("completed");
  const [attendingVet, setAttendingVet] = useState("Dr. Elena Santos, DVM");
  const [availableVets, setAvailableVets] = useState<string[]>([
    "Dr. Elena Santos, DVM",
    "Dr. Helen Ann P. Tacandong, DVM",
    "Dr. Sarah Chen, DVM",
  ]);

  // Load available vets from database
  useEffect(() => {
    async function loadRegisteredVets() {
      try {
        const supabase = getPublicSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("full_name, role")
          .order("full_name", { ascending: true });

        if (!error && data && data.length > 0) {
          const registered = data
            .filter((u) => {
              const r = (u.role || "").toLowerCase();
              return r.includes("vet") || r.includes("admin");
            })
            .map((u) => u.full_name?.trim())
            .filter(Boolean) as string[];

          if (registered.length > 0) {
            setAvailableVets((prev) => Array.from(new Set([...registered, ...prev])));
          }
        }
      } catch (e) {
        console.warn("Notice loading vets:", e);
      }
    }
    loadRegisteredVets();
  }, []);

  // Sync state whenever consultation changes
  useEffect(() => {
    if (!consultation) return;

    setWeightKg(consultation.vitals?.weightKg?.toString() || "10");
    setTemperatureC(consultation.vitals?.temperatureC?.toString() || "38.5");
    setHeartRateBpm(consultation.vitals?.heartRateBpm?.toString() || "110");
    setMucousMembrane(consultation.vitals?.mucousMembrane || "Normal (Pink)");

    setDiagnosis(
      consultation.diagnosis && !consultation.diagnosis.toLowerCase().includes("pending")
        ? consultation.diagnosis
        : ""
    );
    setTreatment(
      consultation.treatment && !consultation.treatment.toLowerCase().includes("pending")
        ? consultation.treatment
        : ""
    );
    setMedication(
      consultation.medication && !consultation.medication.toLowerCase().includes("pending") && !consultation.medication.toLowerCase().includes("to be prescribed")
        ? consultation.medication
        : ""
    );
    setDosageInstructions(
      consultation.dosageInstructions && !consultation.dosageInstructions.toLowerCase().includes("pending")
        ? consultation.dosageInstructions
        : ""
    );
    setRecommendations(consultation.recommendations || "");
    setFollowUp(Boolean(consultation.followUp));
    if (consultation.followUpDate) {
      const parsed = new Date(consultation.followUpDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const day = parsed.getDay();
      if (!isNaN(parsed.getTime()) && parsed >= today && day !== 0 && day !== 6) {
        setFollowUpDate(parsed);
      } else {
        setFollowUpDate(undefined);
      }
    } else {
      setFollowUpDate(undefined);
    }
    setStatus(consultation.status === "waiting" ? "completed" : consultation.status);

    // Initial systems checklist
    if (consultation.clinicalSystems && Object.keys(consultation.clinicalSystems).length > 0) {
      setObservedSigns(consultation.clinicalSystems as Record<string, string[]>);
    } else {
      // Default to BAR/QAR and empty for newly arrived queue records
      setObservedSigns({
        mentation: ["BAR / QAR"],
        eyes: [],
        ears: [],
        mouthTeethGums: [],
        skinCoat: [],
        neurologic: [],
        respiratoryLungs: [],
        cardiacHeart: [],
        gastrointestinal: [],
        abdomen: [],
        urogenital: [],
        musculoskeletal: [],
      });
    }

    // Vet name priority: existing consultation vet if set, or logged-in vet
    if (consultation.vetName && !consultation.vetName.includes("Queue Assignment")) {
      setAttendingVet(consultation.vetName);
    } else if (user?.fullName) {
      setAttendingVet(user.fullName);
      setAvailableVets((prev) => Array.from(new Set([user.fullName!, ...prev])));
    }
  }, [consultation, user]);

  const toggleSign = (category: string, sign: string) => {
    setObservedSigns((prev) => {
      const current = prev[category] || [];
      if (current.includes(sign)) {
        return { ...prev, [category]: current.filter((s) => s !== sign) };
      } else {
        let next = [...current, sign];
        if (sign !== "Appear Normal" && sign !== "BAR / QAR") {
          next = next.filter((s) => s !== "Appear Normal");
        } else {
          next = [sign];
        }
        return { ...prev, [category]: next };
      }
    });
  };

  const markAllNormal = () => {
    const allNorm: Record<string, string[]> = {};
    CVO_CLINICAL_SYSTEMS.forEach((sys) => {
      allNorm[sys.key] = sys.key === "mentation" ? ["BAR / QAR"] : ["Appear Normal"];
    });
    setObservedSigns(allNorm);
  };

  const clearAllSigns = () => {
    setObservedSigns({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultation) return;

    if (!diagnosis.trim()) {
      toast.error("Please enter a clinical diagnosis.");
      return;
    }

    setLoading(true);

    try {
      const allSymptomsList: string[] = [];
      Object.entries(observedSigns).forEach(([_, signs]) => {
        signs.forEach((s) => allSymptomsList.push(s));
      });
      if (allSymptomsList.length === 0) {
        allSymptomsList.push(consultation.chiefComplaint || "General Examination");
      }

      const updates: Partial<CVOConsultation> = {
        diagnosis: diagnosis.trim(),
        treatment: treatment.trim() || "Standard supportive care",
        medication: medication.trim() || "None prescribed",
        dosageInstructions: dosageInstructions.trim() || "None",
        recommendations: recommendations.trim(),
        followUp,
        followUpDate: followUp && followUpDate ? format(followUpDate, "yyyy-MM-dd") : undefined,
        vetName: attendingVet,
        status,
        clinicalSystems: observedSigns,
        symptoms: allSymptomsList,
        vitals: {
          weightKg: parseFloat(weightKg) || consultation.vitals?.weightKg || 10,
          temperatureC: parseFloat(temperatureC) || consultation.vitals?.temperatureC || 38.5,
          heartRateBpm: parseInt(heartRateBpm) || consultation.vitals?.heartRateBpm || 110,
          mucousMembrane,
        },
      };

      updateConsultation(consultation.id, updates);

      toast.success("Clinical Examination Saved", {
        description: `Encounter #${consultation.encounterNo} updated for ${consultation.petName}. Status: ${status}.`,
      });

      if (onSaved) {
        onSaved({ ...consultation, ...updates });
      }

      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save clinical examination.");
    } finally {
      setLoading(false);
    }
  };

  if (!consultation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto p-5 sm:p-7 bg-background rounded-2xl shadow-2xl pointer-events-auto">
        <DialogHeader className="border-b pb-3.5 pr-10 sm:pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Clinical Examination & Treatment Intake</span>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {consultation.encounterNo}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official CVO Examination Form • Patient: {consultation.petName} ({consultation.species}) • Owner: {consultation.ownerName}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="h-8 text-xs font-semibold rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-consultation">In Consultation</SelectItem>
                  <SelectItem value="treatment">Treatment / In-Clinic</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="waiting">Waiting (Triage)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Patient Overview & Owner Narrative Banner */}
          <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <User className="size-3.5 text-primary" />
                Citizen Owner: {consultation.ownerName} ({consultation.ownerContact || "N/A"}) • Brgy. {consultation.ownerBarangay}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Date: {consultation.date} at {consultation.time}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border/60">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Owner-Reported Symptoms / Chief Complaint:
              </span>
              <p className="font-medium text-foreground text-xs leading-relaxed">
                {consultation.chiefComplaint || "Routine consultation requested."}
              </p>
            </div>
          </div>

          {/* Section 1: Objective Clinical Vitals */}
          <div className="rounded-xl border border-border/70 p-4 bg-card/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Scale className="size-3.5 text-primary" />
              1. Physical Vitals & Body Assessment
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Weight (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  required
                  className="h-8 text-xs rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Temperature (°C) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                  required
                  className="h-8 text-xs rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Heart Rate (bpm)</Label>
                <Input
                  type="number"
                  value={heartRateBpm}
                  onChange={(e) => setHeartRateBpm(e.target.value)}
                  className="h-8 text-xs rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Mucous Membrane</Label>
                <Select value={mucousMembrane} onValueChange={(val: any) => setMucousMembrane(val)}>
                  <SelectTrigger className="h-8 text-xs rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal (Pink)">Normal (Pink)</SelectItem>
                    <SelectItem value="Pale">Pale</SelectItem>
                    <SelectItem value="Congested">Congested</SelectItem>
                    <SelectItem value="Jaundiced">Jaundiced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: 12 Clinical Systems Checklist */}
          <div className="space-y-3 rounded-xl border border-border/70 p-4 bg-card/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ClipboardCheck className="size-3.5 text-blue-500" />
                  2. 12-System Clinical Examination Checklist
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Check all applicable physical findings on this animal patient
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={markAllNormal}
                  className="h-7 text-[10px] font-semibold px-2.5 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                >
                  ✓ Mark All Normal
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearAllSigns}
                  className="h-7 text-[10px] text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                >
                  Clear All
                </Button>
              </div>
            </div>

            {/* Systems Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {CVO_CLINICAL_SYSTEMS.map((sys) => {
                const currentSelections = observedSigns[sys.key] || [];
                const hasAbnormal = currentSelections.some(
                  (s) => s !== "Appear Normal" && s !== "BAR / QAR"
                );
                const isNormal =
                  currentSelections.includes("Appear Normal") || currentSelections.includes("BAR / QAR");

                return (
                  <div
                    key={sys.key}
                    className={cn(
                      "rounded-lg border p-2.5 space-y-1.5 bg-background/70 transition-all",
                      hasAbnormal
                        ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20"
                        : isNormal
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className="flex items-center justify-between border-b border-border/40 pb-1">
                      <span className="font-bold text-[11px] text-foreground tracking-tight">
                        {sys.number}. {sys.title}
                      </span>
                      {hasAbnormal ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold"
                        >
                          {currentSelections.length} flagged
                        </Badge>
                      ) : isNormal ? (
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                          Normal
                        </span>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-1 gap-1 pt-0.5">
                      {sys.options.map((opt) => {
                        const checked = currentSelections.includes(opt);
                        const isNormalOption = opt === "Appear Normal" || opt === "BAR / QAR";

                        return (
                          <label
                            key={opt}
                            className={cn(
                              "flex items-center gap-1.5 p-1 rounded text-[11px] cursor-pointer transition-colors select-none",
                              checked
                                ? isNormalOption
                                  ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold"
                                  : "bg-amber-500/20 text-amber-950 dark:text-amber-100 font-semibold"
                                : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSign(sys.key, opt)}
                              className="size-3.5 rounded accent-primary cursor-pointer shrink-0"
                            />
                            <span className="truncate leading-snug">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Diagnosis & Treatment (Directly from Physical Sheet) */}
          <div className="rounded-xl border border-border/70 p-4 bg-card/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Pill className="size-3.5 text-primary" />
              3. Clinical Diagnosis & Treatment Administered
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Diagnosis *</Label>
                <Input
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Acute Gastroenteritis / Helminthiasis / Healthy"
                  required
                  className="h-8.5 text-xs font-semibold rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Treatment Administered *</Label>
                <Input
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  placeholder="e.g. Fluid rehydration, Deworming oral suspension"
                  required
                  className="h-8.5 text-xs rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prescribed Medication</Label>
                <Input
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  placeholder="e.g. Pyrantel Pamoate 50mg/ml, Metronidazole"
                  className="h-8 text-xs rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Dosage & Instructions</Label>
                <Input
                  value={dosageInstructions}
                  onChange={(e) => setDosageInstructions(e.target.value)}
                  placeholder="e.g. 1 ml PO once, repeat in 14 days"
                  className="h-8 text-xs rounded-lg bg-background"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Recommendations & Follow Up (Directly from Physical Sheet) */}
          <div className="rounded-xl border border-border/70 p-4 bg-card/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-emerald-600" />
              4. Recommendations & Follow-Up
            </h4>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Clinical Recommendations</Label>
              <Textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                placeholder="Dietary instructions, observation precautions, hygiene practices..."
                rows={2}
                className="text-xs rounded-lg p-2.5 bg-background resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1 border-t border-border/50">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground text-xs">
                <input
                  type="checkbox"
                  checked={followUp}
                  onChange={(e) => setFollowUp(e.target.checked)}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
                <span>Follow-Up Required (Schedule Check)</span>
              </label>

              {followUp && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Follow-Up Date</Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Mon – Fri only</span>
                  </div>
                  <DatePicker
                    date={followUpDate}
                    setDate={setFollowUpDate}
                    placeholder="Select follow-up date (Mon – Fri)"
                    className="h-8 text-xs rounded-lg bg-background font-normal"
                    fromDate={new Date()}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const day = date.getDay();
                      // Only available Monday-Friday (exclude past dates, Sundays [0] and Saturdays [6])
                      return date < today || day === 0 || day === 6;
                    }}
                  />
                </div>
              )}
            </div>

            {/* Attending Veterinarian */}
            <div className="pt-2 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Attending Veterinarian / Technician</Label>
                <Select value={attendingVet} onValueChange={setAttendingVet}>
                  <SelectTrigger className="h-8 text-xs rounded-lg bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVets.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t flex flex-row items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8.5 px-3 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8.5 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 rounded-lg cursor-pointer shadow-xs hover:bg-primary/90"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving Clinical Findings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Save Examination & Update Record</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
