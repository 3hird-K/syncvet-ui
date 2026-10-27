"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { usePathname } from "next/navigation";
import { UserSyncProvider } from "@/components/auth/user-sync-provider";

import { QueryProvider } from "@/components/providers/query-provider";
import { CVOProvider } from "@/lib/cvo-context";
import { ChatProvider } from "@/lib/chat-context";
import { CitizenChatWidget } from "@/components/chat/citizen-chat-widget";

import { DashboardRouteGuard } from "@/components/auth/dashboard-route-guard";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  const isMessagesPage = pathname?.startsWith("/messages");

  return (
    <UserSyncProvider>
      <CVOProvider>
        <ChatProvider>
          <DashboardRouteGuard>
            <AppShell>{children}</AppShell>
            {!isMessagesPage && <CitizenChatWidget />}
          </DashboardRouteGuard>
        </ChatProvider>
      </CVOProvider>
    </UserSyncProvider>
  );
}


