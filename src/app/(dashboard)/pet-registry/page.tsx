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
  Eye,
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
} from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import { TableColumnFilter } from "@/components/dashboard/table-column-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { PageMetricCards, type PageMetric } from "@/components/dashboard/page-metric-cards";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { EditPetDialog } from "@/components/dashboard/edit-pet-dialog";
import { DeletePetDialog } from "@/components/dashboard/delete-pet-dialog";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";

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
  barangay: string;
  address: string;
  vaccinated: boolean;
  qr: boolean;
  sterilized: boolean;
  microchip: string;
  classification: "Domestic" | "Livestock";
  lastVaccinationDate?: string;
  nextVaccinationDate?: string;
}

export default function PetRegistryPage() {
  const { user, isLoaded } = useUser();
  const { consultations, activeRoleView } = useCVO();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

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
          .select("*, users(id, full_name, email, address)")
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
          weightKg: p.weight_category === "large" ? 22 : p.weight_category === "small" ? 4.5 : 14.2,
          color: "Standard",
          ownerId: p.owner_id || p.users?.id || "",
          owner: p.users?.full_name || (p.owner_id === user?.id ? (user?.fullName || "Kyle Urgentrouse") : "Registered Citizen"),
          ownerEmail: p.users?.email || (p.owner_id === user?.id ? user?.primaryEmailAddress?.emailAddress : ""),
          barangay: "Cagayan de Oro",
          address: p.users?.address || "District Proper",
          vaccinated: Boolean(p.is_vaccinated),
          qr: true,
          sterilized: Boolean(p.is_neutered || p.is_spayed_neutered),
          microchip: p.microchip_number || p.id,
          classification: "Domestic" as const,
          lastVaccinationDate: p.is_vaccinated ? "2026-05-10" : undefined,
          nextVaccinationDate: p.is_vaccinated ? "2027-05-10" : undefined,
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
    { id: "barangay", label: "Barangay" },
    { id: "vaccinated", label: "Vaccinated" },
    { id: "qr", label: "QR Passport" },
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map((c) => c.id));

  const toggleColumn = (id: string) => {
    setVisibleColumns((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return userPets;
    return userPets.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.barangay.toLowerCase().includes(q)
    );
  }, [userPets, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Generate QR for selected pet
  useEffect(() => {
    if (!selectedPet) return;
    const petUrl = `${window.location.origin}/pet-registry?id=${selectedPet.id}`;
    QRCode.toDataURL(petUrl, { width: 140, margin: 1 })
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
                {visibleColumns.includes("barangay") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Barangay
                  </TableHead>
                )}
                {visibleColumns.includes("vaccinated") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    Vaccinated
                  </TableHead>
                )}
                {visibleColumns.includes("qr") && (
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest">
                    QR Passport
                  </TableHead>
                )}
                <TableHead className="text-[10px] font-bold uppercase tracking-widest text-right pr-6">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No pets match your search.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((pet, idx) => (
                  <TableRow key={`${pet.id}-${idx}`} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedPet(pet)}>
                    {visibleColumns.includes("id") && (
                      <TableCell className="font-mono text-xs text-muted-foreground pl-6">
                        {pet.id}
                      </TableCell>
                    )}
                    {visibleColumns.includes("name") && (
                      <TableCell className="text-sm font-semibold">{pet.name}</TableCell>
                    )}
                    {visibleColumns.includes("species") && (
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {pet.species === "Dog" ? "🐕" : "🐈"} {pet.species}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("breed") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {pet.breed}
                      </TableCell>
                    )}
                    {visibleColumns.includes("owner") && (
                      <TableCell className="text-xs">{pet.owner}</TableCell>
                    )}
                    {visibleColumns.includes("barangay") && (
                      <TableCell className="text-xs text-muted-foreground">
                        {pet.barangay}
                      </TableCell>
                    )}
                    {visibleColumns.includes("vaccinated") && (
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-[10px]",
                            pet.vaccinated
                              ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                              : "bg-red-500/15 text-red-500 hover:bg-red-500/25"
                          )}
                        >
                          {pet.vaccinated ? "Vaccinated" : "Pending"}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.includes("qr") && (
                      <TableCell>
                        {pet.qr ? (
                          <QrCode className="size-4 text-emerald-500" />
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPet(pet)}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                        >
                          <Eye className="size-3.5" /> EMR Record
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPetToEdit(pet);
                            setEditDialogOpen(true);
                          }}
                          className="size-7 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
                          title={`Edit ${pet.name}`}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPetToDelete(pet);
                            setDeleteDialogOpen(true);
                          }}
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-md"
                          title={`Delete ${pet.name}`}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
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
        <SheetContent className="sm:max-w-[560px] overflow-y-auto p-6">
          {selectedPet && (
            <div className="space-y-5">
              <SheetHeader className="p-0 text-left">
                <div className="flex items-center justify-between pr-8">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedPet.id}
                  </Badge>
                  <Badge
                    className={
                      selectedPet.vaccinated
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-red-500/15 text-red-500"
                    }
                  >
                    {selectedPet.vaccinated ? "Rabies Vaccinated" : "Unvaccinated"}
                  </Badge>
                </div>
                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                  <PawIcon className="size-5 text-primary" />
                  {selectedPet.name} ({selectedPet.species})
                </SheetTitle>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPetToEdit(selectedPet);
                        setEditDialogOpen(true);
                      }}
                      className="h-7 text-xs gap-1 rounded-lg cursor-pointer"
                    >
                      <Pencil className="size-3" /> Edit Pet
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = selectedPet;
                        setSelectedPet(null);
                        setPetToDelete(target);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg cursor-pointer"
                    >
                      <Trash2 className="size-3" /> Delete
                    </Button>
                  </div>
                </div>
              </SheetHeader>

              {/* Electronic Veterinary Record Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-4 h-9 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="vaccinations">Vaccines</TabsTrigger>
                  <TabsTrigger value="consultations">EMR / Tx</TabsTrigger>
                  <TabsTrigger value="passport">Passport</TabsTrigger>
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="space-y-3 pt-3 text-xs">
                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/15 space-y-2">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-primary">
                      Biological Profile
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Breed</span>
                        <strong>{selectedPet.breed}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Sex & Age</span>
                        <strong>{selectedPet.sex} • {selectedPet.age}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Weight</span>
                        <strong>{selectedPet.weightKg} kg</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Color / Pattern</span>
                        <strong>{selectedPet.color}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Classification</span>
                        <strong>{selectedPet.classification}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Sterilization</span>
                        <strong>{selectedPet.sterilized ? "Spayed/Neutered" : "Intact"}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-[10px]">Microchip / Tag ID</span>
                        <strong className="font-mono">{selectedPet.microchip}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg border border-border/60 bg-muted/15 space-y-1.5">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <User className="size-3.5" /> Registered Owner Information
                    </p>
                    <p><span className="text-muted-foreground">Owner:</span> <strong>{selectedPet.owner}</strong></p>
                    <p><span className="text-muted-foreground">Barangay:</span> <strong>Barangay {selectedPet.barangay}</strong></p>
                    <p><span className="text-muted-foreground">Address:</span> {selectedPet.address}, Cagayan de Oro City</p>
                  </div>
                </TabsContent>

                {/* Tab 2: Vaccinations */}
                <TabsContent value="vaccinations" className="space-y-3 pt-3 text-xs">
                  <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1">
                    <p className="font-bold text-emerald-600 flex items-center gap-1.5">
                      <ShieldCheck className="size-4" /> Anti-Rabies Protection Status
                    </p>
                    <p className="text-foreground">
                      Status: <strong>{selectedPet.vaccinated ? "UP TO DATE" : "OVERDUE / PENDING"}</strong>
                    </p>
                    {selectedPet.lastVaccinationDate && (
                      <p className="text-muted-foreground">
                        Last Administered: {selectedPet.lastVaccinationDate}
                      </p>
                    )}
                    {selectedPet.nextVaccinationDate && (
                      <p className="text-muted-foreground font-semibold">
                        Next Booster Due: {selectedPet.nextVaccinationDate}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                      Municipal Immunization Ledger
                    </p>
                    <div className="p-2.5 rounded-lg border border-border/60 bg-muted/15 space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span>Rabisin Anti-Rabies (Canine/Feline)</span>
                        <Badge variant="outline" className="text-[9px]">Annual</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Lot #AR-Q3-2026-014 • Vaccinator: Dr. Elena Santos, DVM</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Tab 3: Consultations & Encounters */}
                <TabsContent value="consultations" className="space-y-2.5 pt-3 text-xs">
                  {petConsultations.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      No clinical encounter logs found for this animal.
                    </div>
                  ) : (
                    petConsultations.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-primary">{c.encounterNo}</span>
                          <span className="text-[10px] text-muted-foreground">{c.date}</span>
                        </div>
                        <p className="font-semibold text-foreground">Diagnosis: {c.diagnosis}</p>
                        <p className="text-muted-foreground text-[11px]">Rx: {c.medication}</p>
                        <p className="text-[10px] text-muted-foreground/80">Clinician: {c.vetName}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tab 4: QR Pet Passport */}
                <TabsContent value="passport" className="space-y-4 pt-3 text-xs text-center">
                  <div className="p-5 rounded-xl border border-border/80 bg-muted/15 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      Official CDO Digital Pet Passport
                    </p>
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QR Code Passport"
                        className="size-32 mx-auto rounded-lg border border-border bg-white p-1"
                      />
                    ) : (
                      <div className="size-32 mx-auto flex items-center justify-center bg-muted">
                        <QrCode className="size-8 text-muted-foreground animate-pulse" />
                      </div>
                    )}
                    <p className="font-mono font-bold text-sm text-foreground">{selectedPet.id}</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Scan to verify identity, anti-rabies immunity, and registered owner with the City Veterinary Office.
                    </p>
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
        pet={petToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </div>
  );
}
