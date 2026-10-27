"use client";

import { useState } from "react";
import { Plus, WifiOff, Loader2 } from "lucide-react";
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
import { cvoBarangays } from "@/data/cvo-store";

export function OfflineFieldEntryDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addOfflineRecord } = useCVO();

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
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500">
              <WifiOff className="size-5" />
              <DialogTitle className="text-lg font-bold">Offline Field Vaccination Entry</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Record anti-rabies vaccinations during mobile barangay deployments with zero cellular connectivity. Records store in your device&apos;s local cache until synchronized.
            </DialogDescription>
          </DialogHeader>

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
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Animal & Citizen
            </p>
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
            <Label className="text-xs">Administering Veterinarian</Label>
            <Input
              value={vaccinatorName}
              onChange={(e) => setVaccinatorName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Save to Local Cache"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
