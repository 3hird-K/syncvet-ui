"use client";

import Image from "next/image";
import {
  Calendar,
  Bell,
  Clock,
  MapPin,
  CheckCircle2,
  Syringe,
  AlertCircle,
  CalendarCheck2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LANDING_IMAGES } from "@/lib/constants/images";

export function LandingAppointmentsShowcase() {
  return (
    <section id="appointments" className="py-16 md:py-24 lg:py-32 border-t border-border/70 relative overflow-hidden bg-muted/15 scroll-mt-24">
      {/* Background Ambience */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
            Appointments & Tracking
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-3 sm:mb-4">
            Never lose track of what comes next.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            From routine wellness consultations to community field vaccination drives, SyncVet automates reminder timelines and syncs appointments directly with your accredited local veterinary station.
          </p>
        </div>

        {/* ── Asymmetric Multi-Tier Schedule & Care Hub UI ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-start">
          
          {/* Main Schedule Hub Card (md: 7 cols) */}
          <div className="md:col-span-7 rounded-3xl border border-border/90 bg-card p-5 sm:p-7 lg:p-8 shadow-md space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between pb-3.5 sm:pb-4 border-b border-border/70">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="size-9 sm:size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <CalendarCheck2 className="size-4.5 sm:size-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground">Upcoming Care Timeline</h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">Connected to City Veterinary System</p>
                </div>
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full whitespace-nowrap">
                Live Sync
              </span>
            </div>

            {/* Appointment Item 1 (Highlighted Active Visit) */}
            <div className="p-4 sm:p-5 rounded-2xl border border-primary/30 bg-primary/5 space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="relative size-9 sm:size-10 rounded-xl overflow-hidden border border-border shrink-0">
                    <Image
                      src={LANDING_IMAGES.vetElena}
                      alt="Dr. Elena Santos"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">Annual Health Exam</h4>
                      <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] px-1.5 py-0.2 shrink-0">
                        Tomorrow
                      </Badge>
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                      Attending: <strong className="text-foreground font-semibold">Dr. Elena Santos</strong> (DVM)
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-primary">9:30 AM</span>
                  <p className="text-[10px] text-muted-foreground font-mono">Station 2</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t border-primary/15">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">City Veterinary Station • Lapasan Main Center</span>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 ml-2">
                  Confirmed
                </span>
              </div>
            </div>

            {/* Appointment Item 2 (Community Field Vaccination Drive) */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="size-8 sm:size-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Syringe className="size-4 sm:size-4.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">Barangay Rabies Outreach Drive</h4>
                    <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Mobile Veterinary Unit • Carmen Covered Court</p>
                  </div>
                </div>
                <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground shrink-0">
                  Jun 18
                </span>
              </div>
            </div>

          </div>

          {/* Right Side: Smart Booster Intelligence & Alerts (md: 5 cols) */}
          <div className="md:col-span-5 space-y-4">
            
            {/* Intelligent Countdown Card */}
            <div className="rounded-3xl border border-border/90 bg-card p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-7 sm:size-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Bell className="size-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground">Booster Intelligence</h4>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">Auto-Calculated</span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative size-5 sm:size-6 rounded-full overflow-hidden shrink-0">
                      <Image src={LANDING_IMAGES.petBantay} alt="Bantay" fill className="object-cover" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Bantay’s Deworming</span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    In 14 days
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full w-[78%]" />
                </div>
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">
                  Calculated from dosage on March 2, 2026. Notification alert triggers 3 days prior.
                </p>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/30 border border-border/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="relative size-5 sm:size-6 rounded-full overflow-hidden shrink-0">
                      <Image src={LANDING_IMAGES.petLuna} alt="Luna" fill className="object-cover" />
                    </div>
                    <span className="text-xs font-bold text-foreground">Luna’s FVRCP Core</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    In 3 months
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full w-[35%]" />
                </div>
              </div>
            </div>

            {/* Instant Notification Callout */}
            <div className="rounded-2xl border border-border/90 bg-card p-3.5 sm:p-4 flex items-center gap-3 shadow-xs">
              <div className="size-7 sm:size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="size-4" />
              </div>
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                Automated SMS & calendar alerts prevent missed immunization intervals.
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
