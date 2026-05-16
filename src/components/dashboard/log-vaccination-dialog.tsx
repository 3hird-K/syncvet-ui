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
import { DatePicker } from "@/components/ui/date-picker";

export function LogVaccinationDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.error("Database Connection Error", {
        description: "The vaccination logging service is currently undergoing maintenance. Please try again later.",
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs">
          <Syringe className="size-3.5" /> Log Vaccination
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Syringe className="size-5" />
            <DialogTitle className="text-xl font-bold">Log Vaccination</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Record a new administered dose. Ensure batch number matches physical inventory.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="petId" className="text-[10px] font-bold uppercase tracking-widest">
              Pet ID / Name
            </Label>
            <Input
              id="petId"
              placeholder="e.g. CDO-2026-00142"
              className="h-9 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="vaccine" className="text-[10px] font-bold uppercase tracking-widest">
                Vaccine Type
              </Label>
              <Select defaultValue="anti-rabies">
                <SelectTrigger id="vaccine" className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anti-rabies">Anti-Rabies</SelectItem>
                  <SelectItem value="parvovirus">Anti-Parvovirus</SelectItem>
                  <SelectItem value="deworming">Deworming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="batch" className="text-[10px] font-bold uppercase tracking-widest">
                Batch No.
              </Label>
              <Input
                id="batch"
                placeholder="e.g. AR-Q3-2026-014"
                className="h-9 text-xs font-mono"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Date Administered
              </Label>
              <DatePicker 
                date={date} 
                setDate={setDate} 
                className="h-9 text-xs font-normal" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="vet" className="text-[10px] font-bold uppercase tracking-widest">
                Veterinarian
              </Label>
              <Input
                id="vet"
                placeholder="e.g. Dr. Elena Santos"
                className="h-9 text-xs"
                required
              />
            </div>
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
                Logging...
              </>
            ) : (
              "Submit Record"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
