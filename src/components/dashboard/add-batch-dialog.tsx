"use client";

import { useState } from "react";
import { Plus, Loader2, PackagePlus } from "lucide-react";
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
import { DatePicker } from "@/components/ui/date-picker";

export function AddBatchDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiry, setExpiry] = useState<Date | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.error("Database Connection Error", {
        description: "The inventory service is currently undergoing maintenance. Please try again later.",
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs">
          <Plus className="size-3.5" /> Add Batch
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <PackagePlus className="size-5" />
            <DialogTitle className="text-xl font-bold">Add Inventory Batch</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Register a new vaccine batch into the CDO central storage or satellite units.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vaccine" className="text-[10px] font-bold uppercase tracking-widest">
                Vaccine Product
              </Label>
              <Select defaultValue="anti-rabies">
                <SelectTrigger id="vaccine" className="h-9 text-xs">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anti-rabies">Anti-Rabies (Canine)</SelectItem>
                  <SelectItem value="anti-rabies-feline">Anti-Rabies (Feline)</SelectItem>
                  <SelectItem value="parvovirus">Anti-Parvovirus</SelectItem>
                  <SelectItem value="deworming-oral">Deworming (Oral)</SelectItem>
                  <SelectItem value="deworming-inject">Deworming (Injectable)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch" className="text-[10px] font-bold uppercase tracking-widest">
                Batch No.
              </Label>
              <Input
                id="batch"
                placeholder="e.g. AR-Q3-2026-016"
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stock" className="text-[10px] font-bold uppercase tracking-widest">
                Initial Stock
              </Label>
              <Input
                id="stock"
                type="number"
                placeholder="0"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reorder" className="text-[10px] font-bold uppercase tracking-widest">
                Reorder Level
              </Label>
              <Input
                id="reorder"
                type="number"
                placeholder="0"
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Expiry Date
              </Label>
              <DatePicker 
                date={expiry} 
                setDate={setExpiry} 
                className="h-9 text-xs font-normal" 
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="storage" className="text-[10px] font-bold uppercase tracking-widest">
              Storage Location
            </Label>
            <Select defaultValue="zone1">
              <SelectTrigger id="storage" className="h-9 text-xs">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zone1">CDO Central — Zone 1 (Cold Room)</SelectItem>
                <SelectItem value="zone2">CDO Central — Zone 2</SelectItem>
                <SelectItem value="lapasan">Brgy. Lapasan Satellite</SelectItem>
                <SelectItem value="carmen">Brgy. Carmen Satellite</SelectItem>
                <SelectItem value="bulua">Brgy. Bulua Satellite</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="submit"
            onClick={(e) => handleSubmit(e as any)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Registering...
              </>
            ) : (
              "Add Batch to Ledger"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
