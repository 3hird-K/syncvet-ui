"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Logo from "@/assets/logo-dark.png";
import { GoogleSignInButton } from "./google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  QrCode,
  ShieldCheck,
  CalendarCheck,
  ArrowLeft,
  Lock,
} from "lucide-react";

export function AuthCard() {
  const pathname = usePathname();
  const isSignUp = pathname?.includes("sign-up");

  return (
    <div className="relative flex w-full flex-col justify-between bg-background p-6 sm:p-10 lg:p-14 min-h-screen">
      {/* ── Top Header Navigation ── */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex size-8 items-center justify-center rounded-lg border border-border/80 bg-card text-muted-foreground shadow-2xs group-hover:border-primary/40 group-hover:text-primary transition-all">
            <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          </span>
          <span className="tracking-wide">Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Center Authentication Container ── */}
      <div className="mx-auto w-full max-w-md my-auto py-8">
        <div className="space-y-6">
          {/* Official Agency Brand Lockup matching Landing Navbar */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-card p-2 shadow-xs border border-border/80">
              <Image
                src={Logo}
                alt="SyncVet Logo"
                className="size-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-tight text-foreground leading-none">
                  SYNCVET
                </span>
                <span className="rounded-[4px] bg-primary/10 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                  Official
                </span>
              </div>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none">
                CITY VETERINARY OFFICE · CDO
              </span>
            </div>
          </div>

          {/* Editorial Headline & Narrative */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="h-px w-6 bg-primary/70" />
              <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-primary">
                {isSignUp ? "CITIZEN PET REGISTRATION" : "MUNICIPAL PORTAL ACCESS"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-tight">
              {isSignUp ? (
                <>
                  Register your companion on{" "}
                  <span className="font-extrabold text-foreground">SyncVet</span>
                </>
              ) : (
                <>
                  Welcome back to{" "}
                  <span className="font-extrabold text-foreground">SyncVet</span>
                </>
              )}
            </h1>

            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed font-normal">
              {isSignUp
                ? "Create an official guardian account to enroll your companion animals into Cagayan de Oro's municipal registry and obtain a digital pet passport."
                : "Sign in with your Google account to manage pet health records, verify rabies vaccination status, and check upcoming barangay clinic drives."}
            </p>
          </div>

          {/* Primary Authentication Action */}
          <div className="pt-1">
            <GoogleSignInButton mode={isSignUp ? "sign-up" : "sign-in"} />
          </div>

          {/* Route Switcher (Sign In <-> Sign Up) */}
          <div className="text-center">
            {isSignUp ? (
              <p className="text-xs text-muted-foreground">
                Already registered with SyncVet?{" "}
                <Link
                  href="/sign-in"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign in to portal
                </Link>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                New pet guardian in Cagayan de Oro?{" "}
                <Link
                  href="/sign-up"
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </Link>
              </p>
            )}
          </div>

          {/* ── Editorial Feature Access List (Matching Landing Services Aesthetic) ── */}
          <div className="space-y-2.5 pt-2 border-t border-border/60">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
              OFFICIAL PORTAL CAPABILITIES
            </p>

            <div className="space-y-2">
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card">
                <div className="size-7.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <QrCode className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    Digital QR Pet Passport
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                    Instant scan verification for municipal anti-rabies compliance & travel clearance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card">
                <div className="size-7.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    Verified Immunization History
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                    Official records authenticated directly by licensed City Veterinary Office personnel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/50 p-3 transition-colors hover:border-primary/40 hover:bg-card">
                <div className="size-7.5 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarCheck className="size-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">
                    Barangay Outreach Schedules
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                    Real-time schedule alerts for free anti-rabies drives across 80 barangays.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Official Security & Privacy Note */}
          <div className="flex items-center gap-2 pt-1 text-[10.5px] text-muted-foreground">
            <Lock className="size-3 text-emerald-500 shrink-0" />
            <span>Encrypted municipal database · RA 9482 Anti-Rabies & RA 10173 Compliant</span>
          </div>
        </div>
      </div>

      {/* ── Footer Legal Copy ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
        <p>© 2026 City Veterinary Office of Cagayan de Oro</p>
        <div className="flex items-center gap-3">
          <Link href="#privacy" className="hover:underline hover:text-foreground">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="#terms" className="hover:underline hover:text-foreground">
            Terms of Service
          </Link>
          <span>•</span>
          <Link href="/get-help" className="hover:underline hover:text-foreground">
            Help Center
          </Link>
        </div>
      </div>
    </div>
  );
}
