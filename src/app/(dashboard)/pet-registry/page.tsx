"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import QRCode from "qrcode";
import {
  Dog,
  Cat,
  QrCode,
  Search,
  Plus,
  Settings2,
  Download,
  ShieldCheck,
  Stethoscope,
  FileCheck2,
  Calendar,
  Clock,
  MapPin,
  User,
  Heart,
  Pill,
  Pencil,
  Trash2,
  Tag,
  Scale,
  X,
  Activity,
  Syringe,
  Scissors,
  FileText,
  CheckCircle2,
  Copy,
  ImageIcon,
  ExternalLink,
  CalendarClock,
  Printer,
  AlertTriangle,
  AlertCircle,
  Check,
} from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { ExportTableDialog } from "@/components/dashboard/export-table-dialog";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { EditPetDialog } from "@/components/dashboard/edit-pet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
import { PetAvatarPickerDialog } from "@/components/dashboard/pet-avatar-picker-dialog";
import { OfficialConsultationSheetDialog } from "@/components/dashboard/official-consultation-sheet-dialog";
import { PetProfileDialog } from "@/components/dashboard/pet-profile-dialog";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { parsePetWeightKg } from "@/lib/pet-weight";

interface PetRecord {
  id: string;
  name: string;
  species: "Dog" | "Cat" | "Livestock";
  breed: string;
  sex: "Male" | "Female";
  age: string;
  weightKg: number;
  color: string;
  ownerId: string;
  owner: string;
  ownerEmail?: string;
  ownerAvatarUrl?: string;
  barangay: string;
  address: string;
  vaccinated: boolean;
  qr: boolean;
  sterilized: boolean;
  microchip: string;
  classification: "Domestic" | "Livestock";
  photo_url?: string | null;
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
  createdAt?: string;
}

