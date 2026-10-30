"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Check, Sparkles, X, Loader2, RefreshCw } from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PET_CAT_AVATARS,
  PET_DOG_AVATARS,
  ALL_PET_AVATARS,
  PetAvatarOption,
} from "@/lib/pet-avatars";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { PetAvatar } from "./pet-avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PetAvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  petId?: string;
  petName?: string;
  species?: "Dog" | "Cat" | string;
  breed?: string;
  currentPhotoUrl?: string | null;
  speciesStrict?: boolean;
  onSelectAvatar?: (url: string) => void;
}

export function PetAvatarPickerDialog({
  open,
  onOpenChange,
  petId,
  petName = "your pet",
  species = "Dog",
  breed = "",
  currentPhotoUrl,
  speciesStrict = true,
  onSelectAvatar,
}: PetAvatarPickerDialogProps) {
  const isInitialCat = species?.toLowerCase() === "cat";
  const [activeTab, setActiveTab] = useState<string>(isInitialCat ? "cats" : "dogs");
  const [selectedUrl, setSelectedUrl] = useState<string>(currentPhotoUrl || "");
  const [saving, setSaving] = useState(false);

  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  // Reset selected state when dialog opens or currentPhotoUrl changes
  useEffect(() => {
    if (open) {
      setSelectedUrl(currentPhotoUrl || "");
      setActiveTab(isInitialCat ? "cats" : "dogs");
    }
  }, [open, currentPhotoUrl, isInitialCat]);

  const filteredAvatars = useMemo(() => {
    if (speciesStrict) {
      // If speciesStrict is active, only allow avatars matching the pet's species!
      return isInitialCat ? PET_CAT_AVATARS : PET_DOG_AVATARS;
    }
    if (activeTab === "dogs") {
      return PET_DOG_AVATARS;
    }
    if (activeTab === "cats") {
      return PET_CAT_AVATARS;
    }
    if (activeTab === "illustrated") {
      return ALL_PET_AVATARS.filter((a) => a.category === "illustrated");
    }
    return ALL_PET_AVATARS;
  }, [speciesStrict, isInitialCat, activeTab]);

  const handleSave = async () => {
    if (!selectedUrl) {
      toast.error("Please select a profile picture.");
      return;
    }

    // If callback provided (e.g. from register or edit dialog form)
    if (onSelectAvatar) {
      onSelectAvatar(selectedUrl);
    }

    // If petId provided, persist directly to Supabase
    if (petId) {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("pets")
          .update({
            photo_url: selectedUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", petId);

        if (error) {
          throw error;
        }

        // Invalidate queries so dashboard, registry & drawers update immediately
        queryClient.invalidateQueries({ queryKey: ["owner-pets"] });
        queryClient.invalidateQueries({ queryKey: ["pets_registry"] });
        queryClient.invalidateQueries({ queryKey: ["supabase-owners-pets"] });
        queryClient.invalidateQueries({ queryKey: ["chat-user-pets"] });

        toast.success("Profile Picture Updated!", {
          description: `${petName}'s digital passport avatar has been saved.`,
        });

        onOpenChange(false);
      } catch (err: any) {
        console.error("Failed to update pet avatar:", err);
        toast.error("Failed to update photo", {
          description: err.message || "An unexpected error occurred while saving.",
        });
      } finally {
        setSaving(false);
      }
    } else {
      // Just close dialog if standalone callback
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header with clean gradient accent */}
        <div className="p-5 pb-4 border-b border-border/60 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent relative">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold">
              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <PawIcon className="size-4.5 text-primary" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                Choose Profile Picture
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Select a photo for <span className="font-semibold text-foreground">{petName}</span>. This will be visible on their official digital passport, queue card, and health records.
            </DialogDescription>
          </DialogHeader>

          {/* Species Category Filter Tabs */}
          <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
            {speciesStrict ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                  {isInitialCat ? "Feline Profiles Only" : "Canine Profiles Only"} ({filteredAvatars.length} available)
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Filtered to match registered species
                </span>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-4 h-9 bg-muted/60 p-1 rounded-xl">
                  <TabsTrigger value="dogs" className="text-xs font-semibold rounded-lg">
                    🐶 Dogs ({PET_DOG_AVATARS.length})
                  </TabsTrigger>
                  <TabsTrigger value="cats" className="text-xs font-semibold rounded-lg">
                    🐱 Cats ({PET_CAT_AVATARS.length})
                  </TabsTrigger>
                  <TabsTrigger value="illustrated" className="text-xs font-semibold rounded-lg">
                    ✨ Stylized
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs font-semibold rounded-lg">
                    All ({ALL_PET_AVATARS.length})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {selectedUrl && (
              <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                <Sparkles className="size-3 text-amber-500" />
                1 avatar selected
              </span>
            )}
          </div>
        </div>

        {/* Avatar Selection Grid with Live Preview Banner */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Live Passport Preview Strip */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <PetAvatar
                photoUrl={selectedUrl}
                species={species}
                name={petName}
                size="md"
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Card Preview
                </p>
                <p className="text-sm font-bold text-foreground truncate">{petName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {breed || species} • Digital Passport
                </p>
              </div>
            </div>

            {selectedUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUrl("")}
                className="text-xs text-muted-foreground hover:text-foreground h-8"
              >
                <RefreshCw className="size-3 mr-1" />
                Reset
              </Button>
            )}
          </div>

          {/* Grid of Avatars */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
            {filteredAvatars.map((avatar) => {
              const isSelected = selectedUrl === avatar.url;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => setSelectedUrl(avatar.url)}
                  className={cn(
                    "relative group flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isSelected
                      ? "border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/40 scale-[1.03]"
                      : "border-border/60 bg-card hover:bg-accent/40 hover:border-border hover:scale-[1.02]"
                  )}
                >
                  {/* Selection Badge */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 z-10 size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-50 duration-200">
                      <Check className="size-3 stroke-[3]" />
                    </div>
                  )}

                  {/* Avatar Image Frame */}
                  <div className="relative size-18 sm:size-20 flex items-center justify-center p-1">
                    <PetAvatar
                      photoUrl={avatar.url}
                      species={avatar.species}
                      name={avatar.label}
                      size="lg"
                    />
                  </div>

                  {/* Caption */}
                  <span
                    className={cn(
                      "mt-1.5 text-[10.5px] font-medium text-center truncate w-full px-0.5",
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

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-xs rounded-xl"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !selectedUrl}
            className="text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="size-3.5" />
                Apply Photo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
