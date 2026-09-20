"use client";

import * as React from "react";
import { ArrowUpRight, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { MotionFadeIn } from "./motion-wrapper";

const GOOGLE_MAPS_SEARCH_URL =
  "https://www.google.com/maps/search/?api=1&query=City+Veterinary+Office+Cagayan+de+Oro";

const GOOGLE_MAPS_DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=City+Veterinary+Office+Carmen+Cagayan+de+Oro";

const GOOGLE_MAPS_EMBED_SRC =
  "https://maps.google.com/maps?q=City+Veterinary+Office,+J.V.+Seri%C3%B1a+St,+Carmen,+Cagayan+de+Oro,+Misamis+Oriental&t=&z=16&ie=UTF8&iwloc=&output=embed";

export function LandingMap() {
  return (
    <section
      id="location"
      aria-label="Office Location and Directions"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        {/* ── Section Header (1:1 Twin to Reference Screenshot) ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            {/* Left: Kicker & Headline with Seriffed Italic Accent */}
            <div className="space-y-2 sm:space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary/80" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-primary">
                  OFFICE LOCATION & DIRECTIONS
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-foreground leading-[1.12]">
                Visit our office in{" "}
                <em className="font-serif italic font-medium text-primary">
                  Cagayan de Oro.
                </em>
              </h2>
            </div>

            {/* Right: Get Driving Directions Action Button */}
            <div className="shrink-0">
              <a
                href={GOOGLE_MAPS_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 sm:h-11 px-5 sm:px-6 rounded-lg bg-primary text-primary-foreground text-xs sm:text-[13px] font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98] inline-flex items-center justify-center gap-2"
              >
                <Navigation className="size-3.5 fill-current" />
                <span>Get Driving Directions</span>
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        </MotionFadeIn>

        {/* ── Map Canvas Stage ── */}
        <MotionFadeIn direction="up" delay={0.1}>
          <div className="group relative w-full h-[440px] sm:h-[480px] lg:h-[520px] rounded-2xl overflow-hidden border border-black/[0.08] dark:border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_25px_rgba(0,0,0,0.35)] bg-muted">
            {/* Interactive Embedded Google Map */}
            <iframe
              title="City Veterinary Office Cagayan de Oro Location"
              src={GOOGLE_MAPS_EMBED_SRC}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full border-0 filter contrast-[1.02] dark:invert-[0.92] dark:hue-rotate-180 dark:contrast-[1.1] transition-all"
            />

            {/* Top-Right Badge: Open in Google Maps */}
            <div className="absolute top-4 right-4 z-10">
              <a
                href={GOOGLE_MAPS_SEARCH_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-card/90 dark:bg-card/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-md border border-border/80 hover:bg-card hover:border-primary/50 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Google Maps</span>
                <ArrowUpRight className="size-3.5 text-primary" />
              </a>
            </div>

            {/* Bottom-Left Floating Headquarters Card (Matching Reference Layout) */}
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-10 max-w-[340px] sm:max-w-[370px] w-[calc(100%-2rem)] sm:w-auto">
              <div className="rounded-xl bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border/90 p-4 sm:p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.55)] space-y-3">
                {/* Header with Icon */}
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <span className="block text-[9px] sm:text-[9.5px] font-bold tracking-[0.18em] uppercase text-primary">
                      CLINICAL HEADQUARTERS
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                      City Veterinary Office
                    </h3>
                  </div>
                </div>

                {/* Physical Address */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  CVO Complex, J.V. Seriña St., Carmen, Cagayan de Oro, 9000 Misamis Oriental
                </p>

                {/* Operating Hours */}
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted-foreground">
                  <Clock className="size-3.5 text-primary shrink-0" />
                  <span>Open Monday – Friday: 8:00 AM – 5:00 PM</span>
                </div>

                {/* Two Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={GOOGLE_MAPS_DIRECTIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
                  >
                    <Navigation className="size-3 fill-current" />
                    <span>Directions</span>
                  </a>

                  <a
                    href="tel:0888572260"
                    className="h-8.5 rounded-lg border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold text-foreground hover:text-primary transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Phone className="size-3 text-primary" />
                    <span>(088) 857-2260</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </MotionFadeIn>
      </div>
    </section>
  );
}
