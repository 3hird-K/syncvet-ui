"use client";

import React from "react";
import { QrCode, Scale, ShieldCheck, AlertTriangle, ChevronDown, PawPrint } from "lucide-react";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { getPetVaccinationStatus } from "@/lib/vaccination-rules";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface PetPassportHeroCardProps {
  pet: any;
  allPets?: any[];
  onSelectPet?: (petId: string) => void;
  className?: string;
  showSelector?: boolean;
}

export function PetPassportHeroCard({
  pet,
  allPets = [],
  onSelectPet,
  className,
  showSelector = true,
}: PetPassportHeroCardProps) {
  if (!pet) return null;

  const isCat = (pet.species || "").toLowerCase() === "cat";
  const cdoPassportId =
    pet.microchip && !pet.microchip.startsWith("pet-")
      ? pet.microchip
      : `CDO-${isCat ? "FEL" : "CAN"}-${
          String(pet.id || "").replace(/\D/g, "").slice(-4) ||
          String(pet.id || "").slice(0, 5).toUpperCase()
        }`;

  const weight =
    pet.weightKg ||
    pet.weight_kg ||
    (pet.weight ? `${pet.weight}` : null);

  const ageDisplay =
    pet.age ||
    (pet.ageYears
      ? `${pet.ageYears} yrs`
      : pet.birthDate
      ? `${Math.max(1, new Date().getFullYear() - new Date(pet.birthDate).getFullYear())} yrs`
      : null);

  const genderDisplay =
    pet.gender === "Female"
      ? "Female ♀"
      : pet.gender === "Male"
      ? "Male ♂"
      : pet.gender || "Unspecified";

  const isNeutered = Boolean(
    pet.isSpayedNeutered ||
      pet.is_spayed_neutered ||
      pet.is_neutered ||
      pet.sterilized
  );

  const vaxStatus = getPetVaccinationStatus(pet);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-white/10 select-none transition-all duration-300",
        isCat
          ? "bg-gradient-to-br from-purple-800 via-indigo-950 to-slate-950"
          : "bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950",
        className
      )}
    >
      {/* Ambient background glow orbs */}
      <div className="absolute -bottom-10 -right-10 size-40 bg-white/[0.05] rounded-full blur-2xl pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.08] rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row: Pet Switcher if multiple pets */}
      {showSelector && allPets.length > 1 && onSelectPet && (
        <div className="flex items-center justify-end relative z-10 mb-3 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-md shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <PawPrint className="size-3 text-white/80" />
                <span>Switch Pet</span>
                <ChevronDown className="size-3 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-[100] rounded-xl p-1 shadow-xl">
              {allPets.map((p) => {
                const isCurrent = String(p.id) === String(pet.id);
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => onSelectPet(p.id)}
                    className={cn(
                      "flex items-center gap-2.5 text-xs py-2 px-2.5 rounded-lg cursor-pointer",
                      isCurrent && "bg-primary/10 font-bold text-primary"
                    )}
                  >
                    <PetAvatar
                      photoUrl={p.photo_url}
                      species={p.species}
                      name={p.name}
                      size="xs"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {p.species} • {p.breed || (p.species === "Cat" ? "Puspin" : "Aspin")}
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Hero Identity: Avatar, Name, Metadata and Badges */}
      <div className="flex items-center gap-3.5 sm:gap-4 relative z-10">
        <PetAvatar
          photoUrl={pet.photo_url}
          species={pet.species}
          name={pet.name}
          size="xl"
          className="shrink-0 ring-2 ring-white/30 shadow-md"
        />

        <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
            {pet.name}
          </h3>

          {/* Species, Breed, Gender, Age, Weight */}
          <p className="text-xs text-white/90 font-medium flex items-center gap-1.5 flex-wrap">
            <span>{pet.breed || (isCat ? "Puspin" : "Aspin")}</span>
            <span className="text-white/40">•</span>
            <span>{genderDisplay}</span>
            {ageDisplay && (
              <>
                <span className="text-white/40">•</span>
                <span>{ageDisplay}</span>
              </>
            )}
            {weight && (
              <>
                <span className="text-white/40">•</span>
                <span className="font-semibold text-white">{weight} kg</span>
              </>
            )}
          </p>

          {/* Real-time Status Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span
              className={cn(
                "text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md inline-flex items-center gap-1",
                vaxStatus.isOverdue
                  ? "bg-rose-600 text-white"
                  : vaxStatus.isDueSoon
                  ? "bg-amber-500 text-black font-bold"
                  : vaxStatus.isVaccinated
                  ? "bg-emerald-500 text-white"
                  : "bg-amber-600 text-white"
              )}
            >
              {vaxStatus.isVaccinated ? (
                <ShieldCheck className="size-3" />
              ) : (
                <AlertTriangle className="size-3" />
              )}
              <span>
                {vaxStatus.isOverdue
                  ? "Rabies Overdue"
                  : vaxStatus.isDueSoon
                  ? `Due Soon (${vaxStatus.daysUntilBooster}d)`
                  : vaxStatus.isVaccinated
                  ? "Rabies Protected"
                  : "Unvaccinated"}
              </span>
            </span>

            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-md border inline-flex items-center gap-1",
                isNeutered
                  ? "bg-cyan-500/20 text-cyan-200 border-cyan-400/30"
                  : "bg-white/10 text-white/90 border-white/20"
              )}
            >
              {isNeutered ? "Neutered/Spayed" : "Intact (Not Sterilized)"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
