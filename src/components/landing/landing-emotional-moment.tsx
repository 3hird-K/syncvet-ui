"use client";

import Image from "next/image";
import { Heart, Sparkles } from "lucide-react";
import { LANDING_IMAGES } from "@/lib/constants/images";

export function LandingEmotionalMoment() {
  return (
    <section id="about" className="py-16 md:py-24 lg:py-32 border-t border-border/70 relative overflow-hidden scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Editorial Text Header */}
        <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-14 md:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-3.5 sm:mb-4">
            <Heart className="size-3.5 fill-primary/20" />
            <span>Lifelong Companion Health</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-3 sm:mb-4">
            Because every pet deserves care <br className="hidden sm:inline" />
            that stays connected.
          </h2>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Beyond records and schedules, SyncVet gives pet families peace of mind knowing their companions’ health history is always organized, validated, and within reach.
          </p>
        </div>

        {/* Expansive, Breathable Hero Photography Centerpiece */}
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-card shadow-xl aspect-[16/10] sm:aspect-[16/9] md:aspect-[21/9] group">
          <Image
            src={LANDING_IMAGES.emotionalMoment}
            alt="Dog and cat companion pets sleeping peacefully together in warm golden afternoon sunlight"
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-cover transition-transform duration-1000 group-hover:scale-102"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

          {/* Minimal, elegant caption badge at bottom corner */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-6 sm:left-6 sm:right-auto max-w-md bg-background/85 backdrop-blur-md border border-border/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
            <p className="text-xs font-bold text-foreground">
              Committed to every companion
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              From routine annual rabies protection to lifelong wellness management for canine and feline companions.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
