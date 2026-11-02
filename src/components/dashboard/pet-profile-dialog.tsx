"use client";

import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
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
  HeartPulse,
  Clock,
  Phone,
  Info,
  ChevronRight,
  Scale,
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
import { cn, getTodayDateString, isTodayDate } from "@/lib/utils";
import { toast } from "sonner";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { AdministerVaccinationDialog } from "@/components/dashboard/administer-vaccination-dialog";
import { CompleteSurgeryDialog } from "@/components/dashboard/complete-surgery-dialog";
import { ClinicalExaminationDialog } from "@/components/dashboard/clinical-examination-dialog";
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

function formatAptDate(dateStr?: string) {
  if (!dateStr) return "Scheduled Date";
  try {
    const clean = dateStr.split("T")[0];
    const parts = clean.split("-").map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  } catch {}
  return dateStr;
}

function formatTimeSlot(slot?: string) {
  // CVO services operate from 8:00 AM to 5:00 PM without separate morning or afternoon sessions
  if (!slot) return "08:00 AM – 05:00 PM";
  const s = slot.toLowerCase();
  if (
    s.includes("morn") ||
    s.includes("after") ||
    s.includes("noon") ||
    s.includes("session") ||
    s.includes("shift") ||
    s === "default" ||
    s.includes("12:00")
  ) {
    return "08:00 AM – 05:00 PM";
  }
  return slot;
}

function extractPhone(notes?: string) {
  if (!notes) return null;
  const match = notes.match(/(\b09\d{9}\b|\+?63\d{10}\b)/);
  return match ? match[1] : null;
}

