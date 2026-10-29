"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Syringe,
  MapPin,
  Package,
  BarChart3,
  HelpCircle,
  MoreVertical,
  CircleUser,
  LogOut,
  Moon,
  Sun,
  PanelLeft,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { useClerk, useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { OperationalNotifications } from "@/components/dashboard/operational-notifications";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole, type SyncVetRole } from "@/data/syncvet-users";
import { useCVO } from "@/lib/cvo-context";
import { PawIcon } from "@/components/icons/paw-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";

import {
  Stethoscope,
  FileCheck2,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import { MessengerIcon } from "@/components/icons/messenger-icon";

type NavItem = {
  label: string;
  icon: any;
  href: string | null;
  section?: string;
};

function getNavItemsForRole(role: SyncVetRole): { serviceCategoryTitle: string; items: NavItem[] } {
  switch (role) {
    case "Administrator":
      return {
        serviceCategoryTitle: "CVO Administrative Ops",
        items: [
          { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
          { label: "Public Bulletins", icon: Megaphone, href: "/announcements" },
          { label: "Citizen Inquiries & Chat", icon: MessengerIcon, href: "/messages" },
          { label: "Manage Users", icon: Users, href: "/users" },
          { label: "Consultations & EMR", icon: Stethoscope, href: "/consultations", section: "City Veterinary Services" },
          { label: "Vaccination Records", icon: Syringe, href: "/vaccination-records" },
          { label: "Vaccine Inventory", icon: Package, href: "/vaccine-inventory" },
          { label: "Pet Registry", icon: PawIcon, href: "/pet-registry" },
          { label: "Field Operations", icon: MapPin, href: "/field-operations" },
        ],
      };
    case "Veterinarian":
      return {
        serviceCategoryTitle: "Clinical Veterinary Care",
        items: [
          { label: "Clinical Dashboard", icon: LayoutDashboard, href: "/dashboard" },
          { label: "Public Bulletins", icon: Megaphone, href: "/announcements" },
          { label: "Telemedicine & Chat", icon: MessengerIcon, href: "/messages" },
          { label: "Consultations & EMR", icon: Stethoscope, href: "/consultations", section: "Clinical Procedures" },
          { label: "Vaccination Records", icon: Syringe, href: "/vaccination-records" },
          { label: "Vaccine Inventory", icon: Package, href: "/vaccine-inventory" },
          { label: "Pet Registry", icon: PawIcon, href: "/pet-registry" },
          { label: "Field Operations", icon: MapPin, href: "/field-operations" },
        ],
      };
    case "Pet Owner":
    default:
      return {
        serviceCategoryTitle: "Citizen Pet Services",
        items: [
          { label: "Pet Owner Portal", icon: LayoutDashboard, href: "/pet-owner" },
          { label: "Ask a Veterinarian", icon: MessengerIcon, href: "/messages" },
        ],
      };
  }
}

export function SidebarContent({
  collapsed = false,
  onItemClick,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onItemClick?: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch current user's database role and profile from Supabase
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
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

  // Supabase Realtime subscription for instant role & profile updates
  useEffect(() => {
    if (!user?.id) return;
    const supabase = getPublicSupabaseClient();
    const channelId = `sidebar-user-${user.id}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { role?: string; avatar_url?: string; full_name?: string };
          if (updated) {
            queryClient.setQueryData(["current-user-role", user.id], (old: any) => ({
              ...old,
              ...updated,
            }));
            queryClient.invalidateQueries({ queryKey: ["current-user-role", user.id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const displayName = isLoaded && user ? dbUser?.full_name || user.fullName || user.username || "Citizen" : "Loading...";
  const rawEmail = isLoaded && user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress : "";
  const userEmail = rawEmail || "citizen@syncvet.cdo";
  const userAvatarUrl = dbUser?.avatar_url || (isLoaded && user?.imageUrl ? user.imageUrl : undefined);
  const userInitials = isLoaded && user && displayName 
    ? displayName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : "CT";
  const { activeRoleView } = useCVO();

  const userEmailLower = rawEmail.toLowerCase();
  const isAdminEmail = userEmailLower === "dime.neil03@gmail.com";
  const isStaffMetadata =
    metadata?.roleTitle === "Administrator" ||
    metadata?.roleTitle === "Veterinarian" ||
    metadata?.roleTitle === "Staff" ||
    metadata?.accountType === "administrator" ||
    metadata?.accountType === "veterinarian";

  const isPetOwnerPath = pathname?.startsWith("/pet-owner") ?? false;

  const dbOrMetaRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (isAdminEmail ? "Administrator" : isStaffMetadata ? (metadata?.roleTitle || "Administrator") : "Pet Owner")
  );

  const userRole: SyncVetRole =
    isAdminEmail || dbOrMetaRole === "Administrator"
      ? "Administrator"
      : dbOrMetaRole === "Veterinarian"
      ? "Veterinarian"
      : "Pet Owner";

  const { serviceCategoryTitle, items: activeNavItems } = useMemo(
    () => getNavItemsForRole(userRole),
    [userRole]
  );

  const handleLogout = async () => {
    if (clerk?.signOut) {
      await clerk.signOut({ redirectUrl: "/sign-in" });
    } else {
      router.push("/sign-in");
    }
  };

  const handleOpenAccount = () => {
    setProfileOpen(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* ── Brand & Sidebar Toggle ── */}
      {collapsed ? (
        <div className="flex shrink-0 flex-col items-center gap-2.5 px-0">
          <Link
            href="/"
            title="Return to SyncVet Landing Page"
            className="flex shrink-0 items-center justify-center outline-none transition-all duration-200 group cursor-pointer"
            onClick={onItemClick}
          >
            <div className="flex shrink-0 items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 size-8">
              {mounted && (
                <Image
                  src={Logo}
                  alt="SyncVet Logo"
                  className="size-full object-contain"
                  priority
                />
              )}
            </div>
          </Link>

          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 shrink-0 cursor-pointer"
              title="Expand sidebar"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="size-4 rotate-180" />
            </Button>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 items-center justify-between px-2">
          <Link
            href="/"
            title="Return to SyncVet Landing Page"
            className="group flex shrink-0 items-center gap-3 transition-opacity duration-150 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg cursor-pointer min-w-0"
            onClick={onItemClick}
          >
            <div className="flex shrink-0 items-center justify-center overflow-hidden transition-all duration-200 group-hover:scale-105 size-10">
              {mounted && (
                <Image
                  src={Logo}
                  alt="SyncVet Logo"
                  className="size-full object-contain"
                  priority
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold tracking-tight text-foreground leading-none group-hover:text-primary transition-colors">
                SYNCVET
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
                MANAGEMENT SYSTEM
              </p>
            </div>
          </Link>

          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 shrink-0 cursor-pointer"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
        </div>
      )}

      {/* ── Nav section ── */}
      <div
        className={cn(
          "mt-8 min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
          collapsed ? "px-0" : "px-1",
        )}
      >
        {!collapsed && (
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {serviceCategoryTitle}
          </p>
        )}
        <nav className="flex flex-col gap-1">
          {activeNavItems.map((item: NavItem) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : item.href
                  ? pathname.startsWith(item.href)
                  : false;
            const Icon = item.icon;

            return (
              <div key={item.label}>
                {item.section && !collapsed && (
                  <p className="mb-1.5 mt-4 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {item.section}
                  </p>
                )}
                <Link
                  href={item.href || "#"}
                  className={cn(
                    "group flex items-center rounded-lg text-[12px] font-semibold transition-colors duration-150",
                    collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                  title={collapsed ? item.label : undefined}
                  onClick={onItemClick}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
                    )}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom section: Support links + User profile with 3 dots menu ── */}
      <div
        className={cn(
          "shrink-0 space-y-3 pt-3 border-t border-sidebar-border/60",
          collapsed ? "px-0" : "px-1",
        )}
      >
        {/* Support nav links & Theme Switcher */}
        <div className="flex flex-col gap-1">
          {/* Operational Notifications for Staff Accounts */}
          {userRole !== "Pet Owner" && !pathname?.startsWith("/pet-owner") && (
            <OperationalNotifications sidebarMode collapsed={collapsed} />
          )}

          {/* Theme switcher placed above Get Help */}
          <button
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className={cn(
              "flex items-center rounded-lg text-[12px] font-semibold transition-colors duration-150 cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground w-full outline-none",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
            )}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme mode"
          >
            {mounted && theme === "dark" ? (
              <Sun className="size-4 text-muted-foreground shrink-0 transition-transform duration-150" strokeWidth={2} />
            ) : (
              <Moon className="size-4 text-muted-foreground shrink-0 transition-transform duration-150" strokeWidth={2} />
            )}
            {!collapsed && (
              <span className="truncate">
                {mounted && theme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </button>

          <Link
            href="/get-help"
            className={cn(
              "flex items-center rounded-lg text-[12px] font-semibold transition-colors duration-150",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
              pathname === "/get-help"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title={collapsed ? "Get Help" : undefined}
            onClick={onItemClick}
          >
            <HelpCircle 
              className={cn("size-4", pathname === "/get-help" ? "text-white" : "text-muted-foreground")} 
              strokeWidth={2} 
            />
            {!collapsed && <span>Get Help</span>}
          </Link>
        </div>

        {/* ── User card with 3-Dots Dropdown Menu ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "group w-full flex items-center rounded-2xl bg-muted/40 p-2.5 transition-all hover:bg-muted/70 border border-border/50 text-left outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40",
                collapsed ? "justify-center px-1.5" : "gap-2.5 justify-between",
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="size-8.5 shrink-0 border border-border/80 shadow-2xs">
                  {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={displayName} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center">
                    <PawIcon className="size-4 text-white" />
                  </AvatarFallback>
                </Avatar>
                {!collapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-bold text-primary leading-tight group-hover:text-primary/90">
                      {displayName}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium leading-tight">
                      {userRole}
                    </p>
                  </div>
                )}
              </div>

              {!collapsed && (
                <div className="flex size-6 items-center justify-center rounded-lg text-primary/70 group-hover:text-primary shrink-0 transition-colors">
                  <MoreVertical className="size-4" />
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            side="right"
            align="end"
            sideOffset={14}
            className="w-64 rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 z-50"
          >
            {/* Header info in popup */}
            <div className="flex items-center gap-3 p-2">
              <Avatar className="size-9 shrink-0 border border-border/80 shadow-xs">
                {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={displayName} />}
                <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center">
                  <PawIcon className="size-4.5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground leading-tight">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground font-medium leading-tight mt-0.5">
                  {userEmail}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1.5 bg-border/60" />

            {/* Account Action */}
            <DropdownMenuItem
              onClick={handleOpenAccount}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            >
              <CircleUser className="size-4 text-muted-foreground" />
              <span>Edit Profile</span>
            </DropdownMenuItem>

            {/* Logout Action */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer transition-colors"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Custom Edit Profile Dialog */}
        <EditProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </div>
  );
}

export function DashboardSidebar({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden lg:flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-6 transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[60px] px-1.5" : "w-[16%] min-w-[250px] px-5",
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}
