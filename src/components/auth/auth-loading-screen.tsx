"use client";

import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { Loader2 } from "lucide-react";

interface AuthLoadingScreenProps {
  title?: string;
  subtitle?: string;
}

export function AuthLoadingScreen({
  title = "Signing you in...",
  subtitle = "Please wait while we connect your account to SyncVet.",
}: AuthLoadingScreenProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-4 text-center select-none animate-in fade-in duration-200"
    >
      <div className="flex flex-col items-center max-w-sm space-y-5">
        {/* SyncVet Logo directly without any box or container */}
        <Image
          src={Logo}
          alt="SyncVet Logo"
          className="size-12 object-contain"
          priority
        />

        {/* Minimalist Spinner & Status Text */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Loader2 className="size-4 animate-spin text-primary" />
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h2>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}
