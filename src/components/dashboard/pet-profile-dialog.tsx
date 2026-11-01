"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Download,
  ShieldCheck,
  Stethoscope,
  Calendar,
  MapPin,
  User,
  Pencil,
  Trash2,
  X,
  Syringe,
  FileText,
  CheckCircle2,
  ImageIcon,
  ExternalLink,
  CalendarClock,
  AlertTriangle,
  Save,
  Loader2,
  Lock,
  Camera,
  Check,
  Scissors,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
import { type CVOConsultation } from "@/data/cvo-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { PET_CAT_AVATARS, PET_DOG_AVATARS } from "@/lib/pet-avatars";
import { CAT_BREEDS, DOG_BREEDS } from "@/components/dashboard/register-pet-dialog";

export interface PetProfileRecord {
  id: string;
  name: string;
  species: "Dog" | "Cat" | "Livestock";
  breed: string;
  sex: "Male" | "Female";
  age: string;
  weightKg?: number;
  color?: string;
  ownerId?: string;
  owner: string;
  ownerEmail?: string;
  ownerAvatarUrl?: string;
  barangay: string;
  address?: string;
  vaccinated: boolean;
  qr?: boolean;
  sterilized: boolean;
  microchip: string;
  classification?: "Domestic" | "Livestock";
  photo_url?: string | null;
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  createdAt?: string;
}

export interface PetProfileDialogProps {
  pet: PetProfileRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditPet?: (pet: PetProfileRecord) => void;
  onDeletePet?: (pet: PetProfileRecord) => void;
  onAvatarChange?: (url: string) => void;
  onPetUpdate?: (pet: PetProfileRecord) => void;
  consultations?: CVOConsultation[];
  // Active encounter / scheduled procedure actions in consultations queue:
  encounter?: any;
  onAdministerVaccine?: (encounter: any) => void;
  onFillExamination?: (encounter: any) => void;
  onCompleteSurgery?: (encounter: any) => void;
  onViewOfficialSheet?: (encounter: any) => void;
  onUpdateEncounterStatus?: (encounter: any, newStatus: string) => void;
  isVaccineOutOfStock?: boolean;
}

