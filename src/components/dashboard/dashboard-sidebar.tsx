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
  Settings,
  HelpCircle,
  MoreVertical,
  CircleUser,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import { useClerk, useUser } from "@clerk/nextjs";
import { PawIcon } from "@/components/icons/paw-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditProfileDialog } from "@/components/dashboard/edit-profile-dialog";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard | typeof PawIcon;
  href: string | null;
  section?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Manage Users", icon: Users, href: "/users" },
  { label: "Pet Registry", icon: PawIcon, href: "/pet-registry", section: "Animal Health" },
  { label: "Vaccination Records", icon: Syringe, href: "/vaccination-records" },
  { label: "Field Operations", icon: MapPin, href: "/field-operations" },
  { label: "Vaccine Inventory", icon: Package, href: "/vaccine-inventory", section: "Resource Planning" },
  { label: "Barangay Analytics", icon: BarChart3, href: "/barangay-analytics" },
];

export function SidebarContent({ collapsed = false, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, isLoaded } = useUser();
  const clerk = useClerk();

  useEffect(() => {
    setMounted(true);
  }, []);

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const displayName = isLoaded && user ? user.fullName || user.username || "IT Officer" : "Neil Dime";
  const userEmail = isLoaded && user?.primaryEmailAddress?.emailAddress ? user.primaryEmailAddress.emailAddress : "dime.neil03@gmail.com";
  const userAvatarUrl = isLoaded && user?.imageUrl ? user.imageUrl : undefined;
  const userInitials = isLoaded && user && user.fullName 
    ? user.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "ND";
  const userRole = metadata?.roleTitle || (metadata?.accountType === "pet_owner" ? "Pet Owner" : "Administrator");

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
      {/* ── Brand ── */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3",
          collapsed ? "flex-col items-center px-0" : "px-2",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden transition-all duration-200",
            collapsed ? "size-8" : "size-10"
          )}
          aria-hidden
        >
          {mounted && (
            <Image
              src={Logo}
              alt="SyncVet Logo"
              className="size-full object-contain"
              priority
            />
          )}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-extrabold tracking-tight text-foreground leading-none">
              SYNCVET
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-primary">
              MANAGEMENT SYSTEM
            </p>
          </div>
        )}
      </div>

      {/* ── Nav section ── */}
      <div
        className={cn(
          "mt-8 min-h-0 flex-1 overflow-y-auto overflow-x-hidden",
          collapsed ? "px-0" : "px-1",
        )}
      >
        {!collapsed && (
          <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Service Management
          </p>
        )}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
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
        {/* Support nav links */}
        <div className="flex flex-col gap-1">
          <Link
            href="/settings"
            className={cn(
              "flex items-center rounded-lg text-[12px] font-semibold transition-colors duration-150",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
              pathname === "/settings"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            title={collapsed ? "Settings" : undefined}
            onClick={onItemClick}
          >
            <Settings 
              className={cn("size-4", pathname === "/settings" ? "text-white" : "text-muted-foreground")} 
              strokeWidth={2} 
            />
            {!collapsed && <span>Settings</span>}
          </Link>
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
                  <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white flex items-center justify-center">
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
                <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-white flex items-center justify-center">
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

export function DashboardSidebar({ collapsed }: { collapsed: boolean }) {
  return (
    <aside
      className={cn(
        "hidden lg:flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-6 transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[60px] px-1.5" : "w-[16%] min-w-[250px] px-5",
      )}
    >
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}
