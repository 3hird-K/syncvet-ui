"use client";

import { useState } from "react";
import { Plus, FileCheck2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCVO } from "@/lib/cvo-context";
import { cvoBarangays, type CVOHealthCertificate } from "@/data/cvo-store";
import { toast } from "sonner";

export function NewCertificateDialog({ onCreated }: { onCreated?: (cert: CVOHealthCertificate) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addCertificate } = useCVO();

  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat" | "Livestock">("Dog");
  const [breed, setBreed] = useState("Aspin");
  const [sex, setSex] = useState<"Male" | "Female">("Male");
  const [age, setAge] = useState("2 years");
  const [color, setColor] = useState("Brown & Black");
  const [microchipOrTag, setMicrochipOrTag] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("Zone 2");
  const [ownerBarangay, setOwnerBarangay] = useState("Lapasan");
  const [ownerContact, setOwnerContact] = useState("0917-882-9102");

  const [purpose, setPurpose] = useState<
    "Domestic Air/Sea Travel" | "Inter-Barangay Transport" | "General Health Declaration" | "Adoption Clearance"
  >("Domestic Air/Sea Travel");

  const [rabiesBrand, setRabiesBrand] = useState("Rabisin (Boehringer Ingelheim)");
  const [rabiesBatch, setRabiesBatch] = useState("AR-Q3-2026-014");
  const [validityDays, setValidityDays] = useState("7");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName || !ownerName) {
      toast.error("Please fill in Pet Name and Owner Name");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const today = new Date();
      const issueDate = today.toISOString().split("T")[0];

      const validDate = new Date(today);
      validDate.setDate(validDate.getDate() + parseInt(validityDays || "7"));
      const validUntil = validDate.toISOString().split("T")[0];

      const cert = addCertificate({
        issueDate,
        validUntil,
        purpose,
        petId: `CDO-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        petName,
        species,
        breed,
        sex,
        age,
        color,
        microchipOrTag: microchipOrTag || `TAG-CDO-${Math.floor(100 + Math.random() * 900)}`,
        ownerName,
        ownerAddress: `${ownerAddress}, Barangay ${ownerBarangay}`,
        ownerBarangay,
        ownerContact,
        rabiesVaccination: {
          brand: rabiesBrand,
          batchNumber: rabiesBatch,
          dateGiven: issueDate,
          validUntil: new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().split("T")[0],
          vaccinator: "Dr. Elena Santos, DVM",
        },
        findings: `The animal was physically inspected and found free from clinical signs of rabies, infectious canine/feline viral diseases, and external parasites. Cleared for ${purpose}.`,
        fitForTravel: true,
        issuingOffice: "City Veterinary Office — Cagayan de Oro City, Misamis Oriental",
        issuingVet: "Dr. Elena Santos, DVM",
        vetLicenseNo: "PRC-VET-0014829",
        vetPtrNo: "PTR-CDO-9821442B",
        status: "valid",
      });

      setLoading(false);
      setOpen(false);
      toast.success("Health Certificate Generated", {
        description: `Certificate #${cert.certificateNumber} generated with official QR verification code.`,
      });

      if (onCreated) onCreated(cert);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs cursor-pointer">
          <Plus className="size-3.5" /> Issue Health Certificate
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <FileCheck2 className="size-5" />
              <DialogTitle className="text-lg font-bold">Issue Veterinary Health Certificate (VHC)</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official municipal clearance for domestic transport, sea travel, inter-barangay movement, or health declaration.
            </DialogDescription>
          </DialogHeader>

          {/* Purpose & Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Certificate Purpose</Label>
              <Select value={purpose} onValueChange={(v: any) => setPurpose(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Domestic Air/Sea Travel">Domestic Air/Sea Travel (7-day validity)</SelectItem>
                  <SelectItem value="Inter-Barangay Transport">Inter-Barangay Transport</SelectItem>
                  <SelectItem value="General Health Declaration">General Health Declaration (30 days)</SelectItem>
                  <SelectItem value="Adoption Clearance">Adoption Clearance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Validity Duration (Days)</Label>
              <Select value={validityDays} onValueChange={setValidityDays}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Days (Strict Sea Travel)</SelectItem>
                  <SelectItem value="7">7 Days (Standard Bureau of Animal Industry)</SelectItem>
                  <SelectItem value="14">14 Days</SelectItem>
                  <SelectItem value="30">30 Days (General Clearance)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Animal Details */}
          <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Animal Identification
            </p>
            <div className="grid grid-cols-3 gap-3">
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
                    <SelectItem value="Livestock">Livestock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Breed</Label>
                <Input
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  className="h-8 text-xs"
                />
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
              <div className="space-y-1">
                <Label className="text-xs">Age</Label>
                <Input
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 2 years"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color / Markings</Label>
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Microchip / Tag Number (Optional)</Label>
              <Input
                value={microchipOrTag}
                onChange={(e) => setMicrochipOrTag(e.target.value)}
                placeholder="e.g. 981098102391024 or TAG-LAP-042"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Owner Details */}
          <div className="p-3 rounded-lg border border-border/60 bg-muted/15 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Owner / Consignor Information
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Owner Name *</Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Full Legal Name"
                  required
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Barangay</Label>
                <Select value={ownerBarangay} onValueChange={setOwnerBarangay}>
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
                <Label className="text-xs">Contact Number</Label>
                <Input
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Rabies Proof */}
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Verified Rabies Vaccine Batch
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Vaccine Brand</Label>
                <Input
                  value={rabiesBrand}
                  onChange={(e) => setRabiesBrand(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lot / Batch No.</Label>
                <Input
                  value={rabiesBatch}
                  onChange={(e) => setRabiesBatch(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
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
                  <Loader2 className="mr-2 size-3.5 animate-spin" /> Generating...
                </>
              ) : (
                "Issue Official Certificate"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
