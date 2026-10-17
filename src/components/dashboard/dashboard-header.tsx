"use client";

import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Search, Building2, UserCog, Stethoscope, Syringe, Users, Shield, PawPrint, MessageSquareText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/dashboard/global-search-dialog";
import { useCVO } from "@/lib/cvo-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const [time, setTime] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { activeRoleView, setActiveRoleView } = useCVO();

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

  const getRoleIcon = () => {
    switch (activeRoleView) {
      case "Veterinarian":
        return <Stethoscope className="size-3.5 text-emerald-500" />;
      case "Vaccinator":
        return <Syringe className="size-3.5 text-blue-500" />;
      case "Staff":
        return <Users className="size-3.5 text-amber-500" />;
      case "Pet Owner":
        return <PawPrint className="size-3.5 text-purple-500" />;
      case "Administrator":
      default:
        return <Shield className="size-3.5 text-primary" />;
    }
  };

  return (
    <div className="space-y-3 pb-1">
      {/* Top Banner: LGU Government Identifier + Quick Global Search + Role Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
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

        {/* Action Controls: Search Bar & Role View Filter */}
        <div className="flex items-center gap-2">
          {/* Global Search Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            className="h-8 gap-2 text-xs bg-muted/20 border-border/80 text-muted-foreground hover:text-foreground px-3 cursor-pointer"
          >
            <Search className="size-3.5" />
            <span className="hidden md:inline">Quick Search...</span>
            <kbd className="pointer-events-none hidden h-4 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground sm:flex">
              Ctrl+K
            </kbd>
          </Button>

          {/* Role Perspective Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs border-border/80 bg-muted/20 hover:bg-muted/40 cursor-pointer"
              >
                {getRoleIcon()}
                <span className="font-semibold text-foreground">{activeRoleView} View</span>
                <UserCog className="size-3 text-muted-foreground ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Switch Operational Perspective
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setActiveRoleView("Administrator")}
                className="cursor-pointer text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Shield className="size-3.5 text-primary" />
                  <span>Executive Admin</span>
                </div>
                {activeRoleView === "Administrator" && <Badge variant="secondary" className="text-[9px]">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveRoleView("Veterinarian")}
                className="cursor-pointer text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Stethoscope className="size-3.5 text-emerald-500" />
                  <span>Veterinarian / EMR</span>
                </div>
                {activeRoleView === "Veterinarian" && <Badge variant="secondary" className="text-[9px]">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveRoleView("Vaccinator")}
                className="cursor-pointer text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Syringe className="size-3.5 text-blue-500" />
                  <span>Field Worker / Vaccinator</span>
                </div>
                {activeRoleView === "Vaccinator" && <Badge variant="secondary" className="text-[9px]">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setActiveRoleView("Staff")}
                className="cursor-pointer text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-amber-500" />
                  <span>Frontdesk & Certificates</span>
                </div>
                {activeRoleView === "Staff" && <Badge variant="secondary" className="text-[9px]">Active</Badge>}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setActiveRoleView("Pet Owner");
                  window.location.href = "/pet-owner";
                }}
                className="cursor-pointer text-xs flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <PawPrint className="size-3.5 text-purple-500" />
                  <span>Pet Owner Portal</span>
                </div>
                {activeRoleView === "Pet Owner" && <Badge variant="secondary" className="text-[9px]">Active</Badge>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
