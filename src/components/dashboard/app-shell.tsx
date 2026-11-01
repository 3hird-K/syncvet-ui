"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar, SidebarContent } from "@/components/dashboard/dashboard-sidebar";
import { useUser } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { FacebookTopBar } from "@/components/dashboard/facebook-top-bar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useUser();

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const isStaff =
    isAdminEmail ||
    metadata?.roleTitle === "Administrator" ||
    metadata?.roleTitle === "Veterinarian";
  const isPetOwner = !isStaff && (metadata?.accountType === "pet_owner" || metadata?.roleTitle === "Pet Owner");

  const isPetOwnerPage = pathname.startsWith("/pet-owner");
  const isPetOwnerView = isPetOwnerPage || isPetOwner;
  const isMessagesPage = pathname.startsWith("/messages");

  // ── Pet Owners View: No sidebar, Facebook-style Top Bar ──
  if (isPetOwnerView) {
    return (
      <div className="flex flex-col fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
        {/* Facebook-style Top Bar */}
        <FacebookTopBar />

        {/* Scrollable page content */}
        <main
          className={cn(
            "min-h-0 flex-1 overflow-x-hidden",
            isMessagesPage ? "overflow-hidden flex flex-col" : "overflow-y-auto"
          )}
        >
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex fixed inset-0 h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Mobile-only bar (Hidden on desktop, header removed per user request) */}
        <div className="lg:hidden flex h-11 shrink-0 items-center justify-between border-b border-border px-3 bg-background">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
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

          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">
            SyncVet CVO
          </span>

          <div className="size-8" />
        </div>

        {/* ── Scrollable page content ── */}
        <main
          className={cn(
            "min-h-0 flex-1 overflow-x-hidden",
            isMessagesPage ? "overflow-hidden flex flex-col" : "overflow-y-auto"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
