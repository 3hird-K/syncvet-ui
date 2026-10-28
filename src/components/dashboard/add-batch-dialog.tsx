"use client";

import { useState } from "react";
import { Plus, Loader2, PackagePlus, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DatePicker } from "@/components/ui/date-picker";
import { useCVO } from "@/lib/cvo-context";
import { format } from "date-fns";

const CVO_DEFAULT_PRODUCTS = [
  { name: "Rabisin (Boehringer Ingelheim) — 1.0 mL Vial", category: "Vaccines" as const, unit: "doses" as const, mfg: "Boehringer Ingelheim Animal Health" },
  { name: "Defensor 3 (Zoetis) — 1.0 mL Inactivated", category: "Vaccines" as const, unit: "doses" as const, mfg: "Zoetis Philippines Inc." },
  { name: "Nobivac 1-Rabies (MSD Animal Health) — 1.0 mL", category: "Vaccines" as const, unit: "doses" as const, mfg: "MSD Animal Health" },
  { name: "CVO Municipal Rabies Inactivated (DA-BAI Standard)", category: "Vaccines" as const, unit: "doses" as const, mfg: "Bureau of Animal Industry (DA-BAI)" },
  { name: "Nobivac DHPPi + L (Canine 5-in-1)", category: "Vaccines" as const, unit: "doses" as const, mfg: "MSD Animal Health" },
  { name: "Felocell 4 (Feline Core)", category: "Vaccines" as const, unit: "doses" as const, mfg: "Zoetis Philippines Inc." },
  { name: "Zoletil 50 (Tiletamine-Zolazepam Injectable)", category: "Medicines" as const, unit: "vials" as const, mfg: "Virbac Animal Health" },
  { name: "Ketamine HCl (100 mg/mL Anesthetic Induction)", category: "Medicines" as const, unit: "vials" as const, mfg: "Interchemie Werken" },
  { name: "Xylazine 2% (Sedative & Muscle Relaxant)", category: "Medicines" as const, unit: "vials" as const, mfg: "Bayer Animal Health" },
  { name: "Meloxicam 0.5% Long-Acting Analgesic", category: "Medicines" as const, unit: "vials" as const, mfg: "Boehringer Ingelheim" },
  { name: "Amoxicillin Long-Acting 15% Injectable", category: "Medicines" as const, unit: "vials" as const, mfg: "Norbrook Laboratories" },
  { name: "Suture 3-0 Polyglactin 910 (Absorbable Vicryl)", category: "Surgical Supplies" as const, unit: "units" as const, mfg: "Ethicon / Johnson & Johnson" },
  { name: "Official CVO Aluminum Rabies Collar Tags (RA 9482)", category: "Medical Supplies" as const, unit: "units" as const, mfg: "City Government of Cagayan de Oro" },
];

const STORAGE_LOCATIONS = [
  "Main Vaccine Refrigerator (2°C – 8°C)",
  "Medicine & Pharmacy Cabinet",
  "Medical & Surgical Supply Shelf",
];

