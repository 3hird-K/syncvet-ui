"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Syringe,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  User,
  PawPrint,
  Search,
  Calendar,
  RotateCw,
  Tag,
  ShieldCheck,
  Sparkles,
  MapPin,
  Phone,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cvoBarangays } from "@/data/cvo-store";
import { cn, getTodayDateString } from "@/lib/utils";
import { format, addYears, parseISO } from "date-fns";

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

export function LogVaccinationDialog({ onLogged }: { onLogged?: (record: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAuditLog, inventory, deductInventoryStock, activeRoleView } = useCVO();
  const { user, isLoaded: isUserLoaded } = useUser();
  const queryClient = useQueryClient();
  const supabase = getPublicSupabaseClient();

  // Fetch current user's database role and profile from Supabase
  const { data: dbCurrentUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
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
  const isPetOwner = currentRole === "Pet Owner" && !isAdmin && !isVet;

  const currentUserName =
    dbCurrentUser?.full_name?.trim() ||
    user?.fullName?.trim() ||
    user?.username ||
    "Attending Veterinarian";
  const currentUserAvatar = dbCurrentUser?.avatar_url || (isUserLoaded && user?.imageUrl ? user.imageUrl : undefined);

  // Load registered vets from database
  const { data: dbVets = [] } = useQuery<RegisteredVet[]>({
    queryKey: ["registered-administering-vets"],
    queryFn: async () => {
      try {
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

  const allAvailableVets = useMemo(() => {
    const list: RegisteredVet[] = [];

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

    for (const v of dbVets) {
      const lowerName = v.name.toLowerCase();
      if (
        !lowerName.includes("helen") &&
        !lowerName.includes("elena santos") &&
        !lowerName.includes("sarah chen") &&
        !list.some((item) => item.id === v.id || item.name.toLowerCase() === lowerName)
      ) {
        list.push(v);
      }
    }

    if (currentUserName) {
      const alreadyInList = list.some(
        (v) => v.name.toLowerCase() === currentUserName.toLowerCase() || (user?.id && v.id === user.id)
      );
      if (!alreadyInList) {
        list.push({
          id: user?.id || "current-vet",
          name: currentUserName,
          role: isVet ? "Veterinarian" : "Administrator",
          avatarUrl: currentUserAvatar,
          email: user?.primaryEmailAddress?.emailAddress,
        });
      }
    }

    return list;
  }, [dbVets, currentUserName, isVet, currentUserAvatar, user]);

  const [vetName, setVetName] = useState(HELEN_VET.name);

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

    const targetName = (vetName || HELEN_VET.name).toLowerCase();
    return (
      allAvailableVets.find((v) => v.name.toLowerCase() === targetName) ||
      allAvailableVets.find((v) => targetName.includes(v.name.toLowerCase()) || v.name.toLowerCase().includes(targetName)) ||
      allAvailableVets[0] ||
      HELEN_VET
    );
  }, [allAvailableVets, vetName, isAdmin, isVet, currentUserName, currentUserAvatar, user]);

  useEffect(() => {
    if (open) {
      if (!isAdmin && isVet && currentUserName) {
        setVetName(currentUserName);
      } else if (isAdmin && (!vetName || vetName.toLowerCase().includes("elena santos"))) {
        setVetName(HELEN_VET.name);
      }
    }
  }, [open, isAdmin, isVet, currentUserName, vetName]);

  // Fetch registered users (Pet Owners)
  const { data: dbUsers = [] } = useQuery({
    queryKey: ["vax-log-users"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, email, phone_number, address, role, avatar_url")
          .order("full_name", { ascending: true });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Fetch registered pets for quick auto-fill
  const { data: dbPets = [] } = useQuery({
    queryKey: ["vax-log-pets"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("pets")
          .select("id, name, species, breed, owner_id, weight_kg, weight_category, microchip_number, is_vaccinated, rabies_vaccinated, users(full_name, phone_number, address, avatar_url)");
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Fetch active vaccine batches from cold-chain inventory
  const { data: dbBatches = [] } = useQuery({
    queryKey: ["vax-log-batches"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("inventory_items")
          .select("batch_number, name, quantity, category, expiration_date")
          .gt("quantity", 0);
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Calculate available cold-chain vaccine stock
  const availableVaccineBatches = useMemo(() => {
    if (dbBatches.length > 0) return dbBatches;
    return (inventory || [])
      .filter((i: any) => i.category === "Vaccines" && (i.stock > 0 || i.quantity > 0))
      .map((i: any) => ({
        batch_number: i.batchNumber || i.batch_number,
        name: i.name,
        quantity: i.stock || i.quantity,
        expiration_date: i.expirationDate || i.expiration_date,
      }));
  }, [dbBatches, inventory]);

  const isOutOfStock = availableVaccineBatches.length === 0;

  // Fetch scheduled appointments to detect if this owner/pet is scheduled
  const { data: dbScheduledAppointments = [] } = useQuery({
    queryKey: ["vax-log-scheduled-appointments"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("service_transactions")
          .select("id, owner_id, transaction_type, title, detail, date, time, status")
          .neq("status", "Completed")
          .order("date", { ascending: true });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Consolidated Pet Owners List
  const allOwners = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      contact: string;
      barangay: string;
      avatarUrl?: string | null;
      petsCount: number;
      isCurrentUser?: boolean;
    }> = [];

    // Filter dbUsers to Pet Owners (exclude staff)
    const petOwnersOnly = (dbUsers as any[]).filter((u: any) => {
      const role = normalizeSyncVetRole(u.role);
      return role === "Pet Owner";
    });

    petOwnersOnly.forEach((u: any) => {
      const name = (u.full_name || u.email || "").trim();
      if (!name) return;
      if (!list.some((o) => o.id === u.id || o.name.toLowerCase() === name.toLowerCase())) {
        const userPets = (dbPets as any[]).filter((p: any) => p.owner_id === u.id);
        list.push({
          id: u.id,
          name,
          contact: u.phone_number || "",
          barangay: u.address || "Carmen",
          avatarUrl: u.avatar_url || null,
          petsCount: userPets.length,
          isCurrentUser: user?.id === u.id,
        });
      }
    });

    // Also include verified owners from dbPets who may not have a users record
    (dbPets as any[]).forEach((p: any) => {
      const u = p.users;
      if (u && u.full_name) {
        const name = u.full_name.trim();
        if (!list.some((o) => o.name.toLowerCase() === name.toLowerCase())) {
          list.push({
            id: p.owner_id || `owner-${name.replace(/\s+/g, "-").toLowerCase()}`,
            name,
            contact: u.phone_number || "",
            barangay: u.address || "Carmen",
            avatarUrl: u.avatar_url || null,
            petsCount: 1,
            isCurrentUser: false,
          });
        }
      }
    });

    return list;
  }, [dbUsers, dbPets, user]);

  // Form states
  const [ownerSearch, setOwnerSearch] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("custom");
  const [selectedPetId, setSelectedPetId] = useState<string>("custom");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("Aspin (Mixed)");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [barangay, setBarangay] = useState("Carmen");
  const [vaccineType, setVaccineType] = useState("Rabisin Inactivated Rabies Vaccine");
  const [batchNo, setBatchNo] = useState("");
  const [tagNumber, setTagNumber] = useState("");

  // Autogenerate batch number helper
  const generateNewBatch = () => {
    const randomBatch = `RB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setBatchNo(randomBatch);
  };

  const generateNewTag = () => {
    const randomTag = `CDO-${new Date().getFullYear()}-R${Math.floor(1000 + Math.random() * 9000)}`;
    setTagNumber(randomTag);
  };

  // Auto-sync initial batch with inventory on open
  useEffect(() => {
    if (open) {
      if (!tagNumber) generateNewTag();
      if (availableVaccineBatches.length > 0) {
        const first: any = availableVaccineBatches[0];
        setBatchNo(first.batch_number || first.batchNumber);
        if (first.name) setVaccineType(first.name);
      } else if (!batchNo) {
        generateNewBatch();
      }
    }
  }, [open, availableVaccineBatches]);

  // Auto-select logged-in user if they are a Pet Owner
  useEffect(() => {
    if (open && isPetOwner && user?.id) {
      const match = allOwners.find((o) => o.id === user.id);
      if (match) {
        setSelectedOwnerId(match.id);
        setOwnerName(match.name);
        setOwnerContact(match.contact);
        setBarangay(match.barangay || "Carmen");
      }
    }
  }, [open, isPetOwner, user?.id, allOwners]);

  // Filter owners by search query
  const filteredOwners = useMemo(() => {
    if (!ownerSearch.trim()) return allOwners;
    const q = ownerSearch.toLowerCase().trim();
    return allOwners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.contact.toLowerCase().includes(q) ||
        o.barangay.toLowerCase().includes(q)
    );
  }, [allOwners, ownerSearch]);

  const selectedOwner = useMemo(() => {
    return allOwners.find((o) => o.id === selectedOwnerId);
  }, [allOwners, selectedOwnerId]);

  // Cascading pets owned by the selected owner
  const availablePetsForOwner = useMemo(() => {
    if (!selectedOwnerId || selectedOwnerId === "custom") return [];
    return (dbPets as any[]).filter((p: any) => p.owner_id === selectedOwnerId);
  }, [dbPets, selectedOwnerId]);

  const selectedPet = useMemo(() => {
    if (!selectedPetId || selectedPetId === "custom") return null;
    return availablePetsForOwner.find((p: any) => p.id === selectedPetId);
  }, [availablePetsForOwner, selectedPetId]);

  // Check if this owner has an active scheduled vaccination appointment
  const matchedScheduledAppointment = useMemo(() => {
    if (!selectedOwnerId || selectedOwnerId === "custom") return null;
    return (dbScheduledAppointments as any[]).find((apt: any) => {
      const matchOwner = apt.owner_id === selectedOwnerId || (user?.id && apt.owner_id === user.id);
      const isVax =
        apt.transaction_type?.toLowerCase().includes("vax") ||
        apt.transaction_type?.toLowerCase().includes("rabies") ||
        apt.title?.toLowerCase().includes("vax") ||
        apt.title?.toLowerCase().includes("rabies");
      return matchOwner && isVax;
    });
  }, [dbScheduledAppointments, selectedOwnerId, user]);

  // When owner changes, cascade pets
  const handleOwnerSelect = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    if (ownerId === "custom") {
      setSelectedPetId("custom");
      setOwnerName("");
      setOwnerContact("");
      setPetName("");
      return;
    }

    const found = allOwners.find((o) => o.id === ownerId);
    if (found) {
      setOwnerName(found.name);
      setOwnerContact(found.contact);
      if (found.barangay) {
        const matchBrgy = cvoBarangays.find((b) =>
          found.barangay.toLowerCase().includes(b.toLowerCase())
        );
        if (matchBrgy) setBarangay(matchBrgy);
      }

      // Auto-select first pet if available
      const ownerPets = (dbPets as any[]).filter((p: any) => p.owner_id === ownerId);
      if (ownerPets.length > 0) {
        const firstPet = ownerPets[0];
        setSelectedPetId(firstPet.id);
        setPetName(firstPet.name);
        setSpecies(firstPet.species || "Dog");
        setBreed(firstPet.breed || "Mixed");
      } else {
        setSelectedPetId("custom");
        setPetName("");
      }
    }
  };

  // When pet changes within the selected owner
  const handlePetSelect = (petId: string) => {
    setSelectedPetId(petId);
    if (petId === "custom") {
      setPetName("");
      return;
    }

    const found = availablePetsForOwner.find((p: any) => p.id === petId);
    if (found) {
      setPetName(found.name);
      setSpecies(found.species || "Dog");
      setBreed(found.breed || "Mixed");
    }
  };

  // When selecting a vaccine batch from cold-chain inventory
  const handleVaccineBatchChange = (batchNumber: string) => {
    const matched = availableVaccineBatches.find(
      (b: any) => (b.batch_number || b.batchNumber) === batchNumber
    );
    if (matched) {
      setBatchNo(matched.batch_number || (matched as any).batchNumber || batchNumber);
      if (matched.name) setVaccineType(matched.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOutOfStock) {
      toast.error("Vaccination Restricted: Out of Stock", {
        description: "Cold-chain inventory has 0 doses of vaccines. Please add stock in Vaccine Inventory before logging records.",
      });
      return;
    }

    if (!petName.trim() || !batchNo.trim() || !ownerName.trim()) {
      toast.error("Please provide Pet Name, Owner Name, and Vaccine Batch Number.");
      return;
    }

    setLoading(true);

    try {
      const todayIso = getTodayDateString();
      const nextYearIso = format(addYears(parseISO(todayIso), 1), "yyyy-MM-dd");
      const vaxId = `VAX-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      const finalVet = (!isAdmin && isVet && currentUserName) ? currentUserName : (vetName || HELEN_VET.name);

      // 1. Insert directly into Supabase vaccination_records table
      const { error: insertError } = await supabase.from("vaccination_records").insert({
        record_no: vaxId,
        pet_id: selectedPetId !== "custom" ? selectedPetId : null,
        pet_name: petName.trim(),
        species,
        breed: breed.trim() || "Mixed",
        owner_name: ownerName.trim(),
        owner_contact: ownerContact.trim() || null,
        barangay,
        vaccine_name: vaccineType,
        batch_number: batchNo.trim(),
        administered_date: todayIso,
        next_due_date: nextYearIso,
        veterinarian: finalVet,
        status: "complete",
      });

      if (insertError) {
        console.error("Failed to insert vaccination record:", insertError);
      }

      // Auto-deduct 1 dose from cold-chain inventory stock
      if (batchNo.trim()) {
        try {
          await deductInventoryStock(batchNo.trim(), 1);
        } catch (stockErr) {
          console.warn("Inventory deduction notice:", stockErr);
        }
      }

      // 2. If a registered pet was chosen, update its vaccination state
      if (selectedPetId && selectedPetId !== "custom") {
        await supabase
          .from("pets")
          .update({
            is_vaccinated: true,
            rabies_vaccinated: vaccineType.toLowerCase().includes("rabies") || vaccineType.toLowerCase().includes("rabisin"),
            last_vaccination_date: todayIso,
            next_vaccination_date: nextYearIso,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedPetId);
      }

      // 3. If linked to a scheduled appointment in service_transactions, fulfill it!
      if (matchedScheduledAppointment) {
        try {
          await supabase
            .from("service_transactions")
            .update({
              status: "Completed",
              detail: `Administered ${vaccineType} (Lot #${batchNo}). Tag #${tagNumber}. Certificate: ${vaxId}.`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchedScheduledAppointment.id);
        } catch (aptErr) {
          console.warn("Notice updating scheduled appointment:", aptErr);
        }
      }

      // 4. Add to CVO audit trail
      addAuditLog({
        user: finalVet,
        role: "Veterinarian",
        action: "Administered Vaccination",
        entity: "Vaccination",
        recordId: vaxId,
        details: `Administered ${vaccineType} (Lot #${batchNo}) to ${petName} (Owner: ${ownerName}, Brgy. ${barangay}). Tag: ${tagNumber}. Synchronized to CVO Immunization Ledger.`,
      });

      // 5. Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-queue"] });
      queryClient.invalidateQueries({ queryKey: ["vax-log-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["service_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["vax-log-scheduled-appointments"] });

      toast.success("Vaccination Successfully Logged", {
        description: `${vaccineType} certificate ${vaxId} registered for ${petName}. Pet status updated to Protected.`,
      });

      if (onLogged) {
        onLogged({
          id: vaxId,
          petName: petName.trim(),
          petId: selectedPetId !== "custom" ? selectedPetId : "—",
          species,
          breed,
          ownerName: ownerName.trim(),
          ownerContact,
          barangay,
          vaccine: vaccineType,
          batch: batchNo.trim(),
          date: todayIso,
          vet: finalVet,
          nextDue: nextYearIso,
          status: "complete",
        });
      }

      setOpen(false);
      setSelectedPetId("custom");
      setSelectedOwnerId("custom");
      setPetName("");
      setOwnerName("");
      setOwnerContact("");
    } catch (err: any) {
      toast.error("Failed to record vaccination", {
        description: err?.message || "Please check your network and try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs">
          <Syringe className="size-3.5" /> Log Vaccination
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl lg:max-w-3xl w-[96vw] max-h-[92vh] overflow-y-auto p-5 sm:p-7 bg-background rounded-2xl shadow-2xl pointer-events-auto">
        <DialogHeader className="border-b pb-3.5 pr-10 sm:pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <Syringe className="size-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                  Log Vaccination Record
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Directly records an administered dose into the official CVO municipal immunization ledger.
                </DialogDescription>
              </div>
            </div>

            {/* Save Button at the top beside X icon */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                type="submit"
                form="log-vaccination-form"
                disabled={loading || isOutOfStock}
                size="sm"
                className="h-8.5 px-3.5 text-xs font-bold bg-primary text-primary-foreground gap-1.5 rounded-lg shadow-xs cursor-pointer hover:bg-primary/90 disabled:opacity-50"
              >
                {isOutOfStock ? (
                  <>
                    <AlertTriangle className="size-3.5" />
                    <span>Out of Stock</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Save & Issue Record</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form id="log-vaccination-form" onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Out of Stock Restriction Banner */}
          {isOutOfStock && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 space-y-1">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Vaccine Out of Stock — Logging Restricted</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                There are currently <strong>0 doses</strong> of vaccines in cold-chain inventory. You cannot log a vaccination record until stock is received or added in <strong className="text-foreground">Vaccine Inventory</strong>.
              </p>
            </div>
          )}

          {/* Linked Scheduled Appointment Banner */}
          {matchedScheduledAppointment && (
            <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/30 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Calendar className="size-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900 dark:text-emerald-200">
                    Linked Scheduled Appointment Found
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {matchedScheduledAppointment.title || "Rabies Vaccination"} • Scheduled for {matchedScheduledAppointment.date} {matchedScheduledAppointment.time ? `at ${matchedScheduledAppointment.time}` : ""}. Will be marked as Completed.
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Auto-Sync Active
              </Badge>
            </div>
          )}

          {/* SECTION 1: Citizen Owner & Patient Information */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="size-3.5 text-primary" />
              1. Citizen Owner & Patient Selection
            </span>

            {/* Owner Search & Select */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <User className="size-3 text-primary" /> Select Registered Pet Owner *
                  </Label>
                  {isPetOwner && (
                    <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground bg-muted/40 border-border/60">
                      Your Account
                    </Badge>
                  )}
                </div>

                <Select value={selectedOwnerId} onValueChange={handleOwnerSelect}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full min-w-0">
                    <div className="flex items-center gap-2 min-w-0 truncate">
                      {selectedOwner ? (
                        <>
                          <Avatar className="size-5 shrink-0 border border-primary/20">
                            {selectedOwner.avatarUrl ? (
                              <AvatarImage src={selectedOwner.avatarUrl} alt={selectedOwner.name} className="object-cover" />
                            ) : null}
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
                        <span className="text-muted-foreground truncate">
                          {selectedOwnerId === "custom" ? "— Manual / Walk-In Patient —" : "Choose a registered pet owner..."}
                        </span>
                      )}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-60 z-[95] max-w-[90vw]">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="size-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                          placeholder="Search pet owner by name or phone..."
                          value={ownerSearch}
                          onChange={(e) => setOwnerSearch(e.target.value)}
                          className="h-8 text-xs pl-8 bg-muted/30"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <SelectItem value="custom" className="text-xs cursor-pointer py-1.5 font-semibold text-primary">
                      — Manual / Walk-In Patient —
                    </SelectItem>
                    {filteredOwners.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs cursor-pointer py-1.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="size-6 shrink-0 border border-border/80">
                            {o.avatarUrl ? (
                              <AvatarImage src={o.avatarUrl} alt={o.name} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {o.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col text-left min-w-0 truncate">
                            <span className="font-semibold text-foreground text-xs leading-tight truncate">
                              {o.name} {o.isCurrentUser ? "(You)" : ""}
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

              {/* Owner's Pets Cascading Selector */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <PawPrint className="size-3 text-primary" /> Select Patient / Pet *
                  </Label>
                  {availablePetsForOwner.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {availablePetsForOwner.length} registered
                    </span>
                  )}
                </div>

                {selectedOwnerId && selectedOwnerId !== "custom" ? (
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
                            {availablePetsForOwner.length > 0
                              ? "Select patient pet..."
                              : "No registered pets found (Enter below)"}
                          </span>
                        )}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-60 z-[95] max-w-[90vw]">
                      <SelectItem value="custom" className="text-xs cursor-pointer py-1.5 text-primary font-semibold">
                        — Enter Other / New Pet —
                      </SelectItem>
                      {availablePetsForOwner.map((p: any) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                              <PawPrint className="size-3.5" />
                            </div>
                            <div className="flex flex-col text-left min-w-0 truncate">
                              <span className="font-semibold text-foreground text-xs leading-tight truncate">{p.name}</span>
                              <span className="text-[11px] text-muted-foreground leading-tight truncate">
                                {p.species} • {p.breed}{p.weight_kg ? ` • ${p.weight_kg}kg` : ""}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 rounded-xl border border-dashed border-border/70 bg-background/50 px-3 flex items-center text-xs text-muted-foreground truncate">
                    Manual Walk-In Pet Mode (Enter below)
                  </div>
                )}
              </div>
            </div>

            {/* Patient & Owner Editable Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pet Name *
                </Label>
                <Input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Bella"
                  className="h-8.5 text-xs rounded-lg bg-background"
                  required
                />
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Species *
                </Label>
                <Select value={species} onValueChange={setSpecies}>
                  <SelectTrigger className="h-8.5 text-xs rounded-lg bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog (Canine)</SelectItem>
                    <SelectItem value="Cat">Cat (Feline)</SelectItem>
                    <SelectItem value="Livestock">Livestock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Breed
                </Label>
                <Input
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Aspin (Mixed)"
                  className="h-8.5 text-xs rounded-lg bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-border/50">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Owner Full Name *
                </Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="h-8.5 text-xs rounded-lg bg-background"
                  required
                />
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Contact Number
                </Label>
                <Input
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                  placeholder="e.g. 0917-123-4567"
                  className="h-8.5 text-xs rounded-lg bg-background"
                />
              </div>

              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Barangay *
                </Label>
                <Select value={barangay} onValueChange={setBarangay}>
                  <SelectTrigger className="h-8.5 text-xs rounded-lg bg-background w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-52">
                    {cvoBarangays.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 2: Cold-Chain Vaccine & Inventory Lot */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Syringe className="size-3.5 text-primary" />
                2. Cold-Chain Vaccine & Inventory Sync
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="size-3" /> Live Inventory Sync
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vaccine Product & Inventory Lot *
                </Label>
                {availableVaccineBatches.length > 0 ? (
                  <Select value={batchNo} onValueChange={handleVaccineBatchChange}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full">
                      <SelectValue placeholder="Select active vaccine lot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVaccineBatches.map((v: any) => (
                        <SelectItem
                          key={v.batch_number || v.batchNumber}
                          value={v.batch_number || v.batchNumber}
                          className="text-xs cursor-pointer py-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span className="font-semibold">{v.name}</span>
                            <span className="font-mono text-muted-foreground text-[11px]">
                              (Lot #{v.batch_number || v.batchNumber} • {v.quantity || v.stock} doses)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={vaccineType} onValueChange={setVaccineType}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rabisin Inactivated Rabies Vaccine">Rabisin Anti-Rabies (1.0 mL SC)</SelectItem>
                      <SelectItem value="Canine 5-in-1 DHPPi">Canine 5-in-1 (DHPPi Core)</SelectItem>
                      <SelectItem value="Canine 6-in-1 DHPPi+L">Canine 6-in-1 (DHPPi+L)</SelectItem>
                      <SelectItem value="Feline 4-in-1 FVRCP">Feline 4-in-1 (FVRCP Core)</SelectItem>
                      <SelectItem value="Deworming (Albendazole/Pyrantel)">Deworming Prophylaxis</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Autogenerated Batch Number Row */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Tag className="size-3 text-primary" /> Batch / Lot No. *
                  </Label>
                  <button
                    type="button"
                    onClick={generateNewBatch}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="size-2.5" /> Auto-Gen New
                  </button>
                </div>
                <div className="h-9 px-2.5 rounded-xl border border-border/80 bg-background flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-primary tracking-wider">{batchNo || "RB-2026-AUTO"}</span>
                  <Badge variant="outline" className="text-[9px] font-semibold text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    Auto-Linked
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
              <div className="space-y-1 min-w-0">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Dose Injected (Fixed)
                </Label>
                <div className="h-8.5 px-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold">1.0 mL</span>
                  <span className="text-[9px] text-muted-foreground font-medium">Subcutaneous (SC)</span>
                </div>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Tag className="size-2.5 text-primary" /> CVO Rabies Tag #
                  </Label>
                  <button
                    type="button"
                    onClick={generateNewTag}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="size-2" /> New
                  </button>
                </div>
                <div className="h-8.5 px-2.5 rounded-lg border border-border/70 bg-muted/20 flex items-center justify-between text-xs">
                  <span className="font-mono font-semibold text-foreground">{tagNumber || "CDO-2026-RXXXX"}</span>
                  <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-500/10 px-1 py-0.5 rounded">
                    Municipal Tag
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Attending Vaccinator & Annual Protection */}
          <div className="p-4 rounded-xl border border-border/80 bg-card/60 space-y-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileCheck2 className="size-3.5 text-primary" />
              3. Attending Vaccinator & Annual Booster Schedule
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Attending Veterinarian */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Attending Vaccinator / Veterinarian *</Label>
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
                    className="h-9 px-2.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between text-xs"
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
                  <Select value={vetName} onValueChange={setVetName}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-background border-border/80 w-full">
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
                    <SelectContent className="z-[95]">
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

              {/* Annual Next Due Date */}
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="size-3 text-primary" /> Next Annual Booster Due (RA 9482)
                </Label>
                <div className="h-9 px-2.5 rounded-xl border border-border/80 bg-background flex items-center justify-between text-xs font-medium">
                  <span className="font-semibold text-foreground">
                    {format(addYears(parseISO(getTodayDateString()), 1), "MMMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className="text-[9px] font-semibold text-blue-600 bg-blue-500/10 border-blue-500/20">
                    365 Days
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-3 border-t flex flex-row items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8.5 px-3 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || isOutOfStock}
              size="sm"
              className="h-8.5 px-4 text-xs font-bold bg-primary text-primary-foreground gap-1.5 rounded-lg cursor-pointer shadow-xs hover:bg-primary/90 disabled:opacity-50"
            >
              {isOutOfStock ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  <span>Vaccine Out of Stock</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Recording into Ledger...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Save & Issue Record</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
