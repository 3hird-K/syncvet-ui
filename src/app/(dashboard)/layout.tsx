"use client";

import { AppShell } from "@/components/dashboard/app-shell";
import { usePathname } from "next/navigation";
import { UserSyncProvider } from "@/components/auth/user-sync-provider";

import { QueryProvider } from "@/components/providers/query-provider";
import { CVOProvider } from "@/lib/cvo-context";
import { ChatProvider } from "@/lib/chat-context";
import { CitizenChatWidget } from "@/components/chat/citizen-chat-widget";

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
    <QueryProvider>
      <UserSyncProvider>
        <CVOProvider>
          <ChatProvider>
            <AppShell>{children}</AppShell>
            {!isMessagesPage && <CitizenChatWidget />}
          </ChatProvider>
        </CVOProvider>
      </UserSyncProvider>
    </QueryProvider>
  );
}


