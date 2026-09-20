"use client";

import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { ShieldCheck, Lock, Loader2, CheckCircle2 } from "lucide-react";

interface AuthLoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function AuthLoadingScreen({
  title = "Connecting with Google",
  subtitle = "Authorizing your digital animal health registry access...",
}: AuthLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none bg-background/80 backdrop-blur-xl animate-in fade-in duration-300"
    >
      {/* Subtle architectural background ambiance */}
      <div className="absolute inset-0 bg-[radial-gradient(#d1d5db_1px,transparent_1px)] dark:bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[32rem] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 size-[28rem] rounded-full bg-emerald-500/10 blur-[90px] pointer-events-none" />

      {/* Elevated Centered Floating Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl p-7 sm:p-9 shadow-2xl shadow-black/15 transition-all">
        {/* Subtle top border illumination */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* ── 1. Brand Lockup Header ── */}
        <div className="flex items-center justify-between pb-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-muted/60 p-1.5 border border-border/60 flex items-center justify-center shadow-xs">
              <Image
                src={Logo}
                alt="SyncVet Logo"
                className="size-7 object-contain"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-foreground leading-none">
                  SYNCVET
                </span>
                <span className="rounded-[4px] bg-primary/15 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                  Official
                </span>
              </div>
              <span className="mt-1 text-[8.5px] font-bold uppercase tracking-widest text-muted-foreground leading-none">
                CITY VETERINARY OFFICE · CDO
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Secure TLS</span>
          </div>
        </div>

        {/* ── 2. Animated Center Radar / Spinner ── */}
        <div className="py-7 flex flex-col items-center text-center space-y-4">
          <div className="relative flex items-center justify-center size-20">
            {/* Pulsing glow underlay */}
            <div className="absolute inset-0 rounded-full bg-primary/15 blur-md animate-pulse" />
            
            {/* Smooth spinning dual-ring */}
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary/40 animate-spin [animation-duration:1.2s]" />
            <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-emerald-500 border-l-emerald-500/40 animate-spin [animation-duration:2s] [animation-direction:reverse]" />
            
            {/* Center icon hub */}
            <div className="relative size-12 rounded-full bg-background border border-border/70 flex items-center justify-center shadow-inner">
              <ShieldCheck className="size-6 text-primary animate-pulse" />
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-1.5 max-w-xs mx-auto">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* ── 3. Multi-Step Verification Status ── */}
        <div className="rounded-2xl bg-muted/40 border border-border/60 p-3.5 space-y-2.5 text-left mb-6">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              <span>Google Identity Verified</span>
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              Ready
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Loader2 className="size-3.5 text-primary animate-spin shrink-0" />
              <span>Syncing Animal Health Profile...</span>
            </span>
            <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
              In Progress
            </span>
          </div>

          {/* Smooth animated progress track */}
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden relative mt-1">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full"
              style={{
                width: "40%",
                animation: "syncvet-flow 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </div>

        {/* ── 4. Trust Seal Footer ── */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground/80 font-medium pt-1 border-t border-border/40">
          <Lock className="size-3.5 text-muted-foreground/70 shrink-0" />
          <span>City Government of Cagayan de Oro • Official Single Sign-On</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes syncvet-flow {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(110%);
          }
          100% {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
}
