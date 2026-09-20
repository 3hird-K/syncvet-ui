"use client";

import * as React from "react";
import Image from "next/image";
import { MotionFadeIn } from "./motion-wrapper";

interface ServiceItem {
  id: string;
  number: string;
  category: string;
  title: string;
  description: string;
  imageSrc: string;
}

const SERVICES_DATA: ServiceItem[] = [
  {
    id: "vaccination",
    number: "01",
    category: "MUNICIPAL VACCINATION & IMMUNIZATION",
    title: "Rabies Prevention Done Right",
    description:
      "Nervous about rabies compliance? Don't be. From scheduled mobile clinics to barangay drives, our team ensures your pets receive verified, city-certified protection.",
    imageSrc: "/gallery/clean_cvo_tablon.jpg",
  },
  {
    id: "digital-passport",
    number: "02",
    category: "DIGITAL IDENTIFICATION & RECORDS",
    title: "Smart Records & Collar QR Tags",
    description:
      "Large or small, rescue or pedigree, we keep records secure. Collar QR tags and digital passports keep immunizations instantly verifiable with zero paperwork.",
    imageSrc: "/gallery/qr-scan.jpg",
  },
  {
    id: "clinical-care",
    number: "03",
    category: "CLINICAL PRACTICE & ANIMAL WELFARE",
    title: "Rely on Certified Care",
    description:
      "Have questions about wellness or spay-and-neuter programs? Trust SyncVet to connect you with certified veterinarians for dependable care every step of the way.",
    imageSrc: "/gallery/clinic-care.jpg",
  },
];

export function LandingServices() {
  return (
    <section
      id="services"
      aria-label="Our Services"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-10 sm:py-14 lg:py-16"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        {/* ── Section Header (1:1 Twin to Reference Screenshot) ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-7 sm:mb-9">
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

        {/* ── 3-Column Services Cards ── */}
        <div className="grid grid-cols-1 gap-3.5 sm:gap-4 md:grid-cols-3">
          {SERVICES_DATA.map((service, index) => (
            <MotionFadeIn
              key={service.id}
              direction="up"
              delay={0.08 * index}
              className="flex"
            >
              <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/10 bg-[#fbf9f5] dark:bg-card/75 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)] transition-all duration-300 cursor-pointer">
                {/* Image Section */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
                  <Image
                    src={service.imageSrc}
                    alt={service.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Dark gradient edge for image depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />

                  {/* Number Badge Top-Left */}
                  <div className="absolute top-3 left-3 z-10 rounded-[4px] bg-black/65 px-2 py-0.5 text-[10px] font-mono font-bold tracking-widest text-white backdrop-blur-md border border-white/15 shadow-sm">
                    {service.number}
                  </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
                  <div>
                    {/* Category Kicker */}
                    <span className="block text-[10px] font-bold tracking-[0.2em] uppercase text-primary mb-1">
                      {service.category}
                    </span>

                    {/* Title (Colors only on hover) */}
                    <h3 className="text-base sm:text-[1.18rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary mb-1.5">
                      {service.title}
                    </h3>

                    {/* Description */}
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      {service.description}
                    </p>
                  </div>

                  {/* Professional Bottom Accent Line (smooth expansion & fade on hover) */}
                  <div className="mt-4 pt-1 w-full">
                    <div className="h-[1.5px] w-full bg-transparent overflow-hidden rounded-full">
                      <div className="h-full w-full bg-primary/80 origin-left scale-x-0 group-hover:scale-x-100 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out" />
                    </div>
                  </div>
                </div>
              </article>
            </MotionFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
