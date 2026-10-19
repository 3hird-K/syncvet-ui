"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Clock, Building2 } from "lucide-react";
import { GlobalSearchDialog } from "@/components/dashboard/global-search-dialog";

export function DashboardHeader() {
  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(
        new Intl.DateTimeFormat("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Manila",
        }).format(now)
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    hour12: false,
    timeZone: "Asia/Manila",
  }).format(new Date());
  const greeting =
    parseInt(currentHour) < 12
      ? "Good Morning"
      : parseInt(currentHour) < 18
      ? "Good Afternoon"
      : "Good Evening";

  return (
    <div className="space-y-3 pb-1">
      {/* Top Banner: LGU Government Identifier */}
      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Building2 className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-foreground">
                Cagayan de Oro City Veterinary Office (CVO)
              </span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/30 text-emerald-600 bg-emerald-500/10 font-medium">
                LGU MIS v2.6
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Official Management Information System • Central Animal Health & Public Safety
            </p>
          </div>
        </div>
      </div>

      {/* Header Title + Live Clock Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pt-1">
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
            Veterinary Command Center
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            {greeting}, Officer
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Daily operational status for <span className="text-foreground font-semibold">{new Intl.DateTimeFormat("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date())}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Manila Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/20 border border-border/50">
            <Clock className="size-3.5 text-primary/70" />
            <p className="text-[12px] font-bold tabular-nums tracking-tight text-foreground/90 min-w-[85px] text-right">
              {mounted ? time : "00:00:00 AM"}
            </p>
            <span className="hidden sm:inline text-[9px] font-extrabold text-muted-foreground/40 ml-0.5">PST</span>
          </div>

          {/* System & Clinic Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-7 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5 px-3 font-bold uppercase tracking-wider text-[9px] shadow-none">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              CVO Clinic Online
            </Badge>
          </div>
        </div>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
