"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  useCitizenChat,
  UNIFIED_VET_NAME,
  UNIFIED_VET_BADGE,
  ChatMessageItem,
  ChatReplyInfo,
  parseAttachmentMeta,
  serializeAttachmentMeta,
  isDifferentDay,
  formatDateDivider,
  getShortFirstName,
  isMessageRemovedForUser,
  isMessageLocallyRemoved,
  markMessageLocallyRemoved,
} from "@/lib/chat-context";
import { useCVO } from "@/lib/cvo-context";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import {
  X,
  Minus,
  Maximize2,
  Send,
  Stethoscope,
  Building2,
  PawPrint,
  Sparkles,
  ArrowRight,
  ThumbsUp,
  User,
  Smile,
  Pencil,
  Trash2,
  MoreVertical,
  MoreHorizontal,
  Reply,
  Check,
  ChevronDown,
  Loader2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, getTwoLetterInitials } from "@/lib/utils";

export interface ChatContact {
  id: string; // 'vet' | 'admin' | 'citizen'
  desk: "vet" | "admin";
  name: string;
  shortName: string;
  roleDescription: string;
  avatar: string;
  fallback: string;
  badge: string;
  theme: "emerald" | "teal" | "purple";
  isOnline: boolean;
  ownerId?: string;
}

const CONTACTS: ChatContact[] = [
  {
    id: "vet",
    desk: "vet",
    name: "Dr. Helen Ann P. Tacandong, DVM",
    shortName: "Dr. Helen (Vet)",
    roleDescription: "City Veterinarian • Telemedicine & Clinical Care",
    avatar: "/dr-helen-tacandong.jpg",
    fallback: "HT",
    badge: "City Veterinarian",
    theme: "emerald",
    isOnline: true,
  },
  {
    id: "admin",
    desk: "admin",
    name: "CVO Inquiry & Admin Desk",
    shortName: "CVO Admin Desk",
    roleDescription: "Cagayan de Oro CVO • Public Desk & Bite Reports",
    avatar: "/partners/cdo-seal.png",
    fallback: "AD",
    badge: "Admin Desk",
    theme: "teal",
    isOnline: true,
  },
  {
    id: "citizen",
    desk: "vet",
    name: "Kyle Urgentrouse",
    shortName: "Kyle Urgentrouse",
    roleDescription: "Citizen Consultation • Pet: Dog (Mixed)",
    avatar: "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zSmg1cllNOG9kNGF3QWRESUZ3UVE4OE4zM3UifQ",
    fallback: "KU",
    badge: "Pet Owner",
    theme: "purple",
    isOnline: true,
    ownerId: "user_3Jh5rWy35KtlFbJMi1wroOXOYot",
  },
];

export const checkContactTyping = (
  contact: ChatContact,
  isOtherTyping: boolean,
  typingInfo: any,
  currentUserId?: string | null
) => {
  if (!isOtherTyping || !typingInfo) return false;
  // A user should never see typing events triggered by themselves
  if (currentUserId && typingInfo.senderId && typingInfo.senderId === currentUserId) {
    return false;
  }

  // Strictly check by contact identity (id), NOT shared desk name!
  if (contact.id === "vet") {
    // Must be typed by Veterinarian/staff (not Pet Owner, not Admin)
    return (
      typingInfo.senderRole === "Veterinarian" ||
      (typingInfo.desk === "vet" && typingInfo.senderRole !== "Pet Owner") ||
      (typingInfo.senderName?.includes("Helen") && !typingInfo.senderName?.includes("Admin"))
    );
  }

  if (contact.id === "admin") {
    // Must be typed by CVO Admin Desk (not Vet, not Pet Owner)
    return (
      typingInfo.senderRole === "Admin" ||
      typingInfo.senderRole === "Administrator" ||
      (typingInfo.desk === "admin" && typingInfo.senderRole !== "Pet Owner") ||
      typingInfo.senderName?.includes("Admin")
    );
  }

  if (contact.id === "citizen" || contact.ownerId) {
    // Must strictly be typed by a Pet Owner
    if (typingInfo.senderRole !== "Pet Owner") return false;
    if (contact.ownerId && typingInfo.senderId && typingInfo.senderId !== contact.ownerId) {
      return false;
    }
    return true;
  }

  return false;
};

