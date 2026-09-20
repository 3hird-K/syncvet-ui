"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { MotionFadeIn } from "./motion-wrapper";

interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  source: string;
  imageSrc: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  // Row 1 (2 Columns)
  {
    id: "tablon-vaccination",
    title: "1,351 Pets Vaccinated in Brgy. Tablon",
    subtitle: "Frontline City Veterinary Office medical teams administering free anti-rabies immunizations directly to family companion dogs across Barangay Tablon.",
    source: "City Information Office · Facebook @cityinfo.cdo",
    imageSrc: "/gallery/clean_cvo_tablon.jpg",
  },
  {
    id: "carmen-drive",
    title: "High-Density Drive at Brgy. Carmen",
    subtitle: "Responsible pet guardians gathered at the Barangay Carmen covered court for comprehensive anti-rabies vaccination and pet wellness profiling.",
    source: "City Government of Cagayan de Oro",
    imageSrc: "/gallery/clean_cvo_carmen.jpg",
  },
  // Row 2 (3 Columns)
  {
    id: "dog-day",
    title: "Kagayan Dog Day Championship",
    subtitle: "Dr. Helen Ann P. Tacandong and City Veterinary personnel honoring canine champion Miyuki and responsible pet owners during Kagayan Dog Day Year 4.",
    source: "Official Facebook Update · CityVetCDO",
    imageSrc: "/gallery/clean_cvo_dogday.jpg",
  },
  {
    id: "balulang-center",
    title: "Rabies Center Launch at Brgy. Balulang",
    subtitle: "Inauguration of the dedicated Barangay Rabies Vaccination Center at Villa Angela Covered Court in joint collaboration with the City Veterinary Office.",
    source: "City Information Office (CIO) CDO",
    imageSrc: "/gallery/clean_cvo_balulang.jpg",
  },
  {
    id: "deputization-training",
    title: "Community Rabies Deputization Training",
    subtitle: "CVO healthcare practitioners providing hands-on training to deputize barangay animal health workers for community-level rabies response.",
    source: "City Veterinary Office · CDO Updates",
    imageSrc: "/gallery/clean_cvo_training.jpg",
  },
  // Row 3 (Wide Card)
  {
    id: "cityvet-milestone",
    title: "3,875 Vaccinated Milestone Celebration",
    subtitle: "The dedicated veterinary doctors, field technicians, and barangay health volunteers of Cagayan de Oro celebrating record community pet immunization coverage.",
    source: "Official Press Release · CityVetCDO",
    imageSrc: "/gallery/clean_cvo_3875vax.jpg",
  },
];

