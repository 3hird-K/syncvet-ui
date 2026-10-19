"use client";

import {
  Building2,
  Clock,
  Phone,
  MapPin,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CVOClinicInfoCardProps {
  vaxSlots?: number;
  surgerySlots?: number;
  onBookProcedureClick?: () => void;
  onRequestConsultationClick?: () => void;
}

export function CVOClinicInfoCard({
  vaxSlots = 10,
  surgerySlots = 5,
}: CVOClinicInfoCardProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
      <CardHeader className="p-3.5 sm:p-4 md:p-5 pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 sm:size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Building2 className="size-4 sm:size-4.5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-tight">
                CVO Clinic & Services
              </CardTitle>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
                Macabalan Headquarters & Free Care
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="text-[10px] px-2 py-0.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 font-bold shrink-0 gap-1.5 ml-auto sm:ml-0"
          >
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Walk-in Open
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4 space-y-4 text-xs">
        {/* Clinic Hours & Address */}
        <div className="space-y-2.5 rounded-xl bg-muted/25 p-3 border border-border/60">
          <div className="flex items-start gap-2.5 text-muted-foreground">
            <Clock className="size-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-xs">Mon – Fri, 8:00 AM – 5:00 PM</p>
              <p className="text-[11px] text-muted-foreground">General walk-ins & vaccination</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-muted-foreground pt-2 border-t border-border/40">
            <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-xs">J. Pacana St., Macabalan, CDO</p>
              <p className="text-[11px] text-muted-foreground">City Veterinary Office Main Clinic</p>
            </div>
          </div>
        </div>

        {/* Free Municipal Quotas (without decorative icon) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Daily Municipal Quotas
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              100% Free for CDO
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 space-y-1">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 block">
                Rabies Vax
              </span>
              <p className="text-xl font-extrabold text-foreground tracking-tight">
                {vaxSlots} <span className="text-xs font-normal text-muted-foreground">Slots</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Walk-in daily queue</p>
            </div>

            <div className="p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-1">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 block">
                Spay / Neuter
              </span>
              <p className="text-xl font-extrabold text-foreground tracking-tight">
                {surgerySlots} <span className="text-xs font-normal text-muted-foreground">Slots</span>
              </p>
              <p className="text-[10px] text-muted-foreground">By scheduled slot</p>
            </div>
          </div>
        </div>

        {/* Rabies Bite Center Helpline */}
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Phone className="size-3.5 text-amber-600" />
              Bite Center & Emergency
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded-md">
              24/7 Hotline
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            In case of bite exposure, immediately wash wound with soap and running water for 15 minutes, then report to CVO.
          </p>
          <div className="flex items-center gap-2 pt-1 font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
            <a href="tel:0888573180" className="hover:underline hover:text-foreground transition-colors">
              (088) 857-3180
            </a>
            <span className="text-muted-foreground">•</span>
            <a href="tel:911" className="hover:underline hover:text-foreground transition-colors">
              CDRRMD 911
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
