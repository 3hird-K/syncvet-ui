"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, Loader2, Search, Check, ChevronsUpDown, User, PawPrint, ShieldCheck, Scale, Calendar, QrCode } from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole, type SupabaseUser } from "@/data/syncvet-users";
import { useCVO } from "@/lib/cvo-context";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string | null | undefined, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export const DOG_BREEDS = [
  "Aspin (Asong Pinoy)",
  "Shih Tzu",
  "Pomeranian",
  "Golden Retriever",
  "Labrador Retriever",
  "Siberian Husky",
  "German Shepherd",
  "Poodle",
  "Beagle",
  "Chihuahua",
  "Pug",
  "French Bulldog",
  "Rottweiler",
  "Belgian Malinois",
  "Chow Chow",
  "Dachshund",
  "Doberman Pinscher",
  "American Bully",
  "Pitbull",
  "Jack Russell Terrier",
  "Corgi",
  "Samoyed",
  "Boxer",
  "Dalmatian",
  "Great Dane",
  "Mixed Breed (Canine)",
  "Other Dog Breed",
] as const;

export const CAT_BREEDS = [
  "Puspin (Pusang Pinoy)",
  "Domestic Short Hair",
  "Persian",
  "Siamese",
  "British Shorthair",
  "Maine Coon",
  "Ragdoll",
  "Bengal",
  "Scottish Fold",
  "American Shorthair",
  "Russian Blue",
  "Sphynx",
  "Abyssinian",
  "Birman",
  "Burmese",
  "Mixed Breed (Feline)",
  "Other Cat Breed",
] as const;

export const WEIGHT_CATEGORIES = [
  "Toy / Small (< 10 kg)",
  "Medium (10 – 25 kg)",
  "Large (> 25 kg)",
  "Giant (> 45 kg)",
] as const;

const currentYear = new Date().getFullYear();
const BIRTH_YEARS = Array.from({ length: 16 }, (_, i) => currentYear - i);

