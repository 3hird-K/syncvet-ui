"use client";

import { useState } from "react";
import { Syringe, Loader2 } from "lucide-react";
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

export function LogVaccinationDialog({ onLogged }: { onLogged?: (record: any) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAuditLog } = useCVO();

  const [petName, setPetName] = useState("");
  const [vaccineType, setVaccineType] = useState("Anti-Rabies");
  const [batchNo, setBatchNo] = useState("AR-Q3-2026-014");
  const [vetName, setVetName] = useState("Dr. Elena Santos, DVM");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName || !batchNo) {
      toast.error("Please provide both Pet Name and Batch Number.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const vaxId = `VAX-2026-${Math.floor(10000 + Math.random() * 90000)}`;

      addAuditLog({
        user: vetName,
        role: "Veterinarian",
        action: "Administered Vaccination",
        entity: "Vaccination",
        recordId: vaxId,
        details: `Administered ${vaccineType} (Lot #${batchNo}) to ${petName}. Recorded in CVO Immunization Ledger.`,
      });

      setLoading(false);
      setOpen(false);
      toast.success("Vaccination Successfully Logged", {
        description: `${vaccineType} record ${vaxId} saved for ${petName}. Next annual booster scheduled.`,
      });

      if (onLogged) {
        onLogged({
          id: vaxId,
          petName,
          petId: `CDO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
          vaccine: vaccineType,
          batch: batchNo,
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          vet: vetName,
          nextDue: "May 2027",
          status: "complete",
        });
      }

      setPetName("");
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs cursor-pointer">
          <Syringe className="size-3.5" /> Log Vaccination
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[430px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Syringe className="size-5" />
              <DialogTitle className="text-xl font-bold">Log Vaccination</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Record a new administered dose. Ensure batch number matches physical cold-chain inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3.5 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="petName" className="text-[10px] font-bold uppercase tracking-widest">
                Pet Name / ID *
              </Label>
              <Input
                id="petName"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Bantay or CDO-2026-00142"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="vaccine" className="text-[10px] font-bold uppercase tracking-widest">
                  Vaccine Type
                </Label>
                <Select value={vaccineType} onValueChange={setVaccineType}>
                  <SelectTrigger id="vaccine" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Anti-Rabies">Anti-Rabies (Canine/Feline)</SelectItem>
                    <SelectItem value="Anti-Parvovirus">Anti-Parvovirus (DHPPi+L)</SelectItem>
                    <SelectItem value="Deworming">Deworming (Oral/Injectable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="batch" className="text-[10px] font-bold uppercase tracking-widest">
                  Batch / Lot No. *
                </Label>
                <Input
                  id="batch"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. AR-Q3-2026-014"
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="vet" className="text-[10px] font-bold uppercase tracking-widest">
                Administering Clinician / Vaccinator
              </Label>
              <Select value={vetName} onValueChange={setVetName}>
                <SelectTrigger id="vet" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Elena Santos, DVM">Dr. Elena Santos, DVM</SelectItem>
                  <SelectItem value="Dr. Helen Ann P. Tacandong, DVM">Dr. Helen Ann P. Tacandong, DVM</SelectItem>
                  <SelectItem value="Dr. Sarah Chen, DVM">Dr. Sarah Chen, DVM</SelectItem>
                  <SelectItem value="Officer Mark Velez">Officer Mark Velez (Field Vaccinator)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Log Vaccination Record"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
