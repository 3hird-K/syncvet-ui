"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Stethoscope,
  Plus,
  Loader2,
  Calendar,
  AlertCircle,
  FileCheck2,
  Heart,
  CheckCircle2,
  Syringe,
  PawPrint,
  User,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, isClinicDateDisabled, getNextAvailableClinicDate, isConsultationOverdue } from "@/lib/utils";
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
import { toast } from "sonner";
import { cvoBarangays } from "@/data/cvo-store";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { PetPassportHeroCard } from "@/components/dashboard/pet-passport-hero-card";
import { checkInPetOwnerToQueue, getTodayDateStr } from "@/lib/cvo-queue";

export const CVO_CLINICAL_SYSTEMS = [
  {
    key: "mentation",
    number: 1,
    title: "MENTATION/ATTITUDE",
    options: ["BAR / QAR", "Aggressive", "Depressed", "Anxious/Fearful"],
  },
  {
    key: "eyes",
    number: 2,
    title: "EYES",
    options: [
      "Appear Normal",
      "Cataract L / R",
      "Discharge L / R",
      "Corneal Ulcer/Lesion L / R",
      "Inflamed L / R",
      "Eyelid Lesion/Growth L / R",
      "Infection L / R",
      "Other Eye Abnormality",
    ],
  },
  {
    key: "ears",
    number: 3,
    title: "EARS",
    options: [
      "Appear Normal",
      "Mites",
      "Inflamed L / R",
      "Lesions/Growths L / R",
      "Excessive Debris L / R",
      "Excessive Hair L / R",
      "Other Ear Abnormality",
    ],
  },
  {
    key: "mouthTeethGums",
    number: 4,
    title: "MOUTH/TEETH/GUMS",
    options: [
      "Appear Normal",
      "Ulcers/Growths",
      "Broken Tooth",
      "Gingivitis: Mild",
      "Gingivitis: Moderate",
      "Gingivitis: Severe",
      "Calculus: Mild",
      "Calculus: Moderate",
      "Calculus: Severe",
      "Other Mouth Abnormality",
    ],
  },
  {
    key: "skinCoat",
    number: 5,
    title: "SKIN/COAT",
    options: [
      "Appear Normal",
      "Rash/Dermatitis",
      "Parasites",
      "Dry Coat/Dander",
      "Alopecia",
      "Matted Hair",
      "Redness",
      "Lumps/Tumors",
      "Lesions/Ulcers",
      "Other Skin Abnormality",
    ],
  },
  {
    key: "neurologic",
    number: 6,
    title: "NEUROLOGIC",
    options: [
      "Appear Normal",
      "Paresis/Paralysis",
      "Seizure/Tremor",
      "Ataxia/Gait Abnormality",
      "Circling/Head Tilt",
      "Other Neurologic Abnormality",
    ],
  },
  {
    key: "respiratoryLungs",
    number: 7,
    title: "RESPIRATORY/LUNGS",
    options: [
      "Appear Normal",
      "Rapid Breathing",
      "Nasal Discharge",
      "Breathing Difficulty",
      "Congestion",
      "Coughing",
      "Abnormal sound",
      "Other Respiratory Abnormality",
    ],
  },
  {
    key: "cardiacHeart",
    number: 8,
    title: "CARDIAC/HEART",
    options: [
      "Appear Normal",
      "Abnormal Rhythm",
      "Heart Murmur",
      "Other Cardiac Abnormality",
    ],
  },
  {
    key: "gastrointestinal",
    number: 9,
    title: "GASTROINTESTINAL",
    options: [
      "Appear Normal",
      "Abnormal feces",
      "Parasites",
      "Diarrhea",
      "Vomiting",
      "Inappetence",
      "Other GI Abnormality",
    ],
  },
  {
    key: "abdomen",
    number: 10,
    title: "ABDOMEN",
    options: [
      "Appear Normal",
      "Painful Palpation",
      "Enlarged Organ",
      "Mass / Growth",
      "Fluid",
      "Other Abdominal Abnormality",
    ],
  },
  {
    key: "urogenital",
    number: 11,
    title: "UROGENITAL",
    options: [
      "Appear Normal",
      "Abnormal Testicle L / R",
      "Genital Discharge",
      "Abnormal Prostate",
      "Estrus/Pregnancy",
      "Mammary Gland Abnormality",
      "Other Urogenital Abnormality",
    ],
  },
  {
    key: "musculoskeletal",
    number: 12,
    title: "MUSCULOSKELETAL",
    options: [
      "Appear Normal",
      "Lameness (LF)",
      "Lameness (RF)",
      "Lameness (LH)",
      "Lameness (RH)",
      "Pain",
      "Swelling",
      "Other Musculoskeletal Abnormality",
    ],
  },
];

