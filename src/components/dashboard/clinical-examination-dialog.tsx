"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface RegisteredVet {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export const HELEN_VET: RegisteredVet = {
  id: "helen-tacandong",
  name: "Dr. Helen Ann P. Tacandong, DVM",
  role: "City Veterinarian",
  avatarUrl: "/dr-helen-tacandong.jpg",
};
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
  Lock,
  Clock,
  Save,
  X,
} from "lucide-react";
import { type CVOConsultation } from "@/data/cvo-store";
import { useCVO } from "@/lib/cvo-context";
import { CVO_CLINICAL_SYSTEMS } from "./pet-owner-consultation-dialog";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn, isClinicDateDisabled, getNextAvailableClinicDate } from "@/lib/utils";
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
  const { user, isLoaded: isUserLoaded } = useUser();
  const [loading, setLoading] = useState(false);

  // Fetch current user's database role and profile from Supabase
  const { data: dbCurrentUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("id, role, avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isUserLoaded && !!user?.id,
  });

  const rawEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const isAdminEmail = rawEmail === "dime.neil03@gmail.com";
  const meta = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const currentRole = normalizeSyncVetRole(
    dbCurrentUser?.role ||
    meta?.roleTitle ||
    (isAdminEmail ? "Administrator" : "Pet Owner")
  );
  const isAdmin = isAdminEmail || currentRole === "Administrator" || activeRoleView === "Administrator";
  const isVet = currentRole === "Veterinarian" || activeRoleView === "Veterinarian";

  const currentUserName =
    dbCurrentUser?.full_name?.trim() ||
    user?.fullName?.trim() ||
    user?.username ||
    "Attending Veterinarian";
  const currentUserAvatar = dbCurrentUser?.avatar_url || (isUserLoaded && user?.imageUrl ? user.imageUrl : undefined);

  // Query actual registered veterinarians and staff from database
  const { data: dbVets = [] } = useQuery<RegisteredVet[]>({
    queryKey: ["registered-administering-vets"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, role, avatar_url, email")
          .order("full_name", { ascending: true });

        if (!error && data) {
          return data
            .filter((u) => {
              const r = (u.role || "").toLowerCase();
              return r.includes("vet") || r.includes("admin");
            })
            .map((u) => ({
              id: u.id,
              name: u.full_name?.trim() || u.email?.trim() || "Attending Veterinarian",
              role: u.role || "Veterinarian",
              avatarUrl: u.avatar_url,
              email: u.email,
            }));
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });

  // Combine registered vets from DB with Ms. Helen as primary/default, plus current user
  const allAvailableVets = useMemo(() => {
    const list: RegisteredVet[] = [];

    // Ensure Ms. Helen is always at the top as the default City Veterinarian
    const dbHelen = dbVets.find((v) =>
      v.name.toLowerCase().includes("helen") || (v.email && v.email.toLowerCase().includes("helen"))
    );
    list.push({
      id: dbHelen?.id || HELEN_VET.id,
      name: dbHelen?.name || HELEN_VET.name,
      role: dbHelen?.role || HELEN_VET.role,
      avatarUrl: dbHelen?.avatarUrl || HELEN_VET.avatarUrl,
      email: dbHelen?.email || HELEN_VET.email,
    });

    // Add other registered vets from Supabase DB (excluding duplicate Helen and any legacy dummy names)
    for (const v of dbVets) {
      const lowerName = v.name.toLowerCase();
      if (
        !lowerName.includes("helen") &&
        !lowerName.includes("elena santos") &&
        !lowerName.includes("sarah chen") &&
        !(v.email && v.email.toLowerCase().includes("helen")) &&
        !list.some((item) => item.id === v.id || item.name.toLowerCase() === lowerName)
      ) {
        list.push(v);
      }
    }

    // Include logged-in user if vet or admin and not already in list
    if (currentUserName) {
      const alreadyInList = list.some(
        (v) => v.name.toLowerCase() === currentUserName.toLowerCase() || (user?.id && v.id === user.id)
      );
      if (!alreadyInList) {
        list.push({
          id: user?.id || "current-user",
          name: currentUserName,
          role: isVet ? "Veterinarian" : "Administrator",
          avatarUrl: currentUserAvatar,
          email: user?.primaryEmailAddress?.emailAddress,
        });
      }
    }

    return list;
  }, [dbVets, currentUserName, isVet, currentUserAvatar, user]);

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
  const [attendingVet, setAttendingVet] = useState("");

  // Compute active vet object for avatar and role display
  const selectedVetObj = useMemo(() => {
    if (!isAdmin && isVet && currentUserName) {
      return (
        allAvailableVets.find((v) => v.name.toLowerCase() === currentUserName.toLowerCase()) || {
          id: user?.id || "current-vet",
          name: currentUserName,
          role: "Veterinarian",
          avatarUrl: currentUserAvatar,
        }
      );
    }

    if (!attendingVet) return null;
    const targetName = attendingVet.toLowerCase();
    return (
      allAvailableVets.find((v) => v.name.toLowerCase() === targetName) ||
      allAvailableVets.find((v) => targetName.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(targetName)) ||
      null
    );
  }, [allAvailableVets, attendingVet, isAdmin, isVet, currentUserName, currentUserAvatar, user]);

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
    setStatus(consultation.status || "in-consultation");

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

    // Vet name priority: If veterinarian role, locked to current user. If admin, consultation vet if recognized, else empty.
    if (!isAdmin && isVet && currentUserName) {
      setAttendingVet(currentUserName);
    } else if (isAdmin) {
      if (
        consultation.vetName &&
        !consultation.vetName.includes("Queue Assignment") &&
        !consultation.vetName.includes("Attending CVO Vet") &&
        !consultation.vetName.toLowerCase().includes("elena santos") &&
        (consultation.vetName.toLowerCase().includes("helen") ||
          allAvailableVets.some((v) => v.name.toLowerCase() === consultation.vetName?.toLowerCase()))
      ) {
        setAttendingVet(consultation.vetName);
      } else {
        setAttendingVet("");
      }
    } else if (currentUserName) {
      setAttendingVet(currentUserName);
    }
  }, [consultation, user, isAdmin, isVet, currentUserName, allAvailableVets]);

  // Enforce role assignment whenever dialog opens
  useEffect(() => {
    if (open) {
      if (!isAdmin && isVet && currentUserName) {
        setAttendingVet(currentUserName);
      }
    }
  }, [open, isAdmin, isVet, currentUserName]);

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

  const canSubmit = useMemo(() => {
    const hasWeight = Boolean(weightKg && Number(weightKg) > 0);
    const hasTemp = Boolean(temperatureC && Number(temperatureC) > 0);
    const hasDiag = Boolean(diagnosis && diagnosis.trim().length > 0);
    const hasTreat = Boolean(treatment && treatment.trim().length > 0);
    const hasFollowUpDate = !followUp || Boolean(followUpDate);
    const hasVet = Boolean((!isAdmin && isVet && currentUserName) || attendingVet);
    return hasWeight && hasTemp && hasDiag && hasTreat && hasFollowUpDate && hasVet;
  }, [weightKg, temperatureC, diagnosis, treatment, followUp, followUpDate, isAdmin, isVet, currentUserName, attendingVet]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultation) return;

    if (!canSubmit) {
      toast.error("Required fields incomplete", {
        description: "Please fill in Weight, Temperature, Diagnosis, and Treatment Administered.",
      });
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
        vetName: (!isAdmin && isVet && currentUserName) ? currentUserName : (attendingVet || ""),
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
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-3xl lg:max-w-4xl w-[96vw] max-h-[90vh] p-0 flex flex-col bg-background rounded-2xl shadow-2xl border border-border pointer-events-auto overflow-hidden"
      >
        {/* Pinned Top Header */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-b bg-card/60 backdrop-blur-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Stethoscope className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 truncate">
                <span>Clinical Examination & Treatment Intake</span>
                <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                  {consultation.encounterNo}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground truncate">
                Official CVO Examination Form • Patient: {consultation.petName} ({consultation.species}) • Owner: {consultation.ownerName}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "hidden sm:inline-flex text-xs font-bold capitalize px-2.5 py-1",
                status === "completed" && "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
                status === "treatment" && "bg-purple-500/15 text-purple-600 border-purple-500/30",
                status === "in-consultation" && "bg-blue-500/15 text-blue-600 border-blue-500/30",
                status === "waiting" && "bg-amber-500/15 text-amber-600 border-amber-500/30"
              )}
            >
              {status.replace("-", " ")}
            </Badge>

            {/* Save Icon Button beside Close (X) Icon */}
            <button
              type="submit"
              form="clinical-examination-form"
              disabled={!canSubmit || loading}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border shadow-xs transition-all",
                canSubmit && !loading
                  ? "bg-primary text-primary-foreground border-primary/40 hover:bg-primary/90 hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  : "bg-muted/60 text-muted-foreground/40 border-border/60 cursor-not-allowed opacity-50"
              )}
              title={
                !canSubmit
                  ? "Please fill in all required fields (*Weight, *Temp, *Diagnosis, *Treatment) to save"
                  : "Save Examination & Update Record"
              }
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              <span className="sr-only">Save Examination & Update Record</span>
            </button>

            {/* Close Button */}
            <DialogClose asChild>
              <button
                type="button"
                className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
                <span className="sr-only">Close</span>
              </button>
            </DialogClose>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4">
          <form id="clinical-examination-form" onSubmit={handleSave} className="space-y-4 pb-2">
          {/* Update Encounter Lifecycle */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                Update Encounter Lifecycle
              </Label>
              <span className="text-[11px] text-muted-foreground font-medium">
                Current Status: <span className="font-bold text-foreground capitalize">{status.replace("-", " ")}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(["waiting", "in-consultation", "treatment", "completed"] as const).map((st) => {
                const isActive = status === st;
                return (
                  <Button
                    key={st}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 text-xs font-bold capitalize cursor-pointer rounded-lg transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                        : "bg-background text-foreground hover:bg-muted/70 border-border/70"
                    )}
                    onClick={() => {
                      setStatus(st);
                      updateConsultation(consultation.id, { status: st });
                      toast.success(`Encounter #${consultation.encounterNo} updated`, {
                        description: `Status changed to ${st.replace("-", " ")}.`,
                      });
                    }}
                  >
                    {st.replace("-", " ")}
                  </Button>
                );
              })}
            </div>
          </div>
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
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFollowUp(checked);
                    if (checked && (!followUpDate || isClinicDateDisabled(followUpDate))) {
                      setFollowUpDate(getNextAvailableClinicDate());
                    }
                  }}
                  className="size-4 rounded accent-primary cursor-pointer"
                />
                <span>Follow-Up Required (Schedule Check)</span>
              </label>

              {followUp && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Follow-Up Date</Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Mon – Fri, 8 AM – 5 PM only {new Date().getHours() >= 17 ? "(Today closed)" : ""}
                    </span>
                  </div>
                  <DatePicker
                    date={followUpDate}
                    setDate={setFollowUpDate}
                    placeholder="Select follow-up date (Mon – Fri)"
                    className="h-8 text-xs rounded-lg bg-background font-normal"
                    disabled={isClinicDateDisabled}
                  />
                </div>
              )}
            </div>

            {/* Attending Veterinarian */}
            <div className="pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Attending Veterinarian / Technician</Label>
                  {!isAdmin ? (
                    <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground bg-muted/40 border-border/60 gap-1 px-1.5 py-0 h-4">
                      <Lock className="size-2.5 text-muted-foreground" />
                      Locked to You
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      Default: Ms. Helen (City Vet)
                    </span>
                  )}
                </div>

                {!isAdmin ? (
                  <div
                    className="h-9 px-2.5 rounded-lg border border-border/70 bg-muted/30 flex items-center justify-between text-xs"
                    title="As a Veterinarian, this record is locked to you and cannot be reassigned."
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      <Avatar className="size-5 shrink-0 border border-primary/20">
                        {selectedVetObj?.avatarUrl ? (
                          <AvatarImage src={selectedVetObj.avatarUrl} alt={selectedVetObj.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                          {(selectedVetObj?.name || currentUserName || "VT").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground truncate">
                        {selectedVetObj?.name || currentUserName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        ({selectedVetObj?.role || "Veterinarian"})
                      </span>
                    </div>
                    <Lock className="size-3 text-muted-foreground/60 shrink-0 ml-1.5" />
                  </div>
                ) : (
                  <Select value={attendingVet} onValueChange={setAttendingVet}>
                    <SelectTrigger className="h-9 text-xs rounded-lg bg-background w-full">
                      <div className="flex items-center gap-2 truncate">
                        {selectedVetObj ? (
                          <>
                            <Avatar className="size-5 shrink-0 border border-primary/20">
                              {selectedVetObj.avatarUrl ? (
                                <AvatarImage src={selectedVetObj.avatarUrl} alt={selectedVetObj.name} className="object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                                {selectedVetObj.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold text-foreground text-xs truncate">
                              {selectedVetObj.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              ({selectedVetObj.role})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select Attending Veterinarian</span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="z-[90]">
                      {allAvailableVets.map((v) => (
                        <SelectItem key={v.id || v.name} value={v.name} className="text-xs cursor-pointer py-1.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="size-5 shrink-0 border border-primary/20">
                              {v.avatarUrl ? (
                                <AvatarImage src={v.avatarUrl} alt={v.name} className="object-cover" />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
                                {v.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-semibold text-foreground">{v.name}</span>
                              <span className="text-[10px] text-muted-foreground">({v.role})</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