function getActivityMeta(item: any) {
  if (!item) {
    return {
      title: "Activity Details",
      subtitle: "Official CVO Veterinary Record",
      checklist: "Please arrive 15 minutes before your schedule at the City Veterinary Office.",
      isVax: false,
      isSurgery: false,
      isConsult: false,
      isFollowUp: false,
    };
  }
  const rawService = (item.title || "").toLowerCase();
  const isVax =
    rawService.includes("vax") ||
    rawService.includes("vaccin") ||
    rawService.includes("rabies") ||
    item.type === "vaccination-due" ||
    item.type === "vaccination";
  const isSurgery =
    rawService.includes("spay") ||
    rawService.includes("neuter") ||
    rawService.includes("kapon");
  const isConsult =
    item.type === "encounter" ||
    item.type === "consultation" ||
    rawService.includes("consult");
  const isFollowUp = item.type === "follow-up";

  const title = isVax
    ? "Anti-Rabies Prophylaxis & Core Vaccination"
    : isSurgery
    ? "Spay & Neuter (Kapon) Surgical Procedure"
    : isConsult
    ? "Clinical Veterinary Consultation & Exam"
    : isFollowUp
    ? "Post-Operative Suture Removal & Recovery Check"
    : item.title?.charAt(0).toUpperCase() + item.title?.slice(1);

  const subtitle = isVax
    ? "Official CVO Rabies Elimination & Public Health Drive (RA 9482)"
    : isSurgery
    ? "CVO Surgical Sterilization & Companion Animal Population Control"
    : isConsult
    ? "Outpatient Medical Triage & Clinical Health Assessment"
    : isFollowUp
    ? "Surgical Incision Assessment & Suture Extraction Follow-Up"
    : "City Veterinary Healthcare Service";

  const checklist = isVax
    ? "Present this digital passport or physical booklet upon arrival. Pet must be healthy and active with no fever or signs of illness."
    : isSurgery
    ? "Strict 8-hour fasting before scheduled surgery (no food). Bring a clean towel, recovery collar (E-collar), and pet crate / leash."
    : isConsult
    ? "Proceed to the CVO intake counter for vital signs & temperature checkup upon arrival."
    : isFollowUp
    ? "Inspect incision site for complete wound closure. Attending vet will remove sutures and check recovery."
    : "Please arrive 15 minutes before your scheduled window at the City Veterinary Office.";

  return { title, subtitle, checklist, isVax, isSurgery, isConsult, isFollowUp };
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
    "overview" | "passport" | "consultation" | "procedure" | "review" | "records"
  >("overview");

  // Side panels matching images 2 & 3
  const [showEditPetPanel, setShowEditPetPanel] = useState(false);
  const [showAvatarPickerPanel, setShowAvatarPickerPanel] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<any | null>(null);

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

  // Internal dialog state for direct service administration / review
  const [internalVaxOpen, setInternalVaxOpen] = useState(false);
  const [internalSurgeryOpen, setInternalSurgeryOpen] = useState(false);
  const [internalExamOpen, setInternalExamOpen] = useState(false);
  const [selectedEncounterForAction, setSelectedEncounterForAction] = useState<any | null>(null);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, string>>({});

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Sync currentPet when pet prop changes
  useEffect(() => {
    setCurrentPet((prev) => {
      if (!pet && !prev) return null;
      if (
        pet &&
        prev &&
        pet.id === prev.id &&
        pet.createdAt === prev.createdAt &&
        pet.name === prev.name &&
        pet.breed === prev.breed &&
        pet.weightKg === prev.weightKg &&
        pet.photo_url === prev.photo_url
      ) {
        return prev;
      }
      return pet;
    });
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

  // Synthesize or retrieve queue encounter for direct service administration & review
  const buildQueueEncounterForService = (category: "vaccination" | "spay-neuter" | "consultation"): any => {
    if (encounter && encounter.category === category) {
      return encounter;
    }
    const matchingAppt = petDbAppointments.find((a: any) => {
      if (category === "vaccination") return a.service_id?.includes("vax") || a.service_id?.includes("rabies");
      if (category === "spay-neuter") return a.service_id?.includes("spay") || a.service_id?.includes("neuter") || a.service_id?.includes("kapon");
      return true;
    });

    return {
      id: matchingAppt?.id || encounter?.id || currentPet?.id || "synthetic-enc",
      encounterNo: matchingAppt?.id || encounter?.encounterNo || currentPet?.microchip || `CVO-${currentPet?.id?.slice(0, 6) || "CLINIC"}`,
      petId: currentPet?.id || "",
      petName: currentPet?.name || "Patient",
      species: currentPet?.species || "Canine",
      breed: currentPet?.breed || "Mixed",
      age: currentPet?.age || "Adult",
      sex: currentPet?.sex || "Male",
      ownerName: currentPet?.owner || "Pet Owner",
      ownerPhone: "",
      ownerAddress: currentPet?.barangay || "Carmen, CDO",
      weight: currentPet?.weightKg || 5,
      serviceType:
        category === "vaccination"
          ? "Anti-Rabies Prophylaxis & Core Vaccination"
          : category === "spay-neuter"
          ? "Spay & Neuter (Kapon Surgery)"
          : "Clinical Consultation & Examination",
      category,
      date: matchingAppt?.date || encounter?.date || getTodayDateString(),
      time: matchingAppt?.time_slot || encounter?.time || "08:00 AM - 05:00 PM",
      status: (matchingAppt?.status as any) || (encounter?.status as any) || "waiting",
      chiefComplaint:
        category === "vaccination"
          ? "Rabies prevention & immunization"
          : category === "spay-neuter"
          ? "Population control & reproductive sterilization"
          : encounter?.chiefComplaint || (petConsultations[0]?.chiefComplaint || "General medical consultation & physical examination"),
      notes: matchingAppt?.notes || encounter?.notes || "",
      isOverdue: false,
      petPhotoUrl: currentPet?.photo_url || "",
    };
  };

  const handleStatusChange = (category: "vaccination" | "spay-neuter" | "consultation", newStatus: string) => {
    setServiceStatuses((prev) => ({ ...prev, [category]: newStatus }));
    const enc = buildQueueEncounterForService(category);
    enc.status = newStatus;
    if (onUpdateEncounterStatus) {
      onUpdateEncounterStatus(enc, newStatus);
    }
  };

  const handleAdministerVaccine = () => {
    const enc = buildQueueEncounterForService("vaccination");
    if (onAdministerVaccine) {
      onAdministerVaccine(enc);
    } else {
      setSelectedEncounterForAction(enc);
      setInternalVaxOpen(true);
    }
  };

  const handleCompleteSurgery = () => {
    const enc = buildQueueEncounterForService("spay-neuter");
    if (onCompleteSurgery) {
      onCompleteSurgery(enc);
    } else {
      setSelectedEncounterForAction(enc);
      setInternalSurgeryOpen(true);
    }
  };

  const handleFillExamination = () => {
    const enc = buildQueueEncounterForService("consultation");
    if (onFillExamination) {
      onFillExamination(enc);
    } else {
      setSelectedEncounterForAction(enc);
      setInternalExamOpen(true);
    }
  };

  const handleViewOfficialSheet = () => {
    const enc = buildQueueEncounterForService("consultation");
    if (onViewOfficialSheet) {
      onViewOfficialSheet(enc);
    } else {
      setSelectedConsultationForSheet(enc);
      setConsultationSheetOpen(true);
    }
  };

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

  // Compute Next Scheduled / Upcoming and Past History items
  const { upcomingSchedule, pastHistory } = useMemo(() => {
    const upcoming: Array<{
      id: string;
      type: "appointment" | "encounter" | "follow-up" | "vaccination-due";
      title: string;
      date: string;
      time?: string;
      status: string;
      notes?: string;
      vetName?: string;
      chiefComplaint?: string;
      raw?: any;
    }> = [];

    const history: Array<{
      id: string;
      type: "procedure" | "consultation" | "vaccination";
      title: string;
      date: string;
      time?: string;
      status: string;
      notes?: string;
      vetName?: string;
      diagnosis?: string;
      treatment?: string;
      chiefComplaint?: string;
      encounterNo?: string;
      raw?: any;
    }> = [];

    // 1. Process Database Appointments
    petDbAppointments.forEach((apt: any) => {
      const isCompleted = apt.status?.toLowerCase() === "completed";
      const dateStr = (apt.date || "").split("T")[0];

      if (isCompleted) {
        history.push({
          id: apt.id,
          type: "procedure",
          title: apt.service_id || "Veterinary Procedure",
          date: dateStr,
          time: apt.time_slot,
          status: "completed",
          notes: apt.notes,
          raw: apt,
        });

        // Detect follow-up (e.g. Suture removal) from surgical notes
        if (apt.notes) {
          const sutureMatch = apt.notes.match(/Suture removal:\s*([^.\n]+)/i);
          if (sutureMatch && sutureMatch[1]) {
            upcoming.push({
              id: `followup-suture-${apt.id}`,
              type: "follow-up",
              title: "Suture Removal Follow-Up",
              date: sutureMatch[1].trim(),
              status: "upcoming",
              notes: "Post-operative suture removal & surgical incision inspection.",
              vetName: "CVO Surgical Team",
            });
          }
        }
      } else {
        upcoming.push({
          id: apt.id,
          type: "appointment",
          title: apt.service_id || "Veterinary Procedure",
          date: dateStr,
          time: apt.time_slot,
          status: apt.status || "scheduled",
          notes: apt.notes,
          raw: apt,
        });
      }
    });

    // 2. Process Consultations
    petConsultations.forEach((c) => {
      const isCompleted = c.status?.toLowerCase() === "completed";
      if (!isCompleted && c.status) {
        upcoming.push({
          id: c.encounterNo || c.id,
          type: "encounter",
          title: c.serviceType || "Field Treatment/Consultation",
          date: c.date,
          time: c.time,
          status: c.status || "waiting",
          chiefComplaint: c.chiefComplaint,
          vetName: c.vetName,
          raw: c,
        });
      } else {
        history.push({
          id: c.encounterNo || c.id,
          type: "consultation",
          title: c.serviceType || "Field Treatment/Consultation",
          date: c.date,
          time: c.time,
          status: c.status || "completed",
          chiefComplaint: c.chiefComplaint,
          diagnosis: c.diagnosis,
          treatment: c.treatment,
          vetName: c.vetName,
          encounterNo: c.encounterNo,
          raw: c,
        });
      }
    });

    // 3. Process Vaccinations
    petDbVaccinations.forEach((v: any) => {
      history.push({
        id: v.id || `vax-${v.batch_number}`,
        type: "vaccination",
        title: `${v.vaccine_type || "Anti-Rabies Prophylaxis"} (Lot #${v.batch_number || "RB-2026"})`,
        date: v.date_administered || v.created_at?.split("T")[0] || "2026-10-28",
        status: "administered",
        treatment: "1.0 mL Subcutaneous (SC) Injection",
        vetName: v.administering_vet || "Dr. Helen Ann P. Tacandong, DVM",
        notes: `Batch #${v.batch_number || "RB-2026"}`,
        raw: v,
      });
    });

    // 4. Next Core Rabies Vaccination Due (if recorded)
    if (currentPet?.nextVaccinationDate) {
      upcoming.push({
        id: `vax-next-due-${currentPet.id}`,
        type: "vaccination-due",
        title: "Anti-Rabies Core Annual Booster",
        date: currentPet.nextVaccinationDate,
        status: vaxStatus.isVaccinated ? "scheduled" : "due",
        notes: "Municipal rabies immunization booster (RA 9482 compliance). Free at CVO City Clinic.",
        vetName: "CVO Vaccination Team",
      });
    }

    return { upcomingSchedule: upcoming, pastHistory: history };
  }, [petDbAppointments, petConsultations, petDbVaccinations, currentPet, vaxStatus]);

  // Determine the date in focus for clinical review (scheduled date or today)
  const activeReviewDate = useMemo(() => {
    if (encounter?.date) {
      return encounter.date.split("T")[0];
    }
    if (upcomingSchedule.length > 0 && upcomingSchedule[0].date) {
      return upcomingSchedule[0].date.split("T")[0];
    }
    return getTodayDateString();
  }, [encounter, upcomingSchedule]);

  // Check if pet really has a Vaccination for that certain day
  const scheduledVaxForDay = useMemo(() => {
    // 1. Encounter passed directly to dialog - MUST be category === "vaccination"
    if (encounter && encounter.category === "vaccination") {
      const d = (encounter.date || "").split("T")[0];
      if (!d || d === activeReviewDate) {
        return encounter;
      }
    }

    // 2. Database appointment strictly for this pet and activeReviewDate
    const fromDb = petDbAppointments.find((a: any) => {
      const d = (a.date || "").split("T")[0];
      const s = (a.service_id || "").toLowerCase();
      const isCancelled = a.status?.toLowerCase() === "cancelled";
      return !isCancelled && d === activeReviewDate && (s.includes("vax") || s.includes("rabies"));
    });
    if (fromDb) return fromDb;

    // 3. Upcoming schedule item strictly for this date
    const fromUpcoming = upcomingSchedule.find((item) => {
      const d = item.date?.split("T")[0];
      return (
        d === activeReviewDate &&
        item.status !== "cancelled" &&
        (item.title?.toLowerCase().includes("vax") ||
          item.title?.toLowerCase().includes("rabies") ||
          item.type === "vaccination-due")
      );
    });
    return fromUpcoming || null;
  }, [encounter, upcomingSchedule, petDbAppointments, activeReviewDate]);

  // Check if pet really has a Spay / Neuter (Kapon) for that certain day
  const scheduledSurgeryForDay = useMemo(() => {
    // 1. Encounter passed directly to dialog - MUST be category === "spay-neuter"
    if (encounter && encounter.category === "spay-neuter") {
      const d = (encounter.date || "").split("T")[0];
      if (!d || d === activeReviewDate) {
        return encounter;
      }
    }

    // 2. Database appointment strictly for this pet and activeReviewDate
    const fromDb = petDbAppointments.find((a: any) => {
      const d = (a.date || "").split("T")[0];
      const s = (a.service_id || "").toLowerCase();
      const isCancelled = a.status?.toLowerCase() === "cancelled";
      return !isCancelled && d === activeReviewDate && (s.includes("spay") || s.includes("neuter") || s.includes("kapon"));
    });
    if (fromDb) return fromDb;

    // 3. Upcoming schedule item strictly for this date
    const fromUpcoming = upcomingSchedule.find((item) => {
      const d = item.date?.split("T")[0];
      return (
        d === activeReviewDate &&
        item.status !== "cancelled" &&
        (item.title?.toLowerCase().includes("spay") ||
          item.title?.toLowerCase().includes("neuter") ||
          item.title?.toLowerCase().includes("kapon") ||
          item.type === "follow-up")
      );
    });
    return fromUpcoming || null;
  }, [encounter, upcomingSchedule, petDbAppointments, activeReviewDate]);

  // Check if pet really has a Consultation for that certain day
  const scheduledConsultForDay = useMemo(() => {
    // 1. Encounter passed directly to dialog - MUST be category === "consultation"
    if (encounter && encounter.category === "consultation") {
      const d = (encounter.date || "").split("T")[0];
      if (!d || d === activeReviewDate) {
        return encounter;
      }
    }

    // 2. Database appointment strictly for this pet and activeReviewDate
    const fromDb = petDbAppointments.find((a: any) => {
      const d = (a.date || "").split("T")[0];
      const s = (a.service_id || "").toLowerCase();
      const isCancelled = a.status?.toLowerCase() === "cancelled";
      return !isCancelled && d === activeReviewDate && (s.includes("consult") || s.includes("checkup") || s.includes("exam"));
    });
    if (fromDb) return fromDb;

    // 3. Consultations recorded strictly for this date
    const fromConsults = petConsultations.find((c) => {
      const d = (c.date || "").split("T")[0];
      const isCancelled = c.status?.toLowerCase() === "cancelled";
      return !isCancelled && d === activeReviewDate;
    });
    if (fromConsults) return fromConsults;

    // 4. Upcoming schedule item strictly for this date
    const fromUpcoming = upcomingSchedule.find((item) => {
      const d = item.date?.split("T")[0];
      return (
        d === activeReviewDate &&
        item.status !== "cancelled" &&
        item.type === "encounter" &&
        item.raw?.category === "consultation"
      );
    });
    return fromUpcoming || null;
  }, [encounter, upcomingSchedule, petConsultations, petDbAppointments, activeReviewDate]);

  const hasAnyScheduledServiceForDay = Boolean(
    scheduledVaxForDay || scheduledSurgeryForDay || scheduledConsultForDay
  );

  if (!currentPet) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "w-full p-0 bg-transparent border-0 shadow-none transition-all duration-300 ease-in-out h-[88vh] max-h-[88vh] flex flex-col overflow-x-hidden",
            showAvatarPickerPanel || showEditPetPanel || !!selectedActivityDetail
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
                      setSelectedActivityDetail(null);
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

                  {/* Care Schedule & Clinical Encounters (Stethoscope) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileTab((prev) => (prev === "consultation" ? "overview" : "consultation"));
                      setShowEditPetPanel(false);
                      setShowAvatarPickerPanel(false);
                      setSelectedActivityDetail(null);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeProfileTab === "consultation"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeProfileTab === "consultation" ? "Close Care Schedule View" : "Care Schedule & Medical Encounters Timeline"}
                  >
                    <Stethoscope className="size-4 text-white" />
                    <span className="sr-only">Care Schedule & Encounters</span>
                  </button>

                  {/* Clinical Services Review & Administration (ClipboardCheck - Replaced Calendar) */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProfileTab((prev) => (prev === "review" ? "overview" : "review"));
                      setShowEditPetPanel(false);
                      setShowAvatarPickerPanel(false);
                      setSelectedActivityDetail(null);
                    }}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                      activeProfileTab === "review"
                        ? "bg-white/30 text-white border-white/60 ring-2 ring-white/40 shadow-md scale-105"
                        : "bg-white/10 hover:bg-white/25 text-white border-white/20 hover:border-white/40 backdrop-blur-md"
                    )}
                    title={activeProfileTab === "review" ? "Close Clinical Services Review" : "Clinical Services Review & Administration (Vaccines, Kapon, Consultations)"}
                  >
                    <HeartPulse className="size-4 text-white" />
                    <span className="sr-only">Clinical Services Review & Administration</span>
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
                        setSelectedActivityDetail(null);
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
                            setSelectedActivityDetail(null);
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
                            setSelectedActivityDetail(null);
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
                  "flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
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

                {/* ── CARE SCHEDULE & CLINICAL ENCOUNTERS TAB ── */}
                {activeProfileTab === "consultation" && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <CalendarClock className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground">
                            Care Schedule & Clinical Encounters for {currentPet.name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Official appointments, scheduled follow-ups & medical encounter history
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

                    {/* SECTION 1: NEXT SCHEDULED & UPCOMING ACTIVITIES */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between pt-0.5">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-primary" />
                          <span>Next Scheduled & Upcoming Activities</span>
                        </h5>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold border-primary/30",
                            upcomingSchedule.length > 0
                              ? "bg-primary/10 text-primary border-primary/40 font-bold"
                              : "text-muted-foreground"
                          )}
                        >
                          {upcomingSchedule.length > 0 ? `${upcomingSchedule.length} Scheduled` : "None"}
                        </Badge>
                      </div>

                      {upcomingSchedule.length === 0 ? (
                        <div className="p-4 rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-1">
                          <CalendarClock className="size-5 text-muted-foreground/60 mx-auto" />
                          <p className="text-xs font-semibold text-foreground">
                            No Upcoming Activities Scheduled
                          </p>
                          <p className="text-[10.5px] text-muted-foreground">
                            There are no active or pending appointments for {currentPet.name}.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {upcomingSchedule.map((item) => {
                            const meta = getActivityMeta(item);
                            const formattedDate = formatAptDate(item.date);
                            const formattedSession = formatTimeSlot(item.time);
                            const refId = `#APT-${item.id.slice(0, 8).toUpperCase()}`;
                            const isSelected = selectedActivityDetail?.id === item.id;

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedActivityDetail((prev: any) =>
                                    prev?.id === item.id ? null : item
                                  );
                                  setShowEditPetPanel(false);
                                  setShowAvatarPickerPanel(false);
                                }}
                                className={cn(
                                  "p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none",
                                  isSelected
                                    ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                                    : "bg-card/70 hover:bg-card/95 border-border/70 hover:border-primary/40"
                                )}
                              >
                                {/* Left icon + service details */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={cn(
                                      "size-8 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
                                      meta.isVax
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                        : meta.isSurgery
                                        ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                        : meta.isConsult
                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
                                        : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
                                    )}
                                  >
                                    {meta.isVax ? (
                                      <Syringe className="size-4" />
                                    ) : meta.isSurgery ? (
                                      <Scissors className="size-4" />
                                    ) : meta.isConsult ? (
                                      <Stethoscope className="size-4" />
                                    ) : (
                                      <CalendarClock className="size-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h4 className="font-bold text-xs sm:text-sm text-foreground tracking-tight truncate max-w-[260px] sm:max-w-xs">
                                        {meta.title}
                                      </h4>
                                      <span className="text-[10px] font-mono text-muted-foreground/80 hidden sm:inline">
                                        {refId}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium pt-0.5">
                                      <span className="flex items-center gap-1 text-foreground/80">
                                        <Calendar className="size-3 text-primary shrink-0" />
                                        {formattedDate}
                                      </span>
                                      <span>•</span>
                                      <span className="truncate">{formattedSession}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: status badge & Details button */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 border shadow-2xs hidden sm:inline-flex",
                                      item.status === "confirmed"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                                        : item.status === "waiting"
                                        ? "bg-amber-50 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                                        : "bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                                    )}
                                  >
                                    {item.status === "confirmed" ? (
                                      <>
                                        <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
                                        <span>Confirmed</span>
                                      </>
                                    ) : item.status === "waiting" ? (
                                      <>
                                        <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.2]" />
                                        <span>In Queue</span>
                                      </>
                                    ) : (
                                      <>
                                        <Calendar className="size-3 text-blue-600 dark:text-blue-400 shrink-0 stroke-[2.2]" />
                                        <span>Scheduled</span>
                                      </>
                                    )}
                                  </span>

                                  <Button
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedActivityDetail((prev: any) =>
                                        prev?.id === item.id ? null : item
                                      );
                                      setShowEditPetPanel(false);
                                      setShowAvatarPickerPanel(false);
                                    }}
                                    className={cn(
                                      "h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg shrink-0 cursor-pointer shadow-2xs",
                                      isSelected
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-background hover:bg-muted text-foreground border-border/80"
                                    )}
                                  >
                                    <span>Details</span>
                                    <ChevronRight className={cn("size-3 transition-transform", isSelected && "rotate-90 sm:rotate-0")} />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: PAST ENCOUNTERS & MEDICAL HISTORY */}
                    <div className="space-y-2.5 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between pt-0.5">
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                          <span>Past Encounters & Medical History</span>
                        </h5>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold text-muted-foreground border-border/80"
                        >
                          {pastHistory.length} {pastHistory.length === 1 ? "Record" : "Records"}
                        </Badge>
                      </div>

                      {pastHistory.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No medical history or completed procedures recorded yet for {currentPet.name}.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {pastHistory.map((item) => {
                            const isProc = item.type === "procedure";
                            const isConsult = item.type === "consultation";
                            const isVax = item.type === "vaccination";
                            const isSelected = selectedActivityDetail?.id === item.id;
                            const formattedDate = formatAptDate(item.date);

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  setSelectedActivityDetail((prev: any) =>
                                    prev?.id === item.id ? null : item
                                  );
                                  setShowEditPetPanel(false);
                                  setShowAvatarPickerPanel(false);
                                }}
                                className={cn(
                                  "p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none",
                                  isSelected
                                    ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-xs"
                                    : "bg-card/70 hover:bg-card/95 border-border/70 hover:border-primary/40"
                                )}
                              >
                                {/* Left icon + summary */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div
                                    className={cn(
                                      "size-8 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs",
                                      isProc
                                        ? "bg-purple-500/15 text-purple-600 border-purple-500/30"
                                        : isConsult
                                        ? "bg-blue-500/15 text-blue-600 border-blue-500/30"
                                        : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                    )}
                                  >
                                    {isProc ? (
                                      <Scissors className="size-4" />
                                    ) : isConsult ? (
                                      <Stethoscope className="size-4" />
                                    ) : (
                                      <Syringe className="size-4" />
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {item.encounterNo && (
                                        <span className="font-mono text-[10px] font-bold text-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/70">
                                          #{item.encounterNo}
                                        </span>
                                      )}
                                      <h4 className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[240px] sm:max-w-xs">
                                        {item.title}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground font-medium pt-0.5">
                                      <span className="flex items-center gap-1 text-foreground/80">
                                        <Calendar className="size-3 text-primary shrink-0" />
                                        {formattedDate}
                                      </span>
                                      {item.diagnosis && item.diagnosis !== "Pending Clinical Examination" && (
                                        <>
                                          <span>•</span>
                                          <span className="truncate text-emerald-700 dark:text-emerald-400 font-medium">
                                            {item.diagnosis}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Right: status & Details button */}
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shrink-0 shadow-2xs hidden sm:inline-flex">
                                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
                                    <span>{item.status === "completed" || item.status === "administered" ? "Completed" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                                  </span>

                                  <Button
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedActivityDetail((prev: any) =>
                                        prev?.id === item.id ? null : item
                                      );
                                      setShowEditPetPanel(false);
                                      setShowAvatarPickerPanel(false);
                                    }}
                                    className={cn(
                                      "h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg shrink-0 cursor-pointer shadow-2xs",
                                      isSelected
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-background hover:bg-muted text-foreground border-border/80"
                                    )}
                                  >
                                    <span>Details</span>
                                    <ChevronRight className={cn("size-3 transition-transform", isSelected && "rotate-90 sm:rotate-0")} />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── CLINICAL SERVICES & PROCEDURE REVIEW TAB (Vet & Admin Review Station) ── */}
                {activeProfileTab === "review" && (
                  <div className="space-y-4 animate-in fade-in-0 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/70 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-2xs border border-primary/20">
                          <HeartPulse className="size-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                            <span>Clinical Review & Administration</span>
                            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              {formatAptDate(activeReviewDate)}
                            </span>
                          </h4>
                          <p className="text-[11px] text-muted-foreground">
                            Attending vet station for clinical services scheduled for {currentPet?.name || "this patient"} on {formatAptDate(activeReviewDate)}.
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

                    {/* The Core Clinical Services Section - Only shows services scheduled for that day */}
                    <div className="space-y-3 pt-1">
                      {/* 1. VACCINATION & IMMUNIZATION STRIP */}
                      {scheduledVaxForDay && (() => {
                        const vaxRefId =
                          scheduledVaxForDay.encounterNo ||
                          scheduledVaxForDay.raw?.id ||
                          scheduledVaxForDay.id ||
                          "PROC-X6J41";
                        const formattedRefId =
                          vaxRefId.startsWith("PROC-") || vaxRefId.startsWith("CVO-")
                            ? vaxRefId
                            : `PROC-${vaxRefId.slice(0, 5).toUpperCase()}`;
                        const vaxDate = (scheduledVaxForDay.date || activeReviewDate || getTodayDateString()).split("T")[0];
                        const vaxTime =
                          scheduledVaxForDay.time && scheduledVaxForDay.time !== "09:00 AM"
                            ? scheduledVaxForDay.time
                            : "08:00 AM - 05:00 PM";
                        const vaxStatusVal = serviceStatuses["vaccination"] || scheduledVaxForDay.status || "waiting";

                        return (
                          <div className="px-3.5 py-2.5 rounded-xl border border-blue-200/90 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8.5 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Syringe className="size-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-bold text-foreground">
                                    Anti-Rabies Prophylaxis
                                  </h5>
                                  <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-white/90 dark:bg-muted px-2 py-0.5 rounded border border-border/70 uppercase tracking-wider shadow-2xs">
                                    {formattedRefId}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Scheduled: {vaxDate} at {vaxTime}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Select
                                value={vaxStatusVal}
                                onValueChange={(val) => handleStatusChange("vaccination", val)}
                              >
                                <SelectTrigger className="h-8 px-2.5 rounded-lg border-0 bg-blue-100/90 hover:bg-blue-200/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs gap-1 shadow-2xs focus:ring-0 cursor-pointer">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs min-w-36">
                                  <SelectItem value="waiting" className="text-xs py-1.5">Waiting</SelectItem>
                                  <SelectItem value="in-consultation" className="text-xs py-1.5">In Consultation</SelectItem>
                                  <SelectItem value="treatment" className="text-xs py-1.5">Treatment</SelectItem>
                                  <SelectItem value="completed" className="text-xs py-1.5">Completed</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                size="sm"
                                onClick={handleAdministerVaccine}
                                className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer shrink-0"
                              >
                                <Syringe className="size-3.5" />
                                <span>Administer Dose</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. SPAY & NEUTER (KAPON) SURGICAL STRIP */}
                      {scheduledSurgeryForDay && (() => {
                        const surgRefId =
                          scheduledSurgeryForDay.encounterNo ||
                          scheduledSurgeryForDay.raw?.id ||
                          scheduledSurgeryForDay.id ||
                          "PROC-KP01";
                        const formattedRefId =
                          surgRefId.startsWith("PROC-") || surgRefId.startsWith("CVO-")
                            ? surgRefId
                            : `PROC-${surgRefId.slice(0, 5).toUpperCase()}`;
                        const surgDate = (scheduledSurgeryForDay.date || activeReviewDate || getTodayDateString()).split("T")[0];
                        const surgTime =
                          scheduledSurgeryForDay.time && scheduledSurgeryForDay.time !== "09:00 AM"
                            ? scheduledSurgeryForDay.time
                            : "08:00 AM - 05:00 PM";
                        const surgStatusVal = serviceStatuses["spay-neuter"] || scheduledSurgeryForDay.status || "waiting";

                        return (
                          <div className="px-3.5 py-2.5 rounded-xl border border-purple-200/90 dark:border-purple-900/50 bg-purple-50/70 dark:bg-purple-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8.5 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Scissors className="size-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-bold text-foreground">
                                    Spay & Neuter (Kapon)
                                  </h5>
                                  <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-white/90 dark:bg-muted px-2 py-0.5 rounded border border-border/70 uppercase tracking-wider shadow-2xs">
                                    {formattedRefId}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Scheduled: {surgDate} at {surgTime}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Select
                                value={surgStatusVal}
                                onValueChange={(val) => handleStatusChange("spay-neuter", val)}
                              >
                                <SelectTrigger className="h-8 px-2.5 rounded-lg border-0 bg-purple-100/90 hover:bg-purple-200/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold text-xs gap-1 shadow-2xs focus:ring-0 cursor-pointer">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs min-w-36">
                                  <SelectItem value="waiting" className="text-xs py-1.5">Waiting</SelectItem>
                                  <SelectItem value="in-consultation" className="text-xs py-1.5">In Consultation</SelectItem>
                                  <SelectItem value="treatment" className="text-xs py-1.5">Treatment</SelectItem>
                                  <SelectItem value="completed" className="text-xs py-1.5">Completed</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                size="sm"
                                onClick={handleCompleteSurgery}
                                className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shadow-xs cursor-pointer shrink-0"
                              >
                                <Scissors className="size-3.5" />
                                <span>Execute Kapon</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 3. CLINICAL CONSULTATION & SOAP EXAMINATION STRIP */}
                      {scheduledConsultForDay && (() => {
                        const consultRefId =
                          scheduledConsultForDay.encounterNo ||
                          scheduledConsultForDay.raw?.id ||
                          scheduledConsultForDay.id ||
                          "PROC-CS01";
                        const formattedRefId =
                          consultRefId.startsWith("PROC-") || consultRefId.startsWith("CVO-")
                            ? consultRefId
                            : `PROC-${consultRefId.slice(0, 5).toUpperCase()}`;
                        const consultDate = (scheduledConsultForDay.date || activeReviewDate || getTodayDateString()).split("T")[0];
                        const consultTime =
                          scheduledConsultForDay.time && scheduledConsultForDay.time !== "09:00 AM"
                            ? scheduledConsultForDay.time
                            : "08:00 AM - 05:00 PM";
                        const consultStatusVal = serviceStatuses["consultation"] || scheduledConsultForDay.status || "waiting";

                        return (
                          <div className="px-3.5 py-2.5 rounded-xl border border-emerald-200/90 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-950/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-8.5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <Stethoscope className="size-4" />
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="text-sm font-bold text-foreground">
                                    Clinical Consultation & Examination
                                  </h5>
                                  <span className="font-mono text-[10px] font-semibold text-muted-foreground bg-white/90 dark:bg-muted px-2 py-0.5 rounded border border-border/70 uppercase tracking-wider shadow-2xs">
                                    {formattedRefId}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Scheduled: {consultDate} at {consultTime}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleViewOfficialSheet}
                                className="h-8 px-2.5 text-xs font-semibold gap-1 rounded-lg border border-emerald-200/90 dark:border-emerald-800 bg-white dark:bg-background hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 cursor-pointer shadow-2xs shrink-0"
                                title="View Official Field Sheet"
                              >
                                <FileText className="size-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Sheet</span>
                              </Button>

                              <Select
                                value={consultStatusVal}
                                onValueChange={(val) => handleStatusChange("consultation", val)}
                              >
                                <SelectTrigger className="h-8 px-2.5 rounded-lg border-0 bg-emerald-100/90 hover:bg-emerald-200/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-xs gap-1 shadow-2xs focus:ring-0 cursor-pointer">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="text-xs min-w-36">
                                  <SelectItem value="waiting" className="text-xs py-1.5">Waiting</SelectItem>
                                  <SelectItem value="in-consultation" className="text-xs py-1.5">In Consultation</SelectItem>
                                  <SelectItem value="treatment" className="text-xs py-1.5">Treatment</SelectItem>
                                  <SelectItem value="completed" className="text-xs py-1.5">Completed</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                size="sm"
                                onClick={handleFillExamination}
                                className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer shrink-0"
                              >
                                <ClipboardCheck className="size-3.5" />
                                <span>Fill Exam</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Empty state when no service is scheduled for this day */}
                      {!hasAnyScheduledServiceForDay && (
                        <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-muted/20 space-y-2.5">
                          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                            <HeartPulse className="size-5" />
                          </div>
                          <div className="space-y-1 max-w-sm mx-auto">
                            <h5 className="text-xs sm:text-sm font-bold text-foreground">
                              No Clinical Services Scheduled for This Day
                            </h5>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Services (Consultations, Vaccinations, or Spay/Neuter) will only appear here when scheduled or queued for {currentPet?.name || "this patient"} on {formatAptDate(activeReviewDate)}.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
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

            {/* ── Right Side: Activity & Encounter Details Panel (Matching Image 2 drawer) ── */}
            {selectedActivityDetail && (() => {
              const meta = getActivityMeta(selectedActivityDetail);
              const formattedDetailDate = formatAptDate(selectedActivityDetail.date);
              const formattedDetailSession = formatTimeSlot(selectedActivityDetail.time);
              const detailLocation =
                selectedActivityDetail.raw?.location ||
                "City Veterinary Office - Carmen Central Clinic";
              const detailPhone = extractPhone(selectedActivityDetail.notes);
              const detailCleanNotes = selectedActivityDetail.notes
                ? selectedActivityDetail.notes.replace(/Contact:\s*(\+?63\d{10}|\b09\d{9}\b)/i, "").trim()
                : "";
              const detailRefId = selectedActivityDetail.encounterNo
                ? `#ENC-${selectedActivityDetail.encounterNo}`
                : selectedActivityDetail.id.startsWith("vax-") || selectedActivityDetail.type === "vaccination"
                ? `#VAX-${selectedActivityDetail.id.slice(0, 8).toUpperCase()}`
                : `#APT-${selectedActivityDetail.id.slice(0, 8).toUpperCase()}`;

              return (
                <div className="w-[320px] sm:w-[360px] md:w-[390px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
                  {/* Panel Header */}
                  <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-6 rounded-md flex items-center justify-center shrink-0",
                            meta.isVax
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : meta.isSurgery
                              ? "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                              : meta.isConsult
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : "bg-primary/15 text-primary"
                          )}
                        >
                          {meta.isVax ? (
                            <Syringe className="size-3.5" />
                          ) : meta.isSurgery ? (
                            <Scissors className="size-3.5" />
                          ) : meta.isConsult ? (
                            <Stethoscope className="size-3.5" />
                          ) : (
                            <CalendarClock className="size-3.5" />
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-foreground truncate">
                          Activity Details
                        </h3>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate font-mono">
                        {detailRefId} • {currentPet.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedActivityDetail(null)}
                      className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                      title="Close activity details"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Details Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-xs">
                    {/* Hero Card */}
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {meta.isVax
                            ? "Vaccination & Immunization"
                            : meta.isSurgery
                            ? "Surgical Procedure"
                            : meta.isConsult
                            ? "Clinical Encounter"
                            : "Veterinary Appointment"}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 border shadow-2xs",
                            selectedActivityDetail.status === "confirmed" ||
                              selectedActivityDetail.status === "completed" ||
                              selectedActivityDetail.status === "administered"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/90 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60"
                              : selectedActivityDetail.status === "waiting"
                              ? "bg-amber-50 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                              : "bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60"
                          )}
                        >
                          {selectedActivityDetail.status === "confirmed" ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
                              <span>Confirmed Appointment</span>
                            </>
                          ) : selectedActivityDetail.status === "completed" ||
                            selectedActivityDetail.status === "administered" ? (
                            <>
                              <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.2]" />
                              <span>Completed</span>
                            </>
                          ) : selectedActivityDetail.status === "waiting" ? (
                            <>
                              <Clock className="size-3 text-amber-600 dark:text-amber-400 shrink-0 stroke-[2.2]" />
                              <span>In Queue</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="size-3 text-blue-600 dark:text-blue-400 shrink-0 stroke-[2.2]" />
                              <span>Scheduled</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground leading-tight">
                          {meta.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground pt-1 leading-snug">
                          {meta.subtitle}
                        </p>
                      </div>
                    </div>

                    {/* Schedule Date & Location Details */}
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] font-semibold">
                          <Calendar className="size-3 text-primary" />
                          <span>Date & Schedule Window</span>
                        </div>
                        <p className="font-bold text-foreground text-xs leading-tight">
                          {formattedDetailDate}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground font-mono">
                          {formattedDetailSession}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] font-semibold">
                          <MapPin className="size-3 text-primary" />
                          <span>Clinic Venue / Facility</span>
                        </div>
                        <p className="font-bold text-foreground text-xs leading-tight">
                          {detailLocation}
                        </p>
                        <p className="text-[10.5px] text-muted-foreground">
                          Zone 10, Carmen, Cagayan de Oro City
                        </p>
                      </div>

                      {detailPhone && (
                        <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1">
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] font-semibold">
                            <Phone className="size-3 text-primary" />
                            <span>Registered Contact</span>
                          </div>
                          <p className="font-mono font-bold text-foreground text-xs">
                            {detailPhone}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            SMS notifications & queue alerts
                          </p>
                        </div>
                      )}

                      <div className="p-2.5 rounded-xl bg-card border border-border/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10.5px] font-semibold">
                          <ShieldCheck className="size-3 text-primary" />
                          <span>Record Reference</span>
                        </div>
                        <p className="font-mono font-bold text-primary text-xs">
                          {detailRefId}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Official CVO Registry Reference
                        </p>
                      </div>
                    </div>

                    {/* Clinical Details if Encounter */}
                    {selectedActivityDetail.chiefComplaint && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                        <span className="font-bold text-[10.5px] text-foreground block">
                          Reason / Chief Complaint:
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {selectedActivityDetail.chiefComplaint}
                        </p>
                      </div>
                    )}

                    {selectedActivityDetail.diagnosis && selectedActivityDetail.diagnosis !== "Pending Clinical Examination" && (
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                        <span className="font-bold text-[10.5px] text-emerald-800 dark:text-emerald-300 block">
                          Official Diagnosis:
                        </span>
                        <p className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200 leading-snug">
                          {selectedActivityDetail.diagnosis}
                        </p>
                        {selectedActivityDetail.treatment && (
                          <p className="text-[10.5px] text-muted-foreground pt-0.5">
                            Treatment: {selectedActivityDetail.treatment}
                          </p>
                        )}
                      </div>
                    )}

                    {selectedActivityDetail.treatment && !selectedActivityDetail.diagnosis && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                        <span className="font-bold text-[10.5px] text-foreground block">
                          Treatment Administered:
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {selectedActivityDetail.treatment}
                        </p>
                      </div>
                    )}

                    {selectedActivityDetail.vetName && (
                      <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-0.5">
                        <span className="font-bold text-[10.5px] text-muted-foreground block">
                          Attending Veterinarian:
                        </span>
                        <p className="text-xs font-serif italic text-foreground">
                          {selectedActivityDetail.vetName}
                        </p>
                      </div>
                    )}

                    {detailCleanNotes && (
                      <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-0.5">
                        <span className="font-bold text-[10.5px] text-amber-700 dark:text-amber-300 block">
                          Owner Instructions / Client Notes:
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-snug whitespace-pre-wrap">
                          {detailCleanNotes}
                        </p>
                      </div>
                    )}

                    {/* Pre-Visit Checklist */}
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-muted-foreground flex items-start gap-2">
                      <Info className="size-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold text-foreground text-[10.5px] block">
                          Pre-Visit Checklist for {currentPet.name}:
                        </span>
                        <p className="leading-snug">
                          {meta.checklist}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Panel Footer Actions */}
                  <div className="p-4 border-t border-border/70 bg-muted/30 flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedActivityDetail(null)}
                      className="flex-1 text-xs cursor-pointer"
                    >
                      Close Details
                    </Button>
                    {(selectedActivityDetail.type === "encounter" || selectedActivityDetail.type === "consultation") && selectedActivityDetail.raw && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedConsultationForSheet(selectedActivityDetail.raw);
                          setConsultationSheetOpen(true);
                        }}
                        className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <FileText className="size-3.5" />
                        <span>Official CVO Paper</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Official CVO Consultation Sheet Dialog ── */}
      {consultationSheetOpen && (
        <OfficialConsultationSheetDialog
          open={consultationSheetOpen}
          onOpenChange={setConsultationSheetOpen}
          consultation={selectedConsultationForSheet}
        />
      )}

      {/* ── Internal Clinical Action Dialogs (Vaccine, Surgery, Exam) ── */}
      {internalVaxOpen && (
        <AdministerVaccinationDialog
          consultation={selectedEncounterForAction || (encounter ? encounter : (currentPet ? buildQueueEncounterForService("vaccination") : null))}
          open={internalVaxOpen}
          onOpenChange={setInternalVaxOpen}
          onCompleted={() => {
            setInternalVaxOpen(false);
            queryClient.invalidateQueries({ queryKey: ["selected-pet-profile-vaccinations"] });
            queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
            toast.success(`Vaccine recorded successfully for ${currentPet?.name || "patient"}!`);
          }}
        />
      )}

      {internalSurgeryOpen && (
        <CompleteSurgeryDialog
          consultation={selectedEncounterForAction || (encounter ? encounter : (currentPet ? buildQueueEncounterForService("spay-neuter") : null))}
          open={internalSurgeryOpen}
          onOpenChange={setInternalSurgeryOpen}
          onCompleted={() => {
            setInternalSurgeryOpen(false);
            queryClient.invalidateQueries({ queryKey: ["selected-pet-profile-appointments"] });
            queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
            toast.success(`Kapon surgery recorded successfully for ${currentPet?.name || "patient"}!`);
          }}
        />
      )}

      {internalExamOpen && (
        <ClinicalExaminationDialog
          consultation={selectedEncounterForAction || (encounter ? encounter : (currentPet ? buildQueueEncounterForService("consultation") : null))}
          open={internalExamOpen}
          onOpenChange={setInternalExamOpen}
          onSaved={() => {
            setInternalExamOpen(false);
            queryClient.invalidateQueries({ queryKey: ["consultations"] });
            toast.success(`Clinical examination findings saved for ${currentPet?.name || "patient"}!`);
          }}
        />
      )}

      {/* ── Official Delete Pet Dialog ── */}
      {deletePetDialogOpen && (
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
      )}

    </>
  );
}
