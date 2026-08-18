"use client";

import Image from "next/image";
import { PawPrint, ShieldCheck } from "lucide-react";
import { LANDING_IMAGES } from "@/lib/constants/images";

export function LandingEmotionalMoment() {
  return (
    <section id="about" className="py-16 md:py-24 lg:py-32 border-t border-border/70 relative overflow-hidden scroll-mt-24">
      {/* Background Ambience */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-14 items-center">
          
          {/* ── LEFT: Editorial Text & Key Companion Care Highlights (lg: 6 cols) ── */}
          <div className="lg:col-span-6 space-y-5 sm:space-y-6 text-left">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
                Lifelong Companion Health
              </p>

              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[40px] leading-[1.12] mb-3 sm:mb-4">
                Connected care for every pet.
              </h2>

              <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                SyncVet keeps your pet&apos;s complete health history organized, verified, and always within reach.
              </p>
            </div>

            {/* Feature Cards to balance the side-by-side layout */}
            <div className="space-y-3 pt-1">
              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <PawPrint className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">Tailored Care Schedules</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
                    Personalized vaccine and wellness tracking from puppyhood to senior years.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3.5 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-xs">
                <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">Verified Clinical Records</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed mt-0.5">
                    Official digital health passports recognized by clinics and vet stations.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Dog & Cat Companion Photography Showcase (lg: 6 cols) ── */}
          <div className="lg:col-span-6 relative">
            {/* Subtle glow accent behind image */}
            <div className="absolute -inset-2 sm:-inset-4 bg-gradient-to-tr from-primary/15 via-orange-500/10 to-transparent rounded-3xl blur-2xl -z-10 opacity-70" />

            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-card shadow-2xl aspect-[4/3] group">
              <Image
                src={LANDING_IMAGES.emotionalMoment}
                alt="Dog and cat companion pets resting peacefully together in warm sunlight"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-1000 group-hover:scale-103"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

              {/* Floating Caption Badge at bottom */}
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-5 bg-background/90 backdrop-blur-md border border-border/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center gap-3">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                    Committed to every companion
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed truncate">
                    From routine vaccines to lifelong wellness tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