export function LandingGallery() {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);

  const currentItem = selectedIndex !== null ? GALLERY_ITEMS[selectedIndex] : null;

  const handlePrev = React.useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length));
  }, []);

  const handleNext = React.useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % GALLERY_ITEMS.length));
  }, []);

  // Keyboard navigation & body scroll lock
  React.useEffect(() => {
    if (selectedIndex === null) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "Escape") {
        setSelectedIndex(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIndex, handlePrev, handleNext]);

  return (
    <section
      id="gallery"
      aria-label="Moments from the field gallery"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-16 sm:py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-10">
        
        {/* ── Section Header (Matching Reference Layout) ── */}
        <MotionFadeIn direction="up" amount={0.2} className="mb-12 sm:mb-16">
          <div className="grid items-end gap-6 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Kicker & Headline with Seriffed Italic Accent */}
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary/70" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] uppercase text-primary">
                  MUNICIPAL CARE IN ACTION
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-foreground leading-[1.14]">
                Moments across{" "}
                <em className="font-serif font-medium text-primary italic">
                  Cagayan de Oro.
                </em>
              </h2>
            </div>

            {/* Right: Narrative Context */}
            <div className="lg:col-span-5 lg:pb-1">
              <p className="text-xs sm:text-sm lg:text-[14.5px] leading-relaxed text-muted-foreground font-normal">
                Authentic field documentation of frontline companion care, high-density anti-rabies campaigns, and community pet wellness drives across CDO&apos;s 80 barangays.
              </p>
            </div>

          </div>
        </MotionFadeIn>

        {/* ── Bento Grid: 2 Cols / 3 Cols / Asymmetric Quote Row ── */}
        <div className="space-y-6 sm:space-y-7">
          
          {/* ── ROW 1: 2 Columns ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
            {GALLERY_ITEMS.slice(0, 2).map((item, idx) => (
              <MotionFadeIn
                key={item.id}
                direction="up"
                amount={0.15}
                className="w-full min-w-0 group relative aspect-[16/10] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedIndex(idx)}
              >
                <Image
                  src={item.imageSrc}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 560px"
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                />

                {/* Subtle gradient matching reference site - keeps photography fully visible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

                {/* Frosted Expand Icon Button Appears on Hover */}
                <div className="absolute top-3.5 right-3.5 size-8 rounded-[6px] border border-white/20 bg-black/50 text-white flex items-center justify-center opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 shadow-xs pointer-events-none">
                  <Maximize2 className="size-3.5" />
                </div>

                {/* Bottom Overlay Info */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
                  <span className="block text-sm sm:text-lg lg:text-xl font-bold text-white tracking-tight leading-snug">
                    {item.title}
                  </span>
                  <span className="mt-1 block max-w-lg text-[11px] sm:text-[12.5px] leading-relaxed text-white/85 font-normal line-clamp-2">
                    {item.subtitle}
                  </span>
                </div>
              </MotionFadeIn>
            ))}
          </div>

          {/* ── ROW 2: 3 Columns ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {GALLERY_ITEMS.slice(2, 5).map((item, idx) => {
              const actualIndex = idx + 2;

              return (
                <MotionFadeIn
                  key={item.id}
                  direction="up"
                  amount={0.15}
                  className="w-full min-w-0 group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedIndex(actualIndex)}
                >
                  <Image
                    src={item.imageSrc}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 370px"
                    className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />

                  {/* Subtle gradient matching reference site - keeps photography fully visible */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

                  {/* Frosted Expand Icon Button Appears on Hover */}
                  <div className="absolute top-3.5 right-3.5 size-8 rounded-[6px] border border-white/20 bg-black/50 text-white flex items-center justify-center opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 shadow-xs pointer-events-none">
                    <Maximize2 className="size-3.5" />
                  </div>

                  {/* Bottom Overlay Info */}
                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
                    <span className="block text-xs sm:text-base font-bold text-white tracking-tight leading-snug">
                      {item.title}
                    </span>
                    <span className="mt-1 block max-w-sm text-[10.5px] sm:text-xs leading-relaxed text-white/85 font-normal line-clamp-2">
                      {item.subtitle}
                    </span>
                  </div>
                </MotionFadeIn>
              );
            })}
          </div>

          {/* ── ROW 3: Asymmetric (8 Cols Wide Image + 4 Cols Quote Card) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-stretch">
            
            {/* Wide Image (8 Cols) */}
            <MotionFadeIn
              direction="up"
              amount={0.15}
              className="w-full min-w-0 lg:col-span-8 group relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[340px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer"
              onClick={() => setSelectedIndex(5)}
            >
              <Image
                src={GALLERY_ITEMS[5].imageSrc}
                alt={GALLERY_ITEMS[5].title}
                fill
                sizes="(max-width: 1024px) 100vw, 760px"
                className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />

              {/* Subtle gradient matching reference site - keeps photography fully visible */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-90 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

              {/* Frosted Expand Icon Button Appears on Hover */}
              <div className="absolute top-4 right-4 size-8 sm:size-9 rounded-[6px] border border-white/20 bg-black/50 text-white flex items-center justify-center opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 shadow-xs pointer-events-none">
                <Maximize2 className="size-4" />
              </div>

              {/* Bottom Overlay Info */}
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 pointer-events-none">
                <span className="block text-sm sm:text-lg lg:text-xl font-bold text-white tracking-tight leading-snug">
                  {GALLERY_ITEMS[5].title}
                </span>
                <span className="mt-1 block max-w-xl text-[11px] sm:text-xs lg:text-sm leading-relaxed text-white/85 font-normal line-clamp-2 sm:line-clamp-3">
                  {GALLERY_ITEMS[5].subtitle}
                </span>
              </div>
            </MotionFadeIn>

            {/* Testimonial Quote Card (4 Cols) */}
            <MotionFadeIn
              direction="up"
              delay={0.1}
              amount={0.15}
              className="w-full min-w-0 lg:col-span-4 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] relative overflow-hidden group hover:border-primary/40 transition-all duration-300"
            >
              {/* Subtle Ambient Glow */}
              <div className="absolute -top-10 -right-10 size-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                <span className="font-serif text-5xl sm:text-6xl text-primary/40 leading-none select-none block mb-2">
                  “
                </span>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-foreground leading-snug tracking-tight">
                  We live and serve in every barangay — ensuring no companion animal is left unprotected.
                </p>
              </div>

              <div className="pt-6 mt-6 border-t border-border/70">
                <p className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-foreground">
                  Dr. Helen Ann P. Tacandong
                </p>
                <p className="text-[9.5px] sm:text-[10px] tracking-[0.2em] font-semibold text-primary uppercase mt-0.5">
                  City Veterinarian · CVO Cagayan de Oro
                </p>
              </div>
            </MotionFadeIn>

          </div>

        </div>

      </div>

      {/* ── Fullpage / Fullscreen Lightbox Overlay Matching Reference Exactly ── */}
      <AnimatePresence>
        {selectedIndex !== null && currentItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-white dark:bg-neutral-950 flex flex-col justify-center items-center overflow-hidden"
          >
            {/* Top-Right Square Close Button */}
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="fixed top-6 right-6 sm:top-8 sm:right-8 z-50 size-10 sm:size-11 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Close fullscreen gallery"
            >
              <X className="size-5" />
            </button>

            {/* Left Arrow Navigation Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="fixed left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 size-10 sm:size-11 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Previous image"
            >
              <ChevronLeft className="size-5" />
            </button>

            {/* Right Arrow Navigation Button */}
            <button
              type="button"
              onClick={handleNext}
              className="fixed right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 size-10 sm:size-11 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-label="Next image"
            >
              <ChevronRight className="size-5" />
            </button>

            {/* Centered Image + Bottom Editorial Bar */}
            <div className="w-full max-w-5xl px-6 sm:px-14 flex flex-col items-center">
              
              {/* Image Canvas */}
              <div className="relative w-full aspect-[16/10] max-h-[64vh] sm:max-h-[68vh] rounded-none overflow-hidden flex items-center justify-center">
                <Image
                  src={currentItem.imageSrc}
                  alt={currentItem.title}
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Bottom Dividing Rule & Metadata */}
              <div className="w-full pt-5 mt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  
                  {/* Left Column: Title & 1 / 6 Counter */}
                  <div className="md:col-span-5 space-y-1">
                    <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white tracking-tight leading-snug">
                      {currentItem.title}
                    </h3>
                    <p className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-500 tracking-wider">
                      {selectedIndex + 1} / {GALLERY_ITEMS.length}
                    </p>
                  </div>

                  {/* Right Column: Description Narrative */}
                  <div className="md:col-span-7">
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-normal leading-relaxed">
                      {currentItem.subtitle}
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
