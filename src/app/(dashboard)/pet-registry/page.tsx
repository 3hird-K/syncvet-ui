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
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { EditPetDialog } from "@/components/dashboard/edit-pet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
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
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // CRUD states for Edit & Delete
  const [petToEdit, setPetToEdit] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [petToDelete, setPetToDelete] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  // Generate QR for selected pet
  useEffect(() => {
    if (!selectedPet) return;
    const petUrl = `${window.location.origin}/verify/pet/${selectedPet.id}?name=${encodeURIComponent(selectedPet.name)}&species=${encodeURIComponent(selectedPet.species)}&breed=${encodeURIComponent(selectedPet.breed)}&tag=${encodeURIComponent(selectedPet.microchip || selectedPet.id)}&owner=${encodeURIComponent(selectedPet.owner)}&bgy=${encodeURIComponent(selectedPet.barangay)}&vax=${selectedPet.vaccinated ? "1" : "0"}&lastVax=${encodeURIComponent(selectedPet.lastVaccinationDate || "")}&nextVax=${encodeURIComponent(selectedPet.nextVaccinationDate || "")}`;
    QRCode.toDataURL(petUrl, { width: 320, margin: 1 })
      .then((url) => setQrCodeUrl(url))
      .catch((e) => console.error(e));
  }, [selectedPet]);

  const handleExport = () => {
    toast.promise(new Promise((resolve) => setTimeout(resolve, 800)), {
      loading: "Generating municipal animal registry CSV...",
      success: () => {
        const content =
          "Pet ID,Name,Species,Breed,Owner,Barangay,Vaccinated,Sterilized\n" +
          userPets
            .map(
              (p: PetRecord) =>
                `${p.id},${p.name},${p.species},${p.breed},${p.owner},${p.barangay},${p.vaccinated},${p.sterilized}`
            )
            .join("\n");
        const blob = new Blob([content], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cvo_animal_registry_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        return "Registry exported successfully";
      },
      error: "Export failed",
    });
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
              className="gap-2 text-xs cursor-pointer"
              onClick={handleExport}
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
                      setActiveTab("overview");
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
                            size="sm"
                          />
                          <span className="font-semibold text-foreground">{pet.name}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.includes("species") && (
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className={cn(
                              "size-6 rounded-md flex items-center justify-center shrink-0 border",
                              pet.species === "Dog"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            )}
                          >
                            {pet.species === "Dog" ? (
                              <Dog className="size-3.5" />
                            ) : (
                              <Cat className="size-3.5" />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {pet.species}
                          </span>
                        </div>
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

      {/* ── Electronic Veterinary Record (EMR) Full Drawer ── */}
      <Sheet open={!!selectedPet} onOpenChange={(open) => !open && setSelectedPet(null)}>
        <SheetContent showCloseButton={false} className="sm:max-w-[620px] overflow-y-auto p-5 sm:p-6 bg-background space-y-4">
          {selectedPet && (
            <div className="space-y-4">
              <SheetHeader className="sr-only">
                <SheetTitle>{selectedPet.name} - Electronic Veterinary Record</SheetTitle>
                <SheetDescription>Official digital animal passport and clinical EMR record for {selectedPet.name}</SheetDescription>
              </SheetHeader>

              {/* Drawer Top Navigation & Actions Bar with Perfectly Aligned X Icon */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <PawIcon className="size-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block leading-tight">Patient Health & EMR</span>
                    <span className="text-[10px] text-muted-foreground block leading-tight">Official Municipal Record</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* View QR Code Passport Modal */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setQrDialogOpen(true)}
                    className="size-8 rounded-lg border-border/70 hover:bg-muted cursor-pointer transition-colors text-muted-foreground hover:text-foreground hover:border-primary/40 hover:text-primary"
                    title="View QR Code Passport"
                  >
                    <QrCode className="size-3.5" />
                    <span className="sr-only">View QR Passport</span>
                  </Button>

                  {/* Edit Pet (Icon only) */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setPetToEdit(selectedPet);
                      setEditDialogOpen(true);
                    }}
                    className="size-8 rounded-lg border-border/70 hover:bg-muted cursor-pointer"
                    title="Edit Pet Details"
                  >
                    <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                    <span className="sr-only">Edit Pet</span>
                  </Button>

                  {/* Delete Pet (Icon only) */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPetToDelete(selectedPet);
                      setDeleteDialogOpen(true);
                    }}
                    className="size-8 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 border-rose-500/30 cursor-pointer"
                    title="Delete Pet Record"
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete Pet</span>
                  </Button>

                  {/* Integrated Close (X) Icon Button */}
                  <SheetClose asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border-border/70 cursor-pointer ml-1"
                      title="Close Drawer"
                    >
                      <X className="size-4" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>
              </div>

              {/* Profile Hero Header Card */}
              <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/30 p-4.5 sm:p-5 shadow-xs">
                <div className="flex items-center gap-3.5 min-w-0">
                  <PetAvatar
                    photoUrl={selectedPet.photo_url}
                    species={selectedPet.species}
                    name={selectedPet.name}
                    size="lg"
                  />
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold tracking-tight text-foreground truncate">
                        {selectedPet.name}
                      </h2>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold border-0 py-0.5 px-2",
                          selectedPet.vaccinated
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {selectedPet.vaccinated ? "Rabies Vaccinated" : "Unvaccinated"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium truncate">
                      {selectedPet.breed} • {selectedPet.sex}
                    </p>
                  </div>
                </div>

                {/* Identification & Barcode Strip */}
                <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">Pet ID:</span>
                    <span className="font-mono font-semibold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40 select-all text-[10px] truncate max-w-[220px]" title={selectedPet.id}>
                      {selectedPet.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="size-3 text-primary" />
                      <span className="font-mono text-[10px] font-medium text-foreground">
                        Tag #{selectedPet.microchip || selectedPet.id.slice(0, 8)}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQrDialogOpen(true)}
                      className="h-6 px-2 text-[10px] font-bold text-primary border-primary/30 hover:bg-primary/10 gap-1 rounded-md cursor-pointer shrink-0 shadow-2xs"
                      title="View Digital QR Passport Modal"
                    >
                      <QrCode className="size-3" />
                      <span>View QR</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* 4-Up Clinical Metric Tiles */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl border border-border/70 bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Age</span>
                  <span className="text-xs font-black text-foreground block truncate">{selectedPet.age}</span>
                  <span className="text-[9px] text-muted-foreground/80 block">
                    {selectedPet.species === "Dog" ? "Canine" : "Feline"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-border/70 bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Weight</span>
                  <span className="text-xs font-black text-foreground block truncate">{selectedPet.weightKg} kg</span>
                  <span className="text-[9px] text-muted-foreground/80 block">
                    {selectedPet.weightKg >= 18 ? "Large" : selectedPet.weightKg >= 8 ? "Medium" : "Small"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-border/70 bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Spay / Neuter</span>
                  <span className={cn(
                    "text-xs font-black block truncate",
                    selectedPet.sterilized ? "text-cyan-600 dark:text-cyan-400" : "text-muted-foreground"
                  )}>
                    {selectedPet.sterilized ? (selectedPet.sex === "Female" ? "Spayed" : "Neutered") : "Intact"}
                  </span>
                  <span className="text-[9px] text-muted-foreground/80 block">
                    {selectedPet.sterilized ? "Sterilized" : "Reproductive"}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl border border-border/70 bg-card/60 text-center space-y-0.5">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Immunity</span>
                  <span className={cn(
                    "text-xs font-black block truncate",
                    selectedPet.vaccinated ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {selectedPet.vaccinated ? "Protected" : "Due"}
                  </span>
                  <span className="text-[9px] text-muted-foreground/80 block">Anti-Rabies</span>
                </div>
              </div>

              {/* Electronic Veterinary Record Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 h-9.5 w-full bg-muted/40 p-1 rounded-xl">
                  <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="records" className="text-xs font-semibold rounded-lg">History & EMR</TabsTrigger>
                  <TabsTrigger value="vaccinations" className="text-xs font-semibold rounded-lg">Vaccines</TabsTrigger>
                  <TabsTrigger value="passport" className="text-xs font-semibold rounded-lg gap-1.5">
                    <QrCode className="size-3" />
                    <span>Passport</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-3.5 pt-2 text-xs">
                  {/* Medical History Highlights directly on Overview */}
                  <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Activity className="size-3.5" /> Medical History & Encounters
                      </p>
                      <Badge variant="outline" className="text-[9px] font-semibold text-muted-foreground">
                        {petMedicalHistory.length} Record{petMedicalHistory.length !== 1 ? "s" : ""}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {petMedicalHistory.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {item.category === "Vaccination" ? (
                                <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border-0 py-0 px-1.5">
                                  <Syringe className="size-2.5 mr-0.5 inline" /> Vaccine
                                </Badge>
                              ) : item.category === "Surgery" ? (
                                <Badge className="text-[9px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-0 py-0 px-1.5">
                                  <Scissors className="size-2.5 mr-0.5 inline" /> Surgery
                                </Badge>
                              ) : item.category === "Consultation" ? (
                                <Badge className="text-[9px] font-bold bg-blue-500/15 text-blue-600 border-0 py-0 px-1.5">
                                  <Stethoscope className="size-2.5 mr-0.5 inline" /> Consult
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] font-bold bg-purple-500/15 text-purple-600 border-0 py-0 px-1.5">
                                  <FileText className="size-2.5 mr-0.5 inline" /> Intake
                                </Badge>
                              )}
                              <span className="font-semibold text-foreground text-xs">{item.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{item.date}</span>
                          </div>

                          {item.diagnosis && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">Diagnosis:</span> {item.diagnosis}
                            </p>
                          )}
                          {item.medication && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">Rx / Lot:</span> {item.medication}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                            <span>Clinician: <strong className="text-foreground">{item.vetName}</strong></span>
                            <span className="font-semibold text-emerald-600">{item.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Biological Profile Card */}
                  <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Stethoscope className="size-3.5" /> Biological & Physical Profile
                      </p>
                      <Badge variant="outline" className="text-[9px] font-semibold text-muted-foreground">
                        {selectedPet.classification} Animal
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Breed & Lineage</span>
                        <strong className="text-foreground text-xs block truncate">{selectedPet.breed}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Sex & Age</span>
                        <strong className="text-foreground text-xs block">{selectedPet.sex} • {selectedPet.age}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Recorded Weight</span>
                        <strong className="text-foreground text-xs block">{selectedPet.weightKg} kg</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Color & Markings</span>
                        <strong className="text-foreground text-xs block truncate">{selectedPet.color || "Standard"}</strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Sterilization State</span>
                        <strong className="text-foreground text-xs block">
                          {selectedPet.sterilized ? (selectedPet.sex === "Female" ? "Spayed (Ovariohysterectomy)" : "Neutered (Castration)") : "Intact (Not Sterilized)"}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 space-y-0.5">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider block">Microchip / Municipal Tag</span>
                        <strong className="font-mono text-xs text-foreground block truncate">{selectedPet.microchip}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Registered Owner Card */}
                  <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <User className="size-3.5" /> Registered Citizen Pet Owner
                      </p>
                      <Badge variant="outline" className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                        Verified Household
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                      <Avatar className="size-11 shrink-0 border-2 border-primary/20 shadow-xs">
                        {selectedPet.ownerAvatarUrl ? (
                          <AvatarImage src={selectedPet.ownerAvatarUrl} alt={selectedPet.owner} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {selectedPet.owner.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{selectedPet.owner}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <MapPin className="size-3 text-primary shrink-0" />
                          <span>{selectedPet.address || "District Proper, Cagayan de Oro City"}</span>
                        </p>
                        {selectedPet.ownerEmail && (
                          <p className="text-[11px] text-muted-foreground truncate">{selectedPet.ownerEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 2: Full History & EMR */}
                <TabsContent value="records" className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" /> Full Clinical & Treatment History
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {petMedicalHistory.length} Recorded Procedure{petMedicalHistory.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {petMedicalHistory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground rounded-xl border border-dashed border-border/80 bg-card/40 space-y-1">
                      <Stethoscope className="size-6 text-muted-foreground/40 mx-auto" />
                      <p className="text-xs font-semibold">No Medical History Found</p>
                      <p className="text-[11px]">No clinical records or treatment encounters recorded yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {petMedicalHistory.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-border/80 bg-card/60 space-y-2 shadow-2xs hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {item.category === "Vaccination" ? (
                                <Badge className="text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border-0 py-0.5 px-2">
                                  <Syringe className="size-2.5 mr-1 inline" /> Vaccination
                                </Badge>
                              ) : item.category === "Surgery" ? (
                                <Badge className="text-[9px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-0 py-0.5 px-2">
                                  <Scissors className="size-2.5 mr-1 inline" /> Surgery
                                </Badge>
                              ) : item.category === "Consultation" ? (
                                <Badge className="text-[9px] font-bold bg-blue-500/15 text-blue-600 border-0 py-0.5 px-2">
                                  <Stethoscope className="size-2.5 mr-1 inline" /> Consultation
                                </Badge>
                              ) : (
                                <Badge className="text-[9px] font-bold bg-purple-500/15 text-purple-600 border-0 py-0.5 px-2">
                                  <FileText className="size-2.5 mr-1 inline" /> Intake Record
                                </Badge>
                              )}
                              <span className="font-bold text-foreground text-xs">{item.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/40 font-medium">
                              {item.date}
                            </span>
                          </div>

                          {item.diagnosis && (
                            <div className="p-2 rounded-lg bg-muted/20 border border-border/40 text-[11px] space-y-0.5">
                              <span className="font-semibold text-foreground block">Diagnosis / Clinical Findings:</span>
                              <p className="text-muted-foreground">{item.diagnosis}</p>
                            </div>
                          )}

                          {item.treatment && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Treatment Administered:</span> {item.treatment}
                            </p>
                          )}

                          {item.medication && (
                            <p className="text-[11px] text-muted-foreground">
                              <span className="font-semibold text-foreground">Prescription / Lot #:</span> {item.medication}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[10px] text-muted-foreground">
                            <span>Attending Clinician: <strong className="text-foreground">{item.vetName}</strong></span>
                            <span className="font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Vaccinations */}
                <TabsContent value="vaccinations" className="space-y-3 pt-2 text-xs">
                  <div className={cn(
                    "p-3.5 rounded-xl border space-y-2",
                    selectedPet.vaccinated
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100"
                      : "border-rose-500/30 bg-rose-500/5 text-rose-900 dark:text-rose-100"
                  )}>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-xs flex items-center gap-1.5">
                        <ShieldCheck className={cn("size-4", selectedPet.vaccinated ? "text-emerald-600" : "text-rose-600")} />
                        Anti-Rabies Protection Ledger (RA 9482)
                      </p>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold border-0",
                          selectedPet.vaccinated
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        )}
                      >
                        {selectedPet.vaccinated ? "Certified Up-To-Date" : "Vaccination Due"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                        <span className="text-[10px] text-muted-foreground block">Last Dose Date</span>
                        <strong className="text-foreground">{selectedPet.lastVaccinationDate || "No record on file"}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-background/60 border border-border/40">
                        <span className="text-[10px] text-muted-foreground block">Next Annual Booster</span>
                        <strong className="text-foreground">{selectedPet.nextVaccinationDate || "Immediate Attention Required"}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileCheck2 className="size-3 text-primary" />
                      Official Cagayan de Oro Immunization Certificate
                    </p>
                    <div className="p-3 rounded-xl border border-border/70 bg-card/60 space-y-2">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="text-xs">Rabisin Inactivated Rabies Vaccine (1.0 mL SC)</span>
                        <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/20">
                          Annual Core
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <p>Lot #RB-2026-9844 • Government Cold-Chain Batch</p>
                        <p>Attending City Veterinarian: <strong>Dr. Helen Ann P. Tacandong, DVM</strong></p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 4: QR Pet Passport */}
                <TabsContent value="passport" className="space-y-4 pt-2 text-xs text-center">
                  <div className="p-5 rounded-2xl border border-border/80 bg-gradient-to-b from-card via-card to-muted/20 space-y-3.5 shadow-xs">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-primary">
                        Official CDO Digital Animal Passport
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        City Veterinary Office • Municipal Animal Registry of Cagayan de Oro
                      </p>
                    </div>

                    {qrCodeUrl ? (
                      <div className="p-2.5 rounded-2xl border-2 border-primary/20 bg-white max-w-fit mx-auto shadow-sm">
                        <img
                          src={qrCodeUrl}
                          alt="QR Code Passport"
                          className="size-36 mx-auto rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="size-36 mx-auto flex items-center justify-center bg-muted rounded-2xl border">
                        <QrCode className="size-8 text-muted-foreground animate-pulse" />
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="font-mono font-bold text-xs text-foreground tracking-wider bg-muted/50 max-w-fit mx-auto px-3 py-1 rounded-full border border-border/60">
                        {selectedPet.id}
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-xs mx-auto pt-1 leading-snug">
                        Scan with any smartphone camera to verify patient microchip, anti-rabies immunity validity, and registered owner records.
                      </p>
                    </div>

                    {qrCodeUrl && (
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const a = document.createElement("a");
                            a.href = qrCodeUrl;
                            a.download = `cvo-pet-passport-${selectedPet.name || selectedPet.id}.png`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            toast.success("Pet Passport QR Downloaded", {
                              description: `Saved QR code for ${selectedPet.name || "pet"}`,
                            });
                          }}
                          className="h-8.5 px-4 gap-1.5 text-xs font-semibold cursor-pointer border-border hover:bg-muted rounded-lg shadow-2xs"
                        >
                          <Download className="size-3.5 text-emerald-600" />
                          <span>Download High-Res QR Passport</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

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

      {/* ── Pet Digital Passport QR Modal ── */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md p-6 bg-background rounded-2xl shadow-2xl">
          <DialogHeader className="border-b pb-3 pr-8 space-y-1">
            <div className="flex items-center gap-2 text-primary">
              <QrCode className="size-5 shrink-0" />
              <DialogTitle className="text-base font-bold text-foreground">
                Digital Animal Passport
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official CDO City Veterinary Office verification pass
            </DialogDescription>
          </DialogHeader>

          {selectedPet && (
            <div className="flex flex-col items-center justify-center pt-2 space-y-4 text-center">
              {qrCodeUrl ? (
                <div className="p-3.5 bg-white rounded-2xl border-2 border-primary/25 shadow-md max-w-fit mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrCodeUrl}
                    alt={`${selectedPet.name} QR Passport`}
                    className="size-48 rounded-lg"
                  />
                </div>
              ) : (
                <div className="size-48 flex items-center justify-center bg-muted rounded-2xl border">
                  <QrCode className="size-10 text-muted-foreground animate-pulse" />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-extrabold text-lg text-foreground">
                    {selectedPet.name}
                  </h3>
                  <Badge
                    className={cn(
                      "text-[10px] font-bold border-0 py-0.5 px-2",
                      selectedPet.vaccinated
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {selectedPet.vaccinated ? "Rabies Vaccinated" : "Unvaccinated"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {selectedPet.species} • {selectedPet.breed} • {selectedPet.sex}
                </p>
                <div className="pt-1 flex items-center justify-center gap-1.5">
                  <Tag className="size-3 text-primary" />
                  <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    Tag #{selectedPet.microchip || selectedPet.id}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Scan with any smartphone camera or CVO scanner to verify microchip, anti-rabies immunity validity, and registered owner records.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 w-full pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/verify/pet/${selectedPet.id}`
                    );
                    toast.success("Verification Link Copied", {
                      description: "Public link copied to clipboard.",
                    });
                  }}
                  className="h-9 text-xs font-semibold gap-1.5 cursor-pointer rounded-xl border-border hover:bg-muted"
                >
                  <Copy className="size-3.5" />
                  <span>Copy Link</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!qrCodeUrl) return;
                    const a = document.createElement("a");
                    a.href = qrCodeUrl;
                    a.download = `cvo-pet-passport-${selectedPet.name || selectedPet.id}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success("Pet Passport QR Downloaded", {
                      description: `Saved QR code for ${selectedPet.name || "pet"}`,
                    });
                  }}
                  className="h-9 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Download QR</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
