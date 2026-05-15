"use client";

import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-svh max-h-svh overflow-hidden bg-background text-foreground">
      <DashboardSidebar collapsed={collapsed} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* ── Top bar ── */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="size-4" />
            </Button>
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              SyncVet Dashboard
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* ── Page content ── */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background">
          {children}
        </div>
      </div>
    </div>
  );
}
