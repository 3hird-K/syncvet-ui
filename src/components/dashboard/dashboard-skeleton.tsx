import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface DashboardSkeletonProps {
  variant?: "pet-owner" | "admin";
  message?: string;
}

export function DashboardSkeleton({
  variant = "pet-owner",
}: DashboardSkeletonProps) {
  if (variant === "admin") {
    return (
      <div className="flex-1 w-full min-w-0 max-w-7xl mx-auto space-y-5 p-4 sm:p-5 md:p-6 pb-10 bg-background text-foreground animate-in fade-in-50 duration-200">
        {/* ── 1. CVO Command Center Header Skeleton ── */}
        <div className="space-y-2 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-3.5 w-64" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
            <div className="space-y-1.5">
              <Skeleton className="h-7 w-72 sm:w-96 rounded-lg" />
              <Skeleton className="h-3 w-60 sm:w-80" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-28 rounded-xl" />
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>
          </div>
        </div>

        {/* ── 2. Top-level Summary Metric Cards (4 Columns) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-2xl border border-border/70 p-4 space-y-3 bg-card/60 shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32 rounded-full" />
                <Skeleton className="size-4 rounded" />
              </div>
              <Skeleton className="h-8 w-16 rounded-lg" />
              <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            </Card>
          ))}
        </div>

        {/* ── 3. Quick Municipal Services Hub (3 Service Cards) ── */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-1">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-80" />
            </div>
            <Skeleton className="h-8 w-32 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Skeleton className="size-9 rounded-lg" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-border/40">
                  <Skeleton className="h-8 w-32 rounded-xl" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── 4. Main Balanced Rows (2 Columns each) ── */}
        <div className="space-y-4 sm:space-y-5">
          {/* Row 1: Today's Clinic Operations + CVO Announcements */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            <Card className="rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 bg-card/60">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-28 rounded-xl" />
              </div>
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-4 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="rounded-2xl border border-border/70 p-4 sm:p-5 space-y-4 bg-card/60">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
              <div className="space-y-2.5">
                {[1, 2].map((i) => (
                  <div key={i} className="p-3.5 rounded-xl border border-border/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-28 rounded-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Row 2: Public Health & Rabies + Inventory */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            <Card className="rounded-2xl border border-border/70 p-4 sm:p-5 space-y-3 bg-card/60">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
            </Card>
            <Card className="rounded-2xl border border-border/70 p-4 sm:p-5 space-y-3 bg-card/60">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-32 w-full rounded-xl" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ════ Pet Owner Portal Skeleton ════
  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 bg-background min-h-screen text-foreground space-y-6 animate-in fade-in-50 duration-200">
      {/* ── Main Dashboard Layout Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ── LEFT COLUMN (Greeting Banner, Registered Pets, Services Tabs) ── */}
        <div className="xl:col-span-8 space-y-6 min-w-0">
          {/* 1. Warm Citizen Greeting Banner Skeleton */}
          <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-primary/5 to-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                <Skeleton className="size-14 sm:size-16 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1 min-w-0">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-7 sm:h-9 w-64 sm:w-80" />
                  <Skeleton className="h-3.5 w-full max-w-xl" />
                </div>
              </div>
            </div>

            {/* Clinic Info Strip Skeleton */}
            <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-52" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          </div>

          {/* 2. Registered Pets Section Skeleton */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2.5 w-56" />
                </div>
              </div>
              <Skeleton className="h-8 w-28 rounded-xl" />
            </div>

            {/* 3 Companion Pet Passport Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden flex flex-col justify-between bg-card/60">
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                      <Skeleton className="size-6 rounded-md" />
                    </div>

                    <Skeleton className="h-6 w-full rounded-md" />

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                      <div className="space-y-1">
                        <Skeleton className="h-2.5 w-12" />
                        <Skeleton className="h-3.5 w-16" />
                      </div>
                      <div className="space-y-1">
                        <Skeleton className="h-2.5 w-16" />
                        <Skeleton className="h-3.5 w-20" />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center gap-2">
                    <Skeleton className="h-8 flex-1 rounded-xl" />
                    <Skeleton className="h-8 flex-1 rounded-xl" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 3. Services & History Tabs Skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Card className="rounded-2xl border border-border/80 p-5 space-y-3 bg-card/60">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-16 w-full rounded-xl" />
            </Card>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Announcements & Clinic Info Skeletons) ── */}
        <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5 sticky top-4">
          {/* Announcements Card Skeleton */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card/60">
            <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-xl" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-44" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3.5 rounded-xl border border-border/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28 rounded-md" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* CVO Clinic Info Card Skeleton */}
          <Card className="rounded-2xl border border-border/80 overflow-hidden bg-card/60">
            <CardHeader className="p-4 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-xl" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-36" />
                    <Skeleton className="h-2.5 w-44" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <Skeleton className="h-20 w-full rounded-xl" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
