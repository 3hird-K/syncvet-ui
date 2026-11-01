"use client";

import { useState, useEffect } from "react";
import { Plus, WifiOff, Loader2, Lock, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { useCVO } from "@/lib/cvo-context";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { cvoBarangays } from "@/data/cvo-store";
import { cn } from "@/lib/utils";

export function OfflineFieldEntryDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addOfflineRecord, activeRoleView } = useCVO();
  const { user } = useUser();

  const rawEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
  const isAdminEmail = rawEmail === "dime.neil03@gmail.com";
  const meta = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const currentRole = normalizeSyncVetRole(
    meta?.roleTitle || (isAdminEmail ? "Administrator" : "Pet Owner")
  );
  const isAdmin = isAdminEmail || currentRole === "Administrator" || activeRoleView === "Administrator";
  const isVet = currentRole === "Veterinarian" || activeRoleView === "Veterinarian";
  const currentUserName = user?.fullName?.trim() || user?.username || "Officer Mark Velez";

  const [barangay, setBarangay] = useState("Lapasan");
  const [activityTitle, setActivityTitle] = useState("Mass Anti-Rabies Campaign");
  const [ownerName, setOwnerName] = useState("");
  const [ownerContact, setOwnerContact] = useState("");
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState("Aspin");
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [vaccineBrand, setVaccineBrand] = useState("Rabisin (Boehringer Ingelheim)");
  const [batchNumber, setBatchNumber] = useState("AR-Q3-2026-014");
  const [vaccinatorName, setVaccinatorName] = useState("Officer Mark Velez");

  useEffect(() => {
    if (!isAdmin && isVet && currentUserName) {
      setVaccinatorName(currentUserName);
    }
  }, [isAdmin, isVet, currentUserName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName || !ownerName) return;

    setLoading(true);
    setTimeout(() => {
      const today = new Date();
      const administeredDate = today.toISOString().split("T")[0];
      const nextDue = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
        .toISOString()
        .split("T")[0];

      addOfflineRecord({
        activityId: `ACT-${barangay.toUpperCase().slice(0, 3)}-01`,
        activityTitle,
        barangay,
        ownerName,
        ownerContact: ownerContact || "0917-000-0000",
        petName,
        species,
        breed,
        sex,
        vaccineBrand,
        batchNumber,
        administeredDate,
        nextDueDate: nextDue,
        vaccinatorName,
      });

      setLoading(false);
      setOpen(false);

      setPetName("");
      setOwnerName("");
      setOwnerContact("");
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer">
          <WifiOff className="size-3.5" /> Offline Field Intake
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden p-5 sm:p-6 bg-background rounded-2xl shadow-xl">
        <DialogHeader className="border-b pb-3 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-amber-500 font-bold min-w-0">
              <WifiOff className="size-5 shrink-0" />
              <DialogTitle className="text-base sm:text-lg font-bold truncate">Offline Field Vaccination Entry</DialogTitle>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="submit"
                form="offline-field-entry-form"
                variant="ghost"
                size="icon"
                disabled={loading}
                className={cn(
                  "size-8 rounded-full border border-border/60 transition-all shadow-xs cursor-pointer",
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white hover:scale-105 active:scale-95"
                )}
                title="Save to Local Cache"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              </Button>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all hover:scale-105 active:scale-95"
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Record anti-rabies vaccinations during mobile barangay deployments with zero connectivity. Records store locally until synchronized.
          </DialogDescription>
        </DialogHeader>

        <form id="offline-field-entry-form" onSubmit={handleSubmit} className="space-y-3.5 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Barangay</Label>
              <Select value={barangay} onValueChange={setBarangay}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {cvoBarangays.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Field Activity</Label>
              <Input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-2.5">
            <div className="flex items-center gap-2">
              <PetAvatar species={species} name={petName || "Pet"} size="xs" className="size-4.5 shrink-0" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Animal & Citizen Identification
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs">Pet Name *</Label>
                <Input
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g. Bantay"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Species</Label>
                <Select value={species} onValueChange={(v: any) => setSpecies(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sex</Label>
                <Select value={sex} onValueChange={(v: any) => setSex(v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs">Owner Name *</Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Citizen Name"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contact Number</Label>
                <Input
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                  placeholder="09XX-XXX-XXXX"
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Vaccine Brand</Label>
              <Input
                value={vaccineBrand}
                onChange={(e) => setVaccineBrand(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Batch / Lot Number</Label>
              <Input
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Administering Veterinarian</Label>
              {!isAdmin && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                  <Lock className="size-2.5" /> Locked to You
                </span>
              )}
            </div>
            {!isAdmin ? (
              <div className="h-8 px-2.5 rounded-md border border-border/70 bg-muted/30 flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="truncate">{vaccinatorName || currentUserName}</span>
                <Lock className="size-3 text-muted-foreground/60 shrink-0 ml-1" />
              </div>
            ) : (
              <Input
                value={vaccinatorName}
                onChange={(e) => setVaccinatorName(e.target.value)}
                className="h-8 text-xs"
              />
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