export interface PetItem {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  gender?: string;
  color?: string;
  weightKg?: number;
  photo_url?: string | null;
}

interface PetOwnerConsultationDialogProps {
  pets?: any[];
  initialPet?: any;
  ownerProfile?: {
    name: string;
    contact: string;
    barangay: string;
  };
  trigger?: React.ReactNode;
  embedded?: boolean;
  onSuccess?: () => void;
  onCancel?: () => void;
  hidePetSelector?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export function PetOwnerConsultationDialog({
  pets = [],
  initialPet,
  ownerProfile,
  trigger,
  embedded = false,
  onSuccess,
  onCancel,
  hidePetSelector = false,
  onValidationChange,
}: PetOwnerConsultationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addConsultation, consultations } = useCVO();

  const firstPet = initialPet || (pets.length > 0 ? pets[0] : undefined);
  const [selectedPetId, setSelectedPetId] = useState<string>(firstPet?.id || (pets.length > 0 ? pets[0].id : ""));

  // Only initialize selectedPetId when dialog opens or in embedded mode, or when initialPet prop explicitly changes
  useEffect(() => {
    if (open || embedded) {
      if (initialPet?.id) {
        setSelectedPetId(initialPet.id);
      } else if (pets.length > 0 && (!selectedPetId || !pets.some((p) => String(p.id) === String(selectedPetId)))) {
        setSelectedPetId(pets[0].id);
      }
    }
  }, [open, embedded, initialPet?.id]);

  // Selected registered pet object (if any)
  const selectedPet = useMemo(() => {
    return (
      pets.find((p) => String(p.id) === String(selectedPetId)) ||
      pets.find((p) => p.name?.toLowerCase() === selectedPetId?.toLowerCase()) ||
      (pets.length > 0 ? pets[0] : undefined)
    );
  }, [pets, selectedPetId]);

  // Owner details (defaults from user profile)
  const defaultOwnerName = ownerProfile?.name || "Kyle Urgentrouse";
  const defaultOwnerContact = ownerProfile?.contact || "09918552236";
  const defaultOwnerBarangay = ownerProfile?.barangay || "Carmen";

  const [ownerName, setOwnerName] = useState(defaultOwnerName);
  const [ownerContact, setOwnerContact] = useState(defaultOwnerContact);
  const [ownerBarangay, setOwnerBarangay] = useState(defaultOwnerBarangay);

  useEffect(() => {
    if (ownerProfile?.name) setOwnerName(ownerProfile.name);
    if (ownerProfile?.contact) setOwnerContact(ownerProfile.contact);
    if (ownerProfile?.barangay) setOwnerBarangay(ownerProfile.barangay);
  }, [ownerProfile?.name, ownerProfile?.contact, ownerProfile?.barangay]);

  // Custom pet input states (only used if "+ Other / Unregistered Pet" is chosen)
  const [customPetName, setCustomPetName] = useState("");
  const [customSpecies, setCustomSpecies] = useState<"Dog" | "Cat" | "Livestock">("Dog");
  const [customBreed, setCustomBreed] = useState("");
  const [customAge, setCustomAge] = useState("1 yr");
  const [customGender, setCustomGender] = useState<"M" | "F">("M");
  const [customWeightKg, setCustomWeightKg] = useState("10");
  const [customColor, setCustomColor] = useState("Standard");

