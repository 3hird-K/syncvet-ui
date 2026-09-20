"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import heroBg from "../../../public/hero-bg.jpg";
import { Download, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  motion,
  useScroll,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import { MOTION_VARIANTS } from "./motion-wrapper";

const APK_DOWNLOAD_URL =
  "https://www.dropbox.com/scl/fi/fz9maf2qy55zx7683mxwf/syncvet.apk?rlkey=bpow4wzey0ylnzj3z73ynp2kq&st=6gwsgp8u&dl=1";

export function LandingHero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();

  const dragY = useMotionValue(0);
  const smoothDragY = useSpring(dragY, {
    stiffness: 140,
    damping: 26,
    mass: 0.18,
  });

  // The dragdown onscroll strictly functions only when scrolling DOWN
  useMotionValueEvent(scrollY, "change", (latest) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (latest > prev && latest <= 800) {
      // Actively scrolling DOWN: apply dragdown proportional to scroll position
      const targetY = Math.min((latest / 700) * 160, 160);
      dragY.set(targetY);
    } else if (latest < prev) {
      // Actively scrolling UP: disable dragdown and smoothly return to original position
      dragY.set(0);
    } else if (latest === 0) {
      dragY.set(0);
    }
  });

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative isolate min-h-[95vh] lg:min-h-screen flex flex-col justify-end pb-16 sm:pb-20 lg:pb-22 pt-28 sm:pt-32 overflow-hidden"
    >
      {/* ── Cinematic Moving Hero Background (Ken Burns Animation) ── */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-4 sm:-inset-6 animate-kenburns select-none">
          <Image
            src={heroBg}
            alt="Modern Companion Animal Wellness Pavilion & Veterinary Hospital"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_28%] lg:object-[center_35%] select-none"
          />
        </div>

        {/* Top subtle navbar shadow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-background/30 via-transparent to-transparent" />

        {/* Left shadow: Solid-to-soft scrim for high text contrast and legibility while leaving right side open */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/95 via-background/65 to-transparent lg:w-[60%]" />

        {/* Bottom shadow: Exactly like reference site, fading from transparent via transparent to background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-10">
        {/* Outer container: Applies dragdown animation ONLY when scrolling down */}
        <motion.div
          style={{ y: smoothDragY }}
          className="max-w-2xl lg:max-w-3xl xl:max-w-4xl text-left"
        >
          {/* Inner container: Bidirectional Framer Motion reveal with bottom slide-up & blur */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, amount: 0.2 }}
            variants={MOTION_VARIANTS.staggerContainer(0.08, 0.03)}
            className="space-y-4 sm:space-y-4.5"
          >
            {/* Top Accent Kicker */}
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              className="flex items-center gap-2.5 sm:gap-3"
            >
              <span className="w-5 sm:w-6 h-[1.5px] bg-primary/80 shrink-0" />
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.25em] text-primary">
                SYNCVET HEALTHCARE • CITY VETERINARY OFFICE
              </p>
            </motion.div>

            {/* Large Hero Headline: Refined line-height and comfortable vertical rhythm */}
            <motion.h1
              variants={MOTION_VARIANTS.fadeUp}
              className="select-none tracking-tight"
            >
              <span className="block text-4xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.25rem] font-bold text-foreground leading-[1.04] tracking-tight drop-shadow-2xs">
                Where Care
              </span>
              <span className="mt-1 sm:mt-1.5 block font-serif italic text-3xl sm:text-5xl md:text-6xl lg:text-[4.25rem] xl:text-[4.85rem] leading-[1.05] text-primary drop-shadow-xs whitespace-nowrap">
                Meets Innovation
              </span>
            </motion.h1>

            {/* Editorial Description: High visibility & readability */}
            <motion.p
              variants={MOTION_VARIANTS.fadeUp}
              className="text-sm sm:text-base md:text-lg text-foreground/90 dark:text-foreground/90 font-medium leading-relaxed max-w-xl lg:max-w-2xl drop-shadow-2xs"
            >
              Municipal veterinary health intelligence and verified digital pet passports in Cagayan de Oro. Built for dedicated pet guardians, field veterinary clinics, and compassionate community care.
            </motion.p>

            {/* Direct Action Buttons */}
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              className="pt-1.5 sm:pt-2 flex flex-wrap items-center gap-3 sm:gap-3.5"
            >
              <Button
                asChild
                size="lg"
                className="h-11 sm:h-12 px-5 sm:px-6 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] inline-flex items-center gap-2"
              >
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="syncvet.apk"
                >
                  <Download className="size-4" />
                  <span>Download App</span>
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 sm:h-12 px-5 sm:px-6 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider border-border/80 bg-background/90 dark:bg-card hover:bg-muted text-foreground transition-all shadow-xs active:scale-[0.98]"
              >
                <Link href="#services" className="inline-flex items-center gap-2">
                  <span>Explore Services</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </motion.div>

            {/* Feature Badges: Bold and clearly visible */}
            <motion.div
              variants={MOTION_VARIANTS.fadeUp}
              className="pt-1 sm:pt-1.5 flex flex-wrap items-center gap-x-5 sm:gap-x-6 gap-y-2 text-xs font-semibold text-foreground dark:text-foreground/90"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
                100% Offline Access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
                Digital QR Passports
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-500 shrink-0" />
                Smart Reminders
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
