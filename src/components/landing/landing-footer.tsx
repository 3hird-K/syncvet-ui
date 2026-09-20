"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { useEffect, useState } from "react";
import { PawIcon } from "@/components/icons/paw-icon";
import { MotionFadeIn } from "./motion-wrapper";
import { ArrowUp, Mail, Phone, Globe } from "lucide-react";

export function LandingFooter() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="footer" className="border-t border-border/60 pt-16 pb-10 text-foreground bg-background">
      <MotionFadeIn direction="up" amount={0.15} className="max-w-7xl mx-auto px-5 sm:px-10">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-14 pb-14 sm:pb-16">
          
          {/* Column 1: Brand, Tagline, Description & Socials (md: 5 cols) */}
          <div className="md:col-span-5 lg:col-span-5 space-y-4">
            <Link
              href="#hero"
              onClick={(e) => scrollToSection(e, "#hero")}
              className="inline-flex items-center gap-2.5 group"
            >
              <div className="size-8 flex items-center justify-center shrink-0">
                {mounted ? (
                  <Image
                    src={Logo}
                    alt="SyncVet"
                    className="size-full object-contain"
                  />
                ) : (
                  <PawIcon className="size-5 text-primary" />
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-extrabold tracking-wider text-foreground group-hover:text-primary transition-colors">
                  SYNCVET
                </span>
                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary">
                  VETERINARY PLATFORM
                </span>
              </div>
            </Link>

            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary/90">
              CITY VETERINARY OFFICE
            </p>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Connecting companion care across Cagayan de Oro. Synchronizing health records, anti-rabies vaccination tracking, and municipal veterinary operations.
            </p>

            {/* Social Icons directly below description */}
            <div className="flex items-center gap-3.5 pt-2">
              {/* Facebook */}
              <a
                href="https://www.facebook.com/CityVetCDO"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="City Veterinary Office Facebook"
                className="text-muted-foreground/80 hover:text-primary transition-colors"
              >
                <svg className="size-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>

              {/* Email */}
              <a
                href="mailto:cityvet@cagayandeoro.gov.ph"
                aria-label="Email City Veterinary Office"
                className="text-muted-foreground/80 hover:text-primary transition-colors"
              >
                <Mail className="size-4" />
              </a>

              {/* Phone */}
              <a
                href="tel:0888572260"
                aria-label="Call City Veterinary Office"
                className="text-muted-foreground/80 hover:text-primary transition-colors"
              >
                <Phone className="size-4" />
              </a>

              {/* Official City Government Portal */}
              <a
                href="https://cagayandeoro.gov.ph"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Cagayan de Oro Official Portal"
                className="text-muted-foreground/80 hover:text-primary transition-colors"
              >
                <Globe className="size-4" />
              </a>
            </div>
          </div>

          {/* Column 2: EXPLORE (md: 3 cols) */}
          <div className="md:col-span-3 lg:col-span-3 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
              EXPLORE
            </p>
            <ul className="space-y-3 text-xs text-muted-foreground">
              <li>
                <a
                  href="#about"
                  onClick={(e) => scrollToSection(e, "#about")}
                  className="hover:text-foreground transition-colors"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#overview"
                  onClick={(e) => scrollToSection(e, "#overview")}
                  className="hover:text-foreground transition-colors"
                >
                  Overview
                </a>
              </li>
              <li>
                <a
                  href="#gallery"
                  onClick={(e) => scrollToSection(e, "#gallery")}
                  className="hover:text-foreground transition-colors"
                >
                  Gallery
                </a>
              </li>
              <li>
                <a
                  href="#services"
                  onClick={(e) => scrollToSection(e, "#services")}
                  className="hover:text-foreground transition-colors"
                >
                  Services
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  onClick={(e) => scrollToSection(e, "#contact")}
                  className="hover:text-foreground transition-colors"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: VISIT (md: 3 cols) */}
          <div className="md:col-span-3 lg:col-span-3 space-y-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary/90">
              VISIT
            </p>
            <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <p>
                CVO Complex, J.V. Seriña St.<br />
                Carmen, Cagayan de Oro 9000
              </p>
              <p>
                <a
                  href="tel:0888572260"
                  className="hover:text-primary transition-colors font-medium text-foreground"
                >
                  (088) 857-2260
                </a>
              </p>
              <p>
                Open Monday – Friday: 8:00 am – 5:00 pm
              </p>
            </div>
          </div>

          {/* Top-Right: Back to Top Box Button (md: 1 col) */}
          <div className="md:col-span-1 lg:col-span-1 flex md:justify-end items-start">
            <button
              onClick={scrollToTop}
              aria-label="Back to top"
              className="size-10 rounded-md border border-border/80 hover:border-primary/80 hover:bg-white/[0.04] flex items-center justify-center text-muted-foreground hover:text-primary transition-all group shrink-0"
            >
              <ArrowUp className="size-4.5 transition-transform group-hover:-translate-y-0.5" />
            </button>
          </div>

        </div>

        {/* Bottom Divider & Row */}
        <div className="border-t border-border/50 pt-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground/70">
          
          {/* Left: Copyright & Developer credit */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p>
              Copyright © 2026 SyncVet — All Rights Reserved
            </p>
            <p className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-medium">
              <span>DEVELOPED BY</span>
              <a
                href="https://github.com/3hird-K"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors group/dev"
              >
                <svg className="size-3 fill-current inline-block group-hover/dev:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-primary font-bold underline-offset-4 group-hover/dev:underline">3HIRD-K</span>
              </a>
            </p>
          </div>

          {/* Right: City Vet Office tag & Cookie Preferences */}
          <div className="flex flex-col items-center sm:items-end text-center sm:text-right gap-1">
            <span className="uppercase tracking-widest text-[10px] font-semibold text-foreground/80">
              CITY VETERINARY OFFICE • CAGAYAN DE ORO
            </span>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("open-cookie-preferences"))}
              className="text-muted-foreground/70 hover:text-primary transition-colors text-[10px] underline underline-offset-2"
            >
              Cookie Preferences
            </button>
          </div>

        </div>

      </MotionFadeIn>
    </footer>
  );
}
