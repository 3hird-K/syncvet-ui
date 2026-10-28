"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Menu, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar, SidebarContent } from "@/components/dashboard/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { OperationalNotifications } from "@/components/dashboard/operational-notifications";
import { useUser } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function isPetsView(path: string): boolean {
  return (
    path.startsWith("/pet-owner") ||
    path.startsWith("/pet-registry") ||
    path.startsWith("/pets")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(() => isPetsView(pathname));
  const [open, setOpen] = useState(false);
  const prevPathRef = useRef(pathname);

  // Default sidebar to shrink on pets view, expand on non-pets view, while letting user toggle manually
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      const wasPets = isPetsView(prevPathRef.current);
      const isNowPets = isPetsView(pathname);

      if (isNowPets && !wasPets) {
        setCollapsed(true);
      } else if (!isNowPets && wasPets) {
        setCollapsed(false);
      }
      prevPathRef.current = pathname;
    }
  }, [pathname]);
  const { user } = useUser();

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const isStaff =
    isAdminEmail ||
    metadata?.roleTitle === "Administrator" ||
    metadata?.roleTitle === "Veterinarian";
  const isPetOwner = !isStaff && (metadata?.accountType === "pet_owner" || metadata?.roleTitle === "Pet Owner");

  return (
    <div className="flex fixed inset-0 h-screen max-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <DashboardSidebar collapsed={collapsed} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── Top bar ── */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4 md:px-5">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden size-8 text-muted-foreground hover:text-foreground"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 border-r border-sidebar-border bg-sidebar pt-10">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">
                  Access SyncVet system modules and settings
                </SheetDescription>
                <div className="h-full px-5 py-6">
                  <SidebarContent onItemClick={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Toggle Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden lg:flex size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="size-4" />
            </Button>

            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate max-w-[200px] md:max-w-none">
              {pathname.startsWith("/pet-owner")
                ? "SyncVet Pet Owner Portal • Cagayan de Oro CVO"
                : pathname.startsWith("/messages")
                ? (isPetOwner
                    ? "SyncVet Telemedicine & Vet Consultation • Cagayan de Oro CVO"
                    : "SyncVet Telemedicine & Inquiry Desk • Cagayan de Oro CVO")
                : "SyncVet Dashboard • City Veterinary Office"}
            </span>
          </div>

          {/* ── Top Bar Action Controls: Realtime Operational Notifications (Admin & Vet only) & Theme Toggle ── */}
          <div className="flex items-center gap-1">
            {isStaff && !pathname.startsWith("/pet-owner") && (
              <OperationalNotifications />
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* ── Scrollable page content ── */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
