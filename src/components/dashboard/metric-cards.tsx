"use client";

import {
  PawPrint,
  Users,
  Stethoscope,
  Syringe,
  CheckCircle2,
  AlertTriangle,
  Package,
  MapPin,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn, isTodayDate } from "@/lib/utils";
import { useCVO } from "@/lib/cvo-context";

export function MetricCards() {
  const { consultations, animalControlCases, inventory, offlineRecords, activeRoleView } = useCVO();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Live count queries from Supabase
  const { data: totalPets = 0 } = useQuery<number>({
    queryKey: ["live_pets_count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("pets").select("*", { count: "exact", head: true });
      return error ? 0 : (count ?? 0);
    },
    staleTime: 15000,
  });

  const { data: totalOwners = 0 } = useQuery<number>({
    queryKey: ["live_owners_count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("users").select("*", { count: "exact", head: true });
      return error ? 0 : (count ?? 0);
    },
    staleTime: 15000,
  });

  const { data: totalVaccinations = 0 } = useQuery<number>({
    queryKey: ["live_vax_records_count"],
    queryFn: async () => {
      const { count, error } = await supabase.from("vaccination_records").select("*", { count: "exact", head: true });
      return error ? 0 : (count ?? 0);
    },
    staleTime: 15000,
  });

  // Filter encounters strictly for today so veterinarians and staff are never confused by prior/future dates
  const todaysConsultations = useMemo(
    () => consultations.filter((c) => isTodayDate(c.date)),
    [consultations]
  );
  const todaysCompleted = todaysConsultations.filter((c) => c.status === "completed").length;
  const todaysInProgress = todaysConsultations.filter((c) => c.status === "in-consultation" || c.status === "treatment").length;
  const todaysWaiting = todaysConsultations.filter((c) => c.status === "waiting").length;

  const lowStockCount = inventory.filter((i) => i.status === "low-stock" || i.status === "expiring-soon").length;
  const pendingOfflineSync = offlineRecords.filter((r) => r.syncStatus === "pending").length;
  const activeImpounded = animalControlCases.filter((ac) => ac.status === "impounded").length;
  const totalVaccineDoses = inventory
    .filter((i) => i.category === "Vaccines")
    .reduce((sum, item) => sum + item.stock, 0);

  const activeBarangaysCount = useMemo(() => {
    const set = new Set<string>();
    consultations.forEach((c) => c.ownerBarangay && set.add(c.ownerBarangay));
    animalControlCases.forEach((a) => a.barangay && set.add(a.barangay));
    return set.size;
  }, [consultations, animalControlCases]);

  // Build role-specific metric cards with 100% live database figures
  const getMetrics = () => {
    switch (activeRoleView) {
      case "Veterinarian":
        return [
          {
            title: "Today's Consultations",
            value: `${todaysConsultations.length}`,
            icon: Stethoscope,
            gradient: "from-emerald-500/10",
            iconClass: "text-emerald-500",
            badge: todaysWaiting > 0 ? `${todaysWaiting} Waiting` : "Queue Clear",
            badgeClass: todaysWaiting > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10",
            sub: "Clinical EMR encounters today",
          },
          {
            title: "In Treatment",
            value: `${todaysInProgress}`,
            icon: Clock,
            gradient: "from-blue-500/10",
            iconClass: "text-blue-500",
            badge: todaysInProgress > 0 ? "Active In Exam" : "Floor Clear",
            badgeClass: todaysInProgress > 0 ? "text-blue-500 bg-blue-500/10" : "text-muted-foreground bg-muted/20",
            sub: "Currently in exam rooms today",
          },
          {
            title: "Completed Encounters",
            value: `${todaysCompleted}`,
            icon: CheckCircle2,
            gradient: "from-indigo-500/10",
            iconClass: "text-indigo-400",
            badge: todaysCompleted > 0 ? "Resolved Today" : "0 Today",
            badgeClass: todaysCompleted > 0 ? "text-indigo-400 bg-indigo-400/10" : "text-muted-foreground bg-muted/20",
            sub: "Clinical treatments concluded today",
          },
          {
            title: "Rabies Quarantine Cases",
            value: `${activeImpounded}`,
            icon: ShieldAlert,
            gradient: "from-red-500/10",
            iconClass: "text-red-500",
            badge: activeImpounded > 0 ? "Under Watch" : "No Bite Cases",
            badgeClass: activeImpounded > 0 ? "text-red-500 bg-red-500/10" : "text-emerald-500 bg-emerald-500/10",
            sub: "Mandatory bite observation",
          },
        ];

      case "Staff":
        return [
          {
            title: "Registered Animals",
            value: `${totalPets.toLocaleString()}`,
            icon: PawPrint,
            gradient: "from-indigo-500/10",
            iconClass: "text-indigo-400",
            badge: "Pet Registry",
            badgeClass: "text-indigo-400 bg-indigo-400/10",
            sub: "Registered canine & feline",
          },
          {
            title: "Registered Pet Owners",
            value: `${totalOwners.toLocaleString()}`,
            icon: Users,
            gradient: "from-blue-500/10",
            iconClass: "text-blue-400",
            badge: "Verified Citizens",
            badgeClass: "text-blue-400 bg-blue-400/10",
            sub: "Citizen user accounts",
          },
          {
            title: "Total Vaccinations",
            value: `${totalVaccinations.toLocaleString()}`,
            icon: Syringe,
            gradient: "from-emerald-500/10",
            iconClass: "text-emerald-500",
            badge: "Immunized",
            badgeClass: "text-emerald-500 bg-emerald-500/10",
            sub: "Administered anti-rabies",
          },
          {
            title: "Today's Walk-in Queue",
            value: `${todaysConsultations.length}`,
            icon: Clock,
            gradient: "from-amber-500/10",
            iconClass: "text-amber-500",
            badge: todaysWaiting > 0 ? `${todaysWaiting} In Queue` : "Queue Clear",
            badgeClass: todaysWaiting > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10",
            sub: "Consultation & vaccines today",
          },
        ];

      case "Administrator":
      default:
        return [
          {
            title: "Total Registered Animals",
            value: `${totalPets.toLocaleString()}`,
            icon: PawPrint,
            gradient: "from-indigo-500/10",
            iconClass: "text-indigo-400",
            badge: "Pet Registry",
            badgeClass: "text-indigo-400 bg-indigo-400/10",
            sub: "Verified pet profiles",
          },
          {
            title: "Today's Walk-in Encounters",
            value: `${todaysConsultations.length}`,
            icon: Stethoscope,
            gradient: "from-emerald-500/10",
            iconClass: "text-emerald-500",
            badge: todaysInProgress > 0 ? `${todaysInProgress} Active` : todaysConsultations.length > 0 ? `${todaysConsultations.length} Today` : "0 Today",
            badgeClass: "text-emerald-500 bg-emerald-500/10",
            sub: "Clinical & vaccinations today",
          },
          {
            title: "Inventory & FEFO Alerts",
            value: `${lowStockCount}`,
            icon: AlertTriangle,
            gradient: "from-amber-500/10",
            iconClass: "text-amber-500",
            badge: lowStockCount > 0 ? "Action Required" : "All Normal",
            badgeClass: lowStockCount > 0 ? "text-amber-500 bg-amber-500/10" : "text-emerald-500 bg-emerald-500/10",
            sub: "Low stock & near expiry",
          },
          {
            title: "Registered Pet Owners",
            value: `${totalOwners.toLocaleString()}`,
            icon: Users,
            gradient: "from-primary/10",
            iconClass: "text-primary",
            badge: "LGU Citizens",
            badgeClass: "text-primary bg-primary/10",
            sub: "Active owner accounts",
          },
        ];
    }
  };

  const metrics = getMetrics();

  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4 pt-1">
      {metrics.map((m) => (
        <Card key={m.title} className="bg-card border-border shadow-xs rounded-xl overflow-hidden relative group py-0 transition-all hover:border-primary/40 min-w-0">
          <div className={cn("absolute inset-0 bg-gradient-to-br via-transparent to-transparent pointer-events-none", m.gradient)} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 relative z-10 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <m.icon className={cn("h-4 w-4 shrink-0", m.iconClass)} />
              <CardTitle className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate">{m.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-1 relative z-10 min-w-0">
            <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">{m.value}</div>
            <div className="flex items-center gap-1.5 mt-2 min-w-0 flex-wrap">
              <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0", m.badgeClass)}>{m.badge}</span>
              <p className="text-[10px] text-muted-foreground/70 truncate">{m.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
