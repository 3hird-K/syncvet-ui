import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  Plus,
  Stethoscope,
  Loader2,
  FileCheck2,
  CheckCircle2,
  User,
  PawPrint,
  History,
  Clock,
  Sparkles,
  Calendar,
  Save,
  Pill,
  FileText,
  MapPin,
  X,
  AlertCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getTodayDateString } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { cvoBarangays } from "@/data/cvo-store";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { CVO_CLINICAL_SYSTEMS } from "./pet-owner-consultation-dialog";

function formatSafeDate(d?: string | null): string {
  if (!d) return "Recent";
  try {
    const parsed = new Date(d);
    if (isNaN(parsed.getTime())) return d;
    return format(parsed, "MMM d, yyyy");
  } catch {
    return d;
  }
}

function getHistoryStatusBadge(status?: string) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s === "completed") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
        <CheckCircle2 className="size-3 shrink-0" /> Completed
      </span>
    );
  }
  if (s === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
        <X className="size-3 shrink-0" /> Cancelled
      </span>
    );
  }
  if (s === "missed" || s === "not attended" || s === "unattended" || s === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
        <AlertCircle className="size-3 shrink-0" /> Not Attended
      </span>
    );
  }
  if (s === "waiting" || s === "confirmed" || s === "scheduled") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30">
        <Clock className="size-3 shrink-0" /> {s === "confirmed" || s === "scheduled" ? "Confirmed" : "Waiting"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border capitalize">
      {status.replace(/[-_]/g, " ")}
    </span>
  );
}

