"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Clock,
  Settings,
  HelpCircle,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  href: string | null;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Manage Users", icon: Users, href: "/users" },
  { label: "Manage Tasks", icon: ClipboardList, href: null },
  { label: "Time Logs", icon: Clock, href: null },
];

export function DashboardSidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-svh shrink-0 flex-col border-r border-sidebar-border bg-sidebar py-6 transition-[width,padding] duration-200 ease-out",
        collapsed ? "w-[68px] px-2" : "w-[16%] min-w-[250px] px-5",
      )}
    >
      {/* ── Brand ── */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-3",
          collapsed ? "flex-col items-center px-0" : "px-2",
        )}
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm"
          aria-hidden
        >
          <div className="flex size-full items-center justify-center rounded-sm bg-zinc-900 text-[9px] font-extrabold text-white">
            SV
          </div>
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
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
              item.href == null && "cursor-not-allowed opacity-30",
            );

            if (item.href == null) {
              return (
                <span
                  key={item.label}
                  className={itemClass}
                  title={collapsed ? item.label : undefined}
                >
                  {content}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={itemClass}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ── Bottom actions ── */}
      <div className="mt-auto shrink-0 space-y-2 px-1 pt-4 border-t border-sidebar-border">
        <div className={cn("flex flex-col gap-0.5", collapsed ? "px-0" : "")}>
          <button
            type="button"
            className={cn(
              "flex items-center rounded-lg text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
            )}
            title={collapsed ? "Settings" : undefined}
          >
            <Settings className="size-4" strokeWidth={2} />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center rounded-lg text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
            )}
            title={collapsed ? "Get Help" : undefined}
          >
            <HelpCircle className="size-4" strokeWidth={2} />
            {!collapsed && <span>Get Help</span>}
          </button>
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
    </aside>
  );
}
