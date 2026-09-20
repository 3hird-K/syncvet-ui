"use client";

import Image from "next/image";
import heroBg from "../../../public/hero-bg.jpg";
import Logo from "@/assets/logo-dark.png";
import cdoSeal from "../../../public/partners/cdo-seal.png";
import { CheckCircle2, ShieldCheck } from "lucide-react";

export function AuthHeroVisual() {
  return (
    <div className="relative hidden w-full lg:flex flex-col justify-between overflow-hidden p-10 xl:p-14 select-none min-h-screen">
      {/* ── Background: Real High-Res Photography matching Landing Hero ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src={heroBg}
          alt="Cagayan de Oro City Veterinary Office"
          fill
          priority
          sizes="50vw"
          className="object-cover object-[center_35%]"
        />
        {/* Cinematic dark scrim overlay matching landing page gallery & hero standards */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      </div>

      {/* ── Top Header / Agency Brand Badge ── */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-black/40 p-2 shadow-xs border border-white/20 backdrop-blur-md">
            <Image
              src={Logo}
              alt="SyncVet Logo"
              className="size-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-white leading-none">
                SYNCVET
              </span>
              <span className="rounded-[4px] bg-primary/20 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-widest text-primary-foreground border border-primary/30">
                Official Platform
              </span>
            </div>
            <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/80 leading-none">
              CITY VETERINARY OFFICE · CDO
            </span>
          </div>
        </div>

        {/* Live System Indicator */}
        <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white/90 border border-white/15 backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span>Municipal Portal Online</span>
        </div>
      </div>

      {/* ── Center Editorial Composition ── */}
      <div className="relative z-10 my-auto py-10 space-y-6 max-w-xl text-left">
        {/* Kicker Accent */}
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-primary">
            MUNICIPAL CARE IN ACTION
          </span>
        </div>

        {/* Headline with Serif Italic Accent */}
        <h1 className="text-3xl xl:text-4xl 2xl:text-[2.75rem] font-semibold tracking-tight text-white leading-[1.16]">
          Every companion protected. <br />
          <em className="font-serif font-medium text-primary italic">
            Every barangay connected.
          </em>
        </h1>

        <p className="text-xs sm:text-sm lg:text-[14.5px] leading-relaxed text-white/80 font-normal">
          The official digital animal health registry of the City Government of Cagayan de Oro.
          Connecting companion pet guardians, field vaccination teams, and municipal veterinary clinics under one unified health system.
        </p>

        {/* Testimonial Quote Card matching Landing Gallery Bento Item */}
        <div className="rounded-2xl border border-white/15 bg-black/40 p-5 backdrop-blur-md relative overflow-hidden">
          <span className="font-serif text-3xl text-primary/60 leading-none select-none block mb-1">
            “
          </span>
          <p className="text-xs sm:text-[13.5px] font-medium text-white/95 leading-relaxed">
            We live and serve in every barangay — ensuring no companion animal is left unprotected.
          </p>
          <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white">
                Dr. Helen Ann P. Tacandong
              </p>
              <p className="text-[9.5px] font-semibold text-primary uppercase tracking-widest mt-0.5">
                City Veterinarian · CVO Cagayan de Oro
              </p>
            </div>
            <div className="size-8 rounded-full border border-white/20 bg-white/10 p-1 flex items-center justify-center shrink-0">
              <Image
                src={cdoSeal}
                alt="City Seal of Cagayan de Oro"
                className="size-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Key Municipal Pillars */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <CheckCircle2 className="size-3 text-emerald-400" />
            80 Barangays Covered
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <CheckCircle2 className="size-3 text-emerald-400" />
            3,875+ Protected Pets
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-md">
            <CheckCircle2 className="size-3 text-emerald-400" />
            RA 9482 Anti-Rabies Mandate
          </span>
        </div>
      </div>

      {/* ── Bottom Footer Trust & Security Badges ── */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/75">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Official LGU Health Portal</span>
          </div>
          <span className="text-white/30">•</span>
          <span className="text-[11px] text-white/60">
            Republic of the Philippines
          </span>
        </div>

        <span className="text-[11px] font-mono text-white/50 tracking-wider">
          CVO CDO · v2.4
        </span>
      </div>
    </div>
  );
}
