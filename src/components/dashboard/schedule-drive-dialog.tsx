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

export function ScheduleDriveDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      toast.error("Database Connection Error", {
        description: "The scheduling service is currently undergoing maintenance. Please try again later.",
      });
    }, 1500);
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
            Plan a new mobile vaccination drive or assessment in a specific barangay.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="barangay" className="text-[10px] font-bold uppercase tracking-widest">
                Target Barangay
              </Label>
              <Select defaultValue="lapasan">
                <SelectTrigger id="barangay" className="h-9 text-xs">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lapasan">Lapasan</SelectItem>
                  <SelectItem value="carmen">Carmen</SelectItem>
                  <SelectItem value="bulua">Bulua</SelectItem>
                  <SelectItem value="kauswagan">Kauswagan</SelectItem>
                  <SelectItem value="macasandig">Macasandig</SelectItem>
                  <SelectItem value="gusa">Gusa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type" className="text-[10px] font-bold uppercase tracking-widest">
                Operation Type
              </Label>
              <Select defaultValue="anti-rabies">
                <SelectTrigger id="type" className="h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anti-rabies">Mass Anti-Rabies Drive</SelectItem>
                  <SelectItem value="deworming">Deworming Campaign</SelectItem>
                  <SelectItem value="assessment">Stray Dog Assessment</SelectItem>
                  <SelectItem value="mixed">Anti-Rabies + Registration</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest">
                Scheduled Date
              </Label>
              <DatePicker 
                date={date} 
                setDate={setDate} 
                className="h-9 text-xs font-normal" 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target" className="text-[10px] font-bold uppercase tracking-widest">
                Target Pets (Est.)
              </Label>
              <Input
                id="target"
                type="number"
                placeholder="0"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="team" className="text-[10px] font-bold uppercase tracking-widest">
                Assigned Team
              </Label>
              <Select defaultValue="team-a">
                <SelectTrigger id="team" className="h-9 text-xs">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team-a">Mobile Unit — Team A</SelectItem>
                  <SelectItem value="team-b">Mobile Unit — Team B</SelectItem>
                  <SelectItem value="team-c">Mobile Unit — Team C</SelectItem>
                  <SelectItem value="assessment">Assessment Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lead" className="text-[10px] font-bold uppercase tracking-widest">
                Team Lead
              </Label>
              <Select defaultValue="mark">
                <SelectTrigger id="lead" className="h-9 text-xs">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark">Officer Mark Velez</SelectItem>
                  <SelectItem value="elena">Dr. Elena Santos</SelectItem>
                  <SelectItem value="sarah">Dr. Sarah Chen</SelectItem>
                  <SelectItem value="jay">Officer Jay Ramos</SelectItem>
                </SelectContent>
              </Select>
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
                Scheduling...
              </>
            ) : (
              "Confirm Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
