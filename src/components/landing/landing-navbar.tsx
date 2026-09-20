"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Menu, X, Phone, Globe, Mail } from "lucide-react";
import { PawIcon } from "@/components/icons/paw-icon";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const navLinks = [
  { num: "01", label: "About", href: "#about" },
  { num: "02", label: "Overview", href: "#overview" },
  { num: "03", label: "Gallery", href: "#gallery" },
  { num: "04", label: "Services", href: "#services" },
  { num: "05", label: "Contact", href: "#contact" },
];

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      />
    </svg>
  );
}

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Mark scrolled style after 20px
      setIsScrolled(currentScrollY > 20);

      // Keep navbar visible if programmatic scrolling is active
      if (isProgrammaticScrollRef.current) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Sticky Hide on Scroll Down, Reveal on Scroll Up
      if (currentScrollY > 80) {
        if (currentScrollY > lastScrollY) {
          // Scrolling down -> hide navbar
          setIsVisible(false);
          setMobileOpen(false);
        } else {
          // Scrolling up -> show navbar
          setIsVisible(true);
        }
      } else {
        // At the top -> always visible
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);

      // Active section scroll spy
      const scrollPos = currentScrollY + 120;
      for (let i = navLinks.length - 1; i >= 0; i--) {
        const sec = document.querySelector(navLinks[i].href) as HTMLElement | null;
        if (sec) {
          const top = sec.offsetTop;
          if (scrollPos >= top) {
            setActiveSection(navLinks[i].href);
            return;
          }
        }
      }

      if (currentScrollY < 200) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Lock body scroll and handle Escape key when full-screen mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();

      if (typeof window !== "undefined" && window.location.pathname !== "/") {
        window.location.href = `/${href}`;
        return;
      }

      const target = document.querySelector(href) as HTMLElement | null;
      if (target) {
        isProgrammaticScrollRef.current = true;
        setIsVisible(true);
        setMobileOpen(false);
        setActiveSection(href);

        const navHeight = 72;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight;

        window.scrollTo({
          top: Math.max(0, targetTop),
          behavior: "smooth",
        });

        window.history.pushState(null, "", href);

        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 850);
      }
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-40 w-full transition-all duration-300 ease-in-out",
          isVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled
            ? "bg-background/90 dark:bg-background/85 backdrop-blur-xl border-b border-border/70 shadow-xs"
            : "bg-transparent border-b-transparent shadow-none backdrop-blur-none"
        )}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-10 h-16 sm:h-18 flex items-center justify-between">
        
        {/* ── LEFT: Brand Logo & Title ── */}
        <Link
          href="#hero"
          onClick={(e) => scrollToSection(e, "#hero")}
          className="flex items-center gap-2.5 group select-none shrink-0"
        >
          <div className="size-8 sm:size-9 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            {mounted ? (
              <Image
                src={Logo}
                alt="SyncVet"
                className="size-full object-contain"
                priority
              />
            ) : (
              <PawIcon className="size-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-none">
              SYNCVET
            </span>
            <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary leading-none">
              VETERINARY PLATFORM
            </span>
          </div>
        </Link>

        {/* ── CENTER: Elegant Nav Links with Active State Color ── */}
        <nav className="hidden lg:flex items-center gap-7 xl:gap-9 text-[11px] xl:text-xs font-semibold tracking-widest uppercase">
          {navLinks.map((link) => {
            const isActive = activeSection === link.href;
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className={cn(
                  "py-1 whitespace-nowrap transition-colors duration-200 cursor-pointer",
                  isActive
                    ? "text-primary font-bold"
                    : "text-foreground/75 hover:text-primary font-semibold"
                )}
              >
                {link.label.toUpperCase()}
              </a>
            );
          })}
        </nav>

        {/* ── RIGHT: Theme Toggle, Office Phone Hotline & Portal Action (Desktop lg+) ── */}
        <div className="hidden lg:flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Theme Switcher (h-9 w-9, borderless) */}
          <ThemeToggle />

          {/* Office Contact Number (h-9, borderless) */}
          <a
            href="tel:0888572260"
            title="Call City Veterinary Office: (088) 857-2260"
            className="h-9 px-3 sm:px-3.5 inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-xs font-bold border-0 shadow-none shrink-0 box-border cursor-pointer"
            aria-label="Call City Veterinary Office at (088) 857-2260"
          >
            <Phone className="size-3.5 fill-current shrink-0" />
            <span className="font-semibold tracking-wide whitespace-nowrap">(088) 857-2260</span>
          </a>

          {/* Sign In CTA (h-9, borderless) */}
          <Button
            asChild
            size="sm"
            className="h-9 px-4 inline-flex items-center justify-center rounded-md text-xs font-semibold border-0 bg-card/80 hover:bg-accent hover:text-foreground text-foreground transition-all shadow-none whitespace-nowrap shrink-0 box-border cursor-pointer"
          >
            <Link href="/sign-in">
              Sign In
            </Link>
          </Button>
        </div>

        {/* ── TABLET & MOBILE CONTROLS (Visible on < lg: phone, theme toggle, and burger) ── */}
        <div className="flex lg:hidden items-center gap-2 sm:gap-2.5 shrink-0">
          <ThemeToggle />

          <a
            href="tel:0888572260"
            title="Call City Veterinary Office: (088) 857-2260"
            className="hidden sm:inline-flex h-9 px-3 items-center gap-1.5 rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0"
          >
            <Phone className="size-3.5 fill-current shrink-0" />
            <span className="font-semibold whitespace-nowrap">(088) 857-2260</span>
          </a>

          <Button
            asChild
            size="sm"
            className="h-9 px-3 inline-flex items-center justify-center rounded-md text-xs font-semibold border border-border/70 bg-card/70 hover:bg-accent hover:text-foreground text-foreground transition-all shadow-none whitespace-nowrap shrink-0 box-border cursor-pointer"
          >
            <Link href="/sign-in">
              Sign In
            </Link>
          </Button>

          <button
            onClick={() => setMobileOpen(true)}
            className="size-9 sm:size-10 inline-flex items-center justify-center text-foreground rounded-md border border-border/80 bg-card/70 hover:bg-accent transition-colors shrink-0 cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>
        </div>

      </div>
    </header>

    {/* ── FULL-SCREEN EDITORIAL MOBILE & TABLET DRAWER (Matching Reference Design) ── */}
    <AnimatePresence>
      {mobileOpen && (
        <motion.div
          key="mobile-editorial-drawer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] h-screen h-[100dvh] w-screen bg-background text-foreground flex flex-col justify-between p-6 sm:p-10 md:p-12 overflow-y-auto"
        >
            {/* Top Bar inside Drawer */}
            <div className="flex items-center justify-between shrink-0">
              <Link
                href="#hero"
                onClick={(e) => {
                  setMobileOpen(false);
                  scrollToSection(e, "#hero");
                }}
                className="flex items-center gap-2.5 group select-none shrink-0"
              >
                <div className="size-8 sm:size-9 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                  {mounted ? (
                    <Image
                      src={Logo}
                      alt="SyncVet"
                      className="size-full object-contain"
                      priority
                    />
                  ) : (
                    <PawIcon className="size-5 text-primary" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm sm:text-base font-extrabold tracking-tight text-foreground leading-none">
                    SYNCVET
                  </span>
                  <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary leading-none">
                    VETERINARY PLATFORM
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="border border-border/80 rounded-md bg-card/60">
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="size-9 sm:size-10 inline-flex items-center justify-center text-foreground rounded-md border border-border/80 bg-card/60 hover:bg-accent transition-colors shrink-0 cursor-pointer"
                  aria-label="Close navigation menu"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Middle Editorial Nav Links */}
            <nav className="my-auto py-8 sm:py-10 flex flex-col">
              {navLinks.map((link) => {
                const isActive = activeSection === link.href;
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={(e) => {
                      setMobileOpen(false);
                      scrollToSection(e, link.href);
                    }}
                    className="group flex items-baseline border-b border-border/60 py-4 sm:py-5 md:py-6 transition-colors cursor-pointer"
                  >
                    <span className="w-10 sm:w-14 font-serif italic text-primary text-sm sm:text-base tracking-normal shrink-0">
                      {link.num}
                    </span>
                    <span
                      className={cn(
                        "text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary"
                      )}
                    >
                      {link.label}
                    </span>
                  </a>
                );
              })}
            </nav>

            {/* Bottom Footer Info inside Drawer */}
            <div className="pt-6 pb-2 space-y-3 sm:space-y-4 border-t border-border/40 shrink-0">
              <p className="text-[10px] sm:text-xs font-bold tracking-[0.25em] sm:tracking-[0.3em] uppercase text-muted-foreground">
                CITY VETERINARY OFFICE · CAGAYAN DE ORO, PHILIPPINES
              </p>
              <a
                href="tel:0888572260"
                className="inline-block text-2xl sm:text-3xl font-bold text-primary hover:text-primary/90 transition-colors tracking-tight"
              >
                (088) 857-2260
              </a>

              <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3.5 text-foreground/75">
                  <a
                    href="https://www.facebook.com/CityVetCDO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-9 inline-flex items-center justify-center rounded-md border border-border/70 bg-card/50 hover:text-primary hover:border-primary/50 transition-colors"
                    aria-label="Facebook"
                  >
                    <FacebookIcon className="size-4.5" />
                  </a>
                  <a
                    href="https://cagayandeoro.gov.ph"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="size-9 inline-flex items-center justify-center rounded-md border border-border/70 bg-card/50 hover:text-primary hover:border-primary/50 transition-colors"
                    aria-label="Official Website"
                  >
                    <Globe className="size-4.5" />
                  </a>
                  <a
                    href="mailto:cityvet@cagayandeoro.gov.ph"
                    className="size-9 inline-flex items-center justify-center rounded-md border border-border/70 bg-card/50 hover:text-primary hover:border-primary/50 transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="size-4.5" />
                  </a>
                </div>

                <Button
                  asChild
                  size="sm"
                  className="h-10 px-5 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
