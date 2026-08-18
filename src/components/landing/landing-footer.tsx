"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

  return (
    <footer id="footer" className="border-t border-border/70 py-12 sm:py-16 text-foreground bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Top Grid */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-8 lg:gap-12 pb-10 sm:pb-12 border-b border-border/70">
          
          {/* Brand Column (md: 6 cols) */}
          <div className="col-span-2 md:col-span-6 space-y-3.5 sm:space-y-4">
            <Link href="#hero" onClick={(e) => scrollToSection(e, "#hero")} className="flex items-center gap-2.5">
              <div className="size-8 flex items-center justify-center shrink-0">
                {mounted ? (
                  <Image
                    src={Logo}
                    alt="SyncVet"
                    className="size-full object-contain"
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

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              Connected pet care, made simpler. Keeping companion health records, appointments, and veterinary schedules effortlessly synchronized.
            </p>
          </div>

          {/* Product Links (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Product
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <a href="#overview" onClick={(e) => scrollToSection(e, "#overview")} className="hover:text-foreground transition-colors">
                  Overview
                </a>
              </li>
              <li>
                <a href="#health-records" onClick={(e) => scrollToSection(e, "#health-records")} className="hover:text-foreground transition-colors">
                  Health Records
                </a>
              </li>
              <li>
                <a href="#appointments" onClick={(e) => scrollToSection(e, "#appointments")} className="hover:text-foreground transition-colors">
                  Appointments
                </a>
              </li>
              <li>
                <a href="#how-it-works" onClick={(e) => scrollToSection(e, "#how-it-works")} className="hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#hero" onClick={(e) => scrollToSection(e, "#hero")} className="hover:text-foreground transition-colors">
                  Android App (APK)
                </a>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors font-medium text-primary">
                  Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Links (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Company
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <a href="#about" onClick={(e) => scrollToSection(e, "#about")} className="hover:text-foreground transition-colors">
                  About SyncVet
                </a>
              </li>
              <li>
                <Link href="/get-help" className="hover:text-foreground transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/field-operations" className="hover:text-foreground transition-colors">
                  Field Operations
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links (2 cols) */}
          <div className="col-span-1 md:col-span-2 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Legal
            </p>
            <ul className="space-y-2.5 text-xs text-muted-foreground">
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Row */}
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 SyncVet. All rights reserved.</p>

          <div className="flex items-center gap-3.5">
            <span className="text-[11px] text-center sm:text-right">Designed for modern, connected veterinary care.</span>
            <ThemeToggle />
          </div>
        </div>

      </div>
    </footer>
  );
}
