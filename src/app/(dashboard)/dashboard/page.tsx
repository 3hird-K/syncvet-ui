"use client";

import { MetricCards } from "@/components/dashboard/metric-cards";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TodaysOperationsCard } from "@/components/dashboard/todays-operations-card";
import { PublicHealthOverview } from "@/components/dashboard/public-health-overview";
import { InventoryFEFOCard } from "@/components/dashboard/inventory-fefo-card";
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
  Package,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
} from "lucide-react";
import Link from "next/link";
import { NewConsultationDialog } from "@/components/dashboard/new-consultation-dialog";
import { RegisterPetDialog } from "@/components/dashboard/register-pet-dialog";
import { LogVaccinationDialog } from "@/components/dashboard/log-vaccination-dialog";
import { useCVO } from "@/lib/cvo-context";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";

export default function DashboardHomePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { consultations, inventory, activeRoleView } = useCVO();

  // Check user role from Supabase and Clerk metadata
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );

  // If user role is Pet Owner or simulated role view is Pet Owner, immediately route to /pet-owner
  const isPetOwner = activeRoleView === "Pet Owner" || (isLoaded && userRole === "Pet Owner");

  useEffect(() => {
    if (isPetOwner) {
      router.replace("/pet-owner");
    }
  }, [isPetOwner, router]);

  if (isPetOwner) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center p-6">
        <div className="space-y-2">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Opening Your Pet Owner Portal...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-5 p-5 md:p-6 bg-background min-h-screen text-foreground">
      {/* ── 1. CVO Command Center Header ── */}
      <DashboardHeader />

      {/* ── 2. Top-level Summary Metric Cards ── */}
      <MetricCards />

      {/* ── 3. Quick Municipal Services Hub (What CVO & Pet Owners Need) ── */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">
              Official City Veterinary Services
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Direct access to essential municipal walk-in services and citizen requests
            </p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Cagayan de Oro LGU
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Service 1: Anti-Rabies Vaccination */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-card hover:border-emerald-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3">
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
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <LogVaccinationDialog />
              <Link href="/vaccination-records">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2">
                  Ledger <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Service 2: Free Consultation & Clinical EMR */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-card hover:border-blue-500/40 transition-all shadow-xs flex flex-col justify-between space-y-3">
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
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <NewConsultationDialog />
              <Link href="/consultations">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2">
                  Queue ({consultations.length}) <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Service 3: Pet Registration & Digital Passports */}
          <div className="p-4 rounded-xl border border-primary/20 bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between space-y-3">
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
            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
              <RegisterPetDialog />
              <Link href="/pet-registry">
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2">
                  Registry <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Main Operations Row: Today's Clinic Queue & Public Health Status ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TodaysOperationsCard />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* ── 5. Field Operations & Cold-Chain Logistics Row ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PublicHealthOverview />
        <InventoryFEFOCard />
      </div>

      {/* ── 6. Bottom Municipal Services Quick Navigation Banner ── */}
      <Card className="border-border bg-muted/15">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <MapPin className="size-5" />
            </div>
            <div>
              <p className="font-bold text-xs text-foreground">
                Barangay Vaccination Drives & Mobile Operations
              </p>
              <p className="text-[11px] text-muted-foreground">
                View field deployment schedules across Lapasan, Carmen, Bulua, Kauswagan and 80 CDO barangays.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/field-operations">
              <Button size="sm" className="h-8 text-xs gap-1.5 cursor-pointer">
                View Mobile Drives <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
