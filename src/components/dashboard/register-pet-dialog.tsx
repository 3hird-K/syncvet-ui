"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, Loader2, Search, Check, ClipboardCheck, ChevronsUpDown, User, PawPrint, Scale, Calendar, Camera, ImageIcon, X } from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import { PetAvatar } from "./pet-avatar";
import { PET_DOG_AVATARS, PET_CAT_AVATARS, getDefaultPetAvatar } from "@/lib/pet-avatars";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
  const [photoUrl, setPhotoUrl] = useState<string>(PET_DOG_AVATARS[0].url);
  const [showAvatarPickerPanel, setShowAvatarPickerPanel] = useState(false);
  const availableSpeciesAvatars = species === "Cat" ? PET_CAT_AVATARS : PET_DOG_AVATARS;
  const [breed, setBreed] = useState<string>("Aspin (Asong Pinoy)");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [birthYear, setBirthYear] = useState<string>(String(currentYear - 1));
  const [weightCategory, setWeightCategory] = useState<string>("Medium (10 – 25 kg)");
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
      const finalMicrochip = `pet-${Date.now().toString().slice(-9)}`;

      // Put the pet avatar URL directly if not specified (for cats: Persian Whiskers default)
      const defaultAvatar = species === "Cat"
        ? (PET_CAT_AVATARS[0]?.url || "/assets/cat-profiles/image-removebg-preview (2).png")
        : (PET_DOG_AVATARS[0]?.url || "/assets/dog-profiles/image-removebg-preview (5).png");
      const resolvedPhotoUrl = (photoUrl && photoUrl.trim() !== "") ? photoUrl.trim() : defaultAvatar;

      // Insert directly into Supabase `pets` table adhering strictly to database.types.ts
      const { data: insertedPet, error } = await supabase
        .from("pets")
        .insert({
          name: petName.trim(),
          species,
          breed: breed.trim() || (species === "Cat" ? "Puspin" : "Aspin"),
          gender,
          photo_url: resolvedPhotoUrl,
          birth_year: birthYear ? Number(birthYear) : null,
          weight_category: weightCategory || null,
          is_spayed_neutered: false,
          rabies_vaccinated: false,
          is_vaccinated: false,
          vaccination_doses: 0,
          last_vaccination_date: null,
          next_vaccination_date: null,
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
      setPhotoUrl(PET_DOG_AVATARS[0].url);
      setSpecies("Dog");
      setBreed("Aspin (Asong Pinoy)");
      setGender("Male");
      setBirthYear(String(currentYear - 1));
      setWeightCategory("Medium (10 – 25 kg)");
      setNotes("");
      setSelectedOwner(null);
      setShowAvatarPickerPanel(false);
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setShowAvatarPickerPanel(false);
      }}
    >
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button size="sm" className="gap-2 text-xs cursor-pointer rounded-xl">
            <Plus className="size-3.5" /> Register Pet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "w-[95vw] p-0 bg-transparent border-0 shadow-none max-h-[92vh] flex flex-col transition-all duration-300 ease-in-out",
          showAvatarPickerPanel
            ? "sm:max-w-4xl md:max-w-5xl"
            : "sm:max-w-[620px] md:max-w-[660px]"
        )}
      >
        <div className="flex items-stretch gap-2.5 sm:gap-3.5 w-full max-h-[90vh] flex-1 overflow-hidden">
          {/* Left Side: Register Pet Form Card */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto min-w-0 rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl p-5 sm:p-6 relative">
            <form id="register-pet-form" onSubmit={handleSubmit} className="space-y-4">
              {/* Top Action Buttons: Complete Registration & Close */}
              <div className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={loading || !petName.trim() || (!isPetOwner && !selectedOwner && !defaultOwnerId)}
                  className="h-8 px-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer border border-emerald-600/30 flex items-center gap-1.5 text-xs font-semibold"
                  title="Complete Registration & Issue Passport"
                  aria-label="Register Pet"
                >
                  {loading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ClipboardCheck className="size-3.5" />
                  )}
                  <span>Register Pet</span>
                </button>

                <DialogClose asChild>
                  <button
                    type="button"
                    className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
                    title="Close"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogClose>
              </div>

              <DialogHeader className="pb-2.5 border-b border-border/60 pr-36 sm:pr-40">
                <div className="flex items-center gap-2 text-primary">
                  <PawIcon className="size-5" />
                  <DialogTitle className="text-lg font-bold">Register Pet</DialogTitle>
                </div>
                <DialogDescription className="text-xs text-muted-foreground">
                  Official registration for municipal digital passport and anti-rabies immunity records.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3.5 py-1">
                {/* Pet Profile Picture Picker */}
                <div className="p-3 rounded-xl border border-border/70 bg-muted/30 flex items-center justify-between gap-3">
                  <div
                    onClick={() => setShowAvatarPickerPanel((prev) => !prev)}
                    className="flex items-center gap-3 cursor-pointer group"
                    title="Click to toggle avatar selection"
                  >
                    <div className="relative">
                      <PetAvatar
                        photoUrl={photoUrl}
                        species={species}
                        name={petName}
                        size="md"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                        Profile Picture (Optional)
                      </p>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {photoUrl ? "Custom Avatar Chosen" : "Default Species Avatar"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Choose from official SyncVet pet avatars
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAvatarPickerPanel((prev) => !prev)}
                    className={cn(
                      "size-8 rounded-full border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-xs active:scale-95",
                      showAvatarPickerPanel
                        ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                        : "bg-background hover:bg-muted text-foreground border-border/80 hover:border-primary/50"
                    )}
                    title={showAvatarPickerPanel ? "Close photo panel" : "Choose Profile Picture"}
                  >
                    <ImageIcon className="size-4" />
                    <span className="sr-only">Choose Profile Picture</span>
                  </button>
                </div>

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
                      // Automatically switch to feline avatar
                      if (!photoUrl || PET_DOG_AVATARS.some((d) => d.url === photoUrl)) {
                        setPhotoUrl(PET_CAT_AVATARS[0].url);
                      }
                    } else {
                      setBreed("Aspin (Asong Pinoy)");
                      // Automatically switch to canine avatar
                      if (!photoUrl || PET_CAT_AVATARS.some((c) => c.url === photoUrl)) {
                        setPhotoUrl(PET_DOG_AVATARS[0].url);
                      }
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
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <Avatar className="size-5.5 border border-primary/20 shrink-0">
                            {selectedOwner.avatar_url && (
                              <AvatarImage src={selectedOwner.avatar_url} alt={selectedOwner.full_name || ""} />
                            )}
                            <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                              {getInitials(selectedOwner.full_name, selectedOwner.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-foreground truncate">
                            {selectedOwner.full_name || selectedOwner.email}
                          </span>
                          {selectedOwner.address && (
                            <span className="text-[10px] text-muted-foreground truncate">
                              ({selectedOwner.address})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select registered owner...</span>
                      )}
                      <ChevronsUpDown className="size-3 opacity-50 shrink-0 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[340px] max-w-[90vw] p-0" align="start">
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
                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                      {filteredOwners.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedOwner(u);
                            setOwnerPopoverOpen(false);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted text-xs flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="size-7 border border-border/80 shrink-0">
                              {u.avatar_url && (
                                <AvatarImage src={u.avatar_url} alt={u.full_name || ""} />
                              )}
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {getInitials(u.full_name, u.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-left min-w-0">
                              <span className="font-semibold text-foreground text-xs leading-tight truncate">
                                {u.full_name || u.email}
                              </span>
                              <span className="text-[11px] text-muted-foreground leading-tight truncate">
                                {u.email}
                                {u.address ? ` • ${u.address}` : ""}
                              </span>
                            </div>
                          </div>
                          {selectedOwner?.id === u.id && <Check className="size-3.5 text-primary shrink-0 ml-2" />}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

            </form>
          </div>

          {/* Right Side: Expanded Pet Avatar Selector Panel (Strictly matching species, 4 Columns) */}
          {showAvatarPickerPanel && (
            <div className="w-[330px] sm:w-[380px] md:w-[410px] rounded-2xl sm:rounded-3xl border border-border/80 bg-background shadow-2xl flex flex-col h-full min-h-0 shrink-0 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-right-8 duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]">
              {/* Panel Header */}
              <div className="p-3.5 px-4 border-b border-border/70 flex items-center justify-between bg-muted/40 shrink-0">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ImageIcon className="size-3.5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground truncate">
                      Choose Photo
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {species === "Cat" ? "Feline Profiles Only" : "Canine Profiles Only"} • {petName.trim() || "New Pet"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPickerPanel(false)}
                  className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 flex items-center justify-center cursor-pointer transition-colors"
                  title="Close photo selector"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Avatars Grid (4 Columns, Smooth Scrolling) */}
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 max-h-[calc(90vh-70px)]">
                <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 flex items-center justify-between text-xs">
                  <span className="text-[10.5px] font-medium text-muted-foreground">
                    {species === "Cat" ? "Cats only choose cat profiles" : "Dogs only choose dog profiles"}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10">
                    {availableSpeciesAvatars.length} Avatars
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-1">
                  {availableSpeciesAvatars.map((avatar) => {
                    const isSelected = photoUrl === avatar.url;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => setPhotoUrl(avatar.url)}
                        className={cn(
                          "relative group flex flex-col items-center justify-between p-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-left focus:outline-none",
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/40 shadow-xs scale-[1.02]"
                            : "border-border/60 bg-muted/20 hover:bg-accent/40 hover:border-border hover:scale-[1.03]"
                        )}
                        title={`Select ${avatar.label}`}
                      >
                        {isSelected && (
                          <div className="absolute top-1 right-1 z-10 size-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                        <div className="size-12 sm:size-13 flex items-center justify-center p-0.5">
                          <PetAvatar
                            photoUrl={avatar.url}
                            species={species}
                            name={avatar.label}
                            size="sm"
                          />
                        </div>
                        <span
                          className={cn(
                            "mt-1 text-[8.5px] sm:text-[9px] font-medium text-center truncate w-full px-0.5 leading-tight",
                            isSelected ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-muted-foreground"
                          )}
                        >
                          {avatar.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
