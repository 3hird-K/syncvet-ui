"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, X, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { DatePicker } from "@/components/ui/date-picker";
import { useCVO } from "@/lib/cvo-context";
import { format, parseISO } from "date-fns";
import type { CVOInventoryItem } from "@/data/cvo-store";

const CATEGORIES = ["Vaccines", "Medicines", "Surgical Supplies", "Medical Supplies"] as const;

const STORAGE_LOCATIONS = [
  "Main Vaccine Refrigerator (2°C – 8°C)",
  "Medicine & Pharmacy Cabinet",
  "Medical & Surgical Supply Shelf",
];

const UNITS = ["doses", "vials", "units", "boxes"] as const;

interface EditBatchDialogProps {
  batch: CVOInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: (updatedBatch: CVOInventoryItem) => void;
}

export function EditBatchDialog({
  batch,
  open,
  onOpenChange,
  onUpdated,
}: EditBatchDialogProps) {
  const [loading, setLoading] = useState(false);
  const { updateInventoryBatch, addAuditLog } = useCVO();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Vaccines");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [stock, setStock] = useState("100");
  const [unit, setUnit] = useState<string>("doses");
  const [minimumStock, setMinimumStock] = useState("25");
  const [expiry, setExpiry] = useState<Date | undefined>();
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);

  // Sync state whenever batch changes or dialog opens
  useEffect(() => {
    if (batch) {
      setName(batch.name || "");
      setCategory(batch.category || "Vaccines");
      setBatchNumber(batch.batchNumber || "");
      setManufacturer(batch.manufacturer || "");
      setStock(String(batch.stock ?? 0));
      setUnit(batch.unit || "doses");
      setMinimumStock(String(batch.minimumStock ?? 25));
      setStorageLocation(batch.storageLocation || STORAGE_LOCATIONS[0]);

      if (batch.expirationDate) {
        try {
          setExpiry(parseISO(batch.expirationDate));
        } catch {
          setExpiry(new Date(batch.expirationDate));
        }
      }
    }
  }, [batch, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch) return;

    if (!name.trim()) {
      toast.error("Item name is required.");
      return;
    }

    if (!batchNumber.trim()) {
      toast.error("Batch/Lot number is required.");
      return;
    }

    if (!expiry) {
      toast.error("Please pick an expiration date for FEFO tracking.");
      return;
    }

    const stockNum = Math.max(0, parseInt(stock) || 0);
    const minStockNum = Math.max(0, parseInt(minimumStock) || 0);
    const formattedExpiry = format(expiry, "yyyy-MM-dd");

    setLoading(true);

    try {
      const updates: Partial<CVOInventoryItem> = {
        name: name.trim(),
        category: category as any,
        batchNumber: batchNumber.trim().toUpperCase(),
        manufacturer: manufacturer.trim(),
        stock: stockNum,
        unit: unit as any,
        minimumStock: minStockNum,
        expirationDate: formattedExpiry,
        storageLocation,
      };

      const success = await updateInventoryBatch(batch.id || batch.batchNumber, updates);

      if (success) {
        addAuditLog({
          user: "CVO Logistics Officer",
          role: "Administrator",
          action: "Updated Inventory Batch",
          entity: "Inventory",
          recordId: batchNumber.trim().toUpperCase(),
          details: `Updated batch ${batchNumber.trim().toUpperCase()} (${name.trim()}). Stock: ${stockNum} ${unit}, Expiry: ${formattedExpiry}.`,
        });

        toast.success("Batch Updated Successfully", {
          description: `${name.trim()} (Lot #${batchNumber.trim().toUpperCase()}) updated in FEFO ledger.`,
        });

        if (onUpdated) {
          onUpdated({
            ...batch,
            ...updates,
          } as CVOInventoryItem);
        }

        onOpenChange(false);
      } else {
        toast.error("Failed to update batch. Please check your connection.");
      }
    } catch {
      toast.error("An error occurred while updating the batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[650px] p-5 sm:p-6 bg-background rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-0 pb-3 border-b border-border/60 !pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <Pencil className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">Edit Inventory Batch</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Modify cold-chain parameters, stock counts, or expiry date.
                </DialogDescription>
              </div>
            </div>

            {/* Action Buttons: Save changes beside X */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                form="edit-batch-form"
                size="sm"
                disabled={loading || !expiry}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5 shrink-0 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="size-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form id="edit-batch-form" onSubmit={handleSubmit} className="space-y-3.5 py-3 text-xs w-full min-w-0">
          {/* Item Name */}
          <div className="space-y-1 min-w-0">
            <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Product / Item Name *
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rabisin (Boehringer Ingelheim) — 1.0 mL"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Category & Manufacturer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-category" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Category *
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-mfg" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Manufacturer / Source
              </Label>
              <Input
                id="edit-mfg"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder="e.g. Zoetis Philippines Inc."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Batch / Lot No. */}
          <div className="space-y-1 min-w-0">
            <Label htmlFor="edit-batchNo" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Batch / Lot Number *
            </Label>
            <Input
              id="edit-batchNo"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="e.g. RAB-2026-8433"
              className="h-9 font-mono text-xs uppercase"
              required
            />
          </div>

          {/* Stock, Unit & Minimum Stock Alert Level */}
          <div className="grid grid-cols-3 gap-2.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-stock" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Current Stock *
              </Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="h-9 text-xs font-mono font-bold"
                required
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-unit" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Unit *
              </Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="edit-unit" className="h-9 text-xs w-full">
                  <SelectValue placeholder="Unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u} className="text-xs">
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-min" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Low Stock Alert *
              </Label>
              <Input
                id="edit-min"
                type="number"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>

          {/* Expiration Date (FEFO) & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Expiration Date (FEFO) *
              </Label>
              <DatePicker
                date={expiry}
                setDate={setExpiry}
                placeholder="Pick expiration date"
              />
            </div>

            <div className="space-y-1 min-w-0">
              <Label htmlFor="edit-storage" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cold-Chain Storage *
              </Label>
              <Select value={storageLocation} onValueChange={setStorageLocation}>
                <SelectTrigger id="edit-storage" className="h-9 text-xs truncate w-full">
                  <SelectValue placeholder="Storage location" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc} className="text-xs">
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
