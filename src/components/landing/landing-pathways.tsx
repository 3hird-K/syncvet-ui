"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MotionFadeIn } from "./motion-wrapper";

interface PathwayItem {
  id: string;
  kicker: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  actionText: string;
  actionHref: string;
  isExternal?: boolean;
  imageFirst: boolean;
}

const PATHWAYS: PathwayItem[] = [
  {
    id: "guardians",
    kicker: "PET GUARDIANS & COMPANION CARE",
    title: "Direct guardian access and verified digital passports.",
    description:
      "We elevate pet parenting across all 80 barangays. Through instant QR verification, automated anti-rabies renewal alerts, and offline-accessible medical histories on Android, pet guardians maintain unbroken veterinary timelines with absolute confidence.",
    imageSrc: "/pathways-guardian.jpg",
    imageAlt: "Pet guardian with dog checking mobile health passport",
    actionText: "EXPLORE DIGITAL PASSPORTS",
    actionHref: "#health-records",
    imageFirst: true,
  },
  {
    id: "barangay",
    kicker: "MUNICIPAL & BARANGAY OPERATIONS",
    title: "Unrivaled frontline field intelligence and outreach.",
    description:
      "Equipping City Veterinary Office field teams and barangay animal health workers with 100% offline sync capability. From Poblacion to upland rural communities, every anti-rabies vaccination log, microchip record, and batch lot is reconciled with municipal databases in real time.",
    imageSrc: "/pathways-barangay.jpg",
    imageAlt: "Cagayan de Oro City Veterinary Office barangay vaccination drive",
    actionText: "EXPLORE FIELD OPERATIONS",
    actionHref: "/field-operations",
    imageFirst: false,
  },
  {
    id: "clinical",
    kicker: "CLINICAL GOVERNANCE & PROTOCOLS",
    title: "Institutional-grade oversight at every milestone.",
    description:
      "Synchronizing municipal veterinary infrastructure with private clinical practitioners. From batch-validated vaccine lot governance to epidemiological zoonosis containment, our integrated platform guarantees clinical diligence, clarity, and lasting peace of mind.",
    imageSrc: "/pathways-clinic.jpg",
    imageAlt: "Modern clinical veterinary consultation and diagnostics",
    actionText: "CONNECT WITH CITY VET",
    actionHref: "https://www.facebook.com/CityVetCDO",
    isExternal: true,
    imageFirst: true,
  },
];

export function LandingPathways() {
  return (
    <section
      id="overview"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        
        {/* ── Section Header (Two-column layout matching reference) ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-14 sm:mb-20">
          <div className="grid items-end gap-6 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Kicker & Headline with Seriffed Italic Accent */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary/70" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] uppercase text-primary">
                  THE APPROACH
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-foreground leading-[1.14]">
                Three pathways.{" "}
                <em className="font-serif font-medium text-primary italic">
                  One clinical standard.
                </em>
              </h2>
            </div>

            {/* Right: Narrative Summary */}
            <div className="lg:col-span-5 lg:pb-1">
              <p className="text-xs sm:text-sm lg:text-[14.5px] leading-relaxed text-muted-foreground font-normal">
                Whether empowering companion animal guardians at home, deploying frontline anti-rabies vaccination teams across all 80 barangays, or governing institutional clinical diagnostics — our commitment to Cagayan de Oro&apos;s public animal health never wavers.
              </p>
            </div>

          </div>
        </MotionFadeIn>

        {/* ── 3 Alternating Editorial Feature Cards ── */}
        <div className="space-y-16 sm:space-y-24 lg:space-y-28">
          {PATHWAYS.map((item, idx) => {
            const isImageFirst = item.imageFirst;

            return (
              <div
                key={item.id}
                className="grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-14"
              >
                
                {/* ── Image Column with Offset Primary Accent Frame ── */}
                <MotionFadeIn
                  direction="up"
                  delay={0.05}
                  amount={0.15}
                  className={`lg:col-span-6 ${
                    isImageFirst
                      ? "order-1"
                      : "order-1 lg:order-2"
                  }`}
                >
                  <div className="relative">
                    {/* Offset Primary Accent Frame (Twin) */}
                    <div
                      className={`absolute inset-0 rounded-2xl border border-primary/35 pointer-events-none -z-10 hidden sm:block ${
                        isImageFirst
                          ? "translate-x-3 -translate-y-3 sm:translate-x-4 sm:-translate-y-4"
                          : "-translate-x-3 -translate-y-3 sm:-translate-x-4 sm:-translate-y-4"
                      }`}
                    />

                    {/* Main Image Frame */}
                    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl group">
                      <Image
                        src={item.imageSrc}
                        alt={item.imageAlt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 550px"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
                    </div>
                  </div>
                </MotionFadeIn>

                {/* ── Description Column ── */}
                <MotionFadeIn
                  direction="up"
                  delay={0.1}
                  amount={0.15}
                  className={`lg:col-span-6 space-y-3.5 sm:space-y-4 ${
                    isImageFirst
                      ? "order-2"
                      : "order-2 lg:order-1"
                  }`}
                >
                  <p className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] uppercase text-primary">
                    {item.kicker}
                  </p>

                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm lg:text-[14.5px] leading-relaxed text-muted-foreground font-normal">
                    {item.description}
                  </p>

                  <div className="pt-2">
                    {item.isExternal ? (
                      <a
                        href={item.actionHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-semibold tracking-wider text-primary uppercase underline decoration-primary/40 underline-offset-8 transition-colors hover:text-primary/80 inline-flex items-center gap-1.5"
                      >
                        <span>{item.actionText}</span>
                        <ArrowUpRight className="size-4" />
                      </a>
                    ) : (
                      <Link
                        href={item.actionHref}
                        className="text-xs sm:text-sm font-semibold tracking-wider text-primary uppercase underline decoration-primary/40 underline-offset-8 transition-colors hover:text-primary/80 inline-flex items-center gap-1.5"
                      >
                        <span>{item.actionText}</span>
                        <ArrowUpRight className="size-4" />
                      </Link>
                    )}
                  </div>
                </MotionFadeIn>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
