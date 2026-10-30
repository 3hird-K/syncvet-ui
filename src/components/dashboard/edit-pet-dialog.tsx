"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, PawPrint, Scale, Calendar, QrCode, Check, Lock, X, Camera } from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
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
import { useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { DOG_BREEDS, CAT_BREEDS, WEIGHT_CATEGORIES } from "./register-pet-dialog";
import { PetAvatarPickerDialog } from "./pet-avatar-picker-dialog";
import { PetAvatar } from "./pet-avatar";
import { cn } from "@/lib/utils";

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 16 }, (_, i) => currentYear - i);

interface EditPetDialogProps {
  pet: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteRequest?: (pet: any) => void;
}

export function EditPetDialog({
  pet,
  open,
  onOpenChange,
  onDeleteRequest,
}: EditPetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Form states matching database.types.ts
  const [petName, setPetName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState<string>("Aspin (Asong Pinoy)");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [birthYear, setBirthYear] = useState<string>(String(currentYear - 1));
  const [weightCategory, setWeightCategory] = useState<string>("Medium (10 – 25 kg)");
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Sync form state when pet changes
  useEffect(() => {
    if (pet) {
      setPetName(pet.name || "");
      const spec = (pet.species?.toLowerCase() === "cat" ? "Cat" : "Dog") as "Dog" | "Cat";
      setSpecies(spec);
      setBreed(pet.breed || (spec === "Cat" ? "Puspin (Pusang Pinoy)" : "Aspin (Asong Pinoy)"));
      setGender((pet.gender === "female" || pet.gender === "Female" ? "Female" : "Male") as "Male" | "Female");
      
      if (pet.birth_year) {
        setBirthYear(String(pet.birth_year));
      } else if (pet.age) {
        const num = parseInt(pet.age);
        if (!isNaN(num) && num > 0) {
          setBirthYear(String(currentYear - num));
        } else {
          setBirthYear(String(currentYear - 1));
        }
      }

      if (pet.weight_category) {
        const found = WEIGHT_CATEGORIES.find((w) =>
          w.toLowerCase().includes(pet.weight_category.toLowerCase())
        );
        setWeightCategory(found || pet.weight_category);
      } else if (pet.weightKg) {
        if (pet.weightKg < 10) setWeightCategory("Toy / Small (< 10 kg)");
        else if (pet.weightKg <= 25) setWeightCategory("Medium (10 – 25 kg)");
        else setWeightCategory("Large (> 25 kg)");
      }

      setMicrochipNumber(pet.microchip_number || pet.microchip || "");
      setNotes(pet.notes || "");
      setPhotoUrl(pet.photo_url || "");
    }
  }, [pet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet?.id) return;
    if (!petName.trim()) {
      toast.error("Please provide a pet name.");
      return;
    }

    setLoading(true);

    try {
      const defaultAvatar = species === "Cat"
        ? "/assets/cat-profiles/image-removebg-preview (2).png"
        : "/assets/dog-profiles/image-removebg-preview (5).png";
      const resolvedPhotoUrl = (photoUrl && photoUrl.trim() !== "") ? photoUrl.trim() : defaultAvatar;

      const { error } = await supabase
        .from("pets")
        .update({
          name: petName.trim(),
          species,
          breed: breed.trim(),
          gender,
          photo_url: resolvedPhotoUrl,
          birth_year: birthYear ? Number(birthYear) : null,
          weight_category: weightCategory || null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", pet.id);

      if (error) {
        throw error;
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["live_pets_count"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
      queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] });

      toast.success("Pet Updated", {
        description: `${petName}'s profile has been successfully updated.`,
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Pet update error:", err);
      toast.error("Failed to update pet", {
        description: err.message || "An unexpected error occurred while saving changes.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!pet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[95vw] sm:max-w-[580px] md:max-w-[620px] p-5 sm:p-6 rounded-2xl shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-0">
          <DialogHeader className="pb-3 border-b border-border/60 !pr-0 space-y-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <PawIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base font-bold text-foreground truncate">Edit Pet Profile</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate">
                    Modify registration records and biological vitals.
                  </DialogDescription>
                </div>
              </div>

              {/* Action Buttons: Save changes beside X */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs gap-1.5 shrink-0 whitespace-nowrap"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0 border border-border/60"
                  title="Close"
                >
                  <X className="size-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-3 py-3.5 max-h-[68vh] overflow-y-auto pr-1">
            {/* Pet Profile Picture Picker */}
            <div className="p-3 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <PetAvatar
                  photoUrl={photoUrl}
                  species={species}
                  name={petName}
                  size="md"
                />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    Profile Picture
                  </p>
                  <p className="text-xs font-semibold text-foreground">
                    {photoUrl ? "Custom Avatar Selected" : "Default Species Crest"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Used on digital passport, queues & clinic cards
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAvatarPickerOpen(true)}
                className="h-8 px-3 text-xs font-medium rounded-lg gap-1.5 shrink-0 bg-background hover:bg-muted"
              >
                <Camera className="size-3.5 text-primary" />
                <span>{photoUrl ? "Change Photo" : "Choose Photo"}</span>
              </Button>
            </div>

            {/* Pet Name */}
            <div className="grid gap-1">
              <Label htmlFor="edit-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pet Name *
              </Label>
              <Input
                id="edit-name"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Bantay, Muning"
                className="h-8.5 text-xs rounded-lg"
                required
              />
            </div>

            {/* Species & Gender (Locked Municipal Biological Records) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Species
                  </Label>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Lock className="size-2.5" /> Locked
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={species === "Cat" ? "🐱 Cat (Feline)" : "🐶 Dog (Canine)"}
                    readOnly
                    disabled
                    className="h-8.5 text-xs rounded-lg bg-muted/60 text-muted-foreground cursor-not-allowed select-none pr-8 font-medium"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                    <Lock className="size-3" />
                  </div>
                </div>
              </div>

              <div className="grid gap-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Gender
                  </Label>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Lock className="size-2.5" /> Locked
                  </span>
                </div>
                <div className="relative">
                  <Input
                    value={gender === "Female" ? "Female ♀" : "Male ♂"}
                    readOnly
                    disabled
                    className="h-8.5 text-xs rounded-lg bg-muted/60 text-muted-foreground cursor-not-allowed select-none pr-8 font-medium"
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                    <Lock className="size-3" />
                  </div>
                </div>
              </div>
            </div>

            {/* Breed */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-breed" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Breed *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {species === "Dog" ? "Canine" : "Feline"}
                </span>
              </div>
              <Select value={breed} onValueChange={setBreed}>
                <SelectTrigger id="edit-breed" className="h-8.5 text-xs rounded-lg">
                  <SelectValue placeholder="Select breed" />
                </SelectTrigger>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {(species === "Cat" ? CAT_BREEDS : DOG_BREEDS).map((b) => (
                    <SelectItem key={b} value={b} className="text-xs">
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Birth Year & Weight Category */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="grid gap-1">
                <Label htmlFor="edit-birth-year" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-2.5" /> Birth Year
                </Label>
                <Select value={birthYear} onValueChange={setBirthYear}>
                  <SelectTrigger id="edit-birth-year" className="h-8.5 text-xs rounded-lg">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56 overflow-y-auto">
                    {BIRTH_YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y} ({currentYear - y} yr{currentYear - y === 1 ? "" : "s"} old)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="edit-weight" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Scale className="size-2.5" /> Weight Category
                </Label>
                <Select value={weightCategory} onValueChange={setWeightCategory}>
                  <SelectTrigger id="edit-weight" className="h-8.5 text-xs rounded-lg">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_CATEGORIES.map((w) => (
                      <SelectItem key={w} value={w} className="text-xs">
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Microchip / Municipal Tag (Autogenerated - Non-editable) */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-tag" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <QrCode className="size-2.5 text-primary" /> Microchip / Municipal Tag
                </Label>
                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Autogenerated
                </span>
              </div>
              <div className="relative">
                <Input
                  id="edit-tag"
                  value={microchipNumber || pet?.microchip || pet?.id || "Unassigned"}
                  readOnly
                  disabled
                  className="h-8.5 text-xs font-mono rounded-lg bg-muted/60 text-muted-foreground border-border/70 cursor-not-allowed select-all pr-8"
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                  <Lock className="size-3" />
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground">
                Municipal identifier is permanent and locked to avoid record desynchronization.
              </p>
            </div>

            {/* Notes */}
            <div className="grid gap-1">
              <Label htmlFor="edit-notes" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Color & Identifying Marks
              </Label>
              <Input
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. White & brown spots, wearing blue collar"
                className="h-8.5 text-xs rounded-lg"
              />
            </div>
          </div>
        </form>
      </DialogContent>

      <PetAvatarPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        petId={pet?.id}
        petName={petName}
        species={species}
        breed={breed}
        currentPhotoUrl={photoUrl}
        speciesStrict={true}
        onSelectAvatar={(url) => setPhotoUrl(url)}
      />
    </Dialog>
  );
}
