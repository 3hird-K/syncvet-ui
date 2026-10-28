"use client";

import { useState, useMemo, useEffect } from "react";
import { Syringe, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cvoBarangays } from "@/data/cvo-store";

export function LogVaccinationDialog({ onLogged }: { onLogged?: (record: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAuditLog, inventory, deductInventoryStock } = useCVO();
  const queryClient = useQueryClient();
  const supabase = getPublicSupabaseClient();

  // Form states
  const [selectedPetId, setSelectedPetId] = useState<string>("custom");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("Dog");
  const [breed, setBreed] = useState("Aspin (Mixed)");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [barangay, setBarangay] = useState("Carmen");
  const [vaccineType, setVaccineType] = useState("Rabisin Inactivated Rabies Vaccine");
  const [batchNo, setBatchNo] = useState("RB-2026-0814");
  const [vetName, setVetName] = useState("Dr. Elena Santos, DVM");

  // Fetch registered pets for quick auto-fill
  const { data: dbPets = [] } = useQuery({
    queryKey: ["vax-log-pets"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("pets")
          .select("id, name, species, breed, owner_id, users(full_name, phone_number, address)");
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 30000,
  });

  // Fetch active vaccine batches from inventory
  const { data: dbBatches = [] } = useQuery({
    queryKey: ["vax-log-batches"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("inventory_items")
          .select("batch_number, name, quantity, category")
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
    return (inventory || []).filter((i: any) => i.category === "Vaccines" && i.stock > 0);
  }, [dbBatches, inventory]);

  const isOutOfStock = availableVaccineBatches.length === 0;

  // Auto-sync initial batch with available inventory
  useEffect(() => {
    if (availableVaccineBatches.length > 0) {
      const first: any = availableVaccineBatches[0];
      setBatchNo(first?.batch_number || first?.batchNumber || "");
    } else {
      setBatchNo("");
    }
  }, [availableVaccineBatches]);

  const handleSelectPet = (val: string) => {
    setSelectedPetId(val);
    if (val === "custom") {
      setPetName("");
      setOwnerName("");
      setOwnerContact("");
      return;
    }
    const found = dbPets.find((p: any) => p.id === val);
    if (found) {
      setPetName(found.name);
      setSpecies(found.species || "Dog");
      setBreed(found.breed || "Mixed");
      const userObj = found.users as any;
      if (userObj) {
        setOwnerName(userObj.full_name || "");
        setOwnerContact(userObj.phone_number || "");
        if (userObj.address) {
          const matchBrgy = cvoBarangays.find((b) =>
            userObj.address.toLowerCase().includes(b.toLowerCase())
          );
          if (matchBrgy) setBarangay(matchBrgy);
        }
      }
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
      const todayIso = new Date().toISOString().split("T")[0];
      const nextYearIso = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const vaxId = `VAX-2026-${Math.floor(10000 + Math.random() * 90000)}`;

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
        veterinarian: vetName,
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

      // 3. Add to CVO audit trail
      addAuditLog({
        user: vetName,
        role: "Veterinarian",
        action: "Administered Vaccination",
        entity: "Vaccination",
        recordId: vaxId,
        details: `Administered ${vaccineType} (Lot #${batchNo}) to ${petName} (Owner: ${ownerName}, Brgy. ${barangay}). Synchronized to CVO Immunization Ledger.`,
      });

      // 4. Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-queue"] });
      queryClient.invalidateQueries({ queryKey: ["vax-log-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });

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
          vet: vetName,
          nextDue: nextYearIso,
          status: "complete",
        });
      }

      setOpen(false);
      setSelectedPetId("custom");
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
      <DialogContent className="sm:max-w-[520px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Syringe className="size-5" />
              <DialogTitle className="text-xl font-bold">Log Vaccination Record</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Directly records an administered dose into the official CVO municipal immunization ledger.
            </DialogDescription>
          </DialogHeader>

          {/* Out of Stock Restriction Banner */}
          {isOutOfStock && (
            <div className="p-3.5 my-2 rounded-xl border border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/30 space-y-1">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Vaccine Out of Stock — Logging Restricted</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug">
                There are currently <strong>0 doses</strong> of vaccines in cold-chain inventory. You cannot log a vaccination record until stock is received or added in <strong className="text-foreground">Vaccine Inventory</strong>.
              </p>
            </div>
          )}

          <div className="grid gap-3.5 py-4 text-xs">
            {/* Quick Auto-fill from Registered Pets */}
            {dbPets.length > 0 && (
              <div className="grid gap-1.5">
                <Label htmlFor="registeredPet" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quick Select Registered Patient (Optional)
                </Label>
                <Select value={selectedPetId} onValueChange={handleSelectPet}>
                  <SelectTrigger id="registeredPet" className="h-9 text-xs">
                    <SelectValue placeholder="Select registered pet or enter manual..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">— Manual / Walk-in Patient —</SelectItem>
                    {dbPets.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.species} • {p.breed}) — Owner: {(p.users as any)?.full_name || "Unknown"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Pet Information */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-1 grid gap-1.5">
                <Label htmlFor="petName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pet Name *
                </Label>
                <Input
                  id="petName"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Bella"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="species" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Species
                </Label>
                <Select value={species} onValueChange={setSpecies}>
                  <SelectTrigger id="species" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog (Canine)</SelectItem>
                    <SelectItem value="Cat">Cat (Feline)</SelectItem>
                    <SelectItem value="Livestock">Livestock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="breed" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Breed
                </Label>
                <Input
                  id="breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Aspin / Shih Tzu"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Owner Details */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="ownerName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Owner Full Name *
                </Label>
                <Input
                  id="ownerName"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="barangay" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Barangay
                </Label>
                <Select value={barangay} onValueChange={setBarangay}>
                  <SelectTrigger id="barangay" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {cvoBarangays.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vaccine Selection & Batch */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vaccine" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Vaccine Product / Type
                </Label>
                <Select value={vaccineType} onValueChange={setVaccineType}>
                  <SelectTrigger id="vaccine" className="h-9 text-xs">
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
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="batch" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Batch / Lot No. *
                </Label>
                {dbBatches.length > 0 ? (
                  <div className="space-y-1">
                    <Input
                      id="batch"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      placeholder="e.g. RB-2026-0814"
                      className="h-9 text-xs font-mono"
                      required
                    />
                  </div>
                ) : (
                  <Input
                    id="batch"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="e.g. RB-2026-0814"
                    className="h-9 text-xs font-mono"
                    required
                  />
                )}
              </div>
            </div>

            {/* Veterinarian */}
            <div className="grid gap-1.5">
              <Label htmlFor="vet" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Attending Vaccinator / Veterinarian
              </Label>
              <Select value={vetName} onValueChange={setVetName}>
                <SelectTrigger id="vet" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Elena Santos, DVM">Dr. Elena Santos, DVM (City Veterinarian)</SelectItem>
                  <SelectItem value="Dr. Helen Ann P. Tacandong, DVM">Dr. Helen Ann P. Tacandong, DVM</SelectItem>
                  <SelectItem value="Dr. Sarah Chen, DVM">Dr. Sarah Chen, DVM</SelectItem>
                  <SelectItem value="Dr. Mark Velez, DVM">Dr. Mark Velez, DVM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || isOutOfStock}
              className="w-full sm:w-auto font-bold gap-2 text-xs disabled:opacity-50"
            >
              {isOutOfStock ? (
                <>
                  <AlertTriangle className="size-3.5" />
                  Vaccine Out of Stock
                </>
              ) : loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Recording into Ledger...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Save & Issue Record
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