export function PetProfileDialog({
  pet,
  open,
  onOpenChange,
  onDeletePet,
  onAvatarChange,
  onPetUpdate,
  consultations = [],
  encounter,
  onAdministerVaccine,
  onFillExamination,
  onCompleteSurgery,
  onViewOfficialSheet,
  onUpdateEncounterStatus,
  isVaccineOutOfStock = false,
}: PetProfileDialogProps) {
  const [activeProfileTab, setActiveProfileTab] = useState<
    "overview" | "passport" | "consultation" | "procedure" | "records"
  >("overview");

  // Side panels matching images 2 & 3
  const [showEditPetPanel, setShowEditPetPanel] = useState(false);
  const [showAvatarPickerPanel, setShowAvatarPickerPanel] = useState(false);

  // Editable pet state
  const [currentPet, setCurrentPet] = useState<PetProfileRecord | null>(pet);
  const [editPetName, setEditPetName] = useState("");
  const [editPetBreed, setEditPetBreed] = useState("");
  const [editPetWeight, setEditPetWeight] = useState("");
  const [savingPetUpdates, setSavingPetUpdates] = useState(false);
  const [savingPetAvatar, setSavingPetAvatar] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [consultationSheetOpen, setConsultationSheetOpen] = useState(false);
  const [selectedConsultationForSheet, setSelectedConsultationForSheet] = useState<CVOConsultation | null>(null);
  const [deletePetDialogOpen, setDeletePetDialogOpen] = useState(false);

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Sync currentPet when pet prop changes
  useEffect(() => {
    setCurrentPet(pet);
    if (pet) {
      setEditPetName(pet.name || "");
      setEditPetBreed(pet.breed || "");
      setEditPetWeight(pet.weightKg != null ? String(pet.weightKg) : "");
    }
  }, [pet]);

  // Reset panels and tabs when opening
  useEffect(() => {
    if (open) {
      setActiveProfileTab("overview");
      setShowEditPetPanel(false);
      setShowAvatarPickerPanel(false);
    }
  }, [open, pet?.id]);

  // Generate QR for pet
  useEffect(() => {
    if (!currentPet) return;
    const petUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/pet/${currentPet.id}?name=${encodeURIComponent(currentPet.name)}&species=${encodeURIComponent(currentPet.species)}&breed=${encodeURIComponent(currentPet.breed)}&tag=${encodeURIComponent(currentPet.microchip || currentPet.id)}&owner=${encodeURIComponent(currentPet.owner)}&bgy=${encodeURIComponent(currentPet.barangay)}&vax=${currentPet.vaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(currentPet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(currentPet.nextVaccinationDate || "")}`;
    QRCode.toDataURL(petUrl, { width: 360, margin: 1 })
      .then((url) => setQrCodeUrl(url))
      .catch((e) => console.error(e));
  }, [currentPet]);

  // Vaccination status calculation matching pet-owner view
  const vaxStatus = useMemo(() => {
    if (!currentPet) {
      return {
        isVaccinated: false,
        isOverdue: false,
        isDueSoon: false,
        daysUntilBooster: 0,
        badgeText: "Unvaccinated",
      };
    }

    const isVaccinated = currentPet.vaccinated;
    if (!isVaccinated) {
      return {
        isVaccinated: false,
        isOverdue: false,
        isDueSoon: false,
        daysUntilBooster: 0,
        badgeText: "Unvaccinated",
      };
    }

    if (currentPet.nextVaccinationDate) {
      const nextDate = new Date(currentPet.nextVaccinationDate);
      const today = new Date();
      const diffTime = nextDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          isVaccinated: false,
          isOverdue: true,
          isDueSoon: false,
          daysUntilBooster: 0,
          badgeText: "Rabies Overdue",
        };
      } else if (diffDays <= 30) {
        return {
          isVaccinated: true,
          isOverdue: false,
          isDueSoon: true,
          daysUntilBooster: diffDays,
          badgeText: `Due Soon (${diffDays}d)`,
        };
      }
    }

    return {
      isVaccinated: true,
      isOverdue: false,
      isDueSoon: false,
      daysUntilBooster: 365,
      badgeText: "Rabies Protected",
    };
  }, [currentPet]);

  // Species, Breeds & Avatars setup
  const isCat = currentPet?.species?.toLowerCase() === "cat";
  const availableSpeciesAvatars = isCat ? PET_CAT_AVATARS : PET_DOG_AVATARS;
  const baseBreeds: string[] = isCat ? [...CAT_BREEDS] : [...DOG_BREEDS];
  const breedOptions: string[] = editPetBreed && !baseBreeds.includes(editPetBreed)
    ? [editPetBreed, ...baseBreeds]
    : baseBreeds;

  // Unsaved changes detection for Save icon highlight & validation
  const currentPetWeight = currentPet?.weightKg != null ? Number(currentPet.weightKg) : null;
  const parsedEditWeight = parseFloat(editPetWeight);
  const weightChanged =
    editPetWeight.trim() !== "" &&
    !isNaN(parsedEditWeight) &&
    (currentPetWeight === null || Math.abs(parsedEditWeight - currentPetWeight) > 0.001);

  const hasUnsavedChanges = Boolean(
    currentPet &&
      (editPetName.trim() !== (currentPet.name || "").trim() ||
        editPetBreed.trim() !== (currentPet.breed || "").trim() ||
        weightChanged)
  );

  // Save pet profile updates directly (triggered from side panel button or top bar Save icon)
  const handleSavePetUpdates = async () => {
    if (!currentPet) return;
    if (!editPetName.trim()) {
      toast.error("Pet name cannot be empty");
      return;
    }

    setSavingPetUpdates(true);
    try {
      const parsedWeight = parseFloat(editPetWeight);
      const updatePayload: Record<string, any> = {
        name: editPetName.trim(),
        breed: editPetBreed.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        updatePayload.weight_category = `${parsedWeight} kg`;
      }

      const { error } = await supabase
        .from("pets")
        .update(updatePayload)
        .eq("id", currentPet.id);

      if (error) throw error;

      const newWeightKg =
        !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : currentPet.weightKg;

      const updatedRecord: PetProfileRecord = {
        ...currentPet,
        name: editPetName.trim(),
        breed: editPetBreed.trim(),
        weightKg: newWeightKg,
      };

      setCurrentPet(updatedRecord);
      if (onPetUpdate) {
        onPetUpdate(updatedRecord);
      }

      await queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });

      toast.success("Pet Profile Saved", {
        description: `Changes for ${editPetName.trim()} have been saved successfully.`,
      });
      setShowEditPetPanel(false);
    } catch (err: any) {
      console.error("Pet update error:", err);
      toast.error("Failed to save changes", { description: err?.message || "An error occurred" });
    } finally {
      setSavingPetUpdates(false);
    }
  };

  // Direct avatar selection from expanded panel
  const handleDirectAvatarSelect = async (url: string, label: string) => {
    if (!currentPet) return;
    setSavingPetAvatar(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({ photo_url: url, updated_at: new Date().toISOString() })
        .eq("id", currentPet.id);

      if (error) throw error;

      const updatedRecord: PetProfileRecord = {
        ...currentPet,
        photo_url: url,
      };

      setCurrentPet(updatedRecord);
      if (onAvatarChange) {
        onAvatarChange(url);
      }
      if (onPetUpdate) {
        onPetUpdate(updatedRecord);
      }

      await queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });

      toast.success("Profile photo updated!", {
        description: `${currentPet.name}'s avatar set to ${label}.`,
      });
    } catch (err: any) {
      toast.error("Failed to update avatar", { description: err?.message || "An error occurred" });
    } finally {
      setSavingPetAvatar(false);
    }
  };

  // Public verification URL
  const passportVerifyUrl = useMemo(() => {
    if (!currentPet || typeof window === "undefined") return "";
    const tag = currentPet.microchip || currentPet.id;
    const isVax = currentPet.vaccinated ? "1" : "0";
    return `${window.location.origin}/verify/pet/${currentPet.id}?name=${encodeURIComponent(currentPet.name)}&species=${encodeURIComponent(currentPet.species)}&breed=${encodeURIComponent(currentPet.breed)}&tag=${encodeURIComponent(tag)}&owner=${encodeURIComponent(currentPet.owner)}&bgy=${encodeURIComponent(currentPet.barangay)}&vax=${isVax}&lastVax=${encodeURIComponent(currentPet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(currentPet.nextVaccinationDate || "")}`;
  }, [currentPet]);

  const handleDownloadQrOnly = () => {
    if (!qrCodeUrl || !currentPet) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `cvo-pet-passport-${currentPet.name || currentPet.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Pet Passport QR Downloaded", {
      description: `Saved QR code for ${currentPet.name || "pet"}`,
    });
  };

  // Find linked consultations
  const petConsultations = useMemo(() => {
    if (!currentPet) return [];
    return consultations.filter(
      (c) =>
        c.petId.toLowerCase() === currentPet.id.toLowerCase() ||
        c.petName.toLowerCase() === currentPet.name.toLowerCase()
    );
  }, [currentPet, consultations]);

  // Fetch linked database appointments
  const { data: petDbAppointments = [] } = useQuery({
    queryKey: ["selected-pet-profile-appointments", currentPet?.id, currentPet?.name],
    queryFn: async () => {
      if (!currentPet) return [];
      try {
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .or(`pet_id.eq.${currentPet.id},pet_name.ilike.%${currentPet.name}%`)
          .order("date", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentPet && open,
    staleTime: 30000,
  });

  // Fetch linked database vaccinations
  const { data: petDbVaccinations = [] } = useQuery({
    queryKey: ["selected-pet-profile-vaccinations", currentPet?.id, currentPet?.name],
    queryFn: async () => {
      if (!currentPet) return [];
      try {
        const { data } = await supabase
          .from("vaccination_records")
          .select("*")
          .or(`pet_id.eq.${currentPet.id},pet_name.ilike.%${currentPet.name}%`)
          .order("date_administered", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!currentPet && open,
    staleTime: 30000,
  });

  // Chronological medical history
  const petMedicalHistory = useMemo(() => {
    if (!currentPet) return [];

    const list: Array<{
      id: string;
      date: string;
      title: string;
      category: "Consultation" | "Vaccination" | "Surgery" | "Intake";
      diagnosis?: string;
      treatment?: string;
      medication?: string;
      vetName: string;
      status: string;
    }> = [];

    petConsultations.forEach((c) => {
      list.push({
        id: c.encounterNo || c.id,
        date: c.date,
        title: c.chiefComplaint ? `Consultation: ${c.chiefComplaint}` : "Clinical Examination",
        category: "Consultation",
        diagnosis: c.diagnosis,
        treatment: c.treatment,
        medication: c.medication,
        vetName: c.vetName || "Dr. Helen Ann P. Tacandong, DVM",
        status: c.status === "completed" ? "Completed" : "In Progress",
      });
    });

    petDbVaccinations.forEach((v: any) => {
      list.push({
        id: v.id || `VAX-${v.batch_number}`,
        date: v.date_administered || v.created_at?.split("T")[0] || "2026-10-28",
        title: `${v.vaccine_type || "Anti-Rabies Prophylaxis"} (Lot #${v.batch_number || "RB-2026"})`,
        category: "Vaccination",
        diagnosis: "Rabies Prophylaxis & Core Immunization",
        treatment: "1.0 mL Subcutaneous (SC) Injection",
        medication: `Vaccine Lot #${v.batch_number || "RB-2026"}`,
        vetName: v.administering_vet || "Dr. Helen Ann P. Tacandong, DVM",
        status: "Administered",
      });
    });

    petDbAppointments.forEach((a: any) => {
      const isSurg =
        a.service_id?.toLowerCase().includes("spay") ||
        a.service_id?.toLowerCase().includes("neuter") ||
        a.service_id?.toLowerCase().includes("kapon");
      const isVax = a.service_id?.toLowerCase().includes("vaccin");
      if (!list.some((existing) => existing.id === a.id)) {
        list.push({
          id: a.id,
          date: a.date ? a.date.split("T")[0] : "2026-10-28",
          title: isSurg
            ? "Spay & Neuter (Kapon Surgery)"
            : isVax
            ? "Anti-Rabies Vaccination"
            : "General Clinical Examination",
          category: isSurg ? "Surgery" : isVax ? "Vaccination" : "Consultation",
          diagnosis: isSurg
            ? "Elective Sterilization Procedure"
            : isVax
            ? "Preventive Immunization"
            : "Health Evaluation",
          treatment:
            a.notes ||
            (isSurg ? "Surgical Sterilization & Post-Op Antibiotics" : "Routine Assessment"),
          vetName: "Dr. Helen Ann P. Tacandong, DVM",
          status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : "Completed",
        });
      }
    });

    if (list.length === 0) {
      if (currentPet.vaccinated) {
        list.push({
          id: `VAX-CDO-${currentPet.id.slice(0, 6)}`,
          date: currentPet.lastVaccinationDate || "2026-10-28",
          title: "Rabisin Anti-Rabies Core Immunization (1.0 mL SC)",
          category: "Vaccination",
          diagnosis: "Municipal Anti-Rabies Core Immunization (RA 9482)",
          treatment: "Subcutaneous Rabies Vaccine Administered",
          medication: `Lot #RB-2026-9844 • Next Due: ${currentPet.nextVaccinationDate || "2027-10-28"}`,
          vetName: "Dr. Helen Ann P. Tacandong, DVM",
          status: "Protected",
        });
      }
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentPet, petConsultations, petDbVaccinations, petDbAppointments]);

  if (!currentPet) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full p-0 bg-transparent border-0 shadow-none transition-all duration-300 ease-in-out h-[88vh] max-h-[88vh] flex flex-col",
            showAvatarPickerPanel || showEditPetPanel
              ? "max-w-5xl sm:max-w-5xl"
              : activeProfileTab !== "overview"
              ? "max-w-4xl sm:max-w-4xl"
              : "max-w-3xl sm:max-w-3xl"
          )}
        >
          <div className="flex items-stretch gap-1.5 sm:gap-2 w-full h-full min-h-0 flex-1 overflow-hidden">
            {/* Left Side: Pet Info & Passport Card */}
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden min-w-0 rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>{currentPet.name} - Electronic Veterinary Record</DialogTitle>
                <DialogDescription>
                  Official digital animal passport and clinical EMR record for {currentPet.name}
                </DialogDescription>
              </DialogHeader>

              {/* Header Card with Gradient & Crest (Cat: Purple/Indigo, Dog: Emerald/Teal) */}
              <div
                className={cn(
                  "p-5 text-white relative overflow-hidden shrink-0",
                  isCat
                    ? "bg-gradient-to-br from-purple-800 via-indigo-950 to-slate-950"
                    : "bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950"
                )}
              >
                <div className="absolute -bottom-10 -right-10 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />

                {/* Top Action Icons: Digital Passport, Request Care, Book Slot, Records, Save, Delete, Close */}
                <div className="flex items-center justify-end relative z-10 mb-3 gap-1.5">
                  {/* Digital Passport QR Icon */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileTab((prev) => (prev === "passport" ? "overview" : "passport"));
                      setShowEditPetPanel(false);
                      setShowAvatarPickerPanel(false);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeProfileTab === "passport"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeProfileTab === "passport" ? "Close Digital Health Passport" : "Official Digital Health Passport"}
                  >
                    <QrCode className="size-4 text-white" />
                    <span className="sr-only">Official Digital Health Passport</span>
                  </button>

                  {/* Clinical Encounters & Care (Stethoscope) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileTab((prev) => (prev === "consultation" ? "overview" : "consultation"));
                      setShowEditPetPanel(false);
                      setShowAvatarPickerPanel(false);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeProfileTab === "consultation"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeProfileTab === "consultation" ? "Close Clinical Care View" : "Clinical Care Consultations"}
                  >
                    <Stethoscope className="size-4 text-white" />
                    <span className="sr-only">Clinical Care</span>
                  </button>

                  {/* Procedure Scheduling & Appointments (Calendar) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileTab((prev) => (prev === "procedure" ? "overview" : "procedure"));
                      setShowEditPetPanel(false);
                      setShowAvatarPickerPanel(false);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeProfileTab === "procedure"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeProfileTab === "procedure" ? "Close Procedure Booking View" : "Procedures & Appointments"}
                  >
                    <Calendar className="size-4 text-white" />
                    <span className="sr-only">Appointments & Procedures</span>
                  </button>

                  {/* Delete Pet Record Button (Trash2) */}
                  <button
                    type="button"
                    onClick={() => setDeletePetDialogOpen(true)}
                    className="size-8 rounded-full bg-white/10 hover:bg-rose-600/80 text-white border border-white/20 hover:border-rose-400 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    title="Permanently Delete Pet Record"
                  >
                    <Trash2 className="size-4 text-white" />
                    <span className="sr-only">Delete Pet Record</span>
                  </button>

                  {/* Save Profile Button (floppy disk icon requested) */}
                  <button
                    type="button"
                    onClick={handleSavePetUpdates}
                    disabled={savingPetUpdates}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      hasUnsavedChanges
                        ? "bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-300 ring-2 ring-emerald-400/50 shadow-md animate-pulse"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={hasUnsavedChanges ? "Save profile changes" : "Save Profile"}
                  >
                    {savingPetUpdates ? (
                      <Loader2 className="size-4 animate-spin text-white" />
                    ) : (
                      <Save className="size-4 text-white" />
                    )}
                    <span className="sr-only">Save Profile</span>
                  </button>

                  {/* Close Modal Button */}
                  <DialogClose asChild>
                    <button
                      type="button"
                      onClick={() => {
                        onOpenChange(false);
                        setActiveProfileTab("overview");
                        setShowEditPetPanel(false);
                        setShowAvatarPickerPanel(false);
                      }}
                      className="size-8 rounded-full bg-white/10 hover:bg-white/25 text-white border border-white/20 hover:border-white/40 backdrop-blur-md transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ml-2.5 sm:ml-3"
                      title="Close"
                    >
                      <X className="size-4 text-white" />
                      <span className="sr-only">Close</span>
                    </button>
                  </DialogClose>
                </div>

                {/* Hero Identity: Avatar, Name with Edit & Photo Buttons, Badges */}
                <div className="flex items-center gap-4 relative z-10">
                  <PetAvatar
                    photoUrl={currentPet.photo_url}
                    species={currentPet.species}
                    name={currentPet.name}
                    size="xl"
                  />

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Clean Pet Name with Clickable Edit and Photo Icon Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                        {currentPet.name}
                      </h2>
                      <div className="flex items-center gap-1">
                        {/* Edit Pencil Icon (Toggles side panel matching Image 2) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowEditPetPanel((prev) => {
                              const nextState = !prev;
                              if (nextState) {
                                setEditPetName(currentPet.name || "");
                                setEditPetBreed(currentPet.breed || "");
                                setEditPetWeight(currentPet.weightKg != null ? String(currentPet.weightKg) : "");
                              }
                              return nextState;
                            });
                            setShowAvatarPickerPanel(false);
                          }}
                          className={cn(
                            "size-7 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                            showEditPetPanel
                              ? "bg-white text-slate-900 border-white shadow-md scale-105"
                              : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                          )}
                          title={showEditPetPanel ? "Close edit panel" : "Edit Pet Information"}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit Pet</span>
                        </button>

                        {/* Image/Photo Icon (Toggles side panel matching Image 3) */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowAvatarPickerPanel((prev) => !prev);
                            setShowEditPetPanel(false);
                          }}
                          className={cn(
                            "size-7 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                            showAvatarPickerPanel
                              ? "bg-white text-slate-900 border-white shadow-md scale-105"
                              : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                          )}
                          title={showAvatarPickerPanel ? "Close photo panel" : "Change Profile Picture"}
                        >
                          <ImageIcon className="size-3.5" />
                          <span className="sr-only">Change Profile Picture</span>
                        </button>
                      </div>
                    </div>

                    {/* Basic Info Line */}
                    <p className="text-xs text-white/90 font-medium flex items-center gap-1.5 flex-wrap">
                      <span>{currentPet.breed || currentPet.species}</span>
                      <span className="text-white/40">•</span>
                      <span>{currentPet.sex === "Female" ? "Female ♀" : "Male ♂"}</span>
                      <span className="text-white/40">•</span>
                      <span>{currentPet.age}</span>
                      {currentPet.weightKg && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="font-semibold text-white">{currentPet.weightKg} kg</span>
                        </>
                      )}
                    </p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span
                        className={cn(
                          "text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md inline-flex items-center gap-1",
                          vaxStatus.isOverdue
                            ? "bg-rose-600 text-white"
                            : vaxStatus.isDueSoon
                            ? "bg-amber-500 text-black font-bold"
                            : vaxStatus.isVaccinated
                            ? "bg-emerald-500 text-white"
                            : "bg-amber-600 text-white"
                        )}
                      >
                        {vaxStatus.isVaccinated ? (
                          <ShieldCheck className="size-3" />
                        ) : (
                          <AlertTriangle className="size-3" />
                        )}
                        <span>
                          {vaxStatus.isOverdue
                            ? "Rabies Overdue"
                            : vaxStatus.isDueSoon
                            ? `Due Soon (${vaxStatus.daysUntilBooster}d)`
                            : vaxStatus.isVaccinated
                            ? "Rabies Protected"
                            : "Unvaccinated"}
                        </span>
                      </span>

                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md border inline-flex items-center gap-1",
                          currentPet.sterilized
                            ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"
                            : "bg-white/10 text-white/90 border-white/20"
                        )}
                      >
                        {currentPet.sterilized ? "Neutered/Spayed" : "Intact (Not Sterilized)"}
                      </span>

                      {encounter && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md bg-white/20 text-white border border-white/30 inline-flex items-center gap-1">
                          #{encounter.encounterNo || encounter.id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div
                className={cn(
                  "flex-1 min-h-0 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                  activeProfileTab !== "overview" ? "p-3 sm:p-3.5 space-y-2" : "p-3 sm:p-4 space-y-3"
                )}
              >
                {/* ── OVERVIEW TAB ── */}
                {activeProfileTab === "overview" && (
                  <>
                    {/* Compact Scheduled Action Strip (Takes minimal space) */}
                    {encounter && (
                      <div
                        className={cn(
                          "px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs transition-all",
                          encounter.isOverdue
                            ? "border-rose-500/30 bg-rose-500/8 dark:bg-rose-950/20"
                            : encounter.category === "vaccination"
                            ? (encounter.status === "completed"
                                ? "border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20"
                                : isVaccineOutOfStock
                                ? "border-rose-500/30 bg-rose-500/8 dark:bg-rose-950/20"
                                : "border-blue-500/30 bg-blue-500/8 dark:bg-blue-950/20")
                            : encounter.category === "spay-neuter"
                            ? (encounter.status === "completed"
                                ? "border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20"
                                : "border-purple-500/30 bg-purple-500/8 dark:bg-purple-950/20")
                            : (encounter.status === "completed"
                                ? "border-emerald-500/30 bg-emerald-500/8 dark:bg-emerald-950/20"
                                : "border-blue-500/30 bg-blue-500/8 dark:bg-blue-950/20")
                        )}
                      >
                        {/* Left: Icon + Title + Tag + Schedule/Complaint in compact layout */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "size-7 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
                              encounter.category === "vaccination"
                                ? "bg-blue-600 text-white border-blue-700"
                                : encounter.category === "spay-neuter"
                                ? "bg-purple-600 text-white border-purple-700"
                                : "bg-blue-600 text-white border-blue-700"
                            )}
                          >
                            {encounter.category === "vaccination" ? (
                              <Syringe className="size-3.5" />
                            ) : encounter.category === "spay-neuter" ? (
                              <Scissors className="size-3.5" />
                            ) : (
                              <Stethoscope className="size-3.5" />
                            )}
                          </div>

                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate">
                                {encounter.category === "vaccination"
                                  ? "Anti-Rabies Prophylaxis"
                                  : encounter.category === "spay-neuter"
                                  ? "Spay / Neuter (Kapon)"
                                  : "Clinical EMR Consult"}
                              </span>
                              <span className="font-mono text-[9.5px] font-semibold text-muted-foreground bg-muted/70 px-1.5 py-0.2 rounded border border-border/60">
                                {encounter.encounterNo}
                              </span>
                            </div>

                            <p className="text-[10px] sm:text-[10.5px] text-muted-foreground truncate leading-tight">
                              {encounter.category === "consultation" && encounter.chiefComplaint
                                ? `"${encounter.chiefComplaint}" • ${encounter.date}`
                                : `Scheduled: ${encounter.date} at ${encounter.time || "09:00 AM"}${encounter.vetName ? ` • ${encounter.vetName}` : ""}`}
                            </p>
                          </div>
                        </div>

                        {/* Right: Status Dropdown/Badge + Action Buttons in one single compact row */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                          {/* Queue Lifecycle Status (Styled as a compact badge dropdown) */}
                          {onUpdateEncounterStatus && !encounter.isOverdue ? (
                            <Select
                              value={encounter.status}
                              onValueChange={(val) => onUpdateEncounterStatus(encounter, val)}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-7 text-[10px] font-bold px-2 rounded-lg border-0 shadow-2xs gap-1 cursor-pointer focus:ring-0",
                                  encounter.status === "completed"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25"
                                    : encounter.status === "in-consultation" || encounter.status === "treatment"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25"
                                    : "bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25"
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="text-xs min-w-32">
                                <SelectItem value="waiting" className="text-xs py-1">Waiting</SelectItem>
                                <SelectItem value="in-consultation" className="text-xs py-1">In Consultation</SelectItem>
                                <SelectItem value="treatment" className="text-xs py-1">Treatment</SelectItem>
                                <SelectItem value="completed" className="text-xs py-1">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              className={cn(
                                "text-[10px] font-bold border-0 py-1 px-2 shadow-2xs",
                                encounter.isOverdue
                                  ? "bg-rose-600 text-white"
                                  : encounter.status === "completed"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-blue-600 text-white"
                              )}
                            >
                              {encounter.isOverdue
                                ? "Overdue"
                                : encounter.status
                                ? encounter.status.toUpperCase()
                                : "WAITING"}
                            </Badge>
                          )}

                          {/* Secondary: Official Field Sheet button (for consultations) */}
                          {encounter.category === "consultation" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onViewOfficialSheet?.(encounter)}
                              className="h-7 px-2 text-[10.5px] font-medium gap-1 rounded-lg border-border hover:bg-muted cursor-pointer shrink-0"
                              title="View Official CVO Field Sheet"
                            >
                              <FileText className="size-3 text-primary" />
                              <span className="hidden md:inline">Field Sheet</span>
                            </Button>
                          )}

                          {/* Primary Action Button */}
                          {encounter.category === "vaccination" && (
                            <Button
                              size="sm"
                              disabled={encounter.isOverdue || (isVaccineOutOfStock && encounter.status !== "completed")}
                              onClick={() => onAdministerVaccine?.(encounter)}
                              className={cn(
                                "h-7 px-2.5 sm:px-3 text-[11px] font-bold gap-1 rounded-lg cursor-pointer shadow-2xs shrink-0 transition-all",
                                encounter.isOverdue
                                  ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                                  : encounter.status === "completed"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : isVaccineOutOfStock
                                  ? "bg-rose-600 hover:bg-rose-700 text-white cursor-not-allowed"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              )}
                            >
                              <Syringe className="size-3.5" />
                              <span>
                                {encounter.isOverdue
                                  ? "Locked"
                                  : encounter.status === "completed"
                                  ? "Update Dose"
                                  : isVaccineOutOfStock
                                  ? "Out of Stock"
                                  : "Administer Dose"}
                              </span>
                            </Button>
                          )}

                          {encounter.category === "consultation" && (
                            <Button
                              size="sm"
                              disabled={encounter.isOverdue}
                              onClick={() => onFillExamination?.(encounter)}
                              className={cn(
                                "h-7 px-2.5 sm:px-3 text-[11px] font-bold gap-1 rounded-lg cursor-pointer shadow-2xs shrink-0 transition-all",
                                encounter.isOverdue
                                  ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                                  : encounter.status === "completed"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-blue-600 hover:bg-blue-700 text-white"
                              )}
                            >
                              <ClipboardCheck className="size-3.5" />
                              <span>
                                {encounter.isOverdue
                                  ? "Locked"
                                  : encounter.status === "completed"
                                  ? "Update Findings"
                                  : "Fill Exam"}
                              </span>
                            </Button>
                          )}

                          {encounter.category === "spay-neuter" && (
                            <Button
                              size="sm"
                              disabled={encounter.isOverdue}
                              onClick={() => onCompleteSurgery?.(encounter)}
                              className={cn(
                                "h-7 px-2.5 sm:px-3 text-[11px] font-bold gap-1 rounded-lg cursor-pointer shadow-2xs shrink-0 transition-all",
                                encounter.isOverdue
                                  ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground"
                                  : encounter.status === "completed"
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  : "bg-purple-600 hover:bg-purple-700 text-white"
                              )}
                            >
                              <Scissors className="size-3.5" />
                              <span>
                                {encounter.isOverdue
                                  ? "Locked"
                                  : encounter.status === "completed"
                                  ? "Review Kapon"
                                  : "Execute Kapon"}
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Rabies Immunization Status Card (Exact Match with Image 2) */}
                    <div
                      className={cn(
                        "p-3.5 rounded-xl border space-y-2",
                        vaxStatus.isVaccinated
                          ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-950 dark:text-emerald-100"
                          : "bg-amber-500/5 border-amber-500/20 text-amber-950 dark:text-amber-100"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "size-7 rounded-lg flex items-center justify-center shrink-0 border",
                              vaxStatus.isVaccinated
                                ? "bg-emerald-600 text-white border-emerald-700"
                                : "bg-amber-600 text-white border-amber-700"
                            )}
                          >
                            <Syringe className="size-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground leading-tight">
                              {vaxStatus.isVaccinated
                                ? "Anti-Rabies Core Immunization (RA 9482)"
                                : "Anti-Rabies Vaccination Needed"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {vaxStatus.isVaccinated
                                ? "Annual protection active under CVO elimination program"
                                : "Annual vaccination is free at the CVO City Clinic"}
                            </p>
                          </div>
                        </div>

                        <Badge
                          className={cn(
                            "text-[9px] font-bold border-0",
                            vaxStatus.isVaccinated
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-600 text-white"
                          )}
                        >
                          {vaxStatus.badgeText}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Last Vaccination:</span>
                          <span className="font-bold text-foreground text-xs">
                            {currentPet.lastVaccinationDate || "None recorded"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Next Due:</span>
                          <span className="font-bold text-foreground text-xs">
                            {currentPet.nextVaccinationDate ||
                              (vaxStatus.isVaccinated
                                ? "1 Year from dose"
                                : "Immediate schedule required")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Registered Pet Owner Card ── */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card/60 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <User className="size-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground leading-tight">
                              Registered Pet Owner
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              Official CDO Citizen & Custodian Record
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-primary border-primary/30 bg-primary/5"
                        >
                          Verified Citizen
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <Avatar className="size-10 border border-border shadow-xs shrink-0">
                          <AvatarImage src={currentPet.ownerAvatarUrl || undefined} alt={currentPet.owner} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                            {currentPet.owner ? currentPet.owner.charAt(0).toUpperCase() : "O"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate">
                              {currentPet.owner}
                            </span>
                            {currentPet.ownerId && (
                              <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground border border-border/60">
                                ID: {currentPet.ownerId.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                            <span className="truncate">
                              {currentPet.address || "District Proper"}, {currentPet.barangay}
                            </span>
                          </p>
                          {currentPet.ownerEmail && (
                            <p className="text-[10.5px] text-muted-foreground/80 truncate font-mono">
                              {currentPet.ownerEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Biological & Physical Profile */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-card/40 space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <PawIcon className="size-3.5 text-primary" />
                        <span>Biological & Municipal Profile</span>
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Classification</span>
                          <span className="font-semibold text-foreground">
                            {currentPet.classification || "Domestic"}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Tag / Microchip</span>
                          <span className="font-mono font-bold text-primary truncate block">
                            #{currentPet.microchip || currentPet.id.slice(0, 8)}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/40 border border-border/40">
                          <span className="text-[10px] text-muted-foreground block">Sterilization</span>
                          <span className="font-semibold text-foreground">
                            {currentPet.sterilized ? "Spayed / Neutered" : "Intact"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Appointments & Consultations for this pet */}
                    {(petDbAppointments.length > 0 || petConsultations.some((c) => c.status !== "completed")) && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <CalendarClock className="size-3.5 text-primary" />
                          <span>Scheduled Activities for {currentPet.name}</span>
                        </h4>

                        {petDbAppointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5 text-xs">
                              <span className="font-bold text-foreground block">
                                {apt.service_id || "Veterinary Care"}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                <Calendar className="size-3" /> {(apt.date || "").split("T")[0]}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-[10px] font-semibold text-primary border-primary/30"
                            >
                              {apt.status || "Scheduled"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Clinical Encounters & Consultation History for this pet */}
                    {petConsultations.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Stethoscope className="size-3.5 text-primary" />
                            <span>Clinical Encounters & Consultation History</span>
                          </h4>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold text-muted-foreground border-border/80"
                          >
                            {petConsultations.length} {petConsultations.length === 1 ? "Record" : "Records"}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {petConsultations.map((c) => {
                            const isCompleted = c.status === "completed";
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  "p-3 rounded-xl border space-y-2 transition-all",
                                  isCompleted
                                    ? "bg-emerald-500/5 border-emerald-500/20"
                                    : "bg-muted/30 border-border/70"
                                )}
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10.5px] font-bold text-foreground bg-background px-1.5 py-0.5 rounded border border-border/70">
                                      #{c.encounterNo || c.id}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-[9px] font-bold uppercase tracking-wider gap-1",
                                        isCompleted
                                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                          : "bg-muted text-muted-foreground border-border/60"
                                      )}
                                    >
                                      {isCompleted ? (
                                        <>
                                          <CheckCircle2 className="size-2.5 text-emerald-600" />
                                          Completed
                                        </>
                                      ) : (
                                        c.status.toUpperCase()
                                      )}
                                    </Badge>
                                  </div>

                                  <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                                    <Calendar className="size-3" />
                                    {c.date} • {c.time || "Intake"}
                                  </span>
                                </div>

                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-bold text-foreground text-xs">
                                      {c.serviceType || "Clinical Assessment"}
                                    </p>
                                    {c.vetName && (
                                      <span className="text-[10px] text-muted-foreground italic font-serif">
                                        Attending Vet: {c.vetName}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-muted-foreground leading-snug">
                                    <strong className="text-foreground">Reason:</strong> {c.chiefComplaint || "General checkup"}
                                  </p>

                                  {c.diagnosis && c.diagnosis !== "Pending Clinical Examination" && (
                                    <div className="text-[11px] text-foreground bg-background/80 p-2 rounded-lg border border-border/60 space-y-0.5 mt-1">
                                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                                        Official Diagnosis: {c.diagnosis}
                                      </p>
                                      {c.treatment && (
                                        <p className="text-muted-foreground text-[10.5px]">
                                          Treatment: {c.treatment}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedConsultationForSheet(c);
                                      setConsultationSheetOpen(true);
                                    }}
                                    className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg cursor-pointer bg-background hover:bg-muted"
                                  >
                                    <FileText className="size-3 text-primary" />
                                    <span>Official CVO Paper</span>
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── DIGITAL PET PASSPORT TAB ── */}
                {activeProfileTab === "passport" && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <QrCode className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Digital Pet Passport for {currentPet.name}
                          </h4>
                          <p className="text-[10px] text-muted-foreground">
                            Official Cagayan de Oro LGU Companion Animal Identification
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Download QR Only Icon Button */}
                        <button
                          type="button"
                          onClick={handleDownloadQrOnly}
                          className="size-7 rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
                          title="Download QR Code (PNG)"
                        >
                          <Download className="size-3.5" />
                          <span className="sr-only">Download QR Code</span>
                        </button>

                        {/* Verify Record Link Icon Button */}
                        <a
                          href={passportVerifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="size-7 rounded-lg border border-border/70 bg-background hover:bg-muted text-foreground hover:text-primary transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
                          title="Verify Medical Record"
                        >
                          <ExternalLink className="size-3.5" />
                          <span className="sr-only">Verify Record</span>
                        </a>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveProfileTab("overview")}
                          className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          Back to Overview
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border border-border/70 bg-card/60 shadow-2xs space-y-3 text-center">
                      {qrCodeUrl ? (
                        <div className="p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-sm transition-transform hover:scale-102">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrCodeUrl} alt="Pet Passport QR Code" className="size-44 sm:size-48" />
                        </div>
                      ) : (
                        <div className="size-44 flex items-center justify-center bg-muted rounded-2xl border">
                          <QrCode className="size-10 text-muted-foreground animate-pulse" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className="text-xs font-mono font-bold text-primary border-primary/30 bg-primary/5 px-2.5 py-0.5"
                        >
                          Tag ID: #{currentPet.microchip || currentPet.id}
                        </Badge>
                        <p className="text-xs text-muted-foreground font-medium pt-0.5">
                          {currentPet.name} • {currentPet.species} • {currentPet.breed || "Standard"}
                        </p>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed max-w-sm">
                        Present this official QR passport during mobile vaccination drives, spay/neuter outreach, or CVO clinic visits for instant medical history retrieval.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── CLINICAL CONSULTATIONS TAB ── */}
                {activeProfileTab === "consultation" && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Stethoscope className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Clinical Encounters for {currentPet.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Veterinary diagnoses, consultations & health checkups
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveProfileTab("overview")}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Back to Overview
                      </Button>
                    </div>

                    {petConsultations.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No clinical consultations logged for {currentPet.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {petConsultations.map((c) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/70">
                                #{c.encounterNo || c.id}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                <Calendar className="size-3.5" />
                                {c.date} • {c.time || "Intake"}
                              </span>
                            </div>
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-foreground text-sm">
                                {c.chiefComplaint || "General Clinical Care"}
                              </p>
                              {c.diagnosis && (
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  Diagnosis: {c.diagnosis}
                                </p>
                              )}
                              {c.treatment && (
                                <p className="text-[11px] text-muted-foreground">
                                  Treatment: {c.treatment}
                                </p>
                              )}
                              {c.vetName && (
                                <p className="text-[10px] text-muted-foreground italic font-serif pt-0.5">
                                  Attending Veterinarian: {c.vetName}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-end pt-1 border-t border-border/40">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedConsultationForSheet(c);
                                  setConsultationSheetOpen(true);
                                }}
                                className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg cursor-pointer bg-background hover:bg-muted"
                              >
                                <FileText className="size-3 text-primary" />
                                <span>Official CVO Paper</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── PROCEDURES & APPOINTMENTS TAB ── */}
                {activeProfileTab === "procedure" && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <Calendar className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Scheduled Procedures for {currentPet.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Vaccination appointments and Kapon surgical reservations
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveProfileTab("overview")}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Back to Overview
                      </Button>
                    </div>

                    {petDbAppointments.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No procedure appointments currently recorded for {currentPet.name}.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {petDbAppointments.map((apt: any) => (
                          <div
                            key={apt.id}
                            className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">
                                {apt.service_id || "Veterinary Procedure"}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold text-primary border-primary/30"
                              >
                                {apt.status || "Scheduled"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                              <Calendar className="size-3.5" />
                              {(apt.date || "").split("T")[0]} {apt.time_slot ? `• ${apt.time_slot}` : ""}
                            </p>
                            {apt.notes && (
                              <p className="text-[11px] text-muted-foreground">
                                Notes: {apt.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── MEDICAL RECORDS TAB ── */}
                {activeProfileTab === "records" && (
                  <div className="space-y-3 animate-in fade-in-0 duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-border/70">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                          <FileText className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Electronic Medical Records for {currentPet.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Chronological medical history, vaccinations & procedures
                          </p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveProfileTab("overview")}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Back to Overview
                      </Button>
                    </div>

                    {petMedicalHistory.length === 0 ? (
                      <div className="py-8 text-center text-xs text-muted-foreground">
                        No medical history recorded for {currentPet.name} yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {petMedicalHistory.map((item, idx) => (
                          <div
                            key={`${item.id}-${idx}`}
                            className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-foreground">
                                {item.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[9.5px] font-bold text-primary border-primary/30"
                              >
                                {item.category}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground space-y-0.5">
                              <p className="font-mono text-[10.5px]">
                                Date: {item.date} • Attending: {item.vetName}
                              </p>
                              {item.treatment && <p>Treatment: {item.treatment}</p>}
                              {item.medication && <p>Rx / Lot: {item.medication}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right Side: Expanded Pet Avatar Selector Panel (Strictly matching species, 4 Columns - Image 3) ── */}
            {showAvatarPickerPanel && (
              <div className="w-[340px] sm:w-[390px] md:w-[430px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* Panel Header */}
                <div className="p-3.5 px-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Camera className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        Choose Photo
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {isCat ? "Feline Profiles Only" : "Canine Profiles Only"} • {currentPet.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAvatarPickerPanel(false)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                    title="Close photo selector"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Avatars Grid (4 Columns, Smooth Scrolling) */}
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
                    <span className="text-[10.5px] font-medium text-muted-foreground">
                      {isCat ? "Cats only choose cat profiles" : "Dogs only choose dog profiles"}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                      {availableSpeciesAvatars.length} Avatars
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {availableSpeciesAvatars.map((avatar) => {
                      const isSelected = currentPet.photo_url === avatar.url;
                      return (
                        <button
                          key={avatar.id}
                          type="button"
                          disabled={savingPetAvatar}
                          onClick={() => handleDirectAvatarSelect(avatar.url, avatar.label)}
                          className={cn(
                            "relative group flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left focus:outline-none",
                            isSelected
                              ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs scale-[1.02]"
                              : "border-border/60 bg-muted/20 hover:bg-accent/40 hover:border-border hover:scale-[1.03]"
                          )}
                          title={`Select ${avatar.label}`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 z-10 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="size-2.5 stroke-[3]" />
                            </div>
                          )}
                          <div className="size-12 sm:size-13 flex items-center justify-center p-0.5">
                            <PetAvatar
                              photoUrl={avatar.url}
                              species={currentPet.species}
                              name={avatar.label}
                              size="sm"
                            />
                          </div>
                          <span
                            className={cn(
                              "mt-1 text-[8.5px] sm:text-[9px] font-medium text-center truncate w-full px-0.5 leading-tight",
                              isSelected
                                ? "text-emerald-600 dark:text-emerald-400 font-bold"
                                : "text-muted-foreground"
                            )}
                          >
                            {avatar.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Right Side: Edit Pet Details Panel (Matching Image 2) ── */}
            {showEditPetPanel && (
              <div className="w-[320px] sm:w-[360px] md:w-[390px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                {/* Panel Header */}
                <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <Pencil className="size-3.5" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground truncate">
                        Edit Pet Details
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      Update basic info for {currentPet.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEditPetPanel(false)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                    title="Close edit panel"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Form Inputs Area */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {/* Pet Name Input */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      Pet Name <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={editPetName}
                      onChange={(e) => setEditPetName(e.target.value)}
                      placeholder="e.g. Cadmus"
                      className="h-8 text-xs px-2.5 rounded-lg"
                    />
                  </div>

                  {/* Breed Dropdown */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-foreground">Breed</label>
                      <span className="text-[9.5px] text-muted-foreground font-mono">
                        {isCat ? "Feline Breeds" : "Canine Breeds"}
                      </span>
                    </div>
                    <Select value={editPetBreed} onValueChange={setEditPetBreed}>
                      <SelectTrigger className="w-full h-8 text-xs px-2.5 rounded-lg">
                        <SelectValue placeholder="Select breed" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {breedOptions.map((b) => (
                          <SelectItem key={b} value={b} className="text-xs">
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Weight Input in kg */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-foreground">Weight</label>
                      <span className="text-[9.5px] text-muted-foreground">in Kilograms (kg)</span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="150"
                        value={editPetWeight}
                        onChange={(e) => setEditPetWeight(e.target.value)}
                        placeholder="e.g. 48"
                        className="h-8 text-xs px-2.5 pr-8 rounded-lg"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground pointer-events-none">
                        kg
                      </span>
                    </div>
                  </div>

                  {/* Municipal Registration Locks */}
                  <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-muted-foreground">
                      <Lock className="size-3 text-muted-foreground" />
                      <span>Municipal Registration Locks</span>
                    </div>
                    <p className="text-[9.5px] text-muted-foreground leading-relaxed">
                      Species and gender are permanent municipal identification parameters and cannot be altered after registration.
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-md bg-background border text-foreground/80">
                        Species: <strong>{currentPet.species}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium px-2 py-0.5 rounded-md bg-background border text-foreground/80">
                        Gender: <strong>{currentPet.sex === "Female" ? "Female ♀" : "Male ♂"}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Panel Footer Actions (Cancel & Save Changes matching Image 2) */}
                <div className="p-4 border-t border-border/70 bg-muted/30 flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditPetName(currentPet.name || "");
                      setEditPetBreed(currentPet.breed || "");
                      setEditPetWeight(currentPet.weightKg != null ? String(currentPet.weightKg) : "");
                      setShowEditPetPanel(false);
                    }}
                    className="flex-1 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePetUpdates}
                    disabled={savingPetUpdates || !hasUnsavedChanges}
                    className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer disabled:opacity-50"
                  >
                    {savingPetUpdates ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    <span>Save Changes</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Official CVO Consultation Sheet Dialog ── */}
      <OfficialConsultationSheetDialog
        open={consultationSheetOpen}
        onOpenChange={setConsultationSheetOpen}
        consultation={selectedConsultationForSheet}
      />

      {/* ── Official Delete Pet Dialog ── */}
      <DeletePetDialog
        pet={currentPet}
        open={deletePetDialogOpen}
        onOpenChange={setDeletePetDialogOpen}
        onDeleted={() => {
          setDeletePetDialogOpen(false);
          onOpenChange(false);
          if (onDeletePet && currentPet) {
            onDeletePet(currentPet);
          }
        }}
      />
    </>
  );
}
