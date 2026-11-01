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
    <div className="flex-1 bg-background min-h-screen text-foreground py-3 sm:py-4 px-2.5 sm:px-4 pb-20 sm:pb-8 animate-in fade-in-50 duration-200">
      {/* ── Main Dashboard Layout: Left Main Column + Right Sidebar (Announcements & Clinic Info) ── */}
      <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-start">
        {/* ── LEFT COLUMN (Main Content) ── */}
        <div className="md:col-span-7 lg:col-span-8 space-y-4 min-w-0">
          {/* 1. Real-Time Clinic Arrival Queue Tracker Skeleton */}
          <div className="rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 sm:size-12 rounded-2xl shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56 sm:w-72" />
                </div>
              </div>
              <Skeleton className="h-8.5 w-32 rounded-xl shrink-0" />
            </div>
          </div>

          {/* 2. Pet Registry Strip (Story Cards) Skeleton */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Skeleton className="size-3.5 rounded" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 overflow-x-hidden pb-1 pt-1">
              {/* Register Pet card skeleton */}
              <div className="w-[124px] sm:w-[144px] md:w-[158px] h-48 sm:h-52 md:h-56 rounded-2xl sm:rounded-3xl border-2 border-dashed border-border/70 bg-card/40 flex flex-col items-center justify-center p-3 text-center shrink-0 space-y-3">
                <Skeleton className="size-11 sm:size-12 rounded-2xl" />
                <div className="space-y-1 w-full flex flex-col items-center">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>

              {/* 3 Companion Pet cards skeleton */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[124px] sm:w-[144px] md:w-[158px] h-48 sm:h-52 md:h-56 rounded-2xl sm:rounded-3xl border border-border/70 bg-card/60 p-3 flex flex-col justify-between shrink-0 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3.5 w-12 rounded-full" />
                    <Skeleton className="size-4 rounded" />
                  </div>
                  <div className="flex flex-col items-center gap-2 my-auto">
                    <Skeleton className="size-16 sm:size-18 rounded-full" />
                    <div className="space-y-1 w-full flex flex-col items-center">
                      <Skeleton className="h-3.5 w-16" />
                      <Skeleton className="h-2.5 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-full rounded-xl" />
                </div>
              ))}
            </div>
          </div>

          {/* 3. Quick Action Buttons (Request Consultation & Schedule Procedure) Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/70 bg-card/60 p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-36" />
                  </div>
                </div>
                <Skeleton className="size-7 rounded-full shrink-0" />
              </div>
            ))}
          </div>

          {/* 4. Social Feed / Post Creator & Post Skeletons */}
          <div className="space-y-4">
            {/* Post Creator Bar */}
            <div className="rounded-2xl border border-border/70 p-3 sm:p-3.5 bg-card/60 shadow-2xs flex items-center gap-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <Skeleton className="h-9 flex-1 rounded-full" />
              <Skeleton className="size-9 rounded-xl shrink-0" />
            </div>

            {/* Feed Post Skeleton 1 */}
            <div className="rounded-2xl border border-border/70 p-4 sm:p-5 bg-card/60 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full shrink-0" />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-36" />
                      <Skeleton className="h-3.5 w-14 rounded-full" />
                    </div>
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
                <Skeleton className="size-6 rounded-md" />
              </div>
              <div className="space-y-2 pt-1">
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-4/6" />
              </div>
              <Skeleton className="h-44 sm:h-52 w-full rounded-xl" />
              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
                <Skeleton className="h-7 w-20 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN (Clinic Info Card & Emergency Notices) ── */}
        <div className="md:col-span-5 lg:col-span-4 space-y-4">
          {/* CVO Clinic Operations Card Skeleton */}
          <div className="rounded-2xl border border-border/70 overflow-hidden bg-card/60 shadow-2xs">
            <div className="p-4 pb-3 border-b border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-8 rounded-xl shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-2.5 w-48" />
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-2">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-2.5 w-52" />
              </div>
            </div>
          </div>

          {/* Emergency / Hotlines Card Skeleton */}
          <div className="rounded-2xl border border-border/70 p-4 bg-card/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-5 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full rounded-xl" />
              <Skeleton className="h-8 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
