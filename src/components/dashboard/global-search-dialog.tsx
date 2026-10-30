"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  PawPrint,
  User,
  Stethoscope,
  ShieldAlert,
  Package,
  ArrowRight,
  Command,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCVO } from "@/lib/cvo-context";
import { useRouter } from "next/navigation";
import { PetAvatar } from "@/components/dashboard/pet-avatar";

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { consultations, animalControlCases, inventory } = useCVO();
  const router = useRouter();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const query = searchTerm.trim().toLowerCase();

  const petResults = useMemo(() => {
    if (!query) return [];
    const basePets = [
      { id: "CDO-2026-00142", name: "Bantay", species: "Dog", breed: "Aspin", owner: "Maria Santos", barangay: "Lapasan" },
      { id: "CDO-2026-00141", name: "Muning", species: "Cat", breed: "Puspin", owner: "Juan Dela Cruz", barangay: "Carmen" },
      { id: "CDO-2026-00140", name: "Brownie", species: "Dog", breed: "Labrador Mix", owner: "Elena Velez", barangay: "Bulua" },
      { id: "CDO-2026-00139", name: "Mingming", species: "Cat", breed: "Siamese Mix", owner: "Mark Ramos", barangay: "Kauswagan" },
      { id: "CDO-2026-00138", name: "Rocky", species: "Dog", breed: "Aspin", owner: "Grace Tan", barangay: "Macasandig" },
      { id: "CDO-2026-00136", name: "Princess", species: "Dog", breed: "Shih Tzu", owner: "Donna Cruz", barangay: "Patag" },
      { id: "CDO-2026-00132", name: "Max", species: "Dog", breed: "Golden Retriever", owner: "Patricia Dela Rosa", barangay: "Bulua" },
    ];
    return basePets.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.owner.toLowerCase().includes(query) ||
        p.barangay.toLowerCase().includes(query)
    );
  }, [query]);

  const consultationResults = useMemo(() => {
    if (!query) return [];
    return consultations.filter(
      (c) =>
        c.encounterNo.toLowerCase().includes(query) ||
        c.petName.toLowerCase().includes(query) ||
        c.diagnosis.toLowerCase().includes(query) ||
        c.ownerName.toLowerCase().includes(query)
    );
  }, [query, consultations]);

  const animalControlResults = useMemo(() => {
    if (!query) return [];
    return animalControlCases.filter(
      (c) =>
        c.caseId.toLowerCase().includes(query) ||
        c.barangay.toLowerCase().includes(query) ||
        c.animalDescription.toLowerCase().includes(query) ||
        c.reason.toLowerCase().includes(query)
    );
  }, [query, animalControlCases]);

  const inventoryResults = useMemo(() => {
    if (!query) return [];
    return inventory.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.batchNumber.toLowerCase().includes(query) ||
        i.category.toLowerCase().includes(query)
    );
  }, [query, inventory]);

  const totalHits =
    petResults.length +
    consultationResults.length +
    animalControlResults.length +
    inventoryResults.length;

  const navigateTo = (path: string) => {
    onOpenChange(false);
    router.push(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden bg-background border border-border shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Global System Search</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center px-4 border-b border-border bg-muted/15">
          <Search className="size-4 text-muted-foreground shrink-0 mr-2" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search animals, owners, encounters, batches (e.g. 'Bantay', 'Carmen')..."
            className="h-13 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 px-1 placeholder:text-muted-foreground/60"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] text-muted-foreground/70 shrink-0 font-mono gap-1 py-0.5">
            <Command className="size-3" /> K
          </Badge>
        </div>

        {/* Results Area */}
        <div className="max-h-[380px] overflow-y-auto p-4 space-y-4">
          {!query && (
            <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground/80">Search City Veterinary Office records</p>
              <p className="text-[11px] text-muted-foreground/60">
                Type an animal ID, citizen name, barangay, or vaccine lot.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge variant="secondary" className="cursor-pointer text-[10px]" onClick={() => setSearchTerm("Lapasan")}>Brgy. Lapasan</Badge>
                <Badge variant="secondary" className="cursor-pointer text-[10px]" onClick={() => setSearchTerm("Rabisin")}>Rabies Vaccines</Badge>
              </div>
            </div>
          )}

          {query && totalHits === 0 && (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No government records matching <span className="font-semibold text-foreground">&quot;{searchTerm}&quot;</span>.
            </div>
          )}

          {/* Animals */}
          {petResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <PawPrint className="size-3 text-primary" /> Registered Animals ({petResults.length})
              </p>
              <div className="space-y-1">
                {petResults.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => navigateTo("/pet-registry")}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-muted/60 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <PetAvatar
                        photoUrl={(pet as any).photo_url}
                        species={pet.species}
                        name={pet.name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground group-hover:text-primary">{pet.name}</span>
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5">{pet.species}</Badge>
                          <span className="font-mono text-[10px] text-muted-foreground">{pet.id}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Owner: {pet.owner} • Brgy. {pet.barangay}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}



          {/* Consultations */}
          {consultationResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="size-3 text-blue-500" /> Consultations & EMR Encounters ({consultationResults.length})
              </p>
              <div className="space-y-1">
                {consultationResults.map((enc) => (
                  <button
                    key={enc.id}
                    onClick={() => navigateTo("/consultations")}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-muted/60 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground group-hover:text-primary">{enc.encounterNo}</span>
                        <span className="font-semibold text-foreground">{enc.petName}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">{enc.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Diagnosis: {enc.diagnosis} • Attending: {enc.vetName}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Animal Control */}
          {animalControlResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="size-3 text-amber-500" /> Animal Control & Impound Cases ({animalControlResults.length})
              </p>
              <div className="space-y-1">
                {animalControlResults.map((ac) => (
                  <button
                    key={ac.caseId}
                    onClick={() => navigateTo("/animal-control")}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-muted/60 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground group-hover:text-primary">{ac.caseId}</span>
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5">{ac.status.toUpperCase()}</Badge>
                        <span className="text-[10px] text-muted-foreground">{ac.barangay}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {ac.reason} • {ac.animalDescription}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Inventory */}
          {inventoryResults.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <Package className="size-3 text-purple-500" /> Inventory & Vaccine Batches ({inventoryResults.length})
              </p>
              <div className="space-y-1">
                {inventoryResults.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => navigateTo("/vaccine-inventory")}
                    className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs hover:bg-muted/60 transition-colors group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground group-hover:text-primary">{inv.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">Lot #{inv.batchNumber}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Stock: {inv.stock} {inv.unit} • Expires: {inv.expirationDate} • {inv.storageLocation}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>City Veterinary Office — Cagayan de Oro LGU Registry</span>
          <span>Press ESC to close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
