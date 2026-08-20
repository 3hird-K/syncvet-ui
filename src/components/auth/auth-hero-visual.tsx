"use client";

import {
  ShieldCheck,
  QrCode,
  Syringe,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Target,
  Award,
} from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";

export function AuthHeroVisual() {
  return (
    <div className="relative hidden w-full lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/10 via-background to-emerald-950/20 p-10 xl:p-14 border-r border-border/60 select-none">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 size-96 rounded-full bg-emerald-500/10 blur-3xl" />

      {/* Top Header / Agency Brand Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-card/80 p-2 shadow-xs border border-border/80 backdrop-blur-md">
            <Image
              src={Logo}
              alt="SyncVet Logo"
              className="size-full object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-foreground">
                SYNCVET
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                Official Platform
              </span>
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">
              City Veterinary Office of Cagayan de Oro
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-500 border border-emerald-500/20 backdrop-blur-md">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          ML Forecasting Active
        </div>
      </div>

      {/* Center Interactive Visual Composition */}
      <div className="relative z-10 my-auto py-8 space-y-6 max-w-lg">
        {/* Main Headline */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-lg bg-card/60 px-3 py-1 text-xs font-semibold text-foreground/80 border border-border/60 shadow-2xs backdrop-blur-md">
            <PawIcon className="size-3.5 text-primary" />
            <span>Next-Generation Municipal Animal Health</span>
          </div>
          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Digitizing Veterinary Services Through{" "}
            <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
              Data, Care & Innovation.
            </span>
          </h1>
          <p className="text-sm font-medium text-muted-foreground/90 leading-relaxed">
            Connecting pet owners and municipal veterinary teams with QR health passports, automated rabies tracking, and AI-driven vaccine demand forecasting.
          </p>
        </div>

        {/* Dynamic Showcase Floating Cards */}
        <div className="grid gap-3.5 sm:grid-cols-2 pt-2">
          {/* Card 1: QR Pet Digital Passport */}
          <div className="relative rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <QrCode className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">
                    Digital QR Passport
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    CDO-2026-00142
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-500 border border-emerald-500/20">
                Active
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[10px]">
              <span className="text-muted-foreground">Pet: Bantay (Aspin)</span>
              <span className="font-semibold text-foreground flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" /> Rabies Vaxed
              </span>
            </div>
          </div>

          {/* Card 2: ML Demand Forecasting */}
          <div className="relative rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="size-4.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-foreground">
                    Predictive Demand
                  </h2>
                  <p className="text-[10px] text-muted-foreground">
                    80% Confidence Band
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary border border-primary/20">
                +12% MoM
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5 text-[10px]">
              <span className="text-muted-foreground">Forecast Accuracy</span>
              <span className="font-semibold text-emerald-500">87.4% MAPE</span>
            </div>
          </div>

          {/* Card 3: Field Operations Live Status */}
          <div className="relative rounded-2xl border border-border/80 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:border-blue-500/40 hover:shadow-md sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <MapPin className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">
                      Field Mobile Unit A
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      • Barangay Lapasan
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Mass Anti-Rabies Campaign — 98 / 120 pets vaccinated today
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Target className="size-3.5 text-primary" />
                <span>82% Goal</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Trust & Security Badges */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-5 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>256-bit SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Award className="size-4 text-primary" />
            <span>City Veterinary Office Verified</span>
          </div>
        </div>

        <span className="text-[11px] font-mono text-muted-foreground/60">
          SyncVet OS v2.4
        </span>
      </div>
    </div>
  );
}
