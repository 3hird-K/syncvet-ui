"use client";

import { MetricCards } from "@/components/dashboard/metric-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TodaysOperationsCard } from "@/components/dashboard/todays-operations-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Syringe,
  Stethoscope,
  PawPrint,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SlotCapacityManagerDialog } from "@/components/dashboard/slot-capacity-manager-dialog";
import { useCVO } from "@/lib/cvo-context";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getDailyQueue, getTodayDateStr, syncQueueFromSupabase } from "@/lib/cvo-queue";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { consultations, inventory, activeRoleView } = useCVO();

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const [queueState, setQueueState] = useState(() => getDailyQueue(todayStr));

  useEffect(() => {
    const handleUpdate = () => {
      setQueueState(getDailyQueue(todayStr));
    };
    window.addEventListener("syncvet-queue-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    syncQueueFromSupabase(todayStr).then((res) => {
      if (res) setQueueState(res);
    });

    const supabase = getPublicSupabaseClient();
    const channel = supabase
      .channel("cvo-queue-realtime-dashboard")
      .on("broadcast", { event: "queue_state_updated" }, (payload) => {
        if (payload?.payload?.date === todayStr) {
          setQueueState(payload.payload);
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tickets" },
        () => {
          syncQueueFromSupabase(todayStr).then((res) => {
            if (res) setQueueState(res);
          });
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("syncvet-queue-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [todayStr]);

  const activeTodayQueueCount = useMemo(() => {
    if (queueState.isClosed) return 0;
    return queueState.activeTickets.filter(
      (t) => (t.status === "waiting" || t.status === "in-consultation")
    ).length;
  }, [queueState]);

  // Check user role from Supabase and Clerk metadata
  const { data: dbUser, isLoading: isDbLoading } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data as { role?: string | null; full_name?: string | null } | null;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";

  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (isAdminEmail ? "Administrator" : metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );

  const isStaff =
    isAdminEmail ||
    userRole === "Administrator" ||
    userRole === "Veterinarian";

  const isPetOwner = !isStaff && !isDbLoading && isLoaded && userRole === "Pet Owner";

  useEffect(() => {
    if (isLoaded && !isDbLoading && isPetOwner) {
      router.replace("/pet-owner");
    }
  }, [isLoaded, isDbLoading, isPetOwner, router]);

  if (!isLoaded || isDbLoading) {
    return <DashboardSkeleton variant="admin" />;
  }

  if (isPetOwner) {
    return <DashboardSkeleton variant="pet-owner" />;
  }

  return (
    <div className="flex-1 w-full min-w-0 max-w-7xl mx-auto space-y-5 p-4 sm:p-5 md:p-6 pb-10 bg-background text-foreground">
      {/* ── 1. CVO Command Center Header ── */}
      <DashboardHeader />

      {/* ── 2. Top-level Summary Metric Cards ── */}
      <MetricCards />

      {/* ── 3. Quick Municipal Services Hub (What CVO & Pet Owners Need) ── */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Official City Veterinary Services
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Direct access to essential municipal walk-in services and citizen requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SlotCapacityManagerDialog
              isStaff={isStaff}
              userRole={userRole}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Service 1: Anti-Rabies Vaccination */}
          <Link
            href="/vaccination-records"
            className="group p-4 sm:p-5 rounded-2xl border border-emerald-500/20 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/[0.03] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 min-w-0 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Syringe className="size-5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                >
                  Free Service
                </Badge>
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                  Anti-Rabies Immunization
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Annual rabies vaccination, booster schedules, and cold-chain lot tracking for dogs and cats.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="font-bold">View Vaccination Ledger</span>
              <span className="size-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-all duration-200 group-hover:translate-x-1 group-hover:bg-emerald-600 group-hover:text-white">
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>

          {/* Service 2: Free Consultation & Clinical EMR */}
          <Link
            href="/consultations"
            className="group p-4 sm:p-5 rounded-2xl border border-blue-500/20 bg-card hover:border-blue-500/50 hover:bg-blue-500/[0.03] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 min-w-0 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <Stethoscope className="size-5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  Queue ({activeTodayQueueCount})
                </Badge>
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  Veterinary Consultation
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Free clinical examination, diagnosis, wound care, basic treatment, and prescriptions.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
              <span className="font-bold">Open Clinical Queue</span>
              <span className="size-7 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-all duration-200 group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white">
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>

          {/* Service 3: Pet Registration & Digital Passports */}
          <Link
            href="/pet-registry"
            className="group p-4 sm:p-5 rounded-2xl border border-primary/20 bg-card hover:border-primary/50 hover:bg-primary/[0.03] transition-all duration-200 shadow-xs hover:shadow-md flex flex-col justify-between space-y-4 min-w-0 cursor-pointer"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                  <PawPrint className="size-5" />
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
                >
                  Official Registry
                </Badge>
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  Pet Registration & QR Passports
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                  City-wide animal registry, ownership records, and digital QR collar passports for lost pet recovery.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
              <span className="font-bold">Open Pet Registry</span>
              <span className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center transition-all duration-200 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* ── 4. Row 1: Clinical Queue & Daily Operations ── */}
      <div>
        <TodaysOperationsCard />
      </div>

      {/* ── 5. Row 2: Real-Time Office Activity Timeline ── */}
      <ActivityFeed />
    </div>
  );
}