  const [dateOfBirth, setDateOfBirth] = useState("Jan 15, 2025");
  const [weightAssessment, setWeightAssessment] = useState<"Ideal Weight" | "Overweight" | "Underweight">("Ideal Weight");
  const [bodyConditionScore, setBodyConditionScore] = useState<number>(5);

  // Prevent duplicate consultation requests: check if selected pet already has an active consultation in queue
  const existingActiveConsultation = useMemo(() => {
    const targetPetId = (selectedPet?.id || "").toLowerCase().trim();
    const targetPetName = (selectedPet?.name || "").toLowerCase().trim();

    if (!targetPetName && !targetPetId) return null;

    return consultations.find((c) => {
      // Active queue statuses: waiting, in-consultation, treatment (exclude overdue schedules)
      const isOverdue = isConsultationOverdue(c.date, c.status);
      const isActive = (c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment") && !isOverdue;
      if (!isActive) return false;

      const cPetId = (c.petId || "").toLowerCase().trim();
      const cPetName = (c.petName || "").toLowerCase().trim();

      const isSamePet =
        (targetPetId && cPetId && targetPetId === cPetId) ||
        (targetPetName && cPetName && targetPetName === cPetName);

      return isSamePet;
    });
  }, [consultations, selectedPet]);

  const isConsultationAlreadyScheduled = Boolean(existingActiveConsultation);

  const handleSelectPet = (id: string) => {
    setSelectedPetId(id);
  };

  // Step 2: Services requested
  const [services, setServices] = useState({
    healthy: true,
    vitamins: true,
    deworming: true,
    farmManagement: false,
    consultation: true,
  });

  // Step 3: Preferred consultation appointment date (Monday-Friday, 8 AM - 5 PM only)
  const getDefaultConsultationDate = () => {
    return getNextAvailableClinicDate();
  };

  const [consultationDate, setConsultationDate] = useState<Date | undefined>(getDefaultConsultationDate());

  // Step 4: Symptoms / Patient History narrative observed by pet owner
  const [chiefComplaint, setChiefComplaint] = useState("");

  const isFormValid = Boolean(
    !loading &&
    pets.length > 0 &&
    !isConsultationAlreadyScheduled &&
    Boolean(consultationDate) &&
    chiefComplaint.trim().length > 0 &&
    (hidePetSelector ? true : Boolean(selectedPet))
  );

  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPet) {
      toast.error("Please register and select a pet before requesting a consultation.");
      return;
    }

    const effectivePetName = selectedPet.name;
    const effectiveSpecies = selectedPet.species?.toLowerCase() === "cat" ? "Cat" : "Dog";
    const effectiveBreed = selectedPet.breed || (effectiveSpecies === "Cat" ? "Puspin" : "Aspin");
    const effectiveGender = selectedPet.gender === "Female" || selectedPet.gender === "F" ? "F" : "M";
    const effectiveAge = selectedPet.age || "1 yr";
    const effectiveWeightKg = selectedPet.weightKg
      ? selectedPet.weightKg.toString()
      : (selectedPet as any).weight_kg
      ? (selectedPet as any).weight_kg.toString()
      : "10";
    const effectiveColor = selectedPet.color || "Standard";

    if (isConsultationAlreadyScheduled && existingActiveConsultation) {
      toast.error("Duplicate Consultation Blocked", {
        description: `${effectivePetName} already has an active consultation (Encounter #${existingActiveConsultation.encounterNo}) scheduled for ${existingActiveConsultation.date}. Multiple active consultations cannot be booked.`,
      });
      return;
    }
    if (!ownerName.trim()) {
      toast.error("Please provide owner name.");
      return;
    }

