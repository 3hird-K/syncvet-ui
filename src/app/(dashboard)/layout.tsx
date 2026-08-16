"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { usePathname } from "next/navigation";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Root landing page renders full-width without dashboard sidebar
  if (pathname === "/") {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
