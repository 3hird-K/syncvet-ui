"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { usePathname } from "next/navigation";
import { UserSyncProvider } from "@/components/auth/user-sync-provider";

import { QueryProvider } from "@/components/providers/query-provider";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <QueryProvider>
      <UserSyncProvider>
        <AppShell>{children}</AppShell>
      </UserSyncProvider>
    </QueryProvider>
  );
}


