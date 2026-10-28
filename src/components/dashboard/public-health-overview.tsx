"use client";

import { useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Syringe,
  PawPrint,
  ArrowRight,
  Activity,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCVO } from "@/lib/cvo-context";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

export function PublicHealthOverview() {
  const { consultations, animalControlCases } = useCVO();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Fetch real count of administered vaccination records
  const { data: vaxCount = 0 } = useQuery<number>({
    queryKey: ["live_vax_count_public_health"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("vaccination_records")
        .select("*", { count: "exact", head: true });
      return error ? 0 : (count ?? 0);
    },
    staleTime: 30000,
  });

  // Fetch real count of registered pets
  const { data: petCount = 0 } = useQuery<number>({
    queryKey: ["live_pets_count_public_health"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("pets")
        .select("*", { count: "exact", head: true });
      return error ? 0 : (count ?? 0);
    },
    staleTime: 30000,
  });

  // Real-time bite incidents from animal control
  const biteCases = useMemo(() => {
    return animalControlCases.filter(
      (c) =>
        c.reason.toLowerCase().includes("bite") ||
        c.reason.toLowerCase().includes("rabies")
    );
  }, [animalControlCases]);

  // Real barangay distribution from actual database entries
  const barangayStats = useMemo(() => {
    const map = new Map<string, { biteCount: number; consultations: number }>();

    animalControlCases.forEach((ac) => {
      if (!ac.barangay) return;
      const cur = map.get(ac.barangay) || { biteCount: 0, consultations: 0 };
      if (ac.reason.toLowerCase().includes("bite") || ac.reason.toLowerCase().includes("rabies")) {
        cur.biteCount += 1;
      }
      map.set(ac.barangay, cur);
    });

    consultations.forEach((cs) => {
      if (!cs.ownerBarangay) return;
      const cur = map.get(cs.ownerBarangay) || { biteCount: 0, consultations: 0 };
      cur.consultations += 1;
      map.set(cs.ownerBarangay, cur);
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      biteCases: data.biteCount,
      consultations: data.consultations,
      risk: data.biteCount > 1 ? "Elevated" : data.biteCount === 1 ? "Active Watch" : "Routine",
    }));
  }, [animalControlCases, consultations]);

  const barangaysCoveredCount = barangayStats.length;
  const herdImmunityPercent = Math.min(100, Math.round((vaxCount / Math.max(petCount, 1)) * 100));

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
      {/* ── Dashboard Header ── */}
      <CardHeader className="p-4 sm:p-5 pb-3.5 border-b border-border/50 bg-muted/15">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 sm:size-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <ShieldCheck className="size-4 sm:size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Public Health & Disease Surveillance
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold px-1.5 py-0 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 gap-1 shrink-0"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live CDO Surveillance
                </Badge>
              </div>
              <CardDescription className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug mt-0.5">
                City-wide Rabies control program, herd immunity tracking, and mobile field operations across 80 CDO barangays
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Badge
              variant="outline"
              className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30 px-2.5 py-1"
            >
              Target Herd Immunity: 70%
            </Badge>
            <Link href="/field-operations">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 font-semibold cursor-pointer rounded-lg border-border/70 hover:bg-muted/40"
              >
                <span>Field Schedule</span>
                <ArrowRight className="size-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* ── 1. Top-Level Metric KPI Tiles (4 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Metric 1: Rabies Doses */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-gradient-to-br from-emerald-500/5 via-card to-card hover:border-emerald-500/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Rabies Doses
              </span>
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Syringe className="size-3.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {vaxCount.toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted-foreground">doses</span>
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                Live database total
              </p>
            </div>
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Herd Immunity Progress</span>
                <span className="font-bold text-foreground">{herdImmunityPercent}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, herdImmunityPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 2: Registered Pets */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-gradient-to-br from-blue-500/5 via-card to-card hover:border-blue-500/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Registered Pets
              </span>
              <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <PawPrint className="size-3.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {petCount.toLocaleString()}{" "}
                <span className="text-xs font-normal text-muted-foreground">pets</span>
              </p>
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                Total in CDO registry
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Digital QR Passports</span>
              <span className="font-bold text-foreground">100% Active</span>
            </div>
          </div>

          {/* Metric 3: Active Barangays */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-gradient-to-br from-indigo-500/5 via-card to-card hover:border-indigo-500/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Barangays Active
              </span>
              <div className="size-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <MapPin className="size-3.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-foreground tracking-tight">
                {barangaysCoveredCount}{" "}
                <span className="text-xs font-normal text-muted-foreground">/ 80</span>
              </p>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                Clinical touchpoints
              </p>
            </div>
            <div className="pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>City Jurisdiction</span>
                <span className="font-bold text-foreground">80 Barangays</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${Math.max(5, Math.min(100, Math.round((barangaysCoveredCount / 80) * 100)))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metric 4: Bite Incidents */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-gradient-to-br from-amber-500/5 via-card to-card hover:border-amber-500/30 transition-all space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Bite Incidents
              </span>
              <div className={`size-7 rounded-lg flex items-center justify-center ${
                biteCases.length > 0
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}>
                <ShieldAlert className="size-3.5" />
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black tracking-tight ${
                biteCases.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}>
                {biteCases.length}{" "}
                <span className="text-xs font-normal text-muted-foreground">cases</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                14-day quarantine watch
              </p>
            </div>
            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Surveillance Status</span>
              <span className={`font-bold ${biteCases.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                {biteCases.length > 0 ? "Observation Active" : "Zero Active Bites"}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. Integrated Surveillance & Barangay Field Drives Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 pt-1">
          {/* Left: Active Barangay Surveillance Zones */}
          <div className="lg:col-span-7 rounded-xl border border-border/70 bg-muted/15 p-3.5 space-y-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="size-3.5 text-red-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Active Barangay Surveillance
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {barangayStats.length} reporting zones
              </span>
            </div>

            {barangayStats.length > 0 ? (
              <div className="space-y-2">
                {barangayStats.map((b) => (
                  <div
                    key={b.name}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <MapPin className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-foreground text-xs truncate">
                          {b.name.toLowerCase().includes("cagayan de oro")
                            ? "Central CDO / Carmen CVO Area"
                            : b.name.toLowerCase().startsWith("barangay") || b.name.toLowerCase().startsWith("brgy")
                            ? b.name
                            : `Barangay ${b.name}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {b.consultations} Official Encounters Recorded
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {b.biteCases > 0 ? (
                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/30 text-amber-600 bg-amber-500/10">
                          {b.biteCases} Bites
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                          Clear
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center border border-dashed rounded-lg border-border/70 space-y-1">
                <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
                <p className="text-xs font-semibold text-foreground">All CDO barangays currently clear</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Encounter tickets and animal control cases will stream into real-time surveillance automatically.
                </p>
              </div>
            )}
          </div>

          {/* Right: Barangay Vaccination Caravans & Mobile Units (Incorporated from Image 2) */}
          <div className="lg:col-span-5 rounded-xl border border-border/70 bg-gradient-to-br from-emerald-500/5 via-card to-card p-3.5 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Calendar className="size-3.5 text-emerald-600" />
                  Barangay Vaccination Drives
                </span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Active Field Units
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deploy veterinary teams to Carmen, Lapasan, Bulua, Nazareth, and peripheral barangays for anti-rabies vaccination caravans, microchipping, and bite surveillance.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Jurisdiction</p>
                <p className="text-sm font-black text-foreground mt-0.5">80 Barangays</p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase">Target</p>
                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">70% Herd Immunity</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <span className="text-[10px] text-muted-foreground">
                Mobile teams ready for deployment
              </span>
              <Link href="/field-operations">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl shadow-xs cursor-pointer"
                >
                  <span>Field Schedule</span>
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