function generateBatchCode(prodName: string, category: string): string {
  const year = new Date().getFullYear();
  let prefix = "CVO";
  const lower = (prodName + " " + category).toLowerCase();
  if (lower.includes("rabi") || lower.includes("defensor")) prefix = "RAB";
  else if (lower.includes("dhp") || lower.includes("canine") || lower.includes("5-in-1")) prefix = "DHP";
  else if (lower.includes("felo") || lower.includes("feline")) prefix = "FEL";
  else if (category === "Medicines" || lower.includes("zoletil") || lower.includes("xylazine") || lower.includes("ketamine") || lower.includes("amox")) prefix = "MED";
  else if (lower.includes("suture") || lower.includes("tag") || lower.includes("supply")) prefix = "SUP";

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${randomDigits}`;
}

export function AddBatchDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addInventoryBatch, addAuditLog } = useCVO();

  const [selectedProductIndex, setSelectedProductIndex] = useState("0");
  const [customName, setCustomName] = useState("");
  const [batchNo, setBatchNo] = useState(() => generateBatchCode(CVO_DEFAULT_PRODUCTS[0].name, CVO_DEFAULT_PRODUCTS[0].category));
  const [stock, setStock] = useState("100");
  const [reorderLevel, setReorderLevel] = useState("25");
  const [expiry, setExpiry] = useState<Date | undefined>(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const isCustom = selectedProductIndex === "custom";
      const baseProduct = !isCustom ? CVO_DEFAULT_PRODUCTS[Number(selectedProductIndex)] : null;
      const pName = isCustom ? customName || "Custom" : baseProduct?.name || "Vaccine";
      const pCat = baseProduct ? baseProduct.category : "Vaccines";
      setBatchNo(generateBatchCode(pName, pCat));
    }
  };

  const handleProductSelect = (val: string) => {
    setSelectedProductIndex(val);
    if (val !== "custom") {
      const prod = CVO_DEFAULT_PRODUCTS[Number(val)];
      if (prod) {
        setBatchNo(generateBatchCode(prod.name, prod.category));
        if (prod.category === "Vaccines") {
          setStorageLocation("Main Vaccine Refrigerator (2°C – 8°C)");
        } else if (prod.category === "Medicines") {
          setStorageLocation("Medicine & Pharmacy Cabinet");
        } else {
          setStorageLocation("Medical & Surgical Supply Shelf");
        }
      }
    } else {
      setBatchNo(generateBatchCode(customName || "Custom", "Medical Supplies"));
      setStorageLocation("Medical & Surgical Supply Shelf");
    }
  };

  const regenerateBatch = () => {
    const isCustom = selectedProductIndex === "custom";
    const baseProduct = !isCustom ? CVO_DEFAULT_PRODUCTS[Number(selectedProductIndex)] : null;
    const pName = isCustom ? customName || "Custom" : baseProduct?.name || "Vaccine";
    const pCat = baseProduct ? baseProduct.category : "Vaccines";
    setBatchNo(generateBatchCode(pName, pCat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalBatchNo = batchNo.trim() || generateBatchCode("Batch", "Vaccines");

    if (!expiry) {
      toast.error("Please pick an expiration date for FEFO tracking.");
      return;
    }

    const isCustom = selectedProductIndex === "custom";
    const baseProduct = !isCustom ? CVO_DEFAULT_PRODUCTS[Number(selectedProductIndex)] : null;
    const productName = isCustom ? customName.trim() : baseProduct?.name || "Vaccine Product";
    const category = baseProduct ? baseProduct.category : "Vaccines";
    const unit = baseProduct ? baseProduct.unit : "doses";
    const manufacturer = baseProduct ? baseProduct.mfg : "Department of Agriculture / CVO CDO";

    const stockNum = Math.max(0, parseInt(stock) || 0);
    const minStockNum = Math.max(0, parseInt(reorderLevel) || 0);

    setLoading(true);

    try {
      const success = await addInventoryBatch({
        name: productName,
        category,
        batchNumber: finalBatchNo.toUpperCase(),
        manufacturer,
        stock: stockNum,
        unit,
        minimumStock: minStockNum,
        expirationDate: format(expiry, "yyyy-MM-dd"),
        storageLocation,
        status: stockNum <= minStockNum ? "low-stock" : "in-stock",
        fefoPriority: 5,
      });

      if (success) {
        addAuditLog({
          user: "CVO Logistics Officer",
          role: "Administrator",
          action: "Registered Inventory Batch",
          entity: "Inventory",
          recordId: finalBatchNo.toUpperCase(),
          details: `Registered ${stockNum} ${unit} of ${productName} (Lot #${finalBatchNo.toUpperCase()}) into ${storageLocation}.`,
        });

        toast.success("Inventory Batch Registered Successfully", {
          description: `${productName} (Lot #${finalBatchNo.toUpperCase()}) with ${stockNum} ${unit} added to FEFO ledger.`,
        });

        setOpen(false);
      } else {
        toast.error("Failed to add batch. Please check your connection.");
      }
    } catch {
      toast.error("An error occurred while adding the batch.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs cursor-pointer font-bold bg-primary text-primary-foreground shadow-xs">
          <Plus className="size-3.5" /> Add Batch
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[700px] p-5 sm:p-6 bg-background rounded-2xl shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-0 pb-3 border-b border-border/60 !pr-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <PackagePlus className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">Add Inventory Batch</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Register cold-chain vaccine or medicine into clinic storage (FEFO).
                </DialogDescription>
              </div>
            </div>

            {/* Action Buttons: Add Batch button beside the X button */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="submit"
                form="add-batch-form"
                size="sm"
                disabled={loading || !expiry}
                className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5 shrink-0 whitespace-nowrap"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    <span>Add Batch</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all shrink-0"
                title="Close"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <form id="add-batch-form" onSubmit={handleSubmit} className="space-y-3.5 py-3 text-xs w-full min-w-0">
          {/* Product Selector */}
          <div className="space-y-1 min-w-0">
            <Label htmlFor="vaccine" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Product / Item Name *
            </Label>
            <Select value={selectedProductIndex} onValueChange={handleProductSelect}>
              <SelectTrigger id="vaccine" className="h-9 text-xs truncate w-full">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {CVO_DEFAULT_PRODUCTS.map((prod, idx) => (
                  <SelectItem key={idx} value={String(idx)} className="text-xs">
                    {prod.name} ({prod.category})
                  </SelectItem>
                ))}
                <SelectItem value="custom" className="text-xs font-semibold text-primary">
                  + Other / Custom Supply
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedProductIndex === "custom" && (
            <div className="space-y-1 min-w-0">
              <Label htmlFor="customName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Custom Item Name *
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Rabies Vaccine Prophylaxis 1.0 mL"
                className="h-9 text-xs w-full"
                required
              />
            </div>
          )}

          {/* Row 1: Batch Number & Expiration Date */}
          <div className="grid grid-cols-2 gap-3.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
                  Batch / Lot Number
                </Label>
                <button
                  type="button"
                  onClick={regenerateBatch}
                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer flex items-center gap-1 shrink-0 ml-1"
                >
                  <RotateCw className="size-2.5" /> Regenerate
                </button>
              </div>
              <div className="h-9 px-3 bg-muted/40 border border-border/80 rounded-md flex items-center justify-between min-w-0">
                <span className="font-mono font-bold text-xs text-foreground tracking-wider truncate">{batchNo}</span>
                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 ml-1">
                  Auto
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Assigned for cold-chain FEFO</p>
            </div>

            <div className="space-y-1 min-w-0">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                Expiry Date (FEFO) *
              </Label>
              <DatePicker 
                date={expiry} 
                setDate={setExpiry} 
                className="h-9 text-xs font-normal w-full" 
              />
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Earliest expiring used first</p>
            </div>
          </div>

          {/* Row 2: Quantity Received & Low Stock Alert Level */}
          <div className="grid grid-cols-2 gap-3.5 min-w-0">
            <div className="space-y-1 min-w-0">
              <Label htmlFor="stock" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                Quantity Received (Units) *
              </Label>
              <Input
                id="stock"
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="100"
                min="1"
                className="h-9 text-xs font-mono font-bold w-full"
                required
              />
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Total items received in delivery</p>
            </div>

            <div className="space-y-1 min-w-0">
              <Label htmlFor="reorder" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate block">
                Low Stock Alert Level *
              </Label>
              <Input
                id="reorder"
                type="number"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="25"
                min="0"
                className="h-9 text-xs font-mono font-bold w-full"
                required
              />
              <p className="text-[10px] text-muted-foreground leading-tight truncate">Minimum safe inventory count</p>
            </div>
          </div>

          {/* Storage Location */}
          <div className="space-y-1 min-w-0">
            <Label htmlFor="storage" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Storage Location
            </Label>
            <Select value={storageLocation} onValueChange={setStorageLocation}>
              <SelectTrigger id="storage" className="h-9 text-xs w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_LOCATIONS.map((loc) => (
                  <SelectItem key={loc} value={loc} className="text-xs">
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground leading-tight truncate">
              Vaccines must remain stored at 2°C – 8°C cold-chain standards
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