export function NewConsultationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addConsultation, activeRoleView, consultations, inventory } = useCVO();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [showManualDetails, setShowManualDetails] = useState<boolean>(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any | null>(null);

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat" | "Livestock">("Dog");
  const [breed, setBreed] = useState("Aspin (Mixed)");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [ownerBarangay, setOwnerBarangay] = useState<string>("Carmen");
  const [vetName, setVetName] = useState("Dr. Elena Santos, DVM");
  const [availableVets, setAvailableVets] = useState<string[]>([
    "Dr. Elena Santos, DVM",
    "Dr. Helen Ann P. Tacandong, DVM",
    "Dr. Sarah Chen, DVM",
  ]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [medication, setMedication] = useState("");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [serviceType, setServiceType] = useState<
    "Free Consultation" | "Deworming Check" | "Bite Wound Care" | "General Checkup" | "Post-Op Evaluation"
  >("Free Consultation");

  // Fetch registered users from Supabase
  const { data: dbUsers = [] } = useQuery({
    queryKey: ["emr-all-users"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, phone_number, address, role, avatar_url")
          .order("full_name", { ascending: true });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Fetch registered pets from Supabase
  const { data: dbPets = [] } = useQuery({
    queryKey: ["emr-all-pets"],
    queryFn: async () => {
      try {
        const supabase = getPublicSupabaseClient();
        const { data, error } = await supabase
          .from("pets")
          .select("id, name, species, breed, weight_kg, weight_category, gender, owner_id, microchip_number, is_vaccinated, is_spayed_neutered")
          .order("name", { ascending: true });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Consolidate unique owners from Supabase users and historical consultations
  const allOwners = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      contact: string;
      barangay: string;
      avatarUrl?: string;
      petsCount: number;
    }> = [];

    // Strictly filter dbUsers to Pet Owners (exclude staff: Administrators, Veterinarians)
    const petOwnersOnly = dbUsers.filter((u: any) => {
      const role = normalizeSyncVetRole(u.role);
      return role === "Pet Owner";
    });

    petOwnersOnly.forEach((u: any) => {
      const name = (u.full_name || u.email || "").trim();
      if (!name) return;
      if (!list.some((o) => o.id === u.id || o.name.toLowerCase() === name.toLowerCase())) {
        const userPets = dbPets.filter((p: any) => p.owner_id === u.id);
        list.push({
          id: u.id,
          name,
          contact: u.phone_number || "",
          barangay: u.address || "Carmen",
          avatarUrl: u.avatar_url || undefined,
          petsCount: userPets.length,
        });
      }
    });

    // Also include verified owners from consultations ONLY if they are not clinic staff
    consultations.forEach((c) => {
      const name = (c.ownerName || "").trim();
      if (!name) return;
      const lower = name.toLowerCase();
      const isStaff =
        lower.includes("neil dime") ||
        lower.includes("elena santos") ||
        lower.includes("tacandong") ||
        lower.includes("chen") ||
        lower.includes("dr.") ||
        lower.includes("admin") ||
        lower.includes("vet");

      if (!isStaff && !list.some((o) => o.name.toLowerCase() === lower)) {
        list.push({
          id: `cvo-owner-${name.replace(/\s+/g, "-").toLowerCase()}`,
          name,
          contact: c.ownerContact || "",
          barangay: c.ownerBarangay || "Carmen",
          avatarUrl: undefined,
          petsCount: 1,
        });
      }
    });

    return list;
  }, [dbUsers, dbPets, consultations]);

  // Filter available pets for the selected owner
  const availablePetsForSelectedOwner = useMemo(() => {
    if (!selectedOwnerId) return [];

    const selectedOwner = allOwners.find((o) => o.id === selectedOwnerId);
    const pets: Array<{
      id: string;
      name: string;
      species: "Dog" | "Cat" | "Livestock";
      breed: string;
      weightKg?: number | string;
      microchip?: string;
    }> = [];

    // Match in dbPets
    dbPets.forEach((p: any) => {
      if (p.owner_id === selectedOwnerId) {
        const spec = (p.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as "Dog" | "Cat";
        pets.push({
          id: p.id,
          name: p.name,
          species: spec,
          breed: p.breed || "Aspin (Mixed)",
          weightKg: p.weight_kg || (p.weight_category === "small" ? 4.5 : p.weight_category === "large" ? 22 : 12.5),
          microchip: p.microchip_number || p.id,
        });
      }
    });

    // Also match in consultations
    if (selectedOwner) {
      consultations.forEach((c) => {
        if (
          c.ownerName.toLowerCase() === selectedOwner.name.toLowerCase() &&
          !pets.some((p) => p.name.toLowerCase() === c.petName.toLowerCase())
        ) {
          pets.push({
            id: c.petId || `pet-${c.petName.toLowerCase()}`,
            name: c.petName,
            species: (c.species === "Cat" ? "Cat" : c.species === "Livestock" ? "Livestock" : "Dog") as any,
            breed: c.breed || "Mixed",
            weightKg: c.vitals?.weightKg || 12.5,
          });
        }
      });
    }

    return pets;
  }, [selectedOwnerId, allOwners, dbPets, consultations]);

  // Fetch previous transactions & appointments from Supabase for this owner
  const { data: dbTransactions = [] } = useQuery({
    queryKey: ["emr-patient-transactions", selectedOwnerId],
    queryFn: async () => {
      if (!selectedOwnerId || selectedOwnerId === "walk-in") return [];
      try {
        const supabase = getPublicSupabaseClient();
        const items: any[] = [];
        const { data: tx } = await supabase
          .from("service_transactions")
          .select("*")
          .eq("owner_id", selectedOwnerId)
          .order("date", { ascending: false })
          .limit(6);

        if (tx) {
          tx.forEach((t) => {
            items.push({
              id: t.id,
              date: t.date || t.created_at?.slice(0, 10),
              title: t.title || t.transaction_type,
              detail: t.detail || "Municipal service transaction",
              badge: t.transaction_type || "Service",
              status: t.status || "completed",
            });
          });
        }

        const { data: appts } = await supabase
          .from("appointments")
          .select("*")
          .eq("owner_id", selectedOwnerId)
          .order("date", { ascending: false })
          .limit(6);

        if (appts) {
          appts.forEach((a) => {
            items.push({
              id: a.id,
              date: a.date,
              title: `${a.service_id === "spay-neuter" ? "Spay & Neuter" : "Vaccination"} (${a.pet_name})`,
              detail: `Scheduled procedure • ${a.location || "Carmen Clinic"}`,
              badge: "Procedure",
              status: a.status,
            });
          });
        }
        return items;
      } catch {
        return [];
      }
    },
    enabled: open && Boolean(selectedOwnerId) && selectedOwnerId !== "walk-in",
  });

  // Consolidated previous medical transactions and clinical encounters
  const patientHistory = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      title: string;
      detail: string;
      badge: string;
      vet?: string;
      status: string;
      treatment?: string;
      medication?: string;
      dosageInstructions?: string;
      chiefComplaint?: string;
      diagnosis?: string;
      veterinarianNotes?: string;
    }> = [];

    const normPet = petName.trim().toLowerCase();
    const normOwner = ownerName.trim().toLowerCase();

    // 1. Existing CVO consultations matching pet or owner
    consultations.forEach((c) => {
      const matchPet = normPet && c.petName.toLowerCase() === normPet;
      const matchOwner = normOwner && c.ownerName.toLowerCase() === normOwner;
      if (matchPet || (matchOwner && !normPet)) {
        list.push({
          id: c.encounterNo || c.id,
          date: c.date,
          title: `${c.serviceType || "Clinical Encounter"} • ${c.diagnosis}`,
          detail: `Tx: ${c.treatment || "Standard care"} | Rx: ${c.medication || "None"}`,
          badge: c.serviceType || "Consultation",
          vet: c.vetName,
          status: c.status || "completed",
          treatment: c.treatment,
          medication: c.medication,
          dosageInstructions: c.dosageInstructions,
          chiefComplaint: c.chiefComplaint,
          diagnosis: c.diagnosis,
          veterinarianNotes: c.veterinarianNotes,
        });
      }
    });

    // 2. Supabase transactions
    dbTransactions.forEach((t) => {
      const isRelevant = !normPet || t.title.toLowerCase().includes(normPet) || t.detail.toLowerCase().includes(normPet);
      if (isRelevant) {
        list.push({
          id: t.id,
          date: t.date,
          title: t.title,
          detail: t.detail,
          badge: t.badge,
          status: t.status,
          treatment: t.detail,
          medication: "Municipal Clinic Record",
        });
      }
    });

    const seen = new Set<string>();
    return list
      .filter((item) => {
        const key = `${item.date}-${item.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.date > b.date ? -1 : 1));
  }, [consultations, dbTransactions, petName, ownerName]);

  const selectedOwner = useMemo(() => {
    return allOwners.find((o) => o.id === selectedOwnerId);
  }, [allOwners, selectedOwnerId]);

  const selectedPet = useMemo(() => {
    return availablePetsForSelectedOwner.find((p) => p.id === selectedPetId);
  }, [availablePetsForSelectedOwner, selectedPetId]);

  const handleOwnerSelect = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    setShowManualDetails(false);
    const owner = allOwners.find((o) => o.id === ownerId);
    if (owner) {
      setOwnerName(owner.name);
      setOwnerContact(owner.contact);
      if (cvoBarangays.includes(owner.barangay as any)) {
        setOwnerBarangay(owner.barangay as any);
      }
    }

    // Auto-select pet if owner has exactly one registered pet
    const ownerPets = dbPets.filter((p: any) => p.owner_id === ownerId);
    if (ownerPets.length === 1) {
      const p = ownerPets[0];
      setSelectedPetId(p.id);
      setPetName(p.name);
      setSpecies((p.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as any);
      setBreed(p.breed || "Aspin (Mixed)");
    } else {
      setSelectedPetId("");
      setPetName("");
    }
  };

  const handlePetSelect = (petId: string) => {
    setSelectedPetId(petId);
    const pet = availablePetsForSelectedOwner.find((p) => p.id === petId);
    if (pet) {
      setPetName(pet.name);
      setSpecies(pet.species);
      setBreed(pet.breed);
    }
  };

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
        console.warn("Could not fetch vet accounts:", e);
      }
    }
    loadRegisteredVets();
  }, []);

  useEffect(() => {
    if (user?.fullName) {
      const isVet =
        activeRoleView === "Veterinarian" ||
        (user?.unsafeMetadata as any)?.roleTitle === "Veterinarian" ||
        (user?.publicMetadata as any)?.role === "Veterinarian";

      if (isVet) {
        setVetName(user.fullName);
        setAvailableVets((prev) => Array.from(new Set([user.fullName!, ...prev])));
      }
    }
  }, [user, activeRoleView]);

  // Services requested matching CVO sheet
  const [services, setServices] = useState({
    healthy: true,
    vitamins: true,
    deworming: true,
    farmManagement: false,
    consultation: true,
  });

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

  const [recommendations, setRecommendations] = useState("");
  const [followUp, setFollowUp] = useState(false);

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

  // Fast preset application for busy municipal clinicians
  const applyPreset = (preset: "gastro" | "wound" | "vaccine" | "parasite") => {
    switch (preset) {
      case "gastro":
        setChiefComplaint("Anorexia and lethargy for 2 days, mild vomiting");
        setDiagnosis("Acute dietary indiscretion / mild gastroenteritis");
        setTreatment("Subcutaneous fluids (LRS 250ml), Maropitant 1mg/kg SQ");
        setMedication("Metronidazole 250mg tab BID x 5 days, Probiotics 2ml SID");
        setDosageInstructions("Feed bland boiled diet (rice + chicken) for 3 days.");
        setObservedSigns({
          mentation: ["Depressed"],
          gastrointestinal: ["Vomiting", "Inappetence", "Diarrhea"],
        });
        setServices({ healthy: false, vitamins: false, deworming: false, farmManagement: false, consultation: true });
        break;
      case "wound":
        setChiefComplaint("Superficial bite wound / laceration on flank");
        setDiagnosis("Infected skin laceration (non-rabid contact)");
        setTreatment("Sterile povidone-iodine lavage, debridement, topical dressing");
        setMedication("Amoxicillin-Clavulanate 375mg tab BID x 7 days");
        setDosageInstructions("Give with food. Keep wound dry.");
        setObservedSigns({
          mentation: ["BAR / QAR"],
          skinCoat: ["Lesions/Ulcers", "Redness"],
        });
        setServices({ healthy: false, vitamins: false, deworming: false, farmManagement: false, consultation: true });
        break;
      case "vaccine":
        const vaxStock = (inventory || []).filter((i: any) => i.category === "Vaccines" && i.stock > 0).reduce((sum: number, i: any) => sum + i.stock, 0);
        if (vaxStock <= 0) {
          toast.warning("Cold-chain Vaccine Alert: Out of Stock", {
            description: "There are currently 0 doses of anti-rabies vaccine in cold-chain inventory. Please restock in Vaccine Inventory.",
          });
        }
        setChiefComplaint("Routine annual wellness and rabies immunization");
        setDiagnosis("Healthy animal cleared for anti-rabies vaccination");
        setTreatment("Anti-rabies vaccine 1ml SQ (Rabisin)");
        setMedication("Pyrantel Pamoate deworming oral paste");
        setDosageInstructions("Single dose given today. Next booster due in 1 year.");
        markAllNormal();
        setServices({ healthy: true, vitamins: true, deworming: true, farmManagement: false, consultation: false });
        break;
      case "parasite":
        setChiefComplaint("Pruritus, patchy alopecia, skin scratching");
        setDiagnosis("Demodicosis / External flea infestation");
        setTreatment("Skin scrapings evaluation, medicated antiseptic bath");
        setMedication("Ivermectin oral suspension / Topical Fluralaner");
        setDosageInstructions("Apply topical preventative to back of neck.");
        setObservedSigns({
          mentation: ["BAR / QAR"],
          skinCoat: ["Parasites", "Alopecia", "Rash/Dermatitis"],
        });
        setServices({ healthy: false, vitamins: true, deworming: true, farmManagement: false, consultation: true });
        break;
    }
  };

  const isSaveDisabled = useMemo(() => {
    return (
      !selectedOwnerId ||
      !selectedPetId ||
      !petName?.trim() ||
      !ownerName?.trim() ||
      !diagnosis?.trim()
    );
  }, [selectedOwnerId, selectedPetId, petName, ownerName, diagnosis]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaveDisabled) {
      if (!selectedOwnerId) toast.error("Please select a registered pet owner");
      else if (!selectedPetId || !petName) toast.error("Please select a registered patient pet");
      else if (!diagnosis) toast.error("Please enter a clinical diagnosis");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const today = getTodayDateString();
      const timeStr = new Intl.DateTimeFormat("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

      const allSymptomsList: string[] = [];
      Object.entries(observedSigns).forEach(([_, signs]) => {
        signs.forEach((s) => allSymptomsList.push(s));
      });
      if (allSymptomsList.length === 0) {
        allSymptomsList.push(chiefComplaint || "General Examination");
      }

      const enc = addConsultation({
        petId: selectedPetId ? selectedPetId : `CDO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        petName,
        species,
        breed,
        ownerName,
        ownerContact: ownerContact || "0917-000-0000",
        ownerBarangay,
        vetName,
        date: today,
        time: timeStr,
        chiefComplaint: chiefComplaint || "General checkup",
        symptoms: allSymptomsList,
        vitals: {
          weightKg: selectedPet?.weightKg ? Number(selectedPet.weightKg) : 10,
          temperatureC: 38.5,
          mucousMembrane: "Normal (Pink)",
        },
        diagnosis,
        treatment: treatment || "Standard clinical care",
        medication: medication || "None",
        dosageInstructions: dosageInstructions || "As needed",
        status: "completed",
        serviceType,
        clinicalSystems: observedSigns,
        servicesRequested: services,
        recommendations: recommendations || "Standard CVO clinical guidance provided.",
        followUp,
      });

      // If vaccination was administered during this EMR consultation, automatically mirror to vaccination_records
      const isVaxAdministered =
        treatment.toLowerCase().includes("vaccin") ||
        diagnosis.toLowerCase().includes("vaccin") ||
        (treatment.toLowerCase().includes("rabies") && !treatment.toLowerCase().includes("non-rabid"));

      if (isVaxAdministered) {
        void (async () => {
          try {
            const supabase = getPublicSupabaseClient();
            const todayIso = new Date().toISOString().split("T")[0];
            const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            const vaxRecordNo = `VAX-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

            await supabase.from("vaccination_records").insert({
              record_no: vaxRecordNo,
              pet_name: petName || "Pet",
              pet_id: selectedPetId || null,
              species: species || "Dog",
              breed: breed || "Aspin (Mixed)",
              owner_name: ownerName || "Pet Owner",
              owner_contact: ownerContact || null,
              barangay: ownerBarangay || "Carmen",
              vaccine_name: treatment.toLowerCase().includes("rabisin")
                ? "Rabisin Anti-Rabies Vaccine (1.0 mL SC)"
                : "Anti-Rabies Prophylaxis (1.0 mL SC)",
              batch_number: "AR-2026-EMR",
              administered_date: todayIso,
              next_due_date: nextYearIso,
              veterinarian: vetName || "Dr. Elena Santos, DVM",
              status: "complete",
            });

            if (selectedPetId) {
              await supabase
                .from("pets")
                .update({
                  is_vaccinated: true,
                  rabies_vaccinated: true,
                  last_vaccination_date: todayIso,
                  next_vaccination_date: nextYearIso,
                })
                .eq("id", selectedPetId);
            }

            queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
            queryClient.invalidateQueries({ queryKey: ["queue-pets"] });
            queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
          } catch (err) {
            console.warn("Auto-log consultation vaccination error", err);
          }
        })();
      }

      setLoading(false);
      setOpen(false);
      toast.success("Encounter Encoded Successfully", {
        description: `Consultation record ${enc.encounterNo} logged for ${petName}.`,
      });

      // Reset
      setPetName("");
      setOwnerName("");
      setSelectedOwnerId("");
      setSelectedPetId("");
      setShowManualDetails(false);
      setDiagnosis("");
      setChiefComplaint("");
      setTreatment("");
      setMedication("");
      setDosageInstructions("");
      setRecommendations("");
      setFollowUp(false);
    }, 400);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setShowManualDetails(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
          <Plus className="size-3.5" /> Encode Consultation
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[90vh] sm:h-[92vh] max-h-[95vh] p-0 overflow-hidden flex flex-col gap-0 border border-border/80 shadow-2xl rounded-2xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0 min-w-0">
          <DialogHeader className="p-4 sm:p-5 pr-4 border-b border-border/80 shrink-0 bg-card/60">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 text-primary">
                  <Stethoscope className="size-5 shrink-0" />
                  <DialogTitle className="text-lg font-bold truncate">New Clinical Encounter (EMR)</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Official Cagayan de Oro LGU Field Treatment & Clinic Consultation Intake
                </DialogDescription>
              </div>

              {/* Action Buttons: Save Record and X close button perfectly aligned side-by-side */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || isSaveDisabled}
                  className={cn(
                    "h-8 px-3.5 text-xs font-bold rounded-xl transition-all shadow-xs gap-1.5",
                    isSaveDisabled
                      ? "opacity-45 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                      : "cursor-pointer bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                  title={isSaveDisabled ? "Select a registered pet owner, pet patient, and enter a diagnosis to save" : "Save Clinical Record"}
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="size-3.5" />
                      <span>Save Record</span>
                    </>
                  )}
                </Button>

                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                    title="Close"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-w-0 space-y-4">
            {/* 2-Column Responsive Layout: Left (Main Form) & Right (Sidebar) on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
            {/* ── LEFT: Main Clinical Form (8 cols on lg) ── */}
            <div className="lg:col-span-8 space-y-4 min-w-0">
              {/* Quick Presets */}
              <div className="p-2.5 rounded-xl bg-muted/30 border border-border/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Quick Case Presets (Fast Encoding)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("gastro")}
                    className="h-6 text-[10px] px-2 rounded-lg cursor-pointer"
                  >
                    Gastroenteritis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("wound")}
                    className="h-6 text-[10px] px-2 rounded-lg cursor-pointer"
                  >
                    Bite Wound Care
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("vaccine")}
                    className="h-6 text-[10px] px-2 rounded-lg cursor-pointer"
                  >
                    Rabies Clearance
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyPreset("parasite")}
                    className="h-6 text-[10px] px-2 rounded-lg cursor-pointer"
                  >
                    Skin / Parasites
                  </Button>
                </div>
              </div>

              {/* Section 1: Patient & Owner Information */}
              <div className="space-y-3 p-4 rounded-xl border border-border/70 bg-card/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="size-3.5 text-primary" />
                    1. Patient & Owner Information
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Select registered client and patient
                  </span>
                </div>

                {/* Client & Pet Quick Pickers Bar */}
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  {/* Pet Owner Selector with Profile Avatars & Clean Badges */}
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <User className="size-3 text-primary" /> Select Registered Pet Owner
                    </Label>
                    <Select value={selectedOwnerId} onValueChange={handleOwnerSelect}>
                      <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full min-w-0">
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          {selectedOwner ? (
                            <>
                              <Avatar className="size-5 shrink-0 border border-primary/20">
                                {selectedOwner.avatarUrl ? <AvatarImage src={selectedOwner.avatarUrl} alt={selectedOwner.name} /> : null}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[9px]">
                                  {selectedOwner.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold truncate">{selectedOwner.name}</span>
                              <span className="text-muted-foreground text-[11px] truncate">
                                ({selectedOwner.barangay})
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground truncate">Choose a registered pet owner...</span>
                          )}
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-60 z-[95] max-w-[90vw]">
                        {allOwners.map((o) => (
                          <SelectItem key={o.id} value={o.id} className="text-xs cursor-pointer py-1.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Avatar className="size-6.5 shrink-0 border border-border/80">
                                {o.avatarUrl ? <AvatarImage src={o.avatarUrl} alt={o.name} /> : null}
                                <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                                  {o.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col text-left min-w-0 truncate">
                                <span className="font-semibold text-foreground text-xs leading-tight truncate">
                                  {o.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground leading-tight truncate">
                                  {o.barangay}
                                  {o.contact ? ` • ${o.contact}` : o.petsCount > 0 ? ` • ${o.petsCount} pet${o.petsCount > 1 ? "s" : ""}` : " • Verified"}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Owner's Pets Selector */}
                  <div className="space-y-1 min-w-0">
                    <Label className="text-[11px] font-bold text-foreground flex items-center gap-1">
                      <PawPrint className="size-3 text-primary" /> Select Patient / Pet
                    </Label>
                    {selectedOwnerId ? (
                      <Select value={selectedPetId} onValueChange={handlePetSelect}>
                        <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full min-w-0">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            {selectedPet ? (
                              <>
                                <div className="size-5 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                  <PawPrint className="size-3" />
                                </div>
                                <span className="font-semibold truncate">{selectedPet.name}</span>
                                <span className="text-muted-foreground text-[11px] truncate">
                                  ({selectedPet.species} • {selectedPet.breed})
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground truncate">
                                {availablePetsForSelectedOwner.length > 0 ? "Select patient pet..." : "No registered pets found for this owner"}
                              </span>
                            )}
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-60 z-[95] max-w-[90vw]">
                          {availablePetsForSelectedOwner.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                  <PawPrint className="size-3.5" />
                                </div>
                                <div className="flex flex-col text-left min-w-0 truncate">
                                  <span className="font-semibold text-foreground text-xs leading-tight truncate">{p.name}</span>
                                  <span className="text-[11px] text-muted-foreground leading-tight truncate">
                                    {p.species} • {p.breed}{p.weightKg ? ` • ${p.weightKg}kg` : ""}
                                  </span>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-9 rounded-xl border border-dashed border-border/70 bg-background/50 px-3 flex items-center text-xs text-muted-foreground truncate">
                        Select a pet owner first to choose their pets
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Patient & Owner Summary Banner */}
                {selectedOwner && (selectedPet || petName) ? (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <PawPrint className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-foreground truncate">{petName || selectedPet?.name}</span>
                          <Badge variant="outline" className="text-[10px] bg-background border-primary/30 text-primary font-semibold">
                            {species} • {breed}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Owner: <span className="font-semibold text-foreground">{ownerName || selectedOwner.name}</span>
                          {ownerContact ? ` • ${ownerContact}` : ""} • Brgy. {ownerBarangay}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualDetails(!showManualDetails)}
                      className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      {showManualDetails ? "Hide Edit Fields" : "Edit Details"}
                    </Button>
                  </div>
                ) : !selectedOwnerId ? (
                  <div className="p-3 rounded-xl border border-dashed border-border/70 bg-muted/15 flex items-center gap-2.5 text-xs text-muted-foreground">
                    <PawPrint className="size-4 text-muted-foreground/60 shrink-0" />
                    <span>Select a registered pet owner and patient above to auto-load intake records.</span>
                  </div>
                ) : null}

                {/* Edit details form (only shown when toggled) */}
                {showManualDetails && (
                  <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 space-y-3 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Edit Patient & Owner Details
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowManualDetails(false)}
                        className="text-[10px] h-5 px-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        Hide
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Pet Name *</Label>
                        <Input
                          placeholder="e.g. Bantay"
                          value={petName}
                          onChange={(e) => setPetName(e.target.value)}
                          required
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Species</Label>
                        <Select value={species} onValueChange={(v: any) => setSpecies(v)}>
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Dog">Dog (Canine)</SelectItem>
                            <SelectItem value="Cat">Cat (Feline)</SelectItem>
                            <SelectItem value="Livestock">Livestock</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Breed</Label>
                        <Input
                          placeholder="e.g. Aspin / Shih Tzu"
                          value={breed}
                          onChange={(e) => setBreed(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Owner Name *</Label>
                        <Input
                          placeholder="Citizen Full Name"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          required
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Contact Number</Label>
                        <Input
                          placeholder="09XX-XXX-XXXX"
                          value={ownerContact}
                          onChange={(e) => setOwnerContact(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Barangay</Label>
                        <Select value={ownerBarangay} onValueChange={setOwnerBarangay}>
                          <SelectTrigger className="h-8 text-xs rounded-lg">
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
                  </div>
                )}

                {/* Attending Vet */}
                <div className="pt-2.5 border-t border-border/50">
                  <div className="space-y-1 sm:max-w-xs min-w-0">
                    <Label className="text-xs font-semibold">Attending Vet</Label>
                    <Select value={vetName} onValueChange={setVetName}>
                      <SelectTrigger className="h-8 text-xs rounded-lg">
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

              {/* Section 2: Services Requested */}
              <div className="space-y-2 p-4 rounded-xl border border-border/70 bg-card/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileCheck2 className="size-3.5 text-emerald-600" />
                  2. Services Requested (Select All That Apply)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 pt-1">
                  {[
                    { id: "healthy", label: "HEALTHY" },
                    { id: "vitamins", label: "VITAMINS" },
                    { id: "deworming", label: "DEWORMING" },
                    { id: "farmManagement", label: "FARM MGMT" },
                    { id: "consultation", label: "CONSULTATION" },
                  ].map((svc) => (
                    <label
                      key={svc.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none min-w-0",
                        services[svc.id as keyof typeof services]
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border/70 bg-background hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(services[svc.id as keyof typeof services])}
                        onChange={(e) =>
                          setServices({ ...services, [svc.id]: e.target.checked })
                        }
                        className="size-3.5 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <span className="font-extrabold text-[11px] text-foreground tracking-tight truncate">{svc.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section 3: 12-System Clinical Checklist & Examination */}
              <div className="space-y-3 rounded-xl border border-border/70 p-4 bg-card/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Stethoscope className="size-3.5 text-blue-500" />
                      3. 12-System Clinical Examination Checklist
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Official Cagayan de Oro CVO 12-System Physical Examination & Clinical Sign Intake
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={markAllNormal}
                      className="h-6.5 text-[10px] font-semibold px-2 cursor-pointer border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                    >
                      ✓ Mark All Normal
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllSigns}
                      className="h-6.5 text-[10px] text-muted-foreground hover:text-foreground px-2 cursor-pointer"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* 12-Systems Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 pt-1">
                  {CVO_CLINICAL_SYSTEMS.map((sys) => {
                    const currentSelections = observedSigns[sys.key] || [];
                    const hasAbnormal = currentSelections.some(
                      (s) => s !== "Appear Normal" && s !== "BAR / QAR"
                    );
                    const isNormal = currentSelections.includes("Appear Normal") || currentSelections.includes("BAR / QAR");

                    return (
                      <div
                        key={sys.key}
                        className={cn(
                          "rounded-lg border p-2.5 space-y-1.5 bg-background/70 transition-all text-xs min-w-0",
                          hasAbnormal
                            ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20 shadow-2xs"
                            : isNormal
                            ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/10"
                            : "border-border/70 hover:border-border"
                        )}
                      >
                        <div className="flex items-center justify-between border-b border-border/40 pb-1">
                          <span className="font-bold text-[10px] text-foreground tracking-tight">
                            {sys.number}. {sys.title}
                          </span>
                          {hasAbnormal ? (
                            <Badge
                              variant="outline"
                              className="text-[8px] px-1 py-0 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold"
                            >
                              {currentSelections.length} flagged
                            </Badge>
                          ) : isNormal ? (
                            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                              Normal
                            </span>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-0.5 pt-0.5">
                          {sys.options.map((opt) => {
                            const checked = currentSelections.includes(opt);
                            const isNormalOption = opt === "Appear Normal" || opt === "BAR / QAR";

                            return (
                              <label
                                key={opt}
                                className={cn(
                                  "flex items-center gap-1.5 p-1 rounded-md text-[10.5px] cursor-pointer transition-colors select-none",
                                  checked
                                    ? isNormalOption
                                      ? "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold"
                                      : "bg-amber-500/20 text-amber-950 dark:text-amber-100 font-semibold"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSign(sys.key, opt)}
                                  className="size-3 rounded accent-primary cursor-pointer shrink-0"
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

              {/* Section 4: Clinical Findings, Diagnosis & Treatment */}
              <div className="space-y-2.5 p-4 rounded-xl border border-border/70 bg-card/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  4. Symptoms, Diagnosis & Treatment
                </h4>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Chief Complaint / Symptoms History</Label>
                  <Input
                    placeholder="Observed symptoms, history, duration..."
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Clinical Diagnosis *</Label>
                  <Input
                    placeholder="e.g. Mild gastroenteritis, Rabies clearance, Demodicosis..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    required
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Treatment Administered</Label>
                  <Input
                    placeholder="Injections, wound debridement, IV/SQ fluids..."
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Prescribed Medication</Label>
                    <Input
                      placeholder="Antibiotics, vitamins, dewormer..."
                      value={medication}
                      onChange={(e) => setMedication(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Dosage & Instructions</Label>
                    <Input
                      placeholder="e.g. 1 tab BID for 5 days with food"
                      value={dosageInstructions}
                      onChange={(e) => setDosageInstructions(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>
                </div>

                {/* Recommendations & Follow-Up Checkbox matching physical sheet bottom */}
                <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex-1 space-y-1 min-w-0">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Recommendations / Care Instructions
                    </Label>
                    <Input
                      value={recommendations}
                      onChange={(e) => setRecommendations(e.target.value)}
                      placeholder="e.g. Present pet for physical examination, isolate for observation..."
                      className="h-8 text-xs rounded-lg"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground text-xs shrink-0 self-start sm:self-end pb-1.5">
                    <input
                      type="checkbox"
                      checked={followUp}
                      onChange={(e) => setFollowUp(e.target.checked)}
                      className="size-4 rounded accent-primary cursor-pointer"
                    />
                    <span>Follow-Up Required</span>
                  </label>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Clinical History & Transactions Sidebar (4 cols on lg, sticky on desktop) ── */}
            <div className="lg:col-span-4 space-y-3.5 min-w-0 lg:sticky lg:top-0">
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3.5 shadow-2xs min-w-0">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="size-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                      <History className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">Clinical History</h4>
                      <p className="text-[10px] text-muted-foreground truncate">Past encounters & transactions</p>
                    </div>
                  </div>
                  {patientHistory.length > 0 && (
                    <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/30 shrink-0">
                      {patientHistory.length} Record{patientHistory.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {/* Selected Patient Mini Card */}
                {selectedOwner ? (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-2 text-xs min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar className="size-9 border border-border/80 shrink-0">
                        {selectedOwner.avatarUrl ? <AvatarImage src={selectedOwner.avatarUrl} alt={selectedOwner.name} /> : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {selectedOwner.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-foreground text-xs truncate">{selectedOwner.name}</h5>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {selectedOwner.barangay}
                          {selectedOwner.contact ? ` • ${selectedOwner.contact}` : ""}
                        </p>
                      </div>
                    </div>

                    {selectedPet && (
                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-[11px] min-w-0">
                        <span className="flex items-center gap-1 font-semibold text-foreground truncate min-w-0">
                          <PawPrint className="size-3 text-primary shrink-0" /> <span className="truncate">{selectedPet.name}</span>
                        </span>
                        <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                          {selectedPet.species} • {selectedPet.breed}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border/70 bg-muted/15 text-center space-y-1.5">
                    <User className="size-6 text-muted-foreground/40 mx-auto" />
                    <p className="text-xs font-semibold text-foreground">No Patient Selected</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Select a pet owner and patient to view their complete clinical history and previous records here.
                    </p>
                  </div>
                )}

                {/* History Timeline */}
                {patientHistory.length > 0 ? (
                  <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                    {patientHistory.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedHistoryItem(item)}
                        className="p-2.5 rounded-xl bg-background border border-border/70 space-y-1.5 shadow-2xs hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
                        title="Click to view full record details"
                      >
                        <div className="flex items-start justify-between gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                            {formatSafeDate(item.date)}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {getHistoryStatusBadge(item.status)}
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-bold shrink-0">
                              {item.badge}
                            </Badge>
                          </div>
                        </div>

                        <p className="font-bold text-xs text-foreground group-hover:text-primary transition-colors leading-tight break-words">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed break-words line-clamp-2">{item.detail}</p>

                        {item.vet && (
                          <p className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1 border-t border-border/40">
                            <Stethoscope className="size-3 shrink-0" />
                            <span className="truncate">Attending: {item.vet}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : selectedOwner ? (
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/15 text-center space-y-1">
                    <CheckCircle2 className="size-5 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-foreground">First Recorded Visit</p>
                    <p className="text-[11px] text-muted-foreground">
                      No prior clinical consultations or transaction logs found for this patient.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </form>

        {/* Patient History Item Detail Modal */}
        <Dialog open={!!selectedHistoryItem} onOpenChange={(open) => !open && setSelectedHistoryItem(null)}>
          <DialogContent className="sm:max-w-[480px] p-5 space-y-4 rounded-2xl z-[100]">
            {selectedHistoryItem && (
              <>
                <DialogHeader className="p-0 text-left space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pr-8">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {formatSafeDate(selectedHistoryItem.date)}
                      </span>
                      {getHistoryStatusBadge(selectedHistoryItem.status)}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {selectedHistoryItem.badge}
                    </Badge>
                  </div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    {selectedHistoryItem.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Verified CVO municipal record for {petName || selectedPet?.name || "Patient"}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 text-xs">
                  {/* Patient & Owner summary */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <PawPrint className="size-3.5 text-primary" />
                      <span>{petName || selectedPet?.name} ({species} • {breed})</span>
                    </p>
                    <p className="text-muted-foreground">
                      Owner: <strong className="text-foreground">{ownerName || selectedOwner?.name}</strong> • Brgy. {ownerBarangay}
                    </p>
                  </div>

                  {/* Record Details */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Encounter / Booking Status</Label>
                      <div className="mt-1 flex items-center gap-2">
                        {getHistoryStatusBadge(selectedHistoryItem.status)}
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Clinical Detail / Action</Label>
                      <p className="mt-1 p-2.5 rounded-lg bg-background border border-border/70 text-foreground leading-relaxed">
                        {selectedHistoryItem.detail}
                      </p>
                    </div>

                    {selectedHistoryItem.treatment && (
                      <div>
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Treatment Administered</Label>
                        <p className="mt-1 p-2.5 rounded-lg bg-background border border-border/70 text-foreground">
                          {selectedHistoryItem.treatment}
                        </p>
                      </div>
                    )}

                    {selectedHistoryItem.medication && (
                      <div>
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prescriptions</Label>
                        <p className="mt-1 p-2.5 rounded-lg bg-background border border-border/70 text-foreground">
                          {selectedHistoryItem.medication}
                        </p>
                      </div>
                    )}

                    {selectedHistoryItem.vet && (
                      <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-primary font-medium">
                        <Stethoscope className="size-4 shrink-0" />
                        <span>Attending: {selectedHistoryItem.vet}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
