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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCVO } from "@/lib/cvo-context";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

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

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
        <div>
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
            <span>Public Health & Rabies Surveillance</span>
          </CardTitle>
          <CardDescription className="text-[11px] text-muted-foreground/80">
            City-wide Rabies control program metrics, live bite case surveillance, and barangay priority zones
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0 self-start sm:self-auto">
          Target Herd Immunity: 70%
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Core Stats Bar */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
          <div className="p-2 sm:p-2.5 rounded-lg border border-border/60 bg-muted/20 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Rabies Doses</p>
            <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
              {vaxCount} <span className="text-[11px] font-normal text-muted-foreground">doses</span>
            </p>
            <p className="text-[9px] text-emerald-600 font-medium mt-1 truncate">Live database total</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg border border-border/60 bg-muted/20 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Registered Pets</p>
            <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
              {petCount} <span className="text-[11px] font-normal text-muted-foreground">pets</span>
            </p>
            <p className="text-[9px] text-blue-500 font-medium mt-1 truncate">Total in CDO registry</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg border border-border/60 bg-muted/20 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Barangays Active</p>
            <p className="text-base sm:text-lg font-bold text-foreground mt-0.5 truncate">
              {barangaysCoveredCount} <span className="text-[11px] font-normal text-muted-foreground">/ 80</span>
            </p>
            <p className="text-[9px] text-muted-foreground font-medium mt-1 truncate">Real clinical records</p>
          </div>
          <div className="p-2 sm:p-2.5 rounded-lg border border-border/60 bg-muted/20 min-w-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">Bite Incidents</p>
            <p className={`text-base sm:text-lg font-bold mt-0.5 truncate ${biteCases.length > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {biteCases.length} cases
            </p>
            <p className="text-[9px] text-muted-foreground font-medium mt-1 truncate">14-day quarantine</p>
          </div>
        </div>

        {/* High-Priority Barangays Section */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Flame className="size-3 text-red-500" /> Active Barangay Surveillance
          </p>
          {barangayStats.length > 0 ? (
            <div className="space-y-1.5">
              {barangayStats.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/15 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <div>
                      <span className="font-bold text-foreground">
                        {b.name.toLowerCase().includes("cagayan de oro")
                          ? "Central CDO / Carmen CVO Area"
                          : b.name.toLowerCase().startsWith("barangay") || b.name.toLowerCase().startsWith("brgy")
                          ? b.name
                          : `Barangay ${b.name}`}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2">
                        {b.consultations} Encounters
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.biteCases > 0 ? (
                      <Badge variant="outline" className="text-[9px] border-amber-500/30 text-amber-500 bg-amber-500/10">
                        {b.biteCases} Bite Cases
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                        Clear
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-border/70 text-center space-y-1">
              <CheckCircle2 className="size-5 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-foreground">No active bite or quarantine cases</p>
              <p className="text-[11px] text-muted-foreground">
                Barangay metrics will appear automatically in real-time as clinical consultations and animal control cases are logged.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
