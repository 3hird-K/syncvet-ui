"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { usePathname } from "next/navigation";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}

