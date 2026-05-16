"use client";

import { useState } from "react";
import { PanelLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar, SidebarContent } from "@/components/dashboard/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
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
            >
              <PanelLeft className="size-4" />
            </Button>

            <span className="text-[10px] md:text-xs font-semibold uppercase tracking-widest text-muted-foreground truncate max-w-[150px] md:max-w-none">
              SyncVet Dashboard
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* ── Scrollable page content ── */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
