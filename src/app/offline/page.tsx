"use client";

import Link from "next/link";
import { WifiOff, RefreshCw, Home, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <div className="max-w-md w-full text-center space-y-6 rounded-3xl border border-border/60 bg-card/80 backdrop-blur-xl p-8 sm:p-10 shadow-xl">
        <div className="relative mx-auto size-20 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
          <WifiOff className="size-9" />
          <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-amber-500 ring-4 ring-background animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            You&apos;re Currently Offline
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            SyncVet requires an internet connection to sync live clinic queue numbers, schedule outreach drives, and authenticate securely.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-left text-muted-foreground flex items-start gap-3">
          <ShieldCheck className="size-4.5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground block">
              Data Protected Locally
            </span>
            <span>
              Your loaded pet records, medical history, and cached queue tickets remain stored locally on your device.
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <Button
            onClick={handleReload}
            className="w-full sm:flex-1 h-10.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-xs cursor-pointer"
          >
            <RefreshCw className="size-4" />
            <span>Try Reconnecting</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:flex-1 h-10.5 rounded-xl font-medium gap-2 cursor-pointer"
          >
            <Link href="/pet-owner">
              <Home className="size-4" />
              <span>Pet Portal</span>
            </Link>
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground/80">
          SyncVet Veterinary Platform • Cagayan de Oro City Veterinary Office
        </p>
      </div>
    </div>
  );
}

