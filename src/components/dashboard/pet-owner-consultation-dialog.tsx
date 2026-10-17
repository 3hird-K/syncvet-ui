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
import { cn } from "@/lib/utils";
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
}

interface PetOwnerConsultationDialogProps {
  pets?: PetItem[];
  initialPet?: PetItem;
  ownerProfile?: {
    name: string;
    contact: string;
    barangay: string;
  };
  trigger?: React.ReactNode;
}

export function PetOwnerConsultationDialog({
  pets = [],
  initialPet,
  ownerProfile,
  trigger,
}: PetOwnerConsultationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addConsultation, consultations } = useCVO();

  const firstPet = initialPet || (pets.length > 0 ? pets[0] : undefined);
  const [selectedPetId, setSelectedPetId] = useState<string>(firstPet?.id || (pets.length > 0 ? pets[0].id : "custom"));

  // Keep selectedPetId in sync if initialPet changes
  useEffect(() => {
    if (initialPet?.id) {
      setSelectedPetId(initialPet.id);
    } else if (pets.length > 0 && selectedPetId === "custom") {
      setSelectedPetId(pets[0].id);
    }
  }, [initialPet?.id, pets]);

  // Selected registered pet object (if any)
  const selectedPet = pets.find((p) => p.id === selectedPetId);

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

  // Prevent duplicate consultation requests: check if selected pet or custom pet already has an active consultation in queue
  const existingActiveConsultation = useMemo(() => {
    const targetPetId = (selectedPet?.id || "").toLowerCase().trim();
    const targetPetName = (selectedPet?.name || customPetName || "").toLowerCase().trim();

    if (!targetPetName && !targetPetId) return null;

    return consultations.find((c) => {
      // Active queue statuses: waiting, in-consultation, treatment
      const isActive = c.status === "waiting" || c.status === "in-consultation" || c.status === "treatment";
      if (!isActive) return false;

      const cPetId = (c.petId || "").toLowerCase().trim();
      const cPetName = (c.petName || "").toLowerCase().trim();

      const isSamePet =
        (targetPetId && cPetId && targetPetId === cPetId) ||
        (targetPetName && cPetName && targetPetName === cPetName);

      return isSamePet;
    });
  }, [consultations, selectedPet, customPetName]);

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

  // Step 3: Preferred consultation appointment date (Monday-Friday only)
  const getDefaultConsultationDate = () => {
    const d = new Date();
    const day = d.getDay();
    if (day === 0) {
      d.setDate(d.getDate() + 1); // Sunday -> Monday
    } else if (day === 6) {
      d.setDate(d.getDate() + 2); // Saturday -> Monday
    }
    return d;
  };

  const [consultationDate, setConsultationDate] = useState<Date | undefined>(getDefaultConsultationDate());

  // Step 4: Symptoms / Patient History narrative observed by pet owner
  const [chiefComplaint, setChiefComplaint] = useState(
    "Routine physical checkup, request for oral deworming and preventive multivitamin boost."
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Determine effective values
    const effectivePetName = selectedPet ? selectedPet.name : customPetName.trim();
    const effectiveSpecies = selectedPet
      ? (selectedPet.species?.toLowerCase() === "cat" ? "Cat" : "Dog")
      : customSpecies;
    const effectiveBreed = selectedPet
      ? (selectedPet.breed || (selectedPet.species?.toLowerCase() === "cat" ? "Puspin" : "Aspin"))
      : (customBreed.trim() || (customSpecies === "Cat" ? "Puspin" : "Aspin"));
    const effectiveGender = selectedPet
      ? (selectedPet.gender === "Female" || selectedPet.gender === "F" ? "F" : "M")
      : customGender;
    const effectiveAge = selectedPet ? (selectedPet.age || "1 yr") : (customAge.trim() || "1 yr");
    const effectiveWeightKg = selectedPet
      ? (selectedPet.weightKg ? selectedPet.weightKg.toString() : "12.4")
      : (customWeightKg.trim() || "10");
    const effectiveColor = selectedPet ? (selectedPet.color || "Standard") : (customColor.trim() || "Standard");

    if (!effectivePetName) {
      toast.error("Please provide a pet name.");
      return;
    }

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

      setLoading(false);
      setOpen(false);

      toast.success(
        `Consultation Request Submitted! Encounter #${newRecord.encounterNo}`,
        {
          description: `Your request for ${effectivePetName} is queued at City Veterinary Office. Present this encounter number upon arrival.`,
          duration: 6000,
        }
      );
    }, 600);
  };

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

      <DialogContent className="sm:max-w-3xl lg:max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-background rounded-2xl shadow-xl">
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Section 1: Patient & Owner Information */}
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

            {/* Registered Pet Picker */}
            {pets.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-primary">Select from Your Registered Pets</Label>
                  {selectedPet && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      Defaults loaded from pet passport
                    </span>
                  )}
                </div>
                <Select value={selectedPetId} onValueChange={handleSelectPet}>
                  <SelectTrigger className="h-9.5 text-xs sm:text-sm font-semibold text-foreground rounded-xl bg-background border-border/80">
                    <SelectValue placeholder="Select pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs sm:text-sm font-medium">
                        🐾 {p.name} ({p.species} • {p.breed || "Standard"})
                      </SelectItem>
                    ))}
                    <SelectItem value="custom" className="text-xs sm:text-sm text-primary font-semibold">
                      + Other / Unregistered Pet
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* A) REGISTERED PET SELECTED: Clean, Uneditable Default Details Card */}
            {selectedPetId !== "custom" && selectedPet ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <PawPrint className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-foreground">{selectedPet.name}</h5>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold">
                          {selectedPet.species}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedPet.breed || (selectedPet.species === "Cat" ? "Puspin" : "Aspin")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground bg-background/80 border border-border/60 px-2 py-1 rounded-lg">
                    <Lock className="size-3 text-muted-foreground/70" />
                    <span>Default pet profile</span>
                  </div>
                </div>

                {/* Pet Attributes Display Pills (Uneditable) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-500/20 text-xs">
                  <div className="bg-background/80 rounded-lg p-2 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Gender</span>
                    <span className="font-semibold text-foreground text-xs">{selectedPet.gender || "Male"}</span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Age</span>
                    <span className="font-semibold text-foreground text-xs">{selectedPet.age || "1 yr"}</span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Weight</span>
                    <span className="font-semibold text-foreground text-xs">
                      {selectedPet.weightKg ? `${selectedPet.weightKg} kg` : "12.4 kg"}
                    </span>
                  </div>
                  <div className="bg-background/80 rounded-lg p-2 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Color / Markings</span>
                    <span className="font-semibold text-foreground text-xs truncate block">{selectedPet.color || "Standard"}</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                  <span>ℹ️ Pet details are linked from your registered profile. To update these, edit in the</span>
                  <strong className="text-foreground font-semibold">My Pets & Passports</strong>
                  <span>page.</span>
                </p>
              </div>
            ) : (
              /* B) UNREGISTERED / OTHER PET: Editable Inputs for Walk-in or Unregistered animal */
              <div className="space-y-3 p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <PawPrint className="size-3.5 text-primary" />
                  <span>Enter Pet Information (Unregistered / Walk-in):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Pet Name *</Label>
                    <Input
                      value={customPetName}
                      onChange={(e) => setCustomPetName(e.target.value)}
                      placeholder="e.g. Buddy"
                      required
                      className="h-9 text-xs sm:text-sm font-semibold rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Species</Label>
                    <Select value={customSpecies} onValueChange={(val: any) => setCustomSpecies(val)}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dog">Dog (Canine)</SelectItem>
                        <SelectItem value="Cat">Cat (Feline)</SelectItem>
                        <SelectItem value="Livestock">Livestock (Swine/Cattle/Goat)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Breed</Label>
                    <Input
                      value={customBreed}
                      onChange={(e) => setCustomBreed(e.target.value)}
                      placeholder="e.g. Aspin / Mixed"
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Gender</Label>
                    <Select value={customGender} onValueChange={(val: any) => setCustomGender(val)}>
                      <SelectTrigger className="h-9 text-xs sm:text-sm rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Age</Label>
                    <Input
                      value={customAge}
                      onChange={(e) => setCustomAge(e.target.value)}
                      placeholder="e.g. 2 yrs"
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Weight (kg)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={customWeightKg}
                      onChange={(e) => setCustomWeightKg(e.target.value)}
                      placeholder="12.4"
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Color / Markings</Label>
                    <Input
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="e.g. Brown & White"
                      className="h-9 text-xs sm:text-sm rounded-xl bg-background"
                    />
                  </div>
                </div>
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

          {/* Section 2: Services Requested */}
          <div className="space-y-2.5 rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-emerald-600" />
              2. Services Requested (Select All That Apply)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
              {[
                { id: "healthy", label: "HEALTHY", desc: "Routine wellness check" },
                { id: "vitamins", label: "VITAMINS", desc: "Injectable/oral supplements" },
                { id: "deworming", label: "DEWORMING", desc: "Free anti-parasitic dose" },
                { id: "farmManagement", label: "FARM MGMT", desc: "Livestock guidance" },
                { id: "consultation", label: "CONSULTATION", desc: "Illness or injury check" },
              ].map((svc) => (
                <label
                  key={svc.id}
                  className={`flex flex-col justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all duration-150 ${
                    services[svc.id as keyof typeof services]
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                      : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={Boolean(services[svc.id as keyof typeof services])}
                      onChange={(e) =>
                        setServices({ ...services, [svc.id]: e.target.checked })
                      }
                      className="size-4 rounded accent-primary cursor-pointer shrink-0"
                    />
                    <span className="font-extrabold text-xs text-foreground tracking-wide">{svc.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-normal mt-1.5 leading-snug">
                    {svc.desc}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Section 3: Preferred Consultation Schedule */}
          <div className="space-y-3 rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" />
                3. Preferred Consultation Schedule (Monday – Friday) *
              </h4>
              <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary w-fit">
                CVO Clinic: Mon – Fri • 8:00 AM – 5:00 PM
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Select Consultation Date</Label>
                <DatePicker
                  date={consultationDate}
                  setDate={setConsultationDate}
                  placeholder="Choose consultation date (Mon – Fri)"
                  className="h-10 text-xs sm:text-sm rounded-xl bg-background font-normal"
                  fromDate={new Date()}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const day = date.getDay();
                    // Exclude past dates, Sundays (0) and Saturdays (6)
                    return date < today || day === 0 || day === 6;
                  }}
                />
              </div>

              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 text-xs space-y-1">
                <p className="font-semibold text-foreground">Walk-in Clinical Operating Hours</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  The CVO clinic is open for walk-in consultations Monday through Friday, 8:00 AM to 5:00 PM. Weekend consultations are unavailable.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Symptoms / Reason for Consultation */}
          <div className="space-y-3 rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Stethoscope className="size-3.5 text-primary" />
                  4. Symptoms Observed / Reason for Consultation *
                </Label>
                <span className="text-[11px] text-muted-foreground">Citizen description</span>
              </div>
              <Textarea
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="Describe your pet's condition, observed symptoms (e.g. vomiting, coughing, loss of appetite), duration, or reason for requesting care..."
                rows={4}
                className="text-xs sm:text-sm leading-relaxed rounded-xl p-3 resize-y min-h-[90px] bg-background"
                required
              />
            </div>

            {/* Informational Advisory on Clinical Exam being handled by the Vet */}
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 p-3.5 flex items-start gap-3">
              <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Stethoscope className="size-4.5" />
              </div>
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">
                  Clinical Examination & Findings Conducted by Attending Veterinarian
                </p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  Official patient vitals (weight, temperature), the 12-system clinical examination checklist, medical diagnosis, treatment administered, prescriptions, and follow-up care recommendations will be assessed and filled out by the City Veterinarian upon your clinic or field visit.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2.5 pt-3 border-t flex flex-row items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-9 px-4 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || isConsultationAlreadyScheduled}
              className="h-9 px-5 text-xs font-bold bg-primary text-primary-foreground gap-2 rounded-xl cursor-pointer shadow-xs hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting to CVO Queue...</span>
                </>
              ) : isConsultationAlreadyScheduled ? (
                <>
                  <AlertCircle className="size-3.5 text-amber-500" />
                  <span>Consultation Already in Queue</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Submit Consultation Request</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
