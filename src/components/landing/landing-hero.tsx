"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Download,
  QrCode,
  PawPrint,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LANDING_IMAGES } from "@/lib/constants/images";

const APK_DOWNLOAD_URL =
  "https://www.dropbox.com/scl/fi/fz9maf2qy55zx7683mxwf/syncvet.apk?rlkey=bpow4wzey0ylnzj3z73ynp2kq&st=6gwsgp8u&dl=1";

const QR_CODE_URL = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&data=${encodeURIComponent(
  APK_DOWNLOAD_URL
)}`;

export function LandingHero() {
  return (
    <section id="hero" className="relative pt-20 sm:pt-24 md:pt-28 pb-10 sm:pb-16 md:pb-20 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-orange-500/5 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* ── Direct Top-View Split: Responsive from Tablet & Mobile (sm: 640px+) to Desktop ── */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 md:gap-8 lg:gap-10 items-center">
          
          {/* ── LEFT: Headline & Primary Actions (sm: 7 cols, lg: 6 cols) ── */}
          <div className="sm:col-span-7 lg:col-span-6 space-y-3.5 sm:space-y-4 md:space-y-5 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
              SyncVet for Android • v1.0
            </p>

            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[40px] leading-[1.12]">
              Connected Pet Care, <br />
              <span className="text-primary">Right on Your Phone.</span>
            </h1>

            <p className="text-xs sm:text-sm md:text-base text-muted-foreground leading-relaxed max-w-lg">
              Download the official SyncVet Android App for instant offline access to digital pet passports, verified vaccination logs, and smart reminders.
            </p>

            {/* Direct Action Buttons */}
            <div className="pt-1 flex flex-wrap items-center gap-2.5 sm:gap-3">
              <Button
                asChild
                size="lg"
                className="h-9.5 sm:h-10 md:h-11 px-4 sm:px-5 md:px-6 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] flex items-center gap-2"
              >
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="syncvet.apk"
                >
                  <Download className="size-3.5 sm:size-4" />
                  <span>Download Android APK</span>
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-9.5 sm:h-10 md:h-11 px-3.5 sm:px-4 md:px-5 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted/80 text-foreground transition-all"
              >
                <Link href="/sign-in" className="inline-flex items-center gap-1.5">
                  <span>Web Portal</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>

            {/* Feature Checkmarks */}
            <div className="pt-1 sm:pt-2 flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 md:gap-x-5 gap-y-1 text-[10.5px] sm:text-xs text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
                100% Offline Access
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
                Digital QR Passports
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3 sm:size-3.5 text-emerald-500 shrink-0" />
                Smart Reminders
              </span>
            </div>
          </div>

          {/* ── RIGHT: Direct Top-Level Scannable QR Code & Companion Preview (sm: 5 cols, lg: 6 cols) ── */}
          <div className="sm:col-span-5 lg:col-span-6 w-full flex justify-center sm:justify-end">
            <div className="w-full sm:max-w-md rounded-2xl sm:rounded-3xl border border-border/90 bg-card p-4 sm:p-5 md:p-6 lg:p-7 shadow-xl space-y-3.5 sm:space-y-4 md:space-y-5 relative overflow-hidden">
              
              {/* Header Label */}
              <div className="flex items-center justify-between pb-2 sm:pb-2.5 md:pb-3 border-b border-border/70">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <QrCode className="size-3.5 sm:size-4 text-primary" />
                  <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground">
                    Instant Android Install
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Direct APK
                </Badge>
              </div>

              {/* Scannable QR Code & Camera Prompt */}
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 md:gap-5 p-3 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-muted/20 border border-border/70">
                <a
                  href={APK_DOWNLOAD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  download="syncvet.apk"
                  className="relative size-28 sm:size-30 md:size-36 bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 shadow-md border border-border/80 flex items-center justify-center shrink-0 group transition-transform duration-200 hover:scale-102"
                  title="Click or scan to download SyncVet APK"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={QR_CODE_URL}
                    alt="Scan QR code to download SyncVet Android APK"
                    className="size-full object-contain rounded-lg sm:rounded-xl"
                  />
                  <div className="absolute inset-0 bg-primary/10 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Download className="size-5 sm:size-6 text-primary drop-shadow" />
                  </div>
                </a>

                <div className="space-y-1 sm:space-y-1.5 text-center sm:text-left">
                  <p className="text-xs font-bold text-foreground">
                    Scan with Phone Camera
                  </p>
                  <p className="text-[10.5px] sm:text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                    Point your camera at the QR code to install directly on Android.
                  </p>
                  <a
                    href={APK_DOWNLOAD_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    download="syncvet.apk"
                    className="inline-flex items-center gap-1 text-[10.5px] sm:text-[11px] font-semibold text-primary hover:underline pt-0.5"
                  >
                    <Download className="size-3" />
                    <span>Click to download</span>
                  </a>
                </div>
              </div>

              {/* Live Passport Status Preview Bar */}
              <div className="p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-background border border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <div className="relative size-6 sm:size-7 md:size-8 rounded-lg overflow-hidden border border-border shrink-0">
                    <Image
                      src={LANDING_IMAGES.petBantay}
                      alt="Bantay"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] sm:text-xs font-bold text-foreground leading-none">Bantay’s Passport</p>
                    <p className="text-[9.5px] sm:text-[10px] text-muted-foreground mt-0.5">Anti-Rabies: Valid to 2027</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[8.5px] sm:text-[9.5px] md:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 sm:px-2 py-0.5 rounded-full">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