export function RegisterPetDialog({
  trigger,
  defaultOwnerId,
}: {
  trigger?: React.ReactNode;
  defaultOwnerId?: string;
} = {}) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { addAuditLog } = useCVO();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Fetch current user database profile to check role
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const userRole = normalizeSyncVetRole(dbUser?.role);
  const isPetOwner = userRole === "Pet Owner" || (!userRole && !defaultOwnerId) || !!defaultOwnerId;

  // Form states based on database.types.ts `pets` table
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState<"Dog" | "Cat">("Dog");
  const [breed, setBreed] = useState<string>("Aspin (Asong Pinoy)");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [birthYear, setBirthYear] = useState<string>(String(currentYear - 1));
  const [weightCategory, setWeightCategory] = useState<string>("Medium (10 – 25 kg)");
  const [isSpayedNeutered, setIsSpayedNeutered] = useState(false);
  const [rabiesVaccinated, setRabiesVaccinated] = useState(true);
  const [microchipNumber, setMicrochipNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Pet Owner selection for Admin/Staff only
  const [selectedOwner, setSelectedOwner] = useState<SupabaseUser | null>(null);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);

  // Fetch users only if user is staff/admin needing to pick an owner
  const { data: dbUsers = [], isLoading: isLoadingUsers } = useQuery<SupabaseUser[]>({
    queryKey: ["supabase-pet-owners-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) return [];
      return data || [];
    },
    enabled: !isPetOwner,
    staleTime: 30000,
  });

  const petOwners = useMemo(() => {
    return dbUsers.filter((u) => normalizeSyncVetRole(u.role) === "Pet Owner");
  }, [dbUsers]);

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    if (!q) return petOwners;
    return petOwners.filter((u) => {
      const name = (u.full_name || `${u.first_name || ""} ${u.last_name || ""}`).toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone_number || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [petOwners, ownerSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) {
      toast.error("Please provide a pet name.");
      return;
    }

    // Determine target owner: default to logged-in user, defaultOwnerId, or selectedOwner
    const targetOwnerId = defaultOwnerId || (isPetOwner ? user?.id : selectedOwner?.id || user?.id);
    if (!targetOwnerId) {
      toast.error("Owner identity not found. Please log in or select an owner.");
      return;
    }

    setLoading(true);

    try {
      const finalMicrochip =
        microchipNumber.trim() || `pet-${Date.now().toString().slice(-9)}`;

      // Insert directly into Supabase `pets` table adhering strictly to database.types.ts
      const { data: insertedPet, error } = await supabase
        .from("pets")
        .insert({
          name: petName.trim(),
          species,
          breed: breed.trim() || (species === "Cat" ? "Puspin" : "Aspin"),
          gender,
          birth_year: birthYear ? Number(birthYear) : null,
          weight_category: weightCategory || null,
          is_spayed_neutered: isSpayedNeutered,
          rabies_vaccinated: rabiesVaccinated,
          is_vaccinated: rabiesVaccinated,
          microchip_number: finalMicrochip,
          notes: notes.trim() || null,
          owner_id: targetOwnerId,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Invalidate relevant queries so the pet portal & tables refresh live
      queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
      queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
      queryClient.invalidateQueries({ queryKey: ["live_pets_count"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
      queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] });

      // Add audit log
      addAuditLog({
        user: user?.fullName || "Pet Owner",
        role: (userRole as any) || "Pet Owner",
        action: "Registered Animal into CVO Database",
        entity: "Pet Registry",
        recordId: insertedPet?.id || "NEW-PET",
        details: `Registered ${petName} (${species} • ${breed}), Tag: ${finalMicrochip}. Digital QR Passport issued.`,
      });

      toast.success("Pet Successfully Registered", {
        description: `${petName} has been registered with tag ${finalMicrochip} and an active digital passport.`,
      });

      // Reset form
      setPetName("");
      setSpecies("Dog");
      setBreed("Aspin (Asong Pinoy)");
      setGender("Male");
      setBirthYear(String(currentYear - 1));
      setWeightCategory("Medium (10 – 25 kg)");
      setIsSpayedNeutered(false);
      setRabiesVaccinated(true);
      setMicrochipNumber("");
      setNotes("");
      setSelectedOwner(null);
      setOpen(false);
    } catch (err: any) {
      console.error("Pet registration error:", err);
      toast.error("Failed to register animal", {
        description: err.message || "An unexpected error occurred while saving to database.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-2 text-xs cursor-pointer rounded-xl">
            <Plus className="size-3.5" /> Register Pet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px] p-5 rounded-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="pb-2 border-b border-border/50">
            <div className="flex items-center gap-2 text-primary">
              <PawIcon className="size-5" />
              <DialogTitle className="text-lg font-bold">Register Pet</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official registration for municipal digital passport and anti-rabies immunity records.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3.5 max-h-[68vh] overflow-y-auto pr-1">
            {/* Pet Name */}
            <div className="grid gap-1">
              <Label htmlFor="pet-name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Pet Name *
              </Label>
              <Input
                id="pet-name"
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="e.g. Bantay, Muning, Bella"
                className="h-8.5 text-xs rounded-lg"
                required
              />
            </div>

            {/* Species & Gender */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="grid gap-1">
                <Label htmlFor="pet-species" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Species *
                </Label>
                <Select
                  value={species}
                  onValueChange={(val: "Dog" | "Cat") => {
                    setSpecies(val);
                    if (val === "Cat") {
                      setBreed("Puspin (Pusang Pinoy)");
                    } else {
                      setBreed("Aspin (Asong Pinoy)");
                    }
                  }}
                >
                  <SelectTrigger id="pet-species" className="h-8.5 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">🐶 Dog (Canine)</SelectItem>
                    <SelectItem value="Cat">🐱 Cat (Feline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="pet-gender" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Gender
                </Label>
                <Select value={gender} onValueChange={(val: "Male" | "Female") => setGender(val)}>
                  <SelectTrigger id="pet-gender" className="h-8.5 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Breed */}
            <div className="grid gap-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="pet-breed" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Breed *
                </Label>
                <span className="text-[10px] text-muted-foreground">
                  {species === "Dog" ? "Canine" : "Feline"}
                </span>
              </div>
              <Select value={breed} onValueChange={setBreed}>
                <SelectTrigger id="pet-breed" className="h-8.5 text-xs rounded-lg">
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

            {/* Birth Year & Weight Category (from database.types.ts) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="grid gap-1">
                <Label htmlFor="pet-birth-year" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-2.5" /> Birth Year
                </Label>
                <Select value={birthYear} onValueChange={setBirthYear}>
                  <SelectTrigger id="pet-birth-year" className="h-8.5 text-xs rounded-lg">
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
                <Label htmlFor="pet-weight" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Scale className="size-2.5" /> Weight Category
                </Label>
                <Select value={weightCategory} onValueChange={setWeightCategory}>
                  <SelectTrigger id="pet-weight" className="h-8.5 text-xs rounded-lg">
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

            {/* Health & Immunity Toggles (from database.types.ts: is_spayed_neutered, rabies_vaccinated) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRabiesVaccinated((v) => !v)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                  rabiesVaccinated
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 shadow-2xs"
                    : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <div className="min-w-0 pr-1">
                  <span className="text-[11px] font-bold block flex items-center gap-1">
                    <ShieldCheck className="size-3 shrink-0" /> Rabies Vaccinated
                  </span>
                  <span className="text-[9px] text-muted-foreground block truncate">
                    {rabiesVaccinated ? "Immunity Certified" : "Schedule Due"}
                  </span>
                </div>
                <div className={cn(
                  "size-4 rounded-full flex items-center justify-center shrink-0 border",
                  rabiesVaccinated ? "bg-emerald-500 text-white border-emerald-600" : "border-border"
                )}>
                  {rabiesVaccinated && <Check className="size-2.5" />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsSpayedNeutered((v) => !v)}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all",
                  isSpayedNeutered
                    ? "bg-primary/10 border-primary/30 text-primary shadow-2xs"
                    : "bg-muted/30 border-border/60 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <div className="min-w-0 pr-1">
                  <span className="text-[11px] font-bold block">Spayed / Neutered</span>
                  <span className="text-[9px] text-muted-foreground block truncate">
                    {isSpayedNeutered ? "Kapon Procedure Complete" : "Intact"}
                  </span>
                </div>
                <div className={cn(
                  "size-4 rounded-full flex items-center justify-center shrink-0 border",
                  isSpayedNeutered ? "bg-primary text-white border-primary" : "border-border"
                )}>
                  {isSpayedNeutered && <Check className="size-2.5" />}
                </div>
              </button>
            </div>

            {/* Optional Microchip / Tag ID (from database.types.ts: microchip_number) */}
            <div className="grid gap-1">
              <Label htmlFor="pet-tag" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <QrCode className="size-2.5" /> Microchip / Municipal Tag (Optional)
              </Label>
              <Input
                id="pet-tag"
                value={microchipNumber}
                onChange={(e) => setMicrochipNumber(e.target.value)}
                placeholder="Leave blank to auto-generate CVO Tag ID"
                className="h-8.5 text-xs font-mono rounded-lg"
              />
            </div>

            {/* Optional Notes (from database.types.ts: notes) */}
            <div className="grid gap-1">
              <Label htmlFor="pet-notes" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Color & Identifying Marks (Optional)
              </Label>
              <Input
                id="pet-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. White & brown spots, wearing red collar"
                className="h-8.5 text-xs rounded-lg"
              />
            </div>

            {/* Staff-only Owner Selection: Only rendered if current user is not a pet owner and no defaultOwnerId */}
            {!isPetOwner && (
              <div className="grid gap-1 pt-1 border-t border-border/40">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Registered Pet Owner *
                </Label>
                <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full h-9 justify-between px-3 text-xs rounded-lg font-normal"
                    >
                      {selectedOwner ? (
                        <span className="font-semibold text-foreground truncate">
                          {selectedOwner.full_name || selectedOwner.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Select registered owner...</span>
                      )}
                      <ChevronsUpDown className="size-3 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[380px] p-0" align="start">
                    <div className="p-2 border-b border-border">
                      <div className="flex items-center gap-2 px-2 py-1 rounded border bg-background">
                        <Search className="size-3 text-muted-foreground" />
                        <input
                          type="text"
                          value={ownerSearch}
                          onChange={(e) => setOwnerSearch(e.target.value)}
                          placeholder="Search owner..."
                          className="w-full bg-transparent text-xs outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {filteredOwners.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwner(u);
                            setOwnerPopoverOpen(false);
                          }}
                          className="w-full text-left p-1.5 rounded hover:bg-muted text-xs flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{u.full_name || u.email}</span>
                          {selectedOwner?.id === u.id && <Check className="size-3.5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border/50">
            <Button
              type="submit"
              disabled={loading || (!isPetOwner && !selectedOwner && !defaultOwnerId)}
              className="w-full cursor-pointer h-9 text-xs font-bold rounded-xl"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Registering Pet...
                </>
              ) : (
                "Complete Registration & Issue Passport"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
