"use client";

import React from "react";
import { Camera } from "lucide-react";
import { getPetAvatarUrl } from "@/lib/pet-avatars";
import { cn } from "@/lib/utils";

export type PetAvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

interface PetAvatarProps {
  photoUrl?: string | null;
  species?: "Dog" | "Cat" | string | null;
  name?: string;
  size?: PetAvatarSize;
  showCamera?: boolean;
  onCameraClick?: (e: React.MouseEvent) => void;
  cameraTitle?: string;
  className?: string;
  imageClassName?: string;
}

const SIZE_MAP: Record<
  PetAvatarSize,
  {
    container: string;
    border: string;
    cameraButton: string;
    cameraIcon: string;
    popOutScale: string;
  }
> = {
  xs: {
    container: "size-6", // 24px
    border: "border-[1.5px]",
    cameraButton: "size-3.5 -bottom-0.5 -right-0.5",
    cameraIcon: "size-2",
    popOutScale: "size-[120%] -translate-y-[8%]",
  },
  sm: {
    container: "size-8 sm:size-9", // 32-36px (Table rows)
    border: "border-2",
    cameraButton: "size-4.5 -bottom-0.5 -right-0.5",
    cameraIcon: "size-2.5",
    popOutScale: "size-[122%] -translate-y-[9%]",
  },
  md: {
    container: "size-12 sm:size-13", // 48-52px (Dialog previews, compact cards)
    border: "border-[2.5px]",
    cameraButton: "size-5.5 -bottom-0.5 -right-0.5",
    cameraIcon: "size-3",
    popOutScale: "size-[124%] -translate-y-[10%]",
  },
  lg: {
    container: "size-16 sm:size-18", // 64-72px (Story cards, details sheets)
    border: "border-[3px]",
    cameraButton: "size-6.5 -bottom-1 -right-1",
    cameraIcon: "size-3.5",
    popOutScale: "size-[125%] -translate-y-[11%]",
  },
  xl: {
    container: "size-20 sm:size-22", // 80-88px (Passport Hero modal)
    border: "border-[3.5px]",
    cameraButton: "size-7.5 -bottom-1 -right-1",
    cameraIcon: "size-4",
    popOutScale: "size-[126%] -translate-y-[11%]",
  },
  "2xl": {
    container: "size-24 sm:size-28", // 96-112px
    border: "border-[4px]",
    cameraButton: "size-8.5 -bottom-1 -right-1",
    cameraIcon: "size-4.5",
    popOutScale: "size-[128%] -translate-y-[12%]",
  },
};

export function PetAvatar({
  photoUrl,
  species = "Dog",
  name = "Pet",
  size = "md",
  showCamera = false,
  onCameraClick,
  cameraTitle = "Change profile picture",
  className,
  imageClassName,
}: PetAvatarProps) {
  const resolvedUrl = getPetAvatarUrl(photoUrl, species);
  const sizeConfig = SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none group/avatar",
        sizeConfig.container,
        className
      )}
      title={name}
    >
      {/* 1. Circular Mint/Teal Background Disc */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden shadow-xs transition-colors bg-gradient-to-b from-[#eef9f6] via-[#e2f5f1] to-[#c7ede4] dark:from-teal-950/80 dark:via-teal-900/40 dark:to-teal-950/70"
      >
        <div className="absolute inset-0 bg-radial from-white/40 via-transparent to-teal-900/10 pointer-events-none" />
      </div>

      {/* 2. Layer 1: Bottom half of pet clipped strictly inside the circular frame */}
      <div className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center pointer-events-none z-10">
        <img
          src={resolvedUrl}
          alt=""
          aria-hidden="true"
          className={cn(
            "max-w-none object-contain transition-transform duration-300 group-hover/avatar:scale-105",
            sizeConfig.popOutScale,
            imageClassName
          )}
          loading="lazy"
        />
      </div>

      {/* 3. Solid Teal Circular Border Ring (covers bottom edge so pet is cleanly tucked inside) */}
      <div
        className={cn(
          "absolute inset-0 rounded-full pointer-events-none z-[15]",
          sizeConfig.border,
          "border-teal-700 dark:border-teal-500"
        )}
      />

      {/* 4. Layer 2: Top half of pet that pops out over the top border (clipped at 50% equator) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{ clipPath: "inset(-100% -100% 50% -100%)" }}
      >
        <img
          src={resolvedUrl}
          alt={name}
          className={cn(
            "max-w-none object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.30)] transition-transform duration-300 group-hover/avatar:scale-105",
            sizeConfig.popOutScale,
            imageClassName
          )}
          loading="lazy"
        />
      </div>

      {/* 5. Optional Circular Teal Camera Icon Button */}
      {showCamera && (
        <button
          type="button"
          onClick={onCameraClick}
          className={cn(
            "absolute z-30 rounded-full bg-teal-700 hover:bg-teal-600 active:scale-95 text-white border-2 border-white dark:border-zinc-900 shadow-md flex items-center justify-center transition-all cursor-pointer",
            sizeConfig.cameraButton
          )}
          title={cameraTitle}
        >
          <Camera className={cn("stroke-[2.2]", sizeConfig.cameraIcon)} />
          <span className="sr-only">{cameraTitle}</span>
        </button>
      )}
    </div>
  );
}
