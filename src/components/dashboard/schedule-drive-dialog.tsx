"use client";

import { useState } from "react";
import { Plus, Loader2, CalendarPlus } from "lucide-react";
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
import { useCVO } from "@/lib/cvo-context";
import { cvoBarangays } from "@/data/cvo-store";

export function ScheduleDriveDialog() {
  const { addFieldOperation } = useCVO();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [barangay, setBarangay] = useState<string>("Lapasan");
  const [operationType, setOperationType] = useState<string>("Mass Anti-Rabies Drive");
  const [lead, setLead] = useState<string>("Officer Mark Velez");
  const [targetPets, setTargetPets] = useState<number>(100);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barangay) {
      toast.error("Please select a target barangay");
      return;
    }

    setLoading(true);
    try {
      const scheduledDateStr = date
        ? date.toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

      await addFieldOperation({
        barangay,
        type: operationType,
        lead,
        date: scheduledDateStr,
        petsTarget: Number(targetPets) || 100,
        petsVaccinated: 0,
        status: "scheduled",
        notes: notes || undefined,
      });

      toast.success("Field Operation Scheduled", {
        description: `${operationType} scheduled for Brgy. ${barangay} on ${scheduledDateStr}.`,
      });

      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to schedule field operation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs">
          <Plus className="size-3.5" /> Schedule Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <CalendarPlus className="size-5" />
            <DialogTitle className="text-xl font-bold">Schedule Field Operation</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Plan a new mobile vaccination drive or veterinary outreach in a specific barangay.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="barangay" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Target Barangay
              </Label>
              <Select value={barangay} onValueChange={setBarangay}>
                <SelectTrigger id="barangay" className="h-9 text-xs">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {cvoBarangays.map((b) => (
                    <SelectItem key={b} value={b} className="text-xs">
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="type" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Operation Type
              </Label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger id="type" className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mass Anti-Rabies Drive" className="text-xs">Mass Anti-Rabies Drive</SelectItem>
                  <SelectItem value="Deworming Campaign" className="text-xs">Deworming Campaign</SelectItem>
                  <SelectItem value="Stray Dog Assessment" className="text-xs">Stray Dog Assessment</SelectItem>
                  <SelectItem value="Anti-Rabies + Registration" className="text-xs">Anti-Rabies + Registration</SelectItem>
                  <SelectItem value="Other" className="text-xs">General Outreach</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Scheduled Date
              </Label>
              <DatePicker 
                date={date} 
                setDate={setDate} 
                className="h-9 text-xs font-normal" 
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="target" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Target Animals (Est.)
              </Label>
              <Input
                id="target"
                type="number"
                min={1}
                value={targetPets}
                onChange={(e) => setTargetPets(Number(e.target.value) || 0)}
                placeholder="100"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lead" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Officer-in-Charge / Field Lead
            </Label>
            <Select value={lead} onValueChange={setLead}>
              <SelectTrigger id="lead" className="h-9 text-xs">
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Officer Mark Velez" className="text-xs">Officer Mark Velez (Field Operations)</SelectItem>
                <SelectItem value="Dr. Elena Santos, DVM" className="text-xs">Dr. Elena Santos, DVM</SelectItem>
                <SelectItem value="Dr. Sarah Chen, DVM" className="text-xs">Dr. Sarah Chen, DVM</SelectItem>
                <SelectItem value="Officer Jay Ramos" className="text-xs">Officer Jay Ramos (Vaccinator)</SelectItem>
                <SelectItem value="Dr. Helen Ann P. Tacandong, DVM" className="text-xs">Dr. Helen Ann P. Tacandong, DVM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Deployment Notes (Optional)
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Barangay hall covered court deployment; cold-chain box checked"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                "Confirm Schedule"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
