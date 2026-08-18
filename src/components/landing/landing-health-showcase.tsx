"use client";

import Image from "next/image";
import {
  PawPrint,
  QrCode,
  ShieldCheck,
  Syringe,
  CheckCircle2,
  FileCheck2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LANDING_IMAGES } from "@/lib/constants/images";

export function LandingHealthShowcase() {
  return (
    <section id="health-records" className="py-16 md:py-24 lg:py-32 border-t border-border/70 relative overflow-hidden scroll-mt-24">
      {/* Background Ambience */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[450px] h-[450px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 lg:gap-16 items-center">
          
          {/* ── LEFT: High-Quality Veterinary Photography (md: 6 cols) ── */}
          <div className="md:col-span-6 relative">
            <div className="relative rounded-3xl overflow-hidden border border-border/80 bg-card shadow-lg aspect-[4/3] group">
              <Image
                src={LANDING_IMAGES.vetCareMoment}
                alt="Compassionate veterinarian examining companion pet in a bright modern veterinary clinic"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              {/* Verified Clinical Partner Overlay Badge */}
              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 right-3 sm:right-auto bg-background/90 backdrop-blur-md border border-border/80 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-md flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">City Vet Network</p>
                  <p className="text-[10px] text-muted-foreground">Certified clinic integration</p>
                </div>
              </div>
            </div>

            {/* Overlapping Quick-Stats Card */}
            <div className="hidden lg:flex absolute -bottom-6 -right-6 bg-card border border-border/90 rounded-2xl p-4 shadow-xl items-center gap-3.5 animate-float-delayed">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck2 className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">100% Traceable</p>
                <p className="text-[11px] text-muted-foreground">Verified lot & expiration</p>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Editorial Copy & Realistic SyncVet Health Interface (md: 6 cols) ── */}
          <div className="md:col-span-6 space-y-5 sm:space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
                Pet Health & Passports
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[40px] leading-[1.12] mb-3 sm:mb-4">
                Pet health at a glance.
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Access verified immunization records, clinical notes, and digital health passports anytime.
              </p>
            </div>

            {/* Realistic SyncVet Pet Health Passport Interface Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-border/90 bg-card p-4.5 sm:p-6 shadow-md space-y-4 sm:space-y-5">
              
              {/* Pet Info Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <div className="relative size-10 sm:size-12 rounded-xl overflow-hidden border border-border shrink-0">
                    <Image
                      src={LANDING_IMAGES.petBantay}
                      alt="Bantay avatar"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-foreground">Bantay</h4>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        Vaccinated
                      </Badge>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground font-mono">ID: CDO-2026-00142 • Lapasan District</p>
                  </div>
                </div>

                <div className="size-9 sm:size-10 rounded-xl border border-border bg-muted/30 p-1 flex items-center justify-center shrink-0">
                  <QrCode className="size-full text-foreground" />
                </div>
              </div>

              {/* Clinical Verification Rows */}
              <div className="space-y-2 sm:space-y-2.5">
                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">Anti-Rabies Immunization</p>
                      <p className="text-[10px] sm:text-[11px] font-mono text-muted-foreground truncate">Lot: AR-Q3-2026-014 • Dr. Elena Santos</p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                    Valid to 2027
                  </span>
                </div>

                <div className="p-3 sm:p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Syringe className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">DHPP 5-in-1 Canine Core</p>
                      <p className="text-[10px] sm:text-[11px] font-mono text-muted-foreground truncate">Lot: DH-Q2-2026-008 • Dr. Sarah Chen</p>
                    </div>
                  </div>
                  <span className="text-[11px] sm:text-xs font-medium text-muted-foreground shrink-0">
                    Valid to Aug 2026
                  </span>
                </div>
              </div>

              {/* Bottom Feature Highlights */}
              <div className="pt-2 flex flex-wrap items-center gap-y-1.5 gap-x-4 sm:gap-x-5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  <span>Digital QR Passport</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  <span>Microchip Linking</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                  <span>Official PDF Export</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