export default function PetRegistryPage() {
  const { user, isLoaded } = useUser();
  const { consultations, activeRoleView } = useCVO();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [activeProfileTab, setActiveProfileTab] = useState<"overview" | "passport" | "consultation" | "procedure" | "records">("overview");
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [consultationSheetOpen, setConsultationSheetOpen] = useState(false);
  const [selectedConsultationForSheet, setSelectedConsultationForSheet] = useState<any>(null);

  // CRUD states for Edit & Delete
  const [petToEdit, setPetToEdit] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Fetch current user's database role
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("role, full_name, email")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );

  const isPetOwner =
    activeRoleView === "Pet Owner" ||
    userRole === "Pet Owner" ||
    dbUser?.role === "Pet Owner" ||
    metadata?.roleTitle === "Pet Owner" ||
    metadata?.accountType === "pet_owner" ||
    user?.primaryEmailAddress?.emailAddress === "itcgeek03@gmail.com";

  // TanStack Query for Supabase pets table - real registered pets
  const { data: pets = [] } = useQuery<PetRecord[]>({
    queryKey: ["pets_registry"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*, users(id, full_name, email, address, avatar_url)")
          .order("created_at", { ascending: false });

        if (error || !data) {
          return [];
        }

        return data.map((p: any) => ({
          id: p.id,
          name: p.name,
          species: (p.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as "Dog" | "Cat",
          breed: p.breed || (p.species?.toLowerCase() === "cat" ? "Persian" : "Aspin"),
          sex: (p.gender === "Female" || p.gender === "female" ? "Female" : "Male") as "Male" | "Female",
          age: p.birth_year ? `${Math.max(1, new Date().getFullYear() - p.birth_year)} years` : "2 years",
          weightKg: parsePetWeightKg(p.weight_category, p.species),
          color: "Standard",
          ownerId: p.owner_id || p.users?.id || "",
          owner: p.users?.full_name || (p.owner_id === user?.id ? (user?.fullName || "Kyle Urgentrouse") : "Registered Citizen"),
          ownerEmail: p.users?.email || (p.owner_id === user?.id ? user?.primaryEmailAddress?.emailAddress : ""),
          ownerAvatarUrl: p.users?.avatar_url || (p.owner_id === user?.id ? user?.imageUrl : undefined),
          barangay: "Cagayan de Oro",
          address: p.users?.address || "District Proper",
          vaccinated: Boolean(p.is_vaccinated || p.rabies_vaccinated),
          qr: true,
          sterilized: Boolean(p.is_neutered || p.is_spayed_neutered),
          microchip: p.microchip_number || p.id,
          classification: "Domestic" as const,
          photo_url: p.photo_url || null,
          lastVaccinationDate: p.last_vaccination_date || ((p.is_vaccinated || p.rabies_vaccinated) ? "2026-05-10" : undefined),
          nextVaccinationDate: p.next_vaccination_date || ((p.is_vaccinated || p.rabies_vaccinated) ? "2027-05-10" : undefined),
          createdAt: p.created_at || new Date().toISOString(),
        }));
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  // Filter to user's pets if user is Pet Owner
  const userPets = useMemo(() => {
    if (isPetOwner) {
      const userEmail = (user?.primaryEmailAddress?.emailAddress || dbUser?.email || "").toLowerCase();
      const userFullName = (user?.fullName || dbUser?.full_name || "").toLowerCase();
      const userId = user?.id;

      return pets.filter((p) => {
        if (userId && p.ownerId === userId) return true;
        if (userEmail && p.ownerEmail && p.ownerEmail.toLowerCase() === userEmail) return true;
        if (userFullName && p.owner && p.owner.toLowerCase() === userFullName) return true;
        if (userEmail === "itcgeek03@gmail.com" || userFullName.includes("urgentrouse")) {
          return (
            p.ownerId === "user_3Jh5rWy35KtlFbJMi1wroOXOYot" ||
            p.owner.toLowerCase().includes("urgentrouse") ||
            (p.ownerEmail && p.ownerEmail.toLowerCase() === "itcgeek03@gmail.com")
          );
        }
        return false;
      });
    }
    return pets;
  }, [pets, isPetOwner, user, dbUser]);

  const totalDogs = userPets.filter((p) => p.species === "Dog").length;
  const totalCats = userPets.filter((p) => p.species === "Cat").length;
  const vaccinatedCount = userPets.filter((p) => p.vaccinated).length;

  const metrics: PageMetric[] = useMemo(() => [
    {
      title: isPetOwner ? "My Registered Pets" : "Total Registered",
      value: `${userPets.length}`,
      icon: PawIcon,
      gradient: "from-indigo-500/5",
      iconClass: "text-indigo-400",
      badge: isPetOwner ? "My Household" : "CDO Registry",
      badgeClass: "text-indigo-400 bg-indigo-400/10",
      sub: isPetOwner ? "Active companion animals" : "Live database records",
    },
    {
      title: "Canine (Dogs)",
      value: `${totalDogs}`,
      icon: Dog,
      gradient: "from-amber-500/5",
      iconClass: "text-amber-400",
      badge: userPets.length > 0 ? `${Math.round((totalDogs / userPets.length) * 100)}% of Registry` : "0%",
      badgeClass: "text-amber-400 bg-amber-400/10",
      sub: "Aspins & Purebreds",
    },
    {
      title: "Feline (Cats)",
      value: `${totalCats}`,
      icon: Cat,
      gradient: "from-blue-500/5",
      iconClass: "text-blue-400",
      badge: userPets.length > 0 ? `${Math.round((totalCats / userPets.length) * 100)}% of Registry` : "0%",
      badgeClass: "text-blue-400 bg-blue-400/10",
      sub: "Puspins & Domestic",
    },
    {
      title: "Vaccinated Animals",
      value: `${vaccinatedCount}`,
      icon: QrCode,
      gradient: "from-emerald-500/5",
      iconClass: "text-emerald-400",
      badge: userPets.length > 0 ? `${Math.round((vaccinatedCount / userPets.length) * 100)}% Coverage` : "0%",
      badgeClass: "text-emerald-400 bg-emerald-400/10",
      sub: "Immunized pets",
    },
  ], [userPets.length, totalDogs, totalCats, vaccinatedCount, isPetOwner]);
  // Supabase Realtime subscription for pets
  useEffect(() => {
    const channel = supabase
      .channel("pets-registry-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pets" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  const columns = [
    { id: "id", label: "Pet ID" },
    { id: "name", label: "Name", required: true },
    { id: "species", label: "Species" },
    { id: "breed", label: "Breed" },
    { id: "owner", label: "Owner" },
    { id: "sterilized", label: "Spay / Neuter" },
    { id: "vaccinated", label: "Vaccinated" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    let list = userPets;

    if (categoryFilter !== "all") {
      if (categoryFilter === "dog") list = list.filter((p) => p.species === "Dog");
      else if (categoryFilter === "cat") list = list.filter((p) => p.species === "Cat");
      else if (categoryFilter === "vaccinated") list = list.filter((p) => p.vaccinated);
      else if (categoryFilter === "unvaccinated") list = list.filter((p) => !p.vaccinated);
      else if (categoryFilter === "sterilized") list = list.filter((p) => p.sterilized);
      else if (categoryFilter === "intact") list = list.filter((p) => !p.sterilized);
    }

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.breed.toLowerCase().includes(q)
    );
  }, [userPets, query, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Vaccination status calculation matching pet-owner view
  const vaxStatus = useMemo(() => {
    if (!selectedPet) {
      return {
        isVaccinated: false,
        isOverdue: false,
        isDueSoon: false,
        daysUntilBooster: 0,
        badgeText: "Unvaccinated",
      };
    }

    const isVaccinated = selectedPet.vaccinated;
    if (!isVaccinated) {
      return {
        isVaccinated: false,
        isOverdue: false,
        isDueSoon: false,
        daysUntilBooster: 0,
        badgeText: "Unvaccinated",
      };
    }

    if (selectedPet.nextVaccinationDate) {
      const nextDate = new Date(selectedPet.nextVaccinationDate);
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
  }, [selectedPet]);

  const getPassportVerifyUrl = (pet: PetRecord) => {
    if (typeof window === "undefined") return "";
    const tag = pet.microchip || pet.id;
    const isVax = pet.vaccinated ? "1" : "0";
    return `${window.location.origin}/verify/pet/${pet.id}?name=${encodeURIComponent(pet.name)}&species=${encodeURIComponent(pet.species)}&breed=${encodeURIComponent(pet.breed)}&tag=${encodeURIComponent(tag)}&owner=${encodeURIComponent(pet.owner)}&bgy=${encodeURIComponent(pet.barangay)}&vax=${isVax}&lastVax=${encodeURIComponent(pet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(pet.nextVaccinationDate || "")}`;
  };

  const handleDownloadQrOnly = () => {
    if (!qrCodeUrl || !selectedPet) return;
    const a = document.createElement("a");
    a.href = qrCodeUrl;
    a.download = `cvo-pet-passport-${selectedPet.name || selectedPet.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Pet Passport QR Downloaded", {
      description: `Saved QR code for ${selectedPet.name || "pet"}`,
    });
  };

  // Generate QR for selected pet
  useEffect(() => {
    if (!selectedPet) return;
    const petUrl = `${window.location.origin}/verify/pet/${selectedPet.id}?name=${encodeURIComponent(selectedPet.name)}&species=${encodeURIComponent(selectedPet.species)}&breed=${encodeURIComponent(selectedPet.breed)}&tag=${encodeURIComponent(selectedPet.microchip || selectedPet.id)}&owner=${encodeURIComponent(selectedPet.owner)}&bgy=${encodeURIComponent(selectedPet.barangay)}&vax=${selectedPet.vaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(selectedPet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(selectedPet.nextVaccinationDate || "")}`;
    QRCode.toDataURL(petUrl, { width: 320, margin: 1 })
      .then((url) => setQrCodeUrl(url))
      .catch((e) => console.error(e));
  }, [selectedPet]);

  const handleExport = (petsToExport: PetRecord[], filterSummary?: string) => {
    if (petsToExport.length === 0) {
      toast.error("No pet records match the selected export filter.");
      return;
    }

    const content =
      "Pet ID,Name,Species,Breed,Sex,Owner,Barangay,Vaccinated,Sterilized\n" +
      petsToExport
        .map(
          (p: PetRecord) =>
            `"${p.id}","${p.name}","${p.species}","${p.breed}","${p.sex}","${p.owner}","${p.barangay}","${p.vaccinated ? "Yes" : "No"}","${p.sterilized ? "Yes" : "No"}"`
        )
        .join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cvo_animal_registry_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Exported ${petsToExport.length} animal records to CSV${filterSummary ? ` (${filterSummary})` : ""}`);
  };

  // Find linked consultations
  const petConsultations = useMemo(() => {
    if (!selectedPet) return [];
    return consultations.filter(
      (c) =>
        c.petId.toLowerCase() === selectedPet.id.toLowerCase() ||
        c.petName.toLowerCase() === selectedPet.name.toLowerCase()
    );
  }, [selectedPet, consultations]);

  // Fetch linked vaccination records from database for selected pet
  const { data: petDbVaccinations = [] } = useQuery({
    queryKey: ["selected-pet-vaccinations", selectedPet?.id, selectedPet?.name],
    queryFn: async () => {
      if (!selectedPet) return [];
      try {
        const { data } = await supabase
          .from("vaccination_records")
          .select("*")
          .or(`pet_id.eq.${selectedPet.id},pet_name.ilike.%${selectedPet.name}%`)
          .order("date_administered", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedPet,
    staleTime: 30000,
  });

  // Fetch linked procedure appointments (vaccination / kapon / exam) from appointments table
  const { data: petDbAppointments = [] } = useQuery({
    queryKey: ["selected-pet-appointments", selectedPet?.id, selectedPet?.name],
    queryFn: async () => {
      if (!selectedPet) return [];
      try {
        const { data } = await supabase
          .from("appointments")
          .select("*")
          .or(`pet_id.eq.${selectedPet.id},pet_name.ilike.%${selectedPet.name}%`)
          .order("date", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedPet,
    staleTime: 30000,
  });

  // Unified chronological medical history for the pet
  const petMedicalHistory = useMemo(() => {
    if (!selectedPet) return [];

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

    // 1. Consultations from CVO store
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

    // 2. Database vaccination records
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

    // 3. Appointments / Procedures
    petDbAppointments.forEach((a: any) => {
      const isSurg = a.service_id?.toLowerCase().includes("spay") || a.service_id?.toLowerCase().includes("neuter") || a.service_id?.toLowerCase().includes("kapon");
      const isVax = a.service_id?.toLowerCase().includes("vaccin");
      if (!list.some((existing) => existing.id === a.id)) {
        list.push({
          id: a.id,
          date: a.date ? a.date.split("T")[0] : "2026-10-28",
          title: isSurg ? "Spay & Neuter (Kapon Surgery)" : isVax ? "Anti-Rabies Vaccination" : "General Clinical Examination",
          category: isSurg ? "Surgery" : isVax ? "Vaccination" : "Consultation",
          diagnosis: isSurg ? "Elective Sterilization Procedure" : isVax ? "Preventive Immunization" : "Health Evaluation",
          treatment: a.notes || (isSurg ? "Surgical Sterilization & Post-Op Antibiotics" : "Routine Assessment"),
          vetName: "Dr. Helen Ann P. Tacandong, DVM",
          status: a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : "Completed",
        });
      }
    });

    // Baseline records based on pet's verified state
    if (list.length === 0) {
      if (selectedPet.vaccinated) {
        list.push({
          id: `VAX-CDO-${selectedPet.id.slice(0, 6)}`,
          date: selectedPet.lastVaccinationDate || "2026-10-28",
          title: "Rabisin Anti-Rabies Core Immunization (1.0 mL SC)",
          category: "Vaccination",
          diagnosis: "Municipal Anti-Rabies Core Immunization (RA 9482)",
          treatment: "Subcutaneous Rabies Vaccine Administered",
          medication: `Lot #RB-2026-9844 • Next Due: ${selectedPet.nextVaccinationDate || "2027-10-28"}`,
          vetName: "Dr. Helen Ann P. Tacandong, DVM",
          status: "Protected",
        });
      }
      if (selectedPet.sterilized) {
        list.push({
          id: `SURG-${selectedPet.id.slice(0, 6)}`,
          date: "2026-08-15",
          title: selectedPet.sex === "Female" ? "Ovariohysterectomy (Kapon Spay)" : "Orchiectomy (Kapon Neuter)",
          category: "Surgery",
          diagnosis: "Elective Surgical Sterilization",
          treatment: "Aseptic surgical procedure, absorbable sutures placed",
          medication: "Post-op analgesia and antibiotic coverage",
          vetName: "Dr. Elena Santos, DVM",
          status: "Completed",
        });
      }
      list.push({
        id: `INTAKE-${selectedPet.id.slice(0, 6)}`,
        date: "2026-05-10",
        title: "Official CDO Municipal Animal Registration & Intake",
        category: "Intake",
        diagnosis: "Healthy Physical State • Patient Registration Verified",
        treatment: `Initial physical exam, microchip verification #${selectedPet.microchip}`,
        medication: "Preventive Deworming & Digital Health Passport Issued",
        vetName: "City Veterinary Office Clinical Staff",
        status: "Active",
      });
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedPet, petConsultations, petDbVaccinations, petDbAppointments]);

  return (
    <div className="flex-1 space-y-3 p-6 pt-6 bg-background min-h-screen text-foreground">
      <PageHeader
        supertitle={isPetOwner ? "Citizen Pet Services" : "Animal Health Module"}
        title={isPetOwner ? "My Pets & Passports" : "Pet Registry"}
        subtitle={
          isPetOwner ? (
            <>
              Your registered companion animals,{" "}
              <span className="text-foreground">digital QR health passports</span>, and vaccination records under the Cagayan de Oro City Veterinary Office.
            </>
          ) : (
            <>
              City-wide animal registration database with{" "}
              <span className="text-foreground">QR-coded digital health passports</span> and electronic veterinary records (EMR) for the CDO Veterinary Office.
            </>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs cursor-pointer shadow-xs"
              onClick={() => setExportDialogOpen(true)}
            >
              <Download className="size-3.5" /> Export CSV
            </Button>
            <RegisterPetDialog />
          </>
        }
      />

      <PageMetricCards metrics={metrics} />

      <Card>
        <CardHeader className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">
                {isPetOwner ? "My Registered Animals" : "Registered Animals"}
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground/80">
                {isPetOwner
                  ? "All companion animals registered under your account with active digital passports"
                  : "All pets and working animals registered under the Cagayan de Oro City Veterinary Office"}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, ID, or owner..."
                  className="h-8 w-full sm:w-64 pl-8 text-xs bg-muted/20"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              {/* Categorize Dropdown after Search */}
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-36 sm:w-44 text-xs bg-muted/20">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="dog">Canine (Dogs)</SelectItem>
                  <SelectItem value="cat">Feline (Cats)</SelectItem>
                  <SelectItem value="vaccinated">Vaccinated Only</SelectItem>
                  <SelectItem value="unvaccinated">Unvaccinated Only</SelectItem>
                  <SelectItem value="sterilized">Spayed / Neutered</SelectItem>
                  <SelectItem value="intact">Intact Animals</SelectItem>
                </SelectContent>
              </Select>

              <TableColumnFilter
                columns={columns}
                visibleColumns={visibleColumns}
                onToggleColumn={toggleColumn}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes("id") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6">
                    Pet ID
                  </TableHead>
                )}
                {visibleColumns.includes("name") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Name
                  </TableHead>
                )}
                {visibleColumns.includes("species") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Species
                  </TableHead>
                )}
                {visibleColumns.includes("breed") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Breed
                  </TableHead>
                )}
                {visibleColumns.includes("owner") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Owner
                  </TableHead>
                )}
                {visibleColumns.includes("sterilized") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Spay / Neuter
                  </TableHead>
                )}
                {visibleColumns.includes("vaccinated") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest pr-6">
                    Vaccinated
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No pets match your search.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((pet, idx) => (
                  <TableRow
                    key={`${pet.id}-${idx}`}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setSelectedPet(pet);
                      setActiveProfileTab("overview");
                    }}
                  >
                    {visibleColumns.includes("id") && (
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6" title={pet.id}>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono text-[11px] border border-border/40 select-all">
                          {pet.id.length > 8 ? `${pet.id.slice(0, 8)}...` : pet.id}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell className="text-xs font-medium text-foreground py-2.5">
                        <div className="flex items-center gap-2.5">
                          <PetAvatar
                            photoUrl={pet.photo_url}
                            species={pet.species}
                            name={pet.name}
                            size="xs"
                          />
                          <span className="font-semibold text-foreground">{pet.name}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("species") && (
                      <TableCell className="text-xs font-semibold text-foreground">
                        {pet.species}
                      </TableCell>
                    )}
                    {visibleColumns.includes("breed") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {pet.breed}
                      </TableCell>
                    )}
                    {visibleColumns.includes("owner") && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6 shrink-0 border border-border/80">
                            {pet.ownerAvatarUrl ? (
                              <AvatarImage src={pet.ownerAvatarUrl} alt={pet.owner} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {pet.owner.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-foreground truncate max-w-[160px]">
                            {pet.owner}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("sterilized") && (
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium py-0.5 px-2 border",
                            pet.sterilized
                              ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/30"
                              : "bg-muted/40 text-muted-foreground border-border/60"
                          )}
                        >
                          {pet.sterilized
                            ? pet.sex === "Female"
                              ? "Spayed"
                              : "Neutered"
                            : "Intact"}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("vaccinated") && (
                      <TableCell className="pr-6">
                        <Badge
                          className={cn(
                            "text-[10px] font-semibold border-0 py-0.5 px-2",
                            pet.vaccinated
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                              : "bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25"
                          )}
                        >
                          {pet.vaccinated ? "Vaccinated" : "Unvaccinated"}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            itemLabel="pets"
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      {/* ── Official Pet Profile Dialog (Matches Pet Owner View) ── */}
      <PetProfileDialog
        pet={selectedPet}
        open={!!selectedPet}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPet(null);
          }
        }}
        onEditPet={(pet) => {
          setPetToEdit(pet);
          setEditDialogOpen(true);
        }}
        onDeletePet={(pet) => {
          setPetToDelete(pet);
          setDeleteDialogOpen(true);
        }}
        onAvatarChange={(url) => {
          if (selectedPet) {
            setSelectedPet({ ...selectedPet, photo_url: url });
          }
        }}
        onPetUpdate={(updatedPet) => {
          if (selectedPet && selectedPet.id === updatedPet.id) {
            setSelectedPet((prev) => (prev ? { ...prev, ...updatedPet } : null));
          }
        }}
        consultations={consultations}
      />

      {/* ── Edit Pet Dialog ── */}
      <EditPetDialog
        pet={petToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onDeleteRequest={(pet) => {
          setPetToDelete(pet);
          setDeleteDialogOpen(true);
        }}
      />

      {/* ── Delete Pet Dialog ── */}
      <DeletePetDialog
        pet={petToDelete || selectedPet}
        open={deleteDialogOpen}
        onOpenChange={(isOpen) => {
          setDeleteDialogOpen(isOpen);
          if (!isOpen) {
            setPetToDelete(null);
          }
        }}
        onDeleted={() => {
          setSelectedPet(null);
          setPetToDelete(null);
          setDeleteDialogOpen(false);
        }}
      />

      {/* ── Pre-Export Filter Dialog ── */}
      <ExportTableDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        title="Export Animal Registry"
        description="Filter registered pets by day, month, year, date range, species, sex, or vaccination status before exporting to CSV."
        data={userPets}
        dateExtractor={(p) => p.createdAt || p.lastVaccinationDate}
        customFilters={[
          {
            id: "species",
            label: "Species",
            placeholder: "All Species",
            options: [
              { label: "All Species", value: "ALL" },
              { label: "Canine / Dog", value: "Dog" },
              { label: "Feline / Cat", value: "Cat" },
              { label: "Livestock", value: "Livestock" },
            ],
            predicate: (p, val) => {
              if (val === "ALL") return true;
              return p.species === val;
            },
          },
          {
            id: "sex",
            label: "Sex / Gender",
            placeholder: "All",
            options: [
              { label: "All", value: "ALL" },
              { label: "Male", value: "Male" },
              { label: "Female", value: "Female" },
            ],
            predicate: (p, val) => {
              if (val === "ALL") return true;
              return p.sex === val;
            },
          },
          {
            id: "vaccinated",
            label: "Vaccination Status",
            placeholder: "All Records",
            options: [
              { label: "All Records", value: "ALL" },
              { label: "Vaccinated Only", value: "VACCINATED" },
              { label: "Unvaccinated Only", value: "UNVACCINATED" },
            ],
            predicate: (p, val) => {
              if (val === "ALL") return true;
              return val === "VACCINATED" ? p.vaccinated : !p.vaccinated;
            },
          },
          {
            id: "sterilized",
            label: "Sterilization (Spayed/Neutered)",
            placeholder: "All Records",
            options: [
              { label: "All Records", value: "ALL" },
              { label: "Sterilized (Spayed / Neutered)", value: "STERILIZED" },
              { label: "Intact", value: "INTACT" },
            ],
            predicate: (p, val) => {
              if (val === "ALL") return true;
              return val === "STERILIZED" ? p.sterilized : !p.sterilized;
            },
          },
        ]}
        onExport={handleExport}
      />
    </div>
  );
}
