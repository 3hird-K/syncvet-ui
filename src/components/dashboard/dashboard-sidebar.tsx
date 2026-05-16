"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PawPrint,
  Syringe,
  MapPin,
  Package,
  BarChart3,
  Settings,
  HelpCircle,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href: string | null;
  section?: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Manage Users", icon: Users, href: "/users" },
  { label: "Pet Registry", icon: PawPrint, href: "/pet-registry", section: "Animal Health" },
  { label: "Vaccination Records", icon: Syringe, href: "/vaccination-records" },
  { label: "Field Operations", icon: MapPin, href: "/field-operations" },
  { label: "Vaccine Inventory", icon: Package, href: "/vaccine-inventory", section: "Resource Planning" },
  { label: "Barangay Analytics", icon: BarChart3, href: "/barangay-analytics" },
];

export function SidebarContent({ collapsed = false, onItemClick }: { collapsed?: boolean; onItemClick?: () => void }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
              Management System
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
              item.href != null &&
              (item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`));

            /* Section divider */
            const sectionLabel =
              !collapsed && item.section ? (
                <p className="mt-5 mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {item.section}
                </p>
              ) : (
                collapsed && item.section ? <div className="my-2 h-px w-full bg-border/50" /> : null
              );

            const content = (
              <>
                <item.icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-white" : "text-muted-foreground",
                  )}
                  strokeWidth={2}
                />
                {!collapsed && (
                  <span className="truncate text-[12px] font-semibold">
                    {item.label}
                  </span>
                )}
              </>
            );
            const itemClass = cn(
              "group flex items-center rounded-lg text-left transition-colors duration-150",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            );

            const navElement =
              item.href == null ? (
                <span
                  key={item.label}
                  className={itemClass}
                  title={collapsed ? item.label : undefined}
                >
                  {content}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={itemClass}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={onItemClick}
                >
                  {content}
                </Link>
              );

            return (
              <div key={item.label}>
                {sectionLabel}
                {navElement}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom actions ── */}
      <div className="mt-auto shrink-0 space-y-2 px-1 pt-4 border-t border-sidebar-border">
        <div className={cn("flex flex-col gap-0.5", collapsed ? "px-0" : "")}>
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

        {/* ── User card ── */}
        <div
          className={cn(
            "flex items-center rounded-lg bg-muted/50 p-2.5 transition-colors hover:bg-muted",
            collapsed ? "flex-col gap-2" : "gap-3",
          )}
        >
          <div className="relative">
            <Avatar className="size-8 shrink-0 border border-border">
              <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-[9px] font-bold text-white">
                KK
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-semibold text-foreground leading-tight">
                  Koji Kiyotaka
                </p>
                <p className="text-[10px] text-primary">
                  Administrator
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="size-3.5" />
                <span className="sr-only">Menu</span>
              </Button>
            </>
          )}
        </div>
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