    if (!consultationDate) {
      toast.error("Please select a preferred consultation date (Monday to Friday).");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const scheduledDateStr = format(consultationDate, "yyyy-MM-dd");
      const timeStr = new Intl.DateTimeFormat("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

      const newRecord = addConsultation({
        petId: selectedPet ? selectedPet.id : `pet-${effectivePetName.toLowerCase().replace(/\s+/g, "-")}`,
        petName: effectivePetName,
        species: effectiveSpecies as any,
        breed: effectiveBreed,
        ownerName: ownerName.trim(),
        ownerContact: ownerContact.trim(),
        ownerBarangay,
        vetName: "Attending CVO Veterinarian (Queue Assignment)",
        date: scheduledDateStr,
        time: timeStr,
        chiefComplaint: chiefComplaint.trim() || "Consultation Request",
        symptoms: [chiefComplaint.trim() || "Consultation Request"],
        vitals: {
          weightKg: parseFloat(effectiveWeightKg) || 12,
          temperatureC: 38.5,
          heartRateBpm: 110,
          mucousMembrane: "Normal (Pink)",
        },
        diagnosis: "Pending Clinical Examination",
        treatment: "Pending attending veterinarian",
        medication: "To be prescribed by attending veterinarian",
        dosageInstructions: "Pending examination",
        status: "waiting",
        serviceType: "Field Treatment/Consultation",
        veterinarianNotes: `Owner reported: ${chiefComplaint}`,
        noOfHeads: 1,
        dateOfBirth,
        age: effectiveAge,
        gender: effectiveGender,
        color: effectiveColor,
        weightAssessment,
        bodyConditionScore,
        servicesRequested: services,
        clinicalSystems: {},
        recommendations: "",
        followUp: false,
      });

      // Include consultation in today's clinic queue if scheduled for today (without consuming procedure slots)
      if (scheduledDateStr === getTodayDateStr()) {
        try {
          checkInPetOwnerToQueue({
            appointmentId: newRecord.encounterNo || newRecord.id,
            ownerId: ownerName.trim(),
            ownerName: ownerName.trim(),
            ownerContact: ownerContact.trim(),
            ownerBarangay,
            petId: selectedPet ? selectedPet.id : undefined,
            petName: effectivePetName,
            species: effectiveSpecies,
            breed: effectiveBreed,
            serviceId: "consultation",
            serviceTitle: "Clinical Consultation",
            dateStr: scheduledDateStr,
          });
        } catch {}
      }

      setLoading(false);
      setOpen(false);

      toast.success(
        `Consultation Request Submitted! Encounter #${newRecord.encounterNo}`,
        {
          description: `Your request for ${effectivePetName} is queued at City Veterinary Office. Present this encounter number upon arrival.`,
          duration: 6000,
        }
      );
      onSuccess?.();
    }, 600);
  };

  const formContent = (
    <form id="pet-owner-consultation-form" onSubmit={handleSubmit} className={cn(embedded ? "space-y-2 pt-0" : "space-y-4 pt-1")}>
      {/* Section 1: Patient & Owner Information */}
      {!hidePetSelector && (
        <div className="space-y-3.5 rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Heart className="size-3.5 text-primary" />
                1. Pet Details
              </h4>
              <span className="text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Free LGU Municipal Care
              </span>
            </div>

            {/* Registered Pet Picker or No Pets Prompt */}
            {pets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-amber-500/50 bg-amber-500/10 dark:bg-amber-950/20 p-5 text-center space-y-3">
                <div className="size-11 rounded-2xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto">
                  <PawPrint className="size-5.5" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-bold text-sm text-foreground">No Registered Pets Found</h5>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    You do not have any registered pets in your account yet. Please register your pet first to request an official CVO clinical consultation.
                  </p>
                </div>
                <RegisterPetDialog
                  trigger={
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                      <span>Register a Pet Now</span>
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-primary">Select from Your Registered Pets *</Label>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {pets.length} registered pet{pets.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Select value={selectedPetId} onValueChange={handleSelectPet}>
                    <SelectTrigger className="h-9 text-xs font-medium text-foreground rounded-lg bg-background border-border/80">
                      <SelectValue placeholder="Choose a registered pet" />
                    </SelectTrigger>
                    <SelectContent className="z-[90] rounded-lg text-xs">
                      {pets.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer py-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <PetAvatar
                              photoUrl={p.photo_url}
                              species={p.species}
                              name={p.name}
                              size="xs"
                              className="size-5 shrink-0"
                            />
                            <span className="font-semibold text-xs">{p.name}</span>
                            <span className="text-muted-foreground text-[11px]">
                              ({p.species} • {p.breed || "Standard"} • {p.weightKg || (p as any).weight_kg || "?"} kg)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPet && (
                  <div className="pt-1">
                    <PetPassportHeroCard
                      pet={selectedPet}
                      allPets={pets}
                      onSelectPet={handleSelectPet}
                    />
                  </div>
                )}
              </div>
            )}

            {/* If owner details are missing from user account, prompt for them */}
            {(!ownerName || !ownerContact) && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <User className="size-3.5 text-primary" />
                  <span>Owner Contact Information:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Owner Name *</Label>
                    <Input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Contact # *</Label>
                    <Input
                      value={ownerContact}
                      onChange={(e) => setOwnerContact(e.target.value)}
                      placeholder="09918552236"
                      required
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Barangay (CDO)</Label>
                    <Select value={ownerBarangay} onValueChange={setOwnerBarangay}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {cvoBarangays.map((b) => (
                          <SelectItem key={b} value={b} className="text-xs sm:text-sm">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* DUPLICATE CONSULTATION WARNING BANNER */}
            {isConsultationAlreadyScheduled && existingActiveConsultation && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 p-3.5 flex items-start gap-3 text-amber-950 dark:text-amber-200 animate-in fade-in-0 shadow-2xs">
                <AlertCircle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">
                      Active Consultation Already Exists for {selectedPet?.name || customPetName}
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300">
                      Encounter #{existingActiveConsultation.encounterNo}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This pet currently has an active consultation scheduled for <strong>{existingActiveConsultation.date}</strong> in <strong>{existingActiveConsultation.status}</strong> status. Double booking consultations or scheduling twice across different days is not permitted while an active visit is open.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

          {/* Section 2: Services Requested */}
          <div className={cn("rounded-xl border border-border/70 bg-card/60 shadow-2xs", embedded ? "p-2.5 space-y-1.5" : "p-3 sm:p-3.5 space-y-2")}>
            <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3 text-emerald-600" />
              2. Services Requested (Select All That Apply)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 pt-0.5">
              {[
                { id: "healthy", label: "HEALTHY", desc: "Routine wellness check" },
                { id: "vitamins", label: "VITAMINS", desc: "Supplements" },
                { id: "deworming", label: "DEWORMING", desc: "Anti-parasitic dose" },
                { id: "farmManagement", label: "FARM MGMT", desc: "Livestock guidance" },
                { id: "consultation", label: "CONSULTATION", desc: "Illness or injury" },
              ].map((svc) => (
                <label
                  key={svc.id}
                  title={svc.label}
                  className={`flex flex-col justify-between p-1.5 sm:p-2 rounded-lg border cursor-pointer transition-all duration-150 min-w-0 ${
                    services[svc.id as keyof typeof services]
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={Boolean(services[svc.id as keyof typeof services])}
                      onChange={(e) =>
                        setServices({ ...services, [svc.id]: e.target.checked })
                      }
                      className="size-3 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <span className="font-bold text-[9px] sm:text-[9.5px] text-foreground tracking-tight truncate">
                      {svc.label}
                    </span>
                  </div>
                  <p className="text-[8.5px] sm:text-[9px] text-muted-foreground font-normal mt-0.5 leading-tight line-clamp-1">
                    {svc.desc}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Preferred Consultation Schedule */}
          <div className={cn("rounded-xl border border-border/70 bg-card/60 shadow-2xs", embedded ? "p-2.5 space-y-1.5" : "p-3 sm:p-3.5 space-y-2")}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-0.5">
              <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3 text-primary" />
                3. Preferred Consultation Schedule (Monday – Friday) *
              </h4>
              <Badge variant="outline" className="text-[9px] font-semibold border-primary/30 text-primary px-2 py-0.5 whitespace-nowrap shrink-0">
                Mon – Fri • 8:00 AM – 5:00 PM
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
              <div className="space-y-0.5">
                <Label className="text-[10.5px] font-semibold text-foreground">Select Consultation Date</Label>
                <DatePicker
                  date={consultationDate}
                  setDate={setConsultationDate}
                  placeholder="Choose consultation date (Mon – Fri)"
                  className="h-8 text-xs rounded-lg bg-background font-normal"
                  disabled={isClinicDateDisabled}
                />
              </div>

              <div className="p-1.5 px-2.5 rounded-lg border border-border/60 bg-muted/20 text-[10.5px] space-y-0.5">
                <p className="font-bold text-foreground text-[10.5px]">Walk-in Clinical Operating Hours</p>
                <p className="text-[9.5px] text-muted-foreground leading-snug">
                  Open Monday through Friday, 8:00 AM to 5:00 PM. Weekend consultations are unavailable.
                </p>
                {new Date().getHours() >= 17 && (
                  <p className="text-[9.5px] font-semibold text-amber-600 dark:text-amber-400">
                    Hours for today closed (after 5:00 PM). Same-day booking disabled.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Symptoms / Reason for Consultation */}
          <div className={cn("rounded-xl border border-border/70 bg-card/60 shadow-2xs", embedded ? "p-2.5 space-y-1.5" : "p-3 sm:p-3.5 space-y-2")}>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Stethoscope className="size-3 text-primary" />
                  4. Symptoms Observed / Reason for Consultation *
                </Label>
                <span className="text-[10px] text-muted-foreground">Citizen description</span>
              </div>
              <Textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Describe your pet's condition, observed symptoms (e.g. vomiting, lethargy, coughing, loss of appetite)..."
                rows={2}
                className={cn(
                  "text-xs placeholder:text-[10px] sm:placeholder:text-[10.5px] leading-relaxed rounded-lg p-2 resize-none bg-background",
                  embedded ? "h-11 min-h-[44px]" : "min-h-[50px] resize-y"
                )}
                required
              />
            </div>

            {/* Informational Advisory on Clinical Exam being handled by the Vet (hidden when embedded to avoid vertical scrolling) */}
            {!embedded && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-2.5 flex items-start gap-2">
                <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Stethoscope className="size-3.5" />
                </div>
                <div className="text-[11px] space-y-0.5 min-w-0">
                  <p className="font-bold text-foreground text-[11px] leading-tight">
                    Clinical Examination & Findings Conducted by Attending Veterinarian
                  </p>
                  <p className="text-muted-foreground leading-snug text-[10px]">
                    Official patient vitals, 12-system clinical examination, medical diagnosis, treatment administered, and prescriptions are assessed and recorded by the City Veterinarian upon your clinic visit.
                  </p>
                </div>
              </div>
            )}
          </div>

          {!embedded && (
            <div className="gap-2 pt-2 border-t flex flex-row items-center justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onCancel?.();
                }}
                className="h-8 px-3 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || pets.length === 0 || isConsultationAlreadyScheduled}
                className="h-8 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 rounded-lg cursor-pointer shadow-xs hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3 animate-spin" />
                    <span>Submitting to CVO Queue...</span>
                  </>
                ) : pets.length === 0 ? (
                  <>
                    <PawPrint className="size-3 text-amber-300" />
                    <span>Register a Pet First</span>
                  </>
                ) : isConsultationAlreadyScheduled ? (
                  <>
                    <AlertCircle className="size-3 text-amber-500" />
                    <span>Consultation Already in Queue</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3" />
                    <span>Submit Consultation Request</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
  );

  if (embedded) {
    return formContent;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="h-9 gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer">
            <Plus className="size-4" />
            <span>Request Consultation / Treatment</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl lg:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 sm:p-7 bg-background rounded-2xl shadow-xl">
        <DialogHeader className="border-b pb-3.5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                City Veterinary Office Consultation Request Form
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                Official Cagayan de Oro LGU Field Treatment & Clinic Consultation Intake
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {formContent}
      </DialogContent>
    </Dialog>
  );
}
