"use client";

import Image from "next/image";
import authHero from "../../../public/auth-hero.jpg";

export function AuthHeroVisual() {
  return (
    <div className="relative hidden w-full lg:flex lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex-col justify-end overflow-hidden p-10 xl:p-16 select-none min-h-screen">
      {/* ── Background: Ultra-HD Bespoke Veterinary Clinic Photography ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src={authHero}
          alt="Cagayan de Oro City Veterinary Companion Animal Care"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 65vw"
          className="object-cover object-[center_35%]"
        />
        {/* Cinematic dark scrim overlay: keeps subject visible while ensuring text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
      </div>

      {/* ── Architectural Slanted Edge Divider ── */}
      <div className="hidden lg:block absolute top-0 bottom-0 -right-px w-14 xl:w-20 z-20 pointer-events-none text-background">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full fill-current"
        >
          <polygon points="100,0 100,100 0,100" />
          <line
            x1="100"
            y1="0"
            x2="0"
            y2="100"
            stroke="currentColor"
            className="text-border/70"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* ── Clean Editorial Tagline ── */}
      <div className="relative z-10 space-y-3.5 max-w-xl text-left pb-2 pr-4 xl:pr-10">
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary">
            CITY VETERINARY OFFICE · CDO
          </span>
        </div>

        <h1 className="text-3xl xl:text-4xl 2xl:text-[2.65rem] font-semibold tracking-tight text-white leading-[1.16]">
          Every companion protected. <br />
          <em className="font-serif font-medium text-primary italic">
            Every barangay connected.
          </em>
        </h1>

        <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-normal">
          The official digital animal health registry of the City Government of Cagayan de Oro.
        </p>
      </div>
    </div>
  );
}