export function CitizenChatWidget() {
  const { user, isLoaded } = useUser();
  const { activeRoleView } = useCVO();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const { isOtherTyping, typingInfo, setActiveDesk, setActiveChatId } = useCitizenChat();

  // Dynamically fetch users to always resolve up-to-date profile pictures (avatar_url)
  const { data: dbUsers = [] } = useQuery({
    queryKey: ["syncvet-widget-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, avatar_url, role");
      if (error) {
        console.error("Widget user fetch error:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 30,
  });

  const userRecord = dbUsers.find((u) => u.id === user?.id);
  const isVet = activeRoleView === "Veterinarian" || userRecord?.role === "Veterinarian";
  const isStaff = activeRoleView !== "Pet Owner" && userRecord?.role !== "Pet Owner";

  const dynamicContacts = useMemo<ChatContact[]>(() => {
    const baseContacts: ChatContact[] = [
      {
        id: "vet",
        desk: "vet",
        name: "Dr. Helen Ann P. Tacandong, DVM",
        shortName: "Dr. Helen (Vet)",
        roleDescription: "City Veterinarian • Telemedicine & Clinical Care",
        avatar: "/dr-helen-tacandong.jpg",
        fallback: "HT",
        badge: "City Veterinarian",
        theme: "emerald",
        isOnline: true,
      },
      {
        id: "admin",
        desk: "admin",
        name: "CVO Inquiry & Admin Desk",
        shortName: "CVO Admin Desk",
        roleDescription: "Cagayan de Oro CVO • Public Desk & Bite Reports",
        avatar: "/partners/cdo-seal.png",
        fallback: "AD",
        badge: "Admin Desk",
        theme: "teal",
        isOnline: true,
      },
    ];

    const petOwnerUsers = dbUsers.filter((u) => {
      const role = u.role?.toLowerCase() || "";
      return (
        role.includes("owner") ||
        (!role.includes("vet") && !role.includes("admin") && !role.includes("staff"))
      );
    });

    const citizenContacts: ChatContact[] = petOwnerUsers.map((u) => {
      const isKyle = u.id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot";
      const resolvedAvatar =
        u.avatar_url ||
        (isKyle
          ? "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zSmg1cllNOG9kNGF3QWRESUZ3UVE4OE4zM3UifQ"
          : "");

      return {
        id: isKyle ? "citizen" : u.id,
        desk: "vet" as const,
        name: u.full_name || "Pet Owner",
        shortName: u.full_name || "Pet Owner",
        roleDescription: "Citizen Consultation • Pet Owner",
        avatar: resolvedAvatar,
        fallback: getTwoLetterInitials(u.full_name || u.email || "PO"),
        badge: "Pet Owner",
        theme: "purple" as const,
        isOnline: true,
        ownerId: u.id,
      };
    });

    const hasCitizen = citizenContacts.some(
      (c) => c.id === "citizen" || c.ownerId === "user_3Jh5rWy35KtlFbJMi1wroOXOYot"
    );
    if (!hasCitizen) {
      citizenContacts.unshift({
        id: "citizen",
        desk: "vet",
        name: "Kyle Urgentrouse",
        shortName: "Kyle Urgentrouse",
        roleDescription: "Citizen Consultation • Pet: Dog (Mixed)",
        avatar:
          "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zSmg1cllNOG9kNGF3QWRESUZ3UVE4OE4zM3UifQ",
        fallback: "KU",
        badge: "Pet Owner",
        theme: "purple",
        isOnline: true,
        ownerId: "user_3Jh5rWy35KtlFbJMi1wroOXOYot",
      });
    }

    return [...baseContacts, ...citizenContacts];
  }, [dbUsers]);

  const findContact = useCallback(
    (contactId: string): ChatContact | undefined => {
      return (
        dynamicContacts.find(
          (c) =>
            c.id === contactId ||
            c.ownerId === contactId ||
            (contactId === "citizen" && c.ownerId === "user_3Jh5rWy35KtlFbJMi1wroOXOYot")
        ) || CONTACTS.find((c) => c.id === contactId)
      );
    },
    [dynamicContacts]
  );

  // List of chat IDs currently expanded (at most 2 side-by-side like Facebook Messenger)
  const [openChatIds, setOpenChatIds] = useState<string[]>([]);
  const openChatIdsRef = useRef<string[]>([]);
  useEffect(() => {
    openChatIdsRef.current = openChatIds;
  }, [openChatIds]);

  // List of chat IDs currently docked as circular chat heads
  const [activeChatHeadIds, setActiveChatHeadIds] = useState<string[]>([]);
  // Unread message count per contact ID
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [pawReactions, setPawReactions] = useState<Record<string, string>>({});

  // Helper to determine if a specific contact is typing
  const isContactTyping = (contact: ChatContact) => {
    return checkContactTyping(contact, isOtherTyping, typingInfo, user?.id);
  };

  const markContactAsRead = useCallback(
    async (contactId: string, knownChatId?: string | null) => {
      setUnreadCounts((prev) => {
        if (!prev[contactId]) return prev;
        const next = { ...prev };
        delete next[contactId];
        return next;
      });

      if (!user?.id) return;
      try {
        let chatId = knownChatId;
        if (!chatId) {
          const contact = findContact(contactId);
          if (!contact) return;
          const targetVetName =
            contact.desk === "admin" ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;

          const query = supabase
            .from("chats")
            .select("id")
            .eq("assigned_vet_name", targetVetName);

          if (contact.ownerId) {
            query.eq("owner_id", contact.ownerId);
          } else {
            query.eq("owner_id", user.id);
          }

          const { data } = await query.maybeSingle();
          chatId = data?.id;
        }

        if (chatId) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .eq("chat_id", chatId)
            .neq("sender_id", user.id)
            .eq("is_read", false);
        }
      } catch {
        // ignore
      }
    },
    [user?.id, supabase]
  );

  // Check initial unread messages in database
  useEffect(() => {
    if (!isLoaded || !user?.id) return;
    const fetchUnreads = async () => {
      try {
        const { data: chats } = await supabase
          .from("chats")
          .select("id, assigned_vet_name, owner_id")
          .eq(isStaff ? "assigned_vet_name" : "owner_id", isStaff ? UNIFIED_VET_NAME : user.id);

        if (!chats || chats.length === 0) return;

        const chatIds = chats.map((c: any) => c.id);
        const { data: unreadMsgs } = await supabase
          .from("chat_messages")
          .select("id, chat_id, sender_id, sender_role, is_read")
          .in("chat_id", chatIds)
          .eq("is_read", false);

        if (unreadMsgs && unreadMsgs.length > 0) {
          const counts: Record<string, number> = {};
          const toMarkReadChatIds = new Set<string>();

          unreadMsgs.forEach((m: any) => {
            if (m.sender_id === user.id) return;
            const chat = chats.find((c: any) => c.id === m.chat_id);
            if (!chat) return;

            let targetContactId = "vet";
            if (chat.assigned_vet_name?.includes("Admin") || m.sender_role === "Admin" || m.sender_role === "Administrator") {
              targetContactId = "admin";
            } else if (isStaff) {
              const isKyle = chat.owner_id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot";
              targetContactId = isKyle ? "citizen" : (chat.owner_id || "citizen");
            } else {
              targetContactId = "vet";
            }

            // Veterinarians do not handle or track CVO Admin chats
            if (isVet && targetContactId === "admin") return;

            // If the chat is already open, do not show unread badge and mark as read in DB
            if (openChatIdsRef.current.includes(targetContactId)) {
              toMarkReadChatIds.add(m.chat_id);
              return;
            }

            const isFromOther = isStaff ? m.sender_role === "Pet Owner" : m.sender_role !== "Pet Owner";
            if (isFromOther) {
              counts[targetContactId] = (counts[targetContactId] || 0) + 1;
            }
          });

          if (toMarkReadChatIds.size > 0) {
            for (const cId of Array.from(toMarkReadChatIds)) {
              await supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("chat_id", cId)
                .neq("sender_id", user.id)
                .eq("is_read", false);
            }
          }

          setUnreadCounts(counts);
          if (Object.keys(counts).length > 0) {
            setActiveChatHeadIds((prev) => Array.from(new Set([...prev, ...Object.keys(counts)])));
          }
        } else {
          setUnreadCounts({});
        }
      } catch {
        // ignore
      }
    };
    fetchUnreads();
  }, [isLoaded, user?.id, isStaff, isVet, supabase]);

  // Realtime subscription for incoming messages to increment unread counter and auto-dock chat head
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`widget-unread-counter-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const row = payload.new;
          if (!row) return;
          if (row.sender_id === user.id) return;

          const isAdmin =
            row.sender_role === "Admin" ||
            row.sender_role === "Administrator" ||
            row.sender_name?.includes("Admin");
          const isFromStaff = row.sender_role !== "Pet Owner";

          let targetContactId = "vet";
          if (!isStaff) {
            targetContactId = isAdmin ? "admin" : "vet";
          } else {
            if (!isFromStaff) {
              const isKyle = row.sender_id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot";
              targetContactId = isKyle ? "citizen" : (row.sender_id || "citizen");
            }
          }

          // Veterinarians do not handle or track CVO Admin chats
          if (isVet && targetContactId === "admin") return;

          // If the chat window is currently open, mark read in DB and keep counter clear
          if (openChatIdsRef.current.includes(targetContactId)) {
            supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", row.id)
              .then(() => {});
            setUnreadCounts((prev) => {
              if (!prev[targetContactId]) return prev;
              const next = { ...prev };
              delete next[targetContactId];
              return next;
            });
            return;
          }

          setOpenChatIds((currentOpen) => {
            if (!currentOpen.includes(targetContactId)) {
              setUnreadCounts((prev) => ({
                ...prev,
                [targetContactId]: (prev[targetContactId] || 0) + 1,
              }));
              setActiveChatHeadIds((prev) =>
                prev.includes(targetContactId) ? prev : [...prev, targetContactId]
              );
            }
            return currentOpen;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isStaff, supabase]);

  const handleOpenContact = (contactId: string) => {
    markContactAsRead(contactId);
    setActiveChatHeadIds((prev) => (prev.includes(contactId) ? prev : [...prev, contactId]));
    setOpenChatIds((prev) => {
      if (prev.includes(contactId)) return prev;
      return prev.length >= 2 ? [prev[prev.length - 1], contactId] : [...prev, contactId];
    });
  };

  const toggleMinimize = (contactId: string) => {
    setOpenChatIds((prev) => {
      if (prev.includes(contactId)) {
        // Collapsing to circular head: user was already viewing this chat, so ensure marked read
        markContactAsRead(contactId);
        return prev.filter((id) => id !== contactId);
      } else {
        // Expanding window: mark as read immediately
        markContactAsRead(contactId);
        setActiveChatHeadIds((heads) => (heads.includes(contactId) ? heads : [...heads, contactId]));
        return prev.length >= 2 ? [prev[prev.length - 1], contactId] : [...prev, contactId];
      }
    });
  };

  const closeWindow = (contactId: string) => {
    setOpenChatIds((prev) => prev.filter((id) => id !== contactId));
    setActiveChatHeadIds((prev) => prev.filter((id) => id !== contactId));
  };

  const dismissChatHead = (contactId: string) => {
    setActiveChatHeadIds((prev) => prev.filter((id) => id !== contactId));
    setOpenChatIds((prev) => prev.filter((id) => id !== contactId));
    setUnreadCounts((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
  };

  const togglePawReaction = (msgId: string) => {
    setPawReactions((prev) => {
      const next = { ...prev };
      if (next[msgId] === "🐾") {
        delete next[msgId];
      } else {
        next[msgId] = "🐾";
      }
      return next;
    });
  };

  // Contacts that should currently appear as circular heads on the side
  const visibleContacts = useMemo(() => {
    return dynamicContacts.filter((c) => {
      // Pet owners should NEVER see pet owners (including themselves) as a circular contact head!
      if (!isStaff && (c.id === "citizen" || c.ownerId)) return false;
      // Staff members should never see "vet" (themselves) as a circular contact head!
      if (isStaff && c.id === "vet") return false;
      // Veterinarians should strictly NOT see or open CVO Admin chats
      if (isVet && c.id === "admin") return false;

      const isOpen = openChatIds.includes(c.id);
      const isHeadActive = activeChatHeadIds.includes(c.id);
      const hasUnread = (unreadCounts[c.id] || 0) > 0;
      const isTyping = isContactTyping(c);
      return isOpen || isHeadActive || hasUnread || isTyping;
    });
  }, [dynamicContacts, openChatIds, activeChatHeadIds, unreadCounts, isOtherTyping, typingInfo, isStaff, isVet, user?.id]);

  const handleMaximize = (contact: ChatContact, activeDbId?: string | null) => {
    const targetDesk = isVet ? "vet" : contact.desk;
    setActiveDesk(targetDesk);
    if (activeDbId) {
      setActiveChatId(activeDbId);
    } else if (contact.ownerId) {
      setActiveChatId(`thread-${contact.ownerId}`);
    }
    closeWindow(contact.id);

    const params = new URLSearchParams();
    params.set("desk", targetDesk);
    if (activeDbId) params.set("chatId", activeDbId);
    if (contact.ownerId) params.set("ownerId", contact.ownerId);

    router.push(`/messages?${params.toString()}`);
  };

  if (pathname?.startsWith("/messages")) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[999] flex items-end gap-2.5 sm:gap-3 pointer-events-none">
      {/* ── 1. Open Floating Facebook-style Windows (Docked horizontally side-by-side) ── */}
      <div className="flex items-end gap-3 pointer-events-auto relative z-[1000]">
        {openChatIds.map((chatId) => {
          const contact = findContact(chatId);
          if (!contact) return null;
          return (
            <FacebookMessengerWindow
              key={contact.id}
              contact={contact}
              isStaff={isStaff}
              user={user}
              isLoaded={isLoaded}
              pawReactions={pawReactions}
              onTogglePawReaction={togglePawReaction}
              onMinimize={() => toggleMinimize(contact.id)}
              onClose={() => closeWindow(contact.id)}
              onMaximize={(activeDbId) => handleMaximize(contact, activeDbId)}
              onMarkAsRead={markContactAsRead}
            />
          );
        })}
      </div>

      {/* ── 2. Facebook Style Stacked Circular Chat Heads (On the Right Edge) ── */}
      <div className="flex flex-col items-center gap-2 mb-1 pointer-events-auto shrink-0 select-none relative z-[1001]">
        {/* Launcher Circle with '...' (Matches Image 1 top circle) */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="relative flex items-center justify-center size-11.5 sm:size-12 rounded-full shadow-lg hover:shadow-xl transition-colors duration-200 cursor-pointer border border-border/80 hover:border-primary/60 bg-zinc-900/90 dark:bg-zinc-800 text-zinc-300 hover:text-white group z-20"
              title="Start a message or view contacts"
              aria-label="New message / contacts"
            >
              <MoreHorizontal className="size-5" />
              {/* Facebook-style Hover Tooltip */}
              <div className="absolute right-14 hidden group-hover:flex items-center px-2.5 py-1 rounded-lg bg-popover/95 backdrop-blur-md border border-border shadow-lg text-xs font-semibold text-foreground whitespace-nowrap pointer-events-none animate-in fade-in-50 zoom-in-95 duration-150 z-50">
                <span>Start a message</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="left"
            sideOffset={12}
            className="!z-[1050] w-72 sm:w-80 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/70 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-border/40 mb-1">
              <h4 className="text-xs font-extrabold text-foreground tracking-tight">
                New Message
              </h4>
              <p className="text-[10px] text-muted-foreground font-medium">
                Select an official CVO channel to connect
              </p>
            </div>

            {/* Contacts list */}
            <div className="space-y-1 py-0.5">
              {dynamicContacts
                .filter((c) => {
                  if (isStaff) {
                    // Veterinarian should strictly NOT see or open CVO Admin chats, only Pet Owners
                    if (isVet) return c.id !== "vet" && c.id !== "admin";
                    return c.id !== "vet";
                  }
                  return c.id === "vet" || c.id === "admin";
                })
                .map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  onClick={() => handleOpenContact(c.id)}
                  className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-muted/70 transition-all group focus:bg-muted/70"
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-10 rounded-full overflow-hidden border border-border/60 shadow-xs">
                      {c.avatar ? (
                        <AvatarImage
                          src={c.avatar}
                          alt={c.name}
                          referrerPolicy="no-referrer"
                          className={c.id === "admin" ? "object-contain p-1 bg-white" : "object-cover"}
                        />
                      ) : null}
                      <AvatarFallback
                        className={cn(
                          "text-white font-bold text-xs",
                          c.theme === "teal"
                            ? "bg-teal-600"
                            : c.theme === "purple"
                            ? "bg-purple-600"
                            : "bg-emerald-600"
                        )}
                      >
                        {c.fallback}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-emerald-500/20" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {c.shortName}
                      </p>
                      <span
                        className={cn(
                          "text-[9px] font-semibold px-1.5 py-0 rounded-full border shrink-0",
                          c.theme === "teal"
                            ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                            : c.theme === "purple"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {c.badge}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-snug">
                      {c.roleDescription}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dynamic Chat Heads: Only rendered if active, unread, open, or typing */}
        {visibleContacts.map((contact: ChatContact) => {
          const isOpen = openChatIds.includes(contact.id);
          const unread = unreadCounts[contact.id] || 0;
          const isTyping = isContactTyping(contact);

          return (
            <div key={contact.id} className="relative group flex items-center">
              {/* Facebook-style Hover Name Tooltip */}
              <div className="absolute right-14 hidden group-hover:flex items-center px-2.5 py-1 rounded-lg bg-popover/95 backdrop-blur-md border border-border shadow-lg text-xs font-semibold text-foreground whitespace-nowrap pointer-events-none animate-in fade-in-50 zoom-in-95 duration-150 z-50">
                <span>{contact.shortName}</span>
                {unread > 0 ? (
                  <span className="ml-1.5 text-[10px] text-rose-500 font-bold">
                    ({unread} new)
                  </span>
                ) : isOpen ? (
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                    (Click to minimize)
                  </span>
                ) : (
                  <span className="ml-1.5 text-[10px] text-emerald-600 font-semibold">
                    (Click to open)
                  </span>
                )}
              </div>

              {/* Circular Chat Head Avatar */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => toggleMinimize(contact.id)}
                  className={cn(
                    "relative flex items-center justify-center size-11.5 sm:size-12 rounded-full shadow-lg hover:shadow-xl transition-colors duration-200 cursor-pointer border-2 bg-card overflow-visible",
                    isOpen
                      ? "border-primary ring-2 ring-primary/40 ring-offset-2 ring-offset-background"
                      : unread > 0
                      ? "border-rose-500 ring-2 ring-rose-500/30"
                      : "border-border/80 hover:border-primary/60"
                  )}
                  title={contact.name}
                  aria-label={`Open conversation with ${contact.name}`}
                >
                  <Avatar className="size-full rounded-full overflow-hidden">
                    {contact.avatar ? (
                      <AvatarImage
                        src={contact.avatar}
                        alt={contact.name}
                        referrerPolicy="no-referrer"
                        className={
                          contact.id === "admin"
                            ? "object-contain p-1 bg-white"
                            : "object-cover"
                        }
                      />
                    ) : null}
                    <AvatarFallback
                      className={cn(
                        "text-white font-bold text-xs",
                        contact.theme === "teal"
                          ? "bg-teal-600"
                          : contact.theme === "purple"
                          ? "bg-purple-600"
                          : "bg-emerald-600"
                      )}
                    >
                      {contact.fallback}
                    </AvatarFallback>
                  </Avatar>

                  {/* Active Online Status Green Dot (if not unread and not typing) */}
                  {unread === 0 && !isTyping && (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-emerald-500/20" />
                  )}
                </button>

                {/* ── Unread Messages Red Badge (Matches Image 1 & 2: '5' and '1') ── */}
                {unread > 0 && !isOpen && (
                  <span className="absolute -top-1 -right-1 z-20 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white font-extrabold text-[11px] flex items-center justify-center border-2 border-background shadow-md animate-in zoom-in-75">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}

                {/* ── Animated Typing Pill (Matches Image 2: dark pill with 3 bouncing dots) ── */}
                {isTyping && (
                  <div
                    className="absolute -bottom-1 -right-2 z-20 flex items-center gap-1 bg-zinc-900 dark:bg-zinc-800 border border-white/20 shadow-lg px-2 py-1 rounded-full animate-in zoom-in-75 duration-150"
                    title={`${contact.shortName} is typing...`}
                  >
                    <span className="size-1.5 rounded-full bg-zinc-200 animate-bounce [animation-delay:-0.3s]" />
                    <span className="size-1.5 rounded-full bg-zinc-200 animate-bounce [animation-delay:-0.15s]" />
                    <span className="size-1.5 rounded-full bg-zinc-200 animate-bounce" />
                  </div>
                )}

                {/* ── Hover Dismiss Button (Matches Image 1 bottom avatar: dark circle with white 'x') ── */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissChatHead(contact.id);
                  }}
                  className="absolute -top-1 -right-1 z-30 size-5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center border border-white/20 shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Close chat head"
                  aria-label="Dismiss chat head"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Facebook-style Floating Messenger Chat Window
 * Features:
 * - Header with Profile avatar + Active Now + Minimize (_) + Maximize + Close (X) (NO CALL BUTTONS)
 * - Self-contained real-time messages & typing indicators
 * - Paw reaction toggle support with reversed bubble badges
 * - Quick FAQs and Enter-to-send support
 */
function FacebookMessengerWindow({
  contact,
  isStaff,
  user,
  isLoaded,
  pawReactions,
  onTogglePawReaction,
  onMinimize,
  onClose,
  onMaximize,
  onMarkAsRead,
}: {
  contact: ChatContact;
  isStaff: boolean;
  user: any;
  isLoaded: boolean;
  pawReactions: Record<string, string>;
  onTogglePawReaction: (msgId: string) => void;
  onMinimize: () => void;
  onClose: () => void;
  onMaximize: (activeDbId?: string | null) => void;
  onMarkAsRead?: (contactId: string, chatId?: string | null) => void;
}) {
  const { selectedPet, setSelectedPet, sendTypingStatus, isOtherTyping, typingInfo, reactions, toggleReaction, unsendMessage, removeMessageForMe } =
    useCitizenChat();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewUnseen, setHasNewUnseen] = useState(false);
  const [activeChatDbId, setActiveChatDbId] = useState<string | null>(null);
  const activeChatDbIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatDbIdRef.current = activeChatDbId;
  }, [activeChatDbId]);

  const onMarkAsReadRef = useRef(onMarkAsRead);
  useEffect(() => {
    onMarkAsReadRef.current = onMarkAsRead;
  }, [onMarkAsRead]);

  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatReplyInfo | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
    setShowScrollBottom(false);
    setHasNewUnseen(false);
  }, []);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceFromBottom < 70;
    isNearBottomRef.current = isNear;

    if (isNear) {
      setShowScrollBottom(false);
      setHasNewUnseen(false);
    } else {
      setShowScrollBottom(true);
    }

    if (el.scrollTop < 40 && hasMoreOlder && !isFetchingOlder) {
      loadOlderMessages();
    }
  };

  const mapRowToMessageItem = useCallback((m: any): ChatMessageItem => {
    const isAdmin =
      m.sender_role === "Admin" ||
      m.sender_role === "Administrator" ||
      m.sender_name?.includes("Admin");
    const isStaffMsg = m.sender_role !== "Pet Owner";
    const meta = parseAttachmentMeta(m.attachment_url);
    const isUnsent = m.message_text === "__UNSENT__" || meta.isUnsent === true;
    return {
      id: m.id,
      chatId: m.chat_id,
      senderId: m.sender_id,
      senderRole: isAdmin ? "Admin" : isStaffMsg ? "Veterinarian" : "Pet Owner",
      senderName: isAdmin
        ? "CVO Inquiry & Admin Desk"
        : isStaffMsg
        ? UNIFIED_VET_NAME
        : m.sender_name,
      badge: isAdmin ? "CVO Admin Desk" : isStaffMsg ? UNIFIED_VET_BADGE : undefined,
      text: isUnsent ? "" : m.message_text,
      isUnsent,
      timestamp: new Intl.DateTimeFormat("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(m.created_at)),
      createdAt: m.created_at,
      reaction: isUnsent ? undefined : meta.reaction,
      replyTo: isUnsent ? undefined : meta.replyTo,
      isRead: true,
    };
  }, []);

  const loadOlderMessages = async () => {
    if (!activeChatDbId || !hasMoreOlder || isFetchingOlder || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    setIsFetchingOlder(true);
    const scrollEl = scrollContainerRef.current;
    const prevScrollHeight = scrollEl?.scrollHeight || 0;
    const prevScrollTop = scrollEl?.scrollTop || 0;

    try {
      const { data: olderRows } = await supabase
        .from("chat_messages")
        .select("*, users:sender_id(full_name, email)")
        .eq("chat_id", activeChatDbId)
        .lt("created_at", oldest.createdAt)
        .order("created_at", { ascending: false })
        .limit(25);

      if (olderRows) {
        if (olderRows.length < 25) {
          setHasMoreOlder(false);
        }
        if (olderRows.length > 0) {
          const filtered = olderRows.filter((m: any) => {
            const meta = parseAttachmentMeta(m.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress)) return false;
            if (isMessageLocallyRemoved(m.id, user?.id)) return false;
            return true;
          });
          const chronological = [...filtered].reverse();
          const mapped = chronological.map(mapRowToMessageItem);
          setMessages((prev) => [...mapped, ...prev]);

          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const diff = scrollContainerRef.current.scrollHeight - prevScrollHeight;
              scrollContainerRef.current.scrollTop = prevScrollTop + diff;
            }
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsFetchingOlder(false);
    }
  };

  const handleStartReply = (msg: ChatMessageItem) => {
    const isAdmin =
      msg.senderRole === "Admin" ||
      msg.senderRole === "Administrator" ||
      msg.senderName?.includes("Admin");
    const isVet = msg.senderRole === "Veterinarian" || msg.senderRole === "Staff";
    const name = isAdmin
      ? "CVO Admin"
      : isVet
      ? "Dr. Helen"
      : getShortFirstName(msg.senderName || contact.shortName || "Pet Owner");
    setReplyingTo({
      id: msg.id,
      senderName: name,
      text: msg.text,
    });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const scrollToMessage = (targetId?: string) => {
    if (!targetId) return;
    const el = document.getElementById(`widget-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2200);
    }
  };

  const handleStartEdit = (msg: ChatMessageItem) => {
    setEditingMessageId(msg.id);
    setInputText(msg.text);
    setReplyingTo(null);
    textareaRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
    }
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    const clean = inputText.trim();
    if (!clean) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === editingMessageId ? { ...m, text: clean, isEdited: true } : m
      )
    );
    const targetId = editingMessageId;
    setEditingMessageId(null);
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
    }

    try {
      await supabase
        .from("chat_messages")
        .update({ message_text: clean })
        .eq("id", targetId);
    } catch {
      // ignore
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId));
    markMessageLocallyRemoved(msgId, user?.id);
    const target = messages.find((m) => m.id === msgId);
    if (target?.isUnsent) {
      try {
        await removeMessageForMe(msgId);
      } catch {}
      return;
    }
    try {
      await supabase.from("chat_messages").delete().eq("id", msgId);
    } catch {
      // ignore
    }
  };

  const handleUnsendMessage = async (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, isUnsent: true, text: "", replyTo: undefined, reaction: undefined }
          : m
      )
    );
    try {
      await unsendMessage(msgId);
    } catch {
      // ignore
    }
  };

  const isSendingRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat messages specifically for this contact & desk
  const loadMessages = useCallback(async () => {
    if (!isLoaded || !user?.id) return;
    try {
      setIsLoading(true);
      let chatId = activeChatDbIdRef.current;
      const targetVetName =
        contact.desk === "admin" ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;

      if (!chatId) {
        const query = supabase
          .from("chats")
          .select("id")
          .eq("assigned_vet_name", targetVetName);

        if (contact.ownerId) {
          query.eq("owner_id", contact.ownerId);
        } else {
          query.eq("owner_id", user.id);
        }

        const { data: foundChat } = await query.maybeSingle();
        if (foundChat?.id) {
          chatId = foundChat.id;
          activeChatDbIdRef.current = foundChat.id;
          setActiveChatDbId(foundChat.id);
        }
      }

      if (chatId) {
        // Mark all unread messages from other user as read in DB & clear local unread count
        supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("chat_id", chatId)
          .neq("sender_id", user.id)
          .eq("is_read", false)
          .then(() => {});

        onMarkAsReadRef.current?.(contact.id, chatId);

        const { data: msgRows } = await supabase
          .from("chat_messages")
          .select("*, users:sender_id(full_name, email)")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: false })
          .limit(25);

        if (msgRows) {
          setHasMoreOlder(msgRows.length === 25);
          const filtered = msgRows.filter((m: any) => {
            const meta = parseAttachmentMeta(m.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress)) return false;
            if (isMessageLocallyRemoved(m.id, user?.id)) return false;
            return true;
          });
          const chronological = [...filtered].reverse();
          const mapped: ChatMessageItem[] = chronological.map(mapRowToMessageItem);
          setMessages((prev) => {
            const pendingOptimistic = prev.filter((m) => m.id.startsWith("msg-"));
            const merged = [...mapped];
            for (const opt of pendingOptimistic) {
              if (!merged.some((m) => m.id === opt.id || (m.text === opt.text && m.senderRole === opt.senderRole))) {
                merged.push(opt);
              }
            }
            return merged;
          });
          if (!initialScrollDoneRef.current) {
            initialScrollDoneRef.current = true;
            setTimeout(() => {
              scrollToBottom("instant");
            }, 60);
          }
        }
      } else {
        setMessages([]);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, user?.id, user?.primaryEmailAddress?.emailAddress, contact.desk, contact.id, contact.ownerId, supabase, mapRowToMessageItem, scrollToBottom]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription for this conversation window
  useEffect(() => {
    if (!activeChatDbId) return;
    const channel = supabase
      .channel(`messenger-window-${activeChatDbId}-${contact.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatDbId}` },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            const meta = parseAttachmentMeta(row.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress) || isMessageLocallyRemoved(row.id, user?.id)) {
              return;
            }

            if (row.sender_id !== user?.id) {
              supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", row.id)
                .then(() => {});
              onMarkAsReadRef.current?.(contact.id, activeChatDbId);
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === row.id)) return prev;
              const hasMatchingOptimistic = prev.some(
                (m) => m.id.startsWith("msg-") && m.text === row.message_text
              );
              if (hasMatchingOptimistic) {
                return prev.map((m) =>
                  m.id.startsWith("msg-") && m.text === row.message_text
                    ? mapRowToMessageItem(row)
                    : m
                );
              }
              const mapped = mapRowToMessageItem(row);
              return [...prev, mapped];
            });

            if (isNearBottomRef.current) {
              setTimeout(() => scrollToBottom("smooth"), 50);
            } else {
              setShowScrollBottom(true);
              setHasNewUnseen(true);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatDbId}` },
        (payload: any) => {
          const row = payload.new;
          if (row?.id) {
            const meta = parseAttachmentMeta(row.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress) || isMessageLocallyRemoved(row.id, user?.id)) {
              setMessages((prev) => prev.filter((m) => m.id !== row.id));
              return;
            }
            const isUnsent = row.message_text === "__UNSENT__" || meta.isUnsent === true;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? {
                      ...m,
                      text: isUnsent ? "" : row.message_text,
                      isEdited: isUnsent ? false : true,
                      isUnsent,
                      reaction: isUnsent ? undefined : meta.reaction,
                      replyTo: isUnsent ? undefined : meta.replyTo,
                    }
                  : m
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages", filter: `chat_id=eq.${activeChatDbId}` },
        (payload: any) => {
          const old = payload.old;
          if (old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatDbId, supabase, mapRowToMessageItem, scrollToBottom]);

  // Handle incoming / new messages without jumping when backreading
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMsg = messages[messages.length - 1];
      const isOutgoing =
        lastMsg &&
        (isStaff
          ? lastMsg.senderRole !== "Pet Owner"
          : lastMsg.senderRole === "Pet Owner");

      if (isOutgoing || isNearBottomRef.current) {
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        setShowScrollBottom(true);
        setHasNewUnseen(true);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, isStaff, scrollToBottom]);

  // Gentle scroll on typing status only if this contact is typing and user is already at the bottom
  const contactIsTyping = checkContactTyping(contact, isOtherTyping, typingInfo, user?.id);
  useEffect(() => {
    if (contactIsTyping && isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [contactIsTyping, scrollToBottom]);

  // Typing status broadcast
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    const senderRole = isStaff
      ? contact.desk === "admin"
        ? "Admin"
        : "Veterinarian"
      : "Pet Owner";
    if (val.trim()) {
      sendTypingStatus(true, senderRole, {
        desk: contact.desk,
        avatarUrl: isStaff
          ? contact.desk === "admin"
            ? "/partners/cdo-seal.png"
            : "/dr-helen-tacandong.jpg"
          : user?.imageUrl || null,
        senderName: isStaff
          ? contact.desk === "admin"
            ? "CVO Inquiry & Admin Desk"
            : UNIFIED_VET_NAME
          : user?.fullName || "Pet Owner",
        initials: isStaff
          ? contact.desk === "admin"
            ? "AD"
            : "HT"
          : undefined,
        chatId: activeChatDbId || (contact.ownerId ? `thread-${contact.ownerId}` : null),
      });
    } else {
      sendTypingStatus(false, senderRole, {
        desk: contact.desk,
        chatId: activeChatDbId || (contact.ownerId ? `thread-${contact.ownerId}` : null),
      });
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 90)}px`;
    }
  };

  const handleSend = async (forcedText?: string) => {
    const clean = (forcedText || inputText).trim();
    if (isSendingRef.current || !clean) return;
    isSendingRef.current = true;

    try {
      const currentReply = replyingTo;
      if (!forcedText) setInputText("");
      setReplyingTo(null);

      const senderRole = isStaff
        ? contact.desk === "admin"
          ? "Admin"
          : "Veterinarian"
        : "Pet Owner";
      sendTypingStatus(false, senderRole, {
        desk: contact.desk,
        chatId: activeChatDbId || (contact.ownerId ? `thread-${contact.ownerId}` : null),
      });

      if (textareaRef.current) {
        textareaRef.current.style.height = "36px";
      }

      const optimisticMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        senderRole: senderRole as any,
        senderName: isStaff
          ? contact.desk === "admin"
            ? "CVO Inquiry & Admin Desk"
            : UNIFIED_VET_NAME
          : user?.fullName || "Pet Owner",
        text: clean,
        replyTo: currentReply || undefined,
        timestamp: new Intl.DateTimeFormat("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
        isRead: true,
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      let chatId = activeChatDbIdRef.current || activeChatDbId || messages.find((m) => m.chatId)?.chatId || null;
      const targetVetName =
        contact.desk === "admin" ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;

      if (!chatId) {
        const { data: existingChat } = await supabase
          .from("chats")
          .select("id")
          .eq("owner_id", contact.ownerId || user?.id)
          .eq("assigned_vet_name", targetVetName)
          .maybeSingle();

        if (existingChat?.id) {
          chatId = existingChat.id;
          activeChatDbIdRef.current = existingChat.id;
          setActiveChatDbId(existingChat.id);
        } else if (user?.id) {
          const { data: newChat } = await supabase
            .from("chats")
            .insert({
              owner_id: contact.ownerId || user.id,
              pet_id: selectedPet?.id || null,
              pet_name: selectedPet?.name || null,
              subject:
                contact.desk === "admin"
                  ? "CVO Public Admin Desk"
                  : "Veterinary Telemedicine Consultation",
              assigned_vet_name: targetVetName,
              last_message: clean,
            })
            .select("id")
            .single();

          if (newChat?.id) {
            chatId = newChat.id;
            activeChatDbIdRef.current = newChat.id;
            setActiveChatDbId(newChat.id);
          }
        }
      }

      if (chatId) {
        const metaPayload = currentReply
          ? serializeAttachmentMeta({ replyTo: currentReply })
          : null;

        const { data: insertedMsg } = await supabase.from("chat_messages").insert({
          chat_id: chatId,
          sender_id: user?.id,
          sender_role: senderRole,
          sender_name: isStaff
            ? contact.desk === "admin"
              ? "CVO Inquiry & Admin Desk"
              : UNIFIED_VET_NAME
            : user?.fullName || "Pet Owner",
          message_text: clean,
          attachment_url: metaPayload,
        }).select("id, created_at").single();

        if (insertedMsg?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticMsg.id
                ? { ...m, id: insertedMsg.id, createdAt: insertedMsg.created_at, chatId: chatId! }
                : m
            )
          );
        }

        await supabase
          .from("chats")
          .update({ last_message: clean, last_message_at: new Date().toISOString() })
          .eq("id", chatId);
      }
    } finally {
      isSendingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSaveEdit();
      } else {
        handleSend();
      }
    } else if (e.key === "Escape") {
      if (editingMessageId) {
        handleCancelEdit();
      }
    }
  };

  const quickQuestions =
    contact.desk === "admin"
      ? [
          "Animal transport permit requirements",
          "Report a stray bite incident",
          "Anti-rabies vaccine office hours",
          "Macabalan CVO office location",
        ]
      : [
          "What should I do if my dog is bitten?",
          "Free Kapon schedule",
          "Anti-rabies vaccine hours",
          "Clinic walk-in hours in Macabalan",
        ];

  return (
    <div
      onClick={() => onMarkAsRead?.(contact.id, activeChatDbId)}
      className="w-[330px] sm:w-[350px] h-[490px] max-h-[82vh] rounded-t-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in-50 slide-in-from-bottom-4 duration-200 relative z-10 pointer-events-auto"
    >
      {/* ── Facebook-style Chat Header: Avatar, Name, Minimize (-), Maximize, Close (X) - NO CALLS ── */}
      <div className="px-3 py-2.5 border-b border-border/70 bg-gradient-to-r from-muted/50 via-card to-muted/30 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0">
            <Avatar className="size-8 border border-border shadow-2xs overflow-hidden">
              {contact.avatar ? (
                <AvatarImage
                  src={contact.avatar}
                  alt={contact.name}
                  referrerPolicy="no-referrer"
                  className={
                    contact.id === "admin"
                      ? "object-contain p-0.5 bg-white"
                      : "object-cover"
                  }
                />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-white font-bold text-xs",
                  contact.theme === "teal"
                    ? "bg-teal-600"
                    : contact.theme === "purple"
                    ? "bg-purple-600"
                    : "bg-emerald-600"
                )}
              >
                {contact.fallback}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-card bg-emerald-500 ring-1 ring-emerald-500/20" />
          </div>

          <div className="min-w-0">
            <h3 className="font-bold text-xs text-foreground truncate flex items-center gap-1">
              {contact.shortName}
            </h3>
            <p className="text-[10px] text-muted-foreground truncate font-medium flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              Active now
            </p>
          </div>
        </div>

        {/* Action Controls: Minimize (_), Maximize, Close (X) ── Strictly NO call icons ── */}
        <div className="flex items-center gap-0.5 text-muted-foreground shrink-0 ml-1">
          {/* Minimize button: collapses chat into circular profile on side */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMinimize}
            className="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Minimize to circular chat head"
            aria-label="Minimize"
          >
            <Minus className="size-4" />
          </Button>

          {/* Maximize to full /messages page */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMaximize(activeChatDbId)}
            className="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            title="Open in full chat page"
            aria-label="Maximize"
          >
            <Maximize2 className="size-3.5" />
          </Button>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-destructive cursor-pointer"
            title="Close chat"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* ── Chat Body ── */}
      <div className="flex-1 relative min-h-0 flex flex-col pointer-events-auto">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 text-xs bg-muted/10 touch-pan-y overscroll-contain select-text [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
        >
          {/* Top Skeleton: Loading older messages while backreading */}
          {isFetchingOlder && (
            <div className="py-2 px-2.5 mb-2.5 space-y-1.5 border-b border-border/40 animate-in fade-in duration-150">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-primary" />
                <span>Loading earlier messages...</span>
              </div>
              <div className="flex items-start gap-1.5 opacity-70">
                <div className="size-6 rounded-full bg-muted animate-pulse shrink-0" />
                <div className="h-6 w-36 rounded-xl bg-muted/80 animate-pulse" />
              </div>
            </div>
          )}
          {isLoading && messages.length === 0 ? (
            <div className="p-3 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <div className="size-7 rounded-full bg-muted/80 animate-pulse shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-7 w-36 rounded-2xl rounded-tl-xs bg-muted/80 animate-pulse" />
                  <div className="h-5 w-24 rounded-2xl bg-muted/60 animate-pulse" />
                </div>
              </div>
              <div className="flex justify-end">
                <div className="h-7 w-40 rounded-2xl rounded-br-xs bg-primary/20 animate-pulse" />
              </div>
              <div className="flex items-start gap-2">
                <div className="size-7 rounded-full bg-muted/80 animate-pulse shrink-0" />
                <div className="h-8 w-48 rounded-2xl rounded-tl-xs bg-muted/80 animate-pulse" />
              </div>
              <div className="flex justify-end">
                <div className="h-7 w-28 rounded-2xl rounded-br-xs bg-primary/20 animate-pulse" />
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center p-3 space-y-3 animate-in fade-in-50 duration-200">
            <div
              className={cn(
                "size-10 rounded-2xl flex items-center justify-center border shadow-2xs",
                contact.theme === "teal"
                  ? "bg-teal-500/10 text-teal-600 border-teal-500/20"
                  : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              )}
            >
              {contact.desk === "admin" ? (
                <Building2 className="size-5" />
              ) : (
                <Stethoscope className="size-5" />
              )}
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-xs text-foreground flex items-center justify-center gap-1">
                <span>{contact.name}</span>
                <Sparkles className="size-3 text-primary" />
              </h4>
              <p className="text-[10.5px] text-muted-foreground max-w-[240px] leading-relaxed mx-auto">
                {contact.roleDescription}
              </p>
            </div>

            <div className="w-full space-y-1 pt-1 text-left">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                Suggested Topics:
              </p>
              {quickQuestions.slice(0, 3).map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(q)}
                  className="w-full text-left text-[10.5px] p-2 rounded-xl bg-card border border-border/70 hover:border-primary/60 hover:bg-muted/40 transition-all cursor-pointer text-foreground flex items-center justify-between group shadow-2xs"
                >
                  <span className="truncate pr-2">{q}</span>
                  <ArrowRight className="size-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
                </button>
              ))}
            </div>
          </div>
          ) : (
            <>
              {/* Top Backreading Skeleton: shows while loading older messages */}
              {isFetchingOlder && (
                <div className="py-2 px-1 mb-2 space-y-2 border-b border-border/40 animate-in fade-in duration-150">
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    <span>Loading earlier messages...</span>
                  </div>
                  <div className="flex items-start gap-1.5 opacity-60">
                    <div className="size-6 rounded-full bg-muted animate-pulse shrink-0" />
                    <div className="h-6 w-32 rounded-xl bg-muted animate-pulse" />
                  </div>
                  <div className="flex justify-end opacity-60">
                    <div className="h-6 w-28 rounded-xl bg-primary/20 animate-pulse" />
                  </div>
                </div>
              )}
              {hasMoreOlder && !isFetchingOlder && (
                <div className="flex justify-center my-1.5">
                  <button
                    type="button"
                    onClick={loadOlderMessages}
                    className="text-[10px] text-muted-foreground hover:text-foreground font-medium px-2.5 py-0.5 rounded-full hover:bg-muted/70 transition-colors cursor-pointer border border-border/40 shadow-2xs"
                  >
                    Load older messages
                  </button>
                </div>
              )}
            {messages.map((msg, idx) => {
              const isStaffMsg =
                msg.senderRole === "Veterinarian" ||
                msg.senderRole === "Staff" ||
                msg.senderRole === "Admin" ||
                msg.senderRole === "Administrator";
              const isOutgoing = isStaff ? isStaffMsg : !isStaffMsg;

              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;

              const prevIsStaff = prevMsg
                ? prevMsg.senderRole === "Veterinarian" ||
                  prevMsg.senderRole === "Staff" ||
                  prevMsg.senderRole === "Admin" ||
                  prevMsg.senderRole === "Administrator"
                : false;
              const prevIsOutgoing = prevMsg ? (isStaff ? prevIsStaff : !prevIsStaff) : false;

              const nextIsStaff = nextMsg
                ? nextMsg.senderRole === "Veterinarian" ||
                  nextMsg.senderRole === "Staff" ||
                  nextMsg.senderRole === "Admin" ||
                  nextMsg.senderRole === "Administrator"
                : false;
              const nextIsOutgoing = nextMsg ? (isStaff ? nextIsStaff : !nextIsStaff) : false;

              // Check day difference (compress unless it's a difference of a day of not chatting)
              const diffDayFromPrev = prevMsg ? isDifferentDay(prevMsg.createdAt, msg.createdAt) : false;
              const diffDayToNext = nextMsg ? isDifferentDay(msg.createdAt, nextMsg.createdAt) : false;

              const isPrevSame = prevMsg !== null && prevIsOutgoing === isOutgoing && !diffDayFromPrev;
              const isNextSame = nextMsg !== null && nextIsOutgoing === isOutgoing && !diffDayToNext;

              const isGroupStart = !isPrevSame;
              const isGroupEnd = !isNextSame;
              const isMiddle = isPrevSame && isNextSame;
              const isSingle = !isPrevSame && !isNextSame;

              const showDateDivider = idx === 0 || diffDayFromPrev;
              const hasPaw = (reactions[msg.id] || msg.reaction) === "🐾";
              const isEditing = editingMessageId === msg.id;
              const isLikeOnly = msg.text.trim() === "👍";

              const bubbleRadiusClass = isOutgoing
                ? isSingle
                  ? "rounded-2xl rounded-br-xs"
                  : isGroupStart
                  ? "rounded-2xl rounded-br-xs"
                  : isMiddle
                  ? "rounded-2xl rounded-r-xs"
                  : "rounded-2xl rounded-tr-xs"
                : isSingle
                ? "rounded-2xl rounded-bl-xs"
                : isGroupStart
                ? "rounded-2xl rounded-bl-xs"
                : isMiddle
                ? "rounded-2xl rounded-l-xs"
                : "rounded-2xl rounded-tl-xs";

              return (
                <div
                  key={msg.id}
                  id={`widget-msg-${msg.id}`}
                  className={cn(
                    "rounded-xl transition-all duration-300",
                    isGroupStart ? (idx === 0 ? "mt-0" : "mt-2.5") : "mt-[2px]",
                    hasPaw && !isGroupEnd && "mb-1.5",
                    highlightedMessageId === msg.id && "bg-primary/10 ring-2 ring-primary/40 p-1"
                  )}
                >
                  {/* Date Separator Divider between days of chatting */}
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-2.5 select-none animate-in fade-in-50">
                      <span className="text-[9.5px] font-semibold text-muted-foreground/80 bg-muted/60 dark:bg-muted/40 px-2.5 py-0.5 rounded-full border border-border/40 shadow-2xs">
                        {formatDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex flex-col group animate-in fade-in-50 duration-150 relative max-w-full min-w-0",
                      isOutgoing ? "items-end" : "items-start"
                    )}
                  >
                    {/* Quoted Message / Reply Header (Matching Facebook Messenger) */}
                    {msg.replyTo && (
                      <div className={cn("flex flex-col space-y-0.5 mb-1 max-w-[94%] min-w-0", isOutgoing ? "items-end text-right self-end" : "items-start text-left self-start")}>
                        <div className={cn("flex items-center gap-1 text-[9px] text-muted-foreground font-medium px-1 max-w-full min-w-0", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                          <Reply className={cn("size-2.5 text-muted-foreground/80 shrink-0", isOutgoing && "scale-x-[-1]")} />
                          <span className="truncate min-w-0">
                            <strong className="text-foreground/90 font-semibold">{isOutgoing ? "You" : getShortFirstName(msg.senderName)}</strong>
                            {" replied to "}
                            <strong className="text-foreground/90 font-semibold">{getShortFirstName(msg.replyTo.senderName)}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => scrollToMessage(msg.replyTo?.id)}
                          className={cn(
                            "text-left text-[10.5px] px-2.5 py-1 rounded-xl border transition-all cursor-pointer select-none max-w-full min-w-0",
                            isOutgoing ? "self-end" : "self-start",
                            "bg-muted/70 hover:bg-muted text-muted-foreground border-border/60 hover:border-primary/40",
                            "hover:shadow-2xs active:scale-[0.99]"
                          )}
                          title="Click to view replied message"
                        >
                          <span className="line-clamp-2 italic break-words [overflow-wrap:anywhere] [word-break:break-word]">{msg.replyTo.text}</span>
                        </button>
                      </div>
                    )}

                    {/* Sender Name: Only rendered at start of a group for incoming messages WITHOUT a reply header */}
                    {!isOutgoing && isGroupStart && !msg.replyTo && (
                      <div className="flex items-center gap-1.5 text-[9.5px] text-muted-foreground px-1 mb-0.5 max-w-full min-w-0 truncate">
                        <span className="font-semibold text-foreground truncate">
                          {getShortFirstName(msg.senderName || contact.shortName || "Dr. Helen")}
                        </span>
                      </div>
                    )}

                    <div className={cn("flex items-center gap-1 max-w-[92%] min-w-0", isOutgoing ? "flex-row-reverse self-end" : "flex-row self-start")}>
                      {/* Message Body Rendered Directly */}
                      {msg.isUnsent ? (
                        <div
                          className={cn(
                            "py-1.5 px-3 text-[11px] italic rounded-2xl border border-dashed border-border/80 text-muted-foreground/80 select-none bg-muted/20 transition-all shadow-2xs",
                            isOutgoing ? "self-end text-right" : "self-start text-left"
                          )}
                        >
                          {isOutgoing
                            ? "You unsent a message"
                            : `${getShortFirstName(msg.senderName || contact.shortName)} unsent a message`}
                        </div>
                      ) : isLikeOnly ? (
                        <div className="py-1 px-1 relative shrink-0">
                          <ThumbsUp className="size-8 fill-primary text-primary hover:scale-110 transition-transform cursor-pointer" />
                          {hasPaw && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isOutgoing) toggleReaction(msg.id);
                              }}
                              disabled={isOutgoing}
                              className={cn(
                                "absolute -bottom-1 z-10 flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-card border border-border shadow-xs transition-transform",
                                isOutgoing ? "-left-1 cursor-default select-none pointer-events-none" : "-right-1 hover:scale-110 active:scale-95 cursor-pointer"
                              )}
                              title={isOutgoing ? "Paw reaction" : "Remove paw reaction"}
                            >
                              <PawPrint className="size-2.5 text-primary fill-primary" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={cn("relative group/bubble inline-block max-w-full min-w-0", isOutgoing ? "self-end" : "self-start")}>
                          <div
                            className={cn(
                              "p-2.5 px-3 text-xs leading-relaxed shadow-2xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] transition-all",
                              bubbleRadiusClass,
                              isOutgoing
                                ? "bg-primary text-primary-foreground font-medium"
                                : "bg-card border border-border/70 text-foreground"
                            )}
                          >
                            {msg.text}
                          </div>

                          {/* Attached Paw Badge on Bubble (Interchanged: right on incoming, left on outgoing) */}
                          {hasPaw && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isOutgoing) toggleReaction(msg.id);
                              }}
                              disabled={isOutgoing}
                              className={cn(
                                "absolute -bottom-2 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border/80 shadow-xs transition-transform",
                                isOutgoing ? "left-2 cursor-default select-none pointer-events-none" : "right-2 hover:scale-110 active:scale-95 cursor-pointer"
                              )}
                              title={isOutgoing ? "Paw reaction" : "Remove paw reaction"}
                            >
                              <PawPrint className="size-2.5 text-primary fill-primary" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Hover Action Bar */}
                      {!isEditing && !msg.isUnsent && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-muted-foreground self-center shrink-0">
                          {/* Paw Reaction Button (Incoming messages only) */}
                          {!isOutgoing && (
                            <button
                              type="button"
                              onClick={() => toggleReaction(msg.id)}
                              className={cn(
                                "size-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer",
                                hasPaw ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                              )}
                              title={hasPaw ? "Remove paw reaction" : "React with paw"}
                            >
                              <PawPrint className={cn("size-3", hasPaw && "fill-primary")} />
                            </button>
                          )}

                          {/* Reply Button */}
                          <button
                            type="button"
                            onClick={() => handleStartReply(msg)}
                            className="size-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                            title="Reply"
                          >
                            <Reply className="size-3" />
                          </button>

                          {/* Edit Button for Outgoing Messages */}
                          {isOutgoing && !isLikeOnly && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="size-6 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Edit message"
                            >
                              <Pencil className="size-3" />
                            </button>
                          )}

                          {/* Unsend Button for Outgoing Messages */}
                          {isOutgoing && (
                            <button
                              type="button"
                              onClick={() => handleUnsendMessage(msg.id)}
                              className="size-6 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer text-muted-foreground"
                              title="Unsend message"
                            >
                              <Undo2 className="size-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Remove placeholder button for already unsent messages */}
                      {msg.isUnsent && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-muted-foreground self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="size-6 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer text-muted-foreground"
                            title="Remove for you"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* "Edited" indicator: Displayed directly below this specific message if edited */}
                    {msg.isEdited && (
                      <div
                        className={cn(
                          "text-[9px] text-muted-foreground/75 px-1 mt-0.5 font-medium select-none",
                          isOutgoing ? "text-right self-end" : "text-left self-start"
                        )}
                      >
                        Edited
                      </div>
                    )}

                    {/* Timestamp: Displayed on the last message of the group */}
                    {isGroupEnd && (
                      <div className={cn("text-[8.5px] text-muted-foreground/70 px-1 mt-0.5", isOutgoing ? "text-right self-end" : "text-left self-start")}>
                        <span>{msg.timestamp}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {checkContactTyping(contact, isOtherTyping, typingInfo, user?.id) && (
              <div className="flex items-center gap-2 text-muted-foreground text-[10px] p-2 bg-muted/40 rounded-xl max-w-[85%] animate-in fade-in-50 duration-200 mt-2">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <span className="truncate">
                  {typingInfo?.senderName || contact.shortName} is typing...
                </span>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Jump to Latest Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-2.5 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-md text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <ChevronDown className="size-3.5 text-primary group-hover:translate-y-0.5 transition-transform" />
          <span>Latest messages</span>
          {hasNewUnseen && (
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
        </button>
      )}
    </div>

      {/* ── Active Edit Message Banner (Matching Facebook Messenger Screenshot) ── */}
      {editingMessageId && (
        <div className="px-3 py-1.5 bg-muted/70 dark:bg-muted/50 border-t border-border/60 flex items-center justify-between gap-2 text-xs animate-in slide-in-from-bottom-2 duration-150">
          <span className="font-semibold text-foreground text-[11px]">Edit message</span>
          <button
            type="button"
            onClick={handleCancelEdit}
            className="size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title="Cancel edit"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── Active Reply Preview Bar ── */}
      {replyingTo && !editingMessageId && (
        <div className="px-3 py-1.5 bg-muted/70 dark:bg-muted/50 border-t border-border/60 flex items-center justify-between gap-2 text-[10.5px] animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Reply className="size-3" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground text-[10px] leading-tight">
                Replying to <span className="text-primary font-bold">{getShortFirstName(replyingTo.senderName)}</span>
              </p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px] leading-tight">
                {replyingTo.text}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="size-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
            title="Cancel reply"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {/* Input Box Form */}
      <div className="p-2 border-t border-border/70 flex items-end gap-1.5 bg-card shrink-0 relative z-20 pointer-events-auto">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={handleTextareaInput}
          onKeyDown={handleKeyDown}
          onFocus={() => onMarkAsRead?.(contact.id, activeChatDbId)}
          placeholder="Aa"
          className="flex-1 min-h-[34px] max-h-20 resize-none rounded-2xl bg-muted/40 px-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary border border-border/50 leading-relaxed relative z-20 pointer-events-auto cursor-text select-text"
        />

        {editingMessageId ? (
          <button
            type="button"
            onClick={handleSaveEdit}
            className="size-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 relative z-20 pointer-events-auto"
            title="Save edit"
          >
            <Check className="size-4 stroke-[2.5]" />
          </button>
        ) : inputText.trim() ? (
          <button
            type="button"
            onClick={() => handleSend()}
            className="size-8 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 relative z-30 pointer-events-auto"
            title="Send"
            aria-label="Send message"
          >
            <Send className="size-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSend("👍")}
            className="size-8 rounded-full hover:bg-muted flex items-center justify-center text-primary transition-colors cursor-pointer shrink-0 relative z-20 pointer-events-auto"
            title="Send Thumbs Up"
          >
            <ThumbsUp className="size-4.5 fill-primary" />
          </button>
        )}
      </div>
    </div>
  );
}
