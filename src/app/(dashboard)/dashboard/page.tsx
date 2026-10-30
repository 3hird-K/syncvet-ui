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
import { NewConsultationDialog } from "@/components/dashboard/new-consultation-dialog";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { LogVaccinationDialog } from "@/components/dashboard/log-vaccination-dialog";
import { SlotCapacityManagerDialog } from "@/components/dashboard/slot-capacity-manager-dialog";
import { useCVO } from "@/lib/cvo-context";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { consultations, inventory, activeRoleView } = useCVO();

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
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-card hover:border-emerald-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Syringe className="size-4.5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  Free Service
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Anti-Rabies Immunization</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Annual rabies vaccination, booster schedules, and cold-chain lot tracking for dogs and cats.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="min-w-0 shrink">
                <LogVaccinationDialog />
              </div>
              <Link href="/vaccination-records" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground px-2">
                  Ledger <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Service 2: Free Consultation & Clinical EMR */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-card hover:border-blue-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Stethoscope className="size-4.5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600">
                  Walk-in Clinic
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Veterinary Consultation</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Free clinical examination, diagnosis, wound care, basic treatment, and prescriptions.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="min-w-0 shrink">
                <NewConsultationDialog />
              </div>
              <Link href="/consultations" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground px-2">
                  Queue ({consultations.length}) <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Service 3: Pet Registration & Digital Passports */}
          <div className="p-4 rounded-xl border border-primary/20 bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-3 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <PawPrint className="size-4.5" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Official ID
                </span>
              </div>
              <h4 className="font-bold text-sm text-foreground">Pet Registration & QR Passports</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                City-wide animal registry, ownership records, and digital QR collar passports for lost pet recovery.
              </p>
            </div>
            <div className="pt-2 border-t border-border/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
              <div className="min-w-0 shrink">
                <RegisterPetDialog />
              </div>
              <Link href="/pet-registry" className="shrink-0">
                <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground px-2">
                  Registry <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
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
