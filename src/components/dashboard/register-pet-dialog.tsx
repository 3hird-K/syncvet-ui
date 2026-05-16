"use client";

import { useState } from "react";
import { Plus, PawPrint, Loader2 } from "lucide-react";
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

export function RegisterPetDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call with a static error for now as requested
    setTimeout(() => {
      setLoading(false);
      toast.error("Database Connection Error", {
        description: "The registration service is currently undergoing maintenance. Please try again later.",
      });
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 text-xs">
          <Plus className="size-3.5" /> Register Pet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <PawPrint className="size-5" />
            <DialogTitle className="text-xl font-bold">Register New Pet</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Enter the details of the animal to add it to the city-wide registry.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest">
              Pet Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Bantay"
              className="h-9 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="species" className="text-[10px] font-bold uppercase tracking-widest">
                Species
              </Label>
              <Select defaultValue="dog">
                <SelectTrigger id="species" className="h-9 text-xs">
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="breed" className="text-[10px] font-bold uppercase tracking-widest">
                Breed
              </Label>
              <Input
                id="breed"
                placeholder="e.g. Aspin"
                className="h-9 text-xs"
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="owner" className="text-[10px] font-bold uppercase tracking-widest">
              Owner Name
            </Label>
            <Input
              id="owner"
              placeholder="Full legal name of owner"
              className="h-9 text-xs"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="barangay" className="text-[10px] font-bold uppercase tracking-widest">
              Barangay
            </Label>
            <Select defaultValue="lapasan">
              <SelectTrigger id="barangay" className="h-9 text-xs">
                <SelectValue placeholder="Select barangay" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lapasan">Lapasan</SelectItem>
                <SelectItem value="carmen">Carmen</SelectItem>
                <SelectItem value="bulua">Bulua</SelectItem>
                <SelectItem value="kauswagan">Kauswagan</SelectItem>
                <SelectItem value="macasandig">Macasandig</SelectItem>
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
              "Complete Registration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
