"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { Button } from "@/components/ui/button";
import { Menu, X, PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "#overview" },
  { label: "Records", href: "#health-records" },
  { label: "Care", href: "#appointments" },
  { label: "Steps", href: "#how-it-works" },
  { label: "About", href: "#about" },
];

export function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
        setMobileOpen(false);
      }
    }
  };

  return (
    <header className="fixed top-3 sm:top-5 inset-x-0 z-50 flex flex-col items-center px-4 sm:px-6 md:px-8 pointer-events-none transition-all duration-300">
      {/* Floating Main Translucent Capsule Container */}
      <div
        className={cn(
          "pointer-events-auto w-full max-w-6xl rounded-full border transition-all duration-300",
          "px-3.5 sm:px-5 md:px-6 py-2 sm:py-2.5 flex items-center justify-between",
          isScrolled
            ? "bg-background/85 dark:bg-background/75 backdrop-blur-2xl backdrop-saturate-150 border-border/80 shadow-lg shadow-black/5 dark:shadow-black/25"
            : "bg-background/65 dark:bg-background/55 backdrop-blur-xl backdrop-saturate-150 border-border/50 shadow-md shadow-black/3 dark:shadow-black/15"
        )}
      >
        {/* Brand Logo */}
        <Link
          href="#hero"
          onClick={(e) => scrollToSection(e, "#hero")}
          className="flex items-center gap-2 group select-none pl-0.5 sm:pl-1 shrink-0"
        >
          <div className="size-7 sm:size-8 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
            {mounted ? (
              <Image
                src={Logo}
                alt="SyncVet"
                className="size-full object-contain"
                priority
              />
            ) : (
              <PawPrint className="size-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[13px] sm:text-sm font-extrabold tracking-tight text-foreground leading-none">
              SYNCVET
            </span>
            <span className="mt-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-primary leading-none">
              VETERINARY PLATFORM
            </span>
          </div>
        </Link>

        {/* Center Nav Links (Visible on md: >= 768px) */}
        <nav className="hidden md:flex items-center gap-4 lg:gap-7 text-xs lg:text-sm font-medium">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => scrollToSection(e, link.href)}
              className="text-muted-foreground hover:text-foreground transition-colors duration-150 py-1 whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions (Visible on md: >= 768px to stay synced with nav links) */}
        <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0">
          <Link
            href="/sign-in"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors duration-150 whitespace-nowrap"
          >
            Sign In
          </Link>

          <Button
            asChild
            size="sm"
            className="h-8.5 px-4 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-150 shadow-xs active:scale-[0.98] whitespace-nowrap"
          >
            <Link href="/sign-in">
              Get Started
            </Link>
          </Button>
        </div>

        {/* Mobile Menu Trigger (Visible on < md: < 768px) */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground rounded-full border border-border/70 bg-card/40 backdrop-blur-md transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </div>

      {/* Floating Mobile Drawer */}
      {mobileOpen && (
        <div className="pointer-events-auto w-full max-w-6xl mt-2 rounded-3xl border border-border/70 bg-background/90 dark:bg-background/85 backdrop-blur-2xl p-5 sm:p-6 shadow-2xl animate-fade-in-up">
          <nav className="flex flex-col gap-3 text-sm font-medium mb-5">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-foreground/90 hover:text-primary transition-colors py-1.5 font-medium"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2.5 pt-4 border-t border-border/60">
            <Button asChild variant="outline" size="sm" className="w-full justify-center rounded-full text-xs font-semibold">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
            </Button>
            <Button asChild size="sm" className="w-full justify-center rounded-full text-xs font-semibold bg-primary text-primary-foreground">
              <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
