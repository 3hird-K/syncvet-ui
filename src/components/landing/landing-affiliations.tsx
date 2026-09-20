"use client";

import * as React from "react";
import Image from "next/image";
import { MotionFadeIn } from "./motion-wrapper";

interface Partner {
  id: string;
  name: string;
  logo: string;
}

const PARTNERS: Partner[] = [
  {
    id: "ustp",
    name: "USTP · UNIVERSITY OF SCIENCE & TECHNOLOGY",
    logo: "/partners/ustp.png",
  },
  {
    id: "cdo-cvo",
    name: "CAGAYAN DE ORO CITY VETERINARY OFFICE",
    logo: "/partners/cdo-seal.png",
  },
  {
    id: "da-bai",
    name: "DA-BAI · BUREAU OF ANIMAL INDUSTRY",
    logo: "/partners/bai.svg",
  },
  {
    id: "pvma",
    name: "PHILIPPINE VETERINARY MEDICAL ASSOCIATION",
    logo: "/partners/pvma.jpg",
  },
  {
    id: "doh-x",
    name: "DEPARTMENT OF HEALTH · REGION X",
    logo: "/partners/doh.svg",
  },
  {
    id: "da-rfo10",
    name: "DEPARTMENT OF AGRICULTURE · REGION X",
    logo: "/partners/da.svg",
  },
  {
    id: "nmis",
    name: "NATIONAL MEAT INSPECTION SERVICE",
    logo: "/partners/nmis.svg",
  },
];

export function LandingAffiliations() {
  return (
    <section
      aria-label="Institutional Partnerships and Affiliations"
      className="relative w-full overflow-hidden border-y border-border/70 bg-muted/20 dark:bg-card/40 py-4 sm:py-5 select-none"
    >
      {/* ── Section Kicker with Balanced Flanking Lines ── */}
      <MotionFadeIn direction="up" amount={0.2} className="max-w-7xl mx-auto px-5 sm:px-10 mb-3 sm:mb-4">
        <div className="flex items-center justify-center gap-3 sm:gap-4">
          <span className="h-px w-8 sm:w-16 bg-primary/40" />
          <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] sm:tracking-[0.32em] uppercase text-primary text-center">
            AFFILIATIONS &amp; INSTITUTIONAL ALLIANCES
          </span>
          <span className="h-px w-8 sm:w-16 bg-primary/40" />
        </div>
      </MotionFadeIn>

      {/* ── Infinite Horizontal Marquee Track ── */}
      <div className="relative w-full overflow-hidden">
        {/* Subtle Edge Gradient Fade Masks */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="animate-marquee items-center gap-3.5 sm:gap-5 py-1 hover:[animation-play-state:paused]">
          {/* ── Set 1 ── */}
          {PARTNERS.map((partner) => (
            <div key={`set1-${partner.id}`} className="inline-flex items-center gap-3.5 sm:gap-5 shrink-0">
              <div className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-border/80 bg-card px-3.5 sm:px-4 py-1.5 sm:py-2 shadow-2xs transition-all duration-200 hover:border-primary/50 hover:shadow-xs cursor-default">
                <div className="relative size-7 sm:size-7.5 rounded-md bg-white p-0.5 border border-border/60 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={30}
                    height={30}
                    className="size-full object-contain"
                  />
                </div>
                <span className="text-[11px] sm:text-[11.5px] font-bold tracking-wider uppercase text-foreground whitespace-nowrap group-hover:text-primary transition-colors">
                  {partner.name}
                </span>
              </div>

              {/* Subtle Plus Separator */}
              <span className="text-primary/60 text-xs font-bold shrink-0" aria-hidden>
                +
              </span>
            </div>
          ))}

          {/* ── Set 2 (for seamless loop) ── */}
          {PARTNERS.map((partner) => (
            <div key={`set2-${partner.id}`} className="inline-flex items-center gap-3.5 sm:gap-5 shrink-0">
              <div className="group inline-flex items-center gap-2.5 sm:gap-3 rounded-lg sm:rounded-xl border border-border/80 bg-card px-3.5 sm:px-4 py-1.5 sm:py-2 shadow-2xs transition-all duration-200 hover:border-primary/50 hover:shadow-xs cursor-default">
                <div className="relative size-7 sm:size-7.5 rounded-md bg-white p-0.5 border border-border/60 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={30}
                    height={30}
                    className="size-full object-contain"
                  />
                </div>
                <span className="text-[11px] sm:text-[11.5px] font-bold tracking-wider uppercase text-foreground whitespace-nowrap group-hover:text-primary transition-colors">
                  {partner.name}
                </span>
              </div>

              {/* Subtle Plus Separator */}
              <span className="text-primary/60 text-xs font-bold shrink-0" aria-hidden>
                +
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
