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
  CircleUser,
  QrCode,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanQueueQrDialog } from "@/components/dashboard/scan-queue-qr-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";
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
  const [profileOpen, setProfileOpen] = useState(false);

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
    { key: "feed", label: "Home / CVO Feed", shortLabel: "Feed", icon: Home },
    { key: "consultations", label: "Clinical Consultations", shortLabel: "Consultations", icon: Stethoscope },
    { key: "procedures", label: "Procedure Appointments", shortLabel: "Appointments", icon: Calendar },
    { key: "vaccinations", label: "Vaccination Ledger", shortLabel: "Vaccines", icon: Syringe },
  ];

  return (
    <header className="sticky top-0 z-50 h-13 sm:h-14 w-full bg-card/95 backdrop-blur-md border-b border-border/80 shadow-xs select-none px-2 sm:px-4 md:px-6">
      <div className="max-w-[1140px] mx-auto h-full flex items-center justify-between gap-1 sm:gap-3">
        {/* ── 1. Left Section: Circular Emblem Logo ── */}
        <div className="flex items-center shrink-0">
          <Link
            href="/pet-owner?tab=feed"
            onClick={() => handleTabClick("feed")}
            className="group relative size-8.5 sm:size-9.5 md:size-10 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-200 hover:scale-105 outline-none cursor-pointer"
            title="SyncVet Home"
            aria-label="SyncVet Home"
          >
            {mounted && (
              <Image
                src={Logo}
                alt="SyncVet Logo"
                className="size-full object-contain"
                priority
              />
            )}
          </Link>
        </div>

        {/* ── 2. Center Section: Integrated Themed Navigation Tabs ── */}
        <nav className="flex items-center justify-center h-full gap-0.5 sm:gap-1.5 md:gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key && pathname.startsWith("/pet-owner");

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key)}
                className={cn(
                  "relative flex items-center justify-center gap-1.5 h-full px-2 sm:px-3 md:px-4 text-xs font-semibold transition-all duration-200 cursor-pointer outline-none select-none group",
                  isActive
                    ? "text-primary font-bold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl font-medium"
                )}
                title={item.label}
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    "size-4 sm:size-4.5 transition-transform group-hover:scale-105 shrink-0",
                    isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground stroke-[2]"
                  )}
                />
                <span
                  className={cn(
                    "tracking-tight text-[11px] sm:text-xs transition-colors",
                    isActive
                      ? "text-primary font-bold hidden min-[420px]:inline-block"
                      : "text-muted-foreground group-hover:text-foreground font-medium hidden md:inline-block"
                  )}
                >
                  {item.shortLabel}
                </span>

                {/* Theme bottom active indicator bar */}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-1 sm:inset-x-2 md:inset-x-3 h-[3px] bg-primary rounded-t-full shadow-[0_-1px_6px_hsl(var(--primary)/0.6)]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ── 3. Right Section: Utility Icons (Menu, Chat, Profile) ── */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Clinic Arrival QR Scanner */}
          <ScanQueueQrDialog
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="size-8.5 sm:size-9.5 md:size-10 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer transition-transform hover:scale-105"
                title="Scan CVO Clinic Arrival QR to Join Queue"
              >
                <QrCode className="size-4 sm:size-4.5 md:size-5" />
              </Button>
            }
          />

          {/* CVO Services Quick Grid Menu */}
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8.5 sm:size-9.5 md:size-10 rounded-full bg-muted/60 hover:bg-muted text-foreground cursor-pointer transition-transform hover:scale-105"
              title="CVO Municipal Services"
            >
              <LayoutGrid className="size-4 sm:size-4.5 md:size-5" />
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
              onClick={() => handleTabClick("vaccinations")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl"
            >
              <div className="size-7 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                <Syringe className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground">Vaccination Ledger</p>
                <p className="text-[10px] text-muted-foreground">Certified rabies & immunization records</p>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => handleTabClick("drives")}
              className="cursor-pointer gap-2.5 py-2 rounded-xl"
            >
              <div className="size-7 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center shrink-0">
                <MapPin className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xs text-foreground">Barangay Outreach Drives</p>
                <p className="text-[10px] text-muted-foreground">Free community rabies & deworming</p>
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
          className="relative size-8.5 sm:size-9.5 md:size-10 rounded-full bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-transform hover:scale-105 cursor-pointer outline-none"
          title="Ask a Veterinarian in Messages"
        >
          <MessengerIcon className="size-4 sm:size-4.5 md:size-5 text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 size-4.5 sm:size-5 rounded-full bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center ring-2 ring-card shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        {/* User Profile Avatar with Facebook Dropdown Caret */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative size-8.5 sm:size-9.5 md:size-10 rounded-full cursor-pointer outline-none transition-transform hover:scale-105 group"
              title="Account Menu"
            >
              <Avatar className="size-8.5 sm:size-9.5 md:size-10 rounded-full border border-border/80 shadow-2xs">
                {userAvatarUrl ? (
                  <AvatarImage src={userAvatarUrl} alt={displayName} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white font-bold text-xs">
                  <PawIcon className="size-4 text-white" />
                </AvatarFallback>
              </Avatar>

              {/* Bottom Right Chevron Overlay */}
              <div className="absolute -bottom-0.5 -right-0.5 size-3.5 sm:size-4 rounded-full bg-card border border-border flex items-center justify-center shadow-2xs group-hover:bg-muted">
                <ChevronDown className="size-2 sm:size-2.5 text-foreground" />
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

            {/* Edit Profile */}
            <DropdownMenuItem
              onClick={() => setProfileOpen(true)}
              className="cursor-pointer gap-2.5 py-2 rounded-xl text-xs font-medium"
            >
              <CircleUser className="size-4 text-muted-foreground shrink-0" />
              <span>Edit Profile</span>
            </DropdownMenuItem>

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

        {/* Custom Edit Profile Dialog */}
        <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
      </div>
    </header>
  );
}
