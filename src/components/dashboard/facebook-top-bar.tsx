"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { useCitizenChat } from "@/lib/chat-context";
import Logo from "@/assets/logo-dark.png";
import { MessengerIcon } from "@/components/icons/messenger-icon";
import { PawIcon } from "@/components/icons/paw-icon";
import {
  Home,
  Stethoscope,
  Calendar,
  Syringe,
  MapPin,
  ShieldAlert,
  Search,
  LayoutGrid,
  Bell,
  Sun,
  Moon,
  HelpCircle,
  LogOut,
  ChevronDown,
  Building2,
  Clock,
  Phone,
  ArrowRight,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FacebookTopBarProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
}

export function FacebookTopBar({
  currentTab: propTab,
  onTabChange: propOnTabChange,
}: FacebookTopBarProps) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useCitizenChat();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync active tab from props or URL query or event
  useEffect(() => {
    if (propTab) {
      setActiveTab(propTab);
      return;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) setActiveTab(tabParam);
    }

    const handleTabEvent = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };

    window.addEventListener("syncvet-tab-change", handleTabEvent);
    return () => window.removeEventListener("syncvet-tab-change", handleTabEvent);
  }, [propTab]);

  // Fetch current user details from Supabase
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-fb-bar", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role, avatar_url, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (isAdminEmail ? "Administrator" : undefined)
  );
  const isStaff = userRole === "Administrator" || userRole === "Veterinarian";

  const displayName = dbUser?.full_name || user?.fullName || "Pet Guardian";
  const userAvatarUrl = dbUser?.avatar_url || user?.imageUrl;

  const handleTabClick = (tabKey: string) => {
    setActiveTab(tabKey);
    if (propOnTabChange) {
      propOnTabChange(tabKey);
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("syncvet-tab-change", { detail: tabKey }));
      const url = new URL(window.location.href);
      if (pathname.startsWith("/pet-owner")) {
        url.searchParams.set("tab", tabKey);
        window.history.pushState({}, "", url.toString());
      } else {
        router.push(`/pet-owner?tab=${tabKey}`);
      }
    }
  };

  const navItems = [
    { key: "feed", label: "Home / CVO Feed", icon: Home },
    { key: "consultations", label: "Clinical Consultations", icon: Stethoscope },
    { key: "procedures", label: "Procedure Appointments", icon: Calendar },
    { key: "vaccinations", label: "Vaccination Ledger", icon: Syringe },
    { key: "drives", label: "Barangay Drives", icon: MapPin },
    { key: "protocols", label: "Bite Protocol", icon: ShieldAlert },
  ];

  return (
    <header className="sticky top-0 z-50 h-14 w-full bg-card/95 backdrop-blur-md border-b border-border/80 shadow-xs flex items-center justify-between px-3 sm:px-4 select-none">
      {/* ── 1. Left Section: Logo & Search Pill ── */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <Link
          href="/pet-owner?tab=feed"
          onClick={() => handleTabClick("feed")}
          className="group flex items-center gap-2 outline-none cursor-pointer"
          title="SyncVet Home"
        >
          <div className="size-10 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105">
            {mounted && (
              <Image
                src={Logo}
                alt="SyncVet Logo"
                className="size-full object-contain"
                priority
              />
            )}
          </div>
          <span className="hidden xl:inline-block font-extrabold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
            SYNCVET
          </span>
        </Link>

        {/* Facebook-Style Search Input Pill */}
        <div className="relative flex items-center">
          <div className="flex items-center h-10 rounded-full bg-muted/60 hover:bg-muted/90 px-3 text-xs text-muted-foreground transition-colors border border-border/40 focus-within:ring-2 focus-within:ring-primary/40 focus-within:bg-card">
            <Search className="size-4 text-muted-foreground shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SyncVet..."
              className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none w-28 sm:w-44 md:w-56"
            />
          </div>
        </div>
      </div>

      {/* ── 2. Center Section: Facebook Centered Iconic Navigation Tabs ── */}
      <nav className="flex items-center justify-center flex-1 max-w-2xl mx-auto h-full px-1 sm:px-4">
        <div className="flex items-center justify-center w-full h-full gap-1 sm:gap-1.5 md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key && pathname.startsWith("/pet-owner");

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key)}
                className={cn(
                  "relative flex items-center justify-center flex-1 h-full max-w-[100px] rounded-xl transition-all duration-150 cursor-pointer outline-none group",
                  isActive
                    ? "text-[#1877F2]"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
                title={item.label}
                aria-label={item.label}
              >
                <div className="flex items-center justify-center size-10 rounded-xl transition-transform group-hover:scale-105">
                  <Icon
                    className={cn(
                      "size-5 sm:size-6 transition-colors",
                      isActive ? "text-[#1877F2] stroke-[2.5]" : "stroke-[2]"
                    )}
                  />
                </div>

                {/* Facebook Active Bottom Indicator Bar */}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-2 h-[3.5px] bg-[#1877F2] rounded-t-full shadow-xs" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── 3. Right Section: Facebook Utility Icons (Menu, Chat, Alerts, Profile) ── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* CVO Services Quick Grid Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-full bg-muted/60 hover:bg-muted text-foreground cursor-pointer transition-transform hover:scale-105"
              title="CVO Municipal Services"
            >
              <LayoutGrid className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 rounded-2xl p-2.5 space-y-1 shadow-xl bg-popover text-xs">
            <div className="p-2 border-b border-border/50">
              <p className="font-bold text-xs text-foreground">CVO Service Center</p>
              <p className="text-[10px] text-muted-foreground">Carmen Central Clinic & Public Desk</p>
            </div>

            <DropdownMenuItem
              onClick={() => handleTabClick("consultations")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl"
            >
              <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Stethoscope className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground">Clinical Consultations</p>
                <p className="text-[10px] text-muted-foreground">Request clinical care for companion pet</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => handleTabClick("procedures")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl"
            >
              <div className="size-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground">Book Procedure Quota</p>
                <p className="text-[10px] text-muted-foreground">Free Spay/Neuter & Rabies slots</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => handleTabClick("protocols")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl"
            >
              <div className="size-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground">24/7 Animal Bite Protocol</p>
                <p className="text-[10px] text-muted-foreground">Emergency rabies exposure guidelines</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <div className="p-2 space-y-1 text-[11px] text-muted-foreground bg-muted/30 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3 text-emerald-600" />
                <span>Mon – Fri: 8:00 AM – 5:00 PM</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="size-3 text-primary" />
                <span>Helpline: (088) 857-3180</span>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messenger Icon (with red unread count badge) */}
        <Link
          href="/messages"
          className="relative size-10 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-transform hover:scale-105 cursor-pointer outline-none"
          title="Ask a Veterinarian in Messages"
        >
          <MessengerIcon className="size-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-card shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Avatar with Facebook Dropdown Caret */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative size-10 rounded-full cursor-pointer outline-none transition-transform hover:scale-105 group"
              title="Account Menu"
            >
              <Avatar className="size-10 rounded-full border border-border/80 shadow-2xs">
                {userAvatarUrl ? (
                  <AvatarImage src={userAvatarUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white font-bold text-xs">
                  <PawIcon className="size-4.5 text-white" />
                </AvatarFallback>
              </Avatar>

              {/* Bottom Right Chevron Overlay */}
              <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-card border border-border flex items-center justify-center shadow-2xs group-hover:bg-muted">
                <ChevronDown className="size-2.5 text-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-68 rounded-2xl p-2.5 shadow-xl bg-popover text-xs border border-border space-y-1"
          >
            {/* Header info */}
            <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl">
              <Avatar className="size-10 rounded-full border border-border/80">
                {userAvatarUrl ? (
                  <AvatarImage src={userAvatarUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white font-bold text-xs">
                  <PawIcon className="size-4.5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">
                  {displayName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {userRole}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator />

            {/* Theme Switcher Toggle */}
            <DropdownMenuItem
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl text-xs font-medium"
            >
              {mounted && theme === "dark" ? (
                <Sun className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <Moon className="size-4 text-muted-foreground shrink-0" />
              )}
              <span>{mounted && theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}</span>
            </DropdownMenuItem>

            {/* Help & Support */}
            <DropdownMenuItem
              onClick={() => router.push("/get-help")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl text-xs font-medium"
            >
              <HelpCircle className="size-4 text-muted-foreground shrink-0" />
              <span>Get Help & FAQs</span>
            </DropdownMenuItem>

            {/* If Staff Account viewing citizen portal: Provide switch back to staff console */}
            {isStaff && (
              <DropdownMenuItem
                onClick={() => router.push("/consultations")}
                className="cursor-pointer gap-2.5 py-2 rounded-xl text-xs font-semibold text-primary"
              >
                <Shield className="size-4 text-primary shrink-0" />
                <span>Return to Staff Console</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* Sign Out */}
            <DropdownMenuItem
              onClick={() => clerk.signOut({ redirectUrl: "/sign-in" })}
              className="cursor-pointer gap-2.5 py-2 rounded-xl text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4 text-destructive shrink-0" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
