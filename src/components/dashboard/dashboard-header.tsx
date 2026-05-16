"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function DashboardHeader() {
  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);

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

  const currentHour = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }).format(new Date());
  const greeting = parseInt(currentHour) < 12 ? "Good Morning" : parseInt(currentHour) < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-0">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-1">
          SyncVet Management System
        </p>
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">
          {greeting}
        </h2>
        <p className="text-sm text-muted-foreground font-medium">
          Here&apos;s the operational overview for <span className="text-foreground">{new Intl.DateTimeFormat('en-PH', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' }).format(new Date())}</span>.
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sleek Live Clock */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/20 border border-border/50">
          <Clock className="size-3 text-primary/70" />
          <p className="text-[12px] font-bold tabular-nums tracking-tight text-foreground/90 min-w-[85px] text-right">
            {mounted ? time : "00:00:00 AM"}
          </p>
          <span className="hidden sm:inline text-[9px] font-extrabold text-muted-foreground/40 ml-1">PH</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex flex-col items-end">
            <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-widest leading-none mb-0.5">Latency</p>
            <p className="text-[10px] font-extrabold text-emerald-500/80 leading-none">24ms</p>
          </div>
          <Badge variant="outline" className="h-7 bg-emerald-500/5 text-emerald-500/70 border-emerald-500/10 gap-1.5 px-3 font-bold uppercase tracking-wider text-[9px] shadow-none hover:bg-emerald-500/10 transition-colors">
            <span className="h-1 size-1 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </div>
      </div>
    </div>
  );
}
