"use client";

import Link from "next/link";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { GoogleSignInButton } from "./google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Lock,
  PawPrint,
  HeartHandshake,
  QrCode,
} from "lucide-react";

export function AuthCard() {
  return (
    <div className="relative flex w-full flex-col justify-between bg-background p-6 sm:p-10 lg:p-14">
      {/* Top Header & Theme Switcher */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            ←
          </span>
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>

      {/* Center Auth Container */}
      <div className="mx-auto w-full max-w-md my-auto py-8">
        <div className="space-y-6">
          {/* Logo & Department Tag */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-card p-2 shadow-xs border border-border">
                <Image
                  src={Logo}
                  alt="SyncVet Logo"
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-foreground">
                    SYNCVET
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
                    Official
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Cagayan de Oro City Veterinary Office
                </p>
              </div>
            </div>

            <div className="pt-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Sign in to SyncVet
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                Continue with your Google account to access pet health passports, vaccination records, and veterinary services.
              </p>
            </div>
          </div>

          {/* Quick Value Highlights */}
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-muted/30 p-2.5 border border-border/50 text-center">
            <div className="flex flex-col items-center gap-1 p-1">
              <QrCode className="size-4 text-primary" />
              <span className="text-[10px] font-medium text-foreground">
                QR Passport
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-1 border-x border-border/50">
              <PawPrint className="size-4 text-emerald-500" />
              <span className="text-[10px] font-medium text-foreground">
                Vax Records
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 p-1">
              <HeartHandshake className="size-4 text-blue-500" />
              <span className="text-[10px] font-medium text-foreground">
                CVO Services
              </span>
            </div>
          </div>

          {/* Single Google Sign-In Action */}
          <div className="pt-1">
            <GoogleSignInButton />
          </div>

          {/* Security & Data Integrity Assurance */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 backdrop-blur-md space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Lock className="size-3.5 text-emerald-500 shrink-0" />
              <span>Government-Grade Data Protection</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              All pet vaccination records and citizen health submissions are encrypted and synced directly with official City Veterinary Office databases.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Legal Copy */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
        <p>© 2026 SyncVet • City of Cagayan de Oro</p>
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
