"use client";

import * as React from "react";
import { MotionFadeIn } from "./motion-wrapper";
import { Syringe, QrCode, Stethoscope } from "lucide-react";

interface ServiceItem {
  id: string;
  number: string;
  category: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "vaccination",
    number: "01",
    category: "MUNICIPAL VACCINATION & IMMUNIZATION",
    title: "Rabies Prevention Done Right",
    description:
      "Nervous about rabies compliance? Don't be. From scheduled mobile clinics to barangay drives, our team ensures your pets receive verified, city-certified protection.",
    icon: Syringe,
  },
  {
    id: "digital-passport",
    number: "02",
    category: "DIGITAL IDENTIFICATION & RECORDS",
    title: "Smart Records & Collar QR Tags",
    description:
      "Large or small, rescue or pedigree, we keep records secure. Collar QR tags and digital passports keep immunizations instantly verifiable with zero paperwork.",
    icon: QrCode,
  },
  {
    id: "clinical-care",
    number: "03",
    category: "CLINICAL PRACTICE & ANIMAL WELFARE",
    title: "Rely on Certified Care",
    description:
      "Have questions about wellness or spay-and-neuter programs? Trust SyncVet to connect you with certified veterinarians for dependable care every step of the way.",
    icon: Stethoscope,
  },
];

export function LandingServices() {
  return (
    <section
      id="services"
      aria-label="Our Services"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-12 sm:py-16 lg:py-20"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        {/* ── Section Header ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-8 sm:mb-10">
          <div className="grid items-end gap-4 lg:grid-cols-12 lg:gap-10">
            {/* Left: Kicker & Headline with Seriffed Italic Accent */}
            <div className="lg:col-span-7 space-y-2 sm:space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary/80" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase text-primary">
                  OUR SERVICES
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.65rem] font-bold tracking-tight text-foreground leading-[1.12]">
                Veterinary care,{" "}
                <em className="font-serif italic font-medium text-primary">
                  done right.
                </em>
              </h2>
            </div>

            {/* Right: Narrative Paragraph */}
            <div className="lg:col-span-5">
              <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground lg:max-w-md">
                Comprehensive companion care across barangay vaccination drives, digital pet passports, and accredited veterinary clinics — zero shortcuts.
              </p>
            </div>
          </div>
        </MotionFadeIn>

        {/* ── 3-Column Services Cards (No images) ── */}
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          {SERVICES_DATA.map((service, index) => {
            const Icon = service.icon;
            return (
              <MotionFadeIn
                key={service.id}
                direction="up"
                delay={0.08 * index}
                className="flex"
              >
                <article className="group relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/10 bg-[#fbf9f5] dark:bg-card/75 p-6 sm:p-7 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-all duration-300">
                  <div>
                    {/* Header: Number Badge & Service Icon */}
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center justify-center rounded-md border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] font-mono font-bold tracking-widest text-muted-foreground group-hover:text-foreground group-hover:border-primary/40 transition-colors">
                        {service.number}
                      </span>
                      <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                        <Icon className="size-5 shrink-0" />
                      </div>
                    </div>

                    {/* Category Kicker */}
                    <div className="mt-5 mb-1.5">
                      <span className="text-[10px] sm:text-[10.5px] font-bold tracking-[0.2em] uppercase text-primary">
                        {service.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base sm:text-[1.18rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary mb-2.5">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-[13px] leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>

                  {/* Professional Bottom Accent Line */}
                  <div className="mt-6 pt-2 w-full">
                    <div className="h-[2px] w-full bg-border/40 overflow-hidden rounded-full">
                      <div className="h-full w-full bg-primary/80 origin-left scale-x-0 group-hover:scale-x-100 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out" />
                    </div>
                  </div>
                </article>
              </MotionFadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
