"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useOptionalCVO } from "@/lib/cvo-context";
import { toast } from "sonner";
import { getTwoLetterInitials } from "@/lib/utils";

export const UNIFIED_VET_NAME = "Dr. Helen Ann P. Tacandong, DVM";
export const UNIFIED_VET_BADGE = "City Veterinarian • CVO";

export interface ChatMessageItem {
  id: string;
  chatId?: string;
  senderId?: string;
  senderRole: "Pet Owner" | "Veterinarian" | "Staff" | "System" | "Admin" | "Administrator";
  senderName: string;
  actualSenderName?: string;
  actualSenderId?: string;
  text: string;
  timestamp: string;
  createdAt?: string;
  badge?: string;
  isRead?: boolean;
  isEdited?: boolean;
  isUnsent?: boolean;
  reaction?: string;
  replyTo?: ChatReplyInfo;
  removedFor?: string[];
}

export interface ChatReplyInfo {
  id: string;
  senderName: string;
  text: string;
}

export function isValidUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function parseAttachmentMeta(url?: string | null): {
  reaction?: string;
  replyTo?: ChatReplyInfo;
  isUnsent?: boolean;
  removedFor?: string[];
} {
  if (!url) return {};
  if (url === "unsent" || url.startsWith("unsent:")) {
    return { isUnsent: true, removedFor: [] };
  }
  if (url.startsWith("reaction:")) {
    return { reaction: url.replace("reaction:", ""), removedFor: [] };
  }
  if (url.startsWith("{")) {
    try {
      const parsed = JSON.parse(url);
      return {
        reaction: parsed.reaction || undefined,
        replyTo: parsed.replyTo || undefined,
        isUnsent: Boolean(parsed.isUnsent),
        removedFor: Array.isArray(parsed.removedFor) ? parsed.removedFor : [],
      };
    } catch {
      return {};
    }
  }
  return {};
}

export function serializeAttachmentMeta(meta: {
  reaction?: string | null;
  replyTo?: ChatReplyInfo | null;
  isUnsent?: boolean;
  removedFor?: string[];
}): string | null {
  const obj: any = {};
  if (meta.reaction) obj.reaction = meta.reaction;
  if (meta.replyTo) obj.replyTo = meta.replyTo;
  if (meta.isUnsent) obj.isUnsent = true;
  if (meta.removedFor && meta.removedFor.length > 0) obj.removedFor = meta.removedFor;
  if (Object.keys(obj).length === 0) return null;
  return JSON.stringify(obj);
}

export function isMessageRemovedForUser(
  meta: { removedFor?: string[] } | null | undefined,
  userId?: string | null,
  userEmail?: string | null
): boolean {
  if (!meta?.removedFor || !Array.isArray(meta.removedFor) || meta.removedFor.length === 0) {
    return false;
  }
  if (userId && meta.removedFor.includes(userId)) return true;
  if (userEmail && meta.removedFor.includes(userEmail)) return true;
  return false;
}

export function isMessageLocallyRemoved(msgId: string, userId?: string | null): boolean {
  if (typeof window === "undefined") return false;
  try {
    const key = `syncvet_removed_msgs_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.includes(msgId);
  } catch {
    return false;
  }
}

export function markMessageLocallyRemoved(msgId: string, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = `syncvet_removed_msgs_${userId || "default"}`;
    const raw = localStorage.getItem(key);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(msgId)) {
      arr.push(msgId);
      localStorage.setItem(key, JSON.stringify(arr));
    }
  } catch {}
}

export function isDifferentDay(dateStrA?: string, dateStrB?: string): boolean {
  if (!dateStrA || !dateStrB) return false;
  const d1 = new Date(dateStrA);
  const d2 = new Date(dateStrB);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  return (
    d1.getFullYear() !== d2.getFullYear() ||
    d1.getMonth() !== d2.getMonth() ||
    d1.getDate() !== d2.getDate()
  );
}

export function formatDateDivider(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const timeStr = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    return `${new Intl.DateTimeFormat("en-PH", {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(d)} at ${timeStr}`;
  }
}

export function getShortFirstName(name?: string | null): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === "you") return "You";

  // If it's Dr. Helen / City Veterinarian
  if (trimmed.includes("Helen") || trimmed.includes("Tacandong")) {
    return "Dr. Helen";
  }
  // If it's Admin Desk
  if (trimmed.includes("Admin") || trimmed.includes("CVO")) {
    return "CVO Admin";
  }
  // If it starts with Dr. / Dra.
  if (/^Dr[a]?\.\s+/i.test(trimmed)) {
    const parts = trimmed.split(/\s+/);
    return `${parts[0]} ${parts[1] || ""}`.trim();
  }

  // Regular pet owner / citizen: extract first name (e.g. "Kyle Urgentrouse" -> "Kyle", "Liel Princes Calo" -> "Liel")
  // Strip off suffixes like ", DVM", ", MD"
  const clean = trimmed.split(",")[0].trim();
  const firstWord = clean.split(/\s+/)[0];
  return firstWord || trimmed;
}

export interface TypingSenderInfo {
  senderId: string;
  senderName: string;
  senderRole: "Pet Owner" | "Veterinarian" | "Admin" | string;
  desk?: "vet" | "admin";
  avatarUrl?: string | null;
  initials: string;
  chatId?: string | null;
  recipientId?: string | null;
}

export interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  markAllAsRead: () => Promise<void>;
  openChatWithPet: (pet?: { id: string; name: string }) => void;
  selectedPet: { id: string; name: string } | null;
  setSelectedPet: (pet: { id: string; name: string } | null) => void;
  messages: ChatMessageItem[];
  sendMessage: (
    text: string,
    channelPersona?: "vet" | "admin",
    replyTo?: ChatReplyInfo
  ) => Promise<void>;
  sendVetReply: (
    chatId: string,
    text: string,
    actualSenderName?: string,
    persona?: "vet" | "admin",
    replyTo?: ChatReplyInfo
  ) => Promise<void>;
  editMessage: (messageId: string, newText: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  removeMessageForMe: (messageId: string) => Promise<boolean>;
  unsendMessage: (messageId: string) => Promise<boolean>;
  reactions: Record<string, string>;
  toggleReaction: (messageId: string, emoji?: string) => Promise<void>;
  clearChat: () => void;
  isLoading: boolean;
  unreadCount: number;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  activeDesk: "vet" | "admin";
  setActiveDesk: (desk: "vet" | "admin") => void;
  isOtherTyping: boolean;
  typingSenderName: string | null;
  typingInfo: TypingSenderInfo | null;
  sendTypingStatus: (
    isTyping: boolean,
    senderRole?: string,
    meta?: {
      desk?: "vet" | "admin";
      avatarUrl?: string | null;
      chatId?: string | null;
      senderName?: string;
      initials?: string;
      recipientId?: string | null;
    }
  ) => void;
  refetchMessages: (explicitChatId?: string | null, deskOverride?: "vet" | "admin") => Promise<void>;
  hasMoreOlder: boolean;
  isFetchingOlder: boolean;
  isLoadingMessages: boolean;
  fetchOlderMessages: () => Promise<void>;
  broadcastMessageRead: (chatId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const LOCAL_STORAGE_CHAT_KEY = "syncvet_citizen_chat_messages_v2";

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const cvo = useOptionalCVO();
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const roleFromMeta = (user?.publicMetadata?.role as string) || (user?.unsafeMetadata?.role as string);
  const isStaffUser =
    isAdminEmail ||
    roleFromMeta?.toLowerCase()?.includes("admin") ||
    roleFromMeta?.toLowerCase()?.includes("vet") ||
    (cvo?.activeRoleView ? cvo.activeRoleView !== "Pet Owner" : false);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPet, setSelectedPet] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_activeChatId, _setActiveChatId] = useState<string | null>(null);
  const activeChatId = _activeChatId;
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  const [activeDesk, setActiveDesk] = useState<"vet" | "admin">("vet");
  const activeDeskRef = useRef<"vet" | "admin">("vet");
  activeDeskRef.current = activeDesk;

  // Real-time reactions state
  const [reactions, setReactions] = useState<Record<string, string>>({});

  // Real-time typing states
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingSenderName, setTypingSenderName] = useState<string | null>(null);
  const [typingInfo, setTypingInfo] = useState<TypingSenderInfo | null>(null);
  const tabIdRef = useRef<string>(
    typeof window !== "undefined"
      ? (window as any).__syncvetTabId ||
        ((window as any).__syncvetTabId = Math.random().toString(36).substring(2, 9))
      : "srv"
  );
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const ownerName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Citizen");

  // Initial messages state (empty if new, allowing the default view to display)
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [isFetchingOlder, setIsFetchingOlder] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const setActiveChatId = useCallback((id: string | null) => {
    _setActiveChatId(id);
    activeChatIdRef.current = id;
    // Strictly isolate messages: immediately purge messages not belonging to the selected chat thread
    setMessages((prev) => {
      if (!id) return [];
      return prev.filter((m) => m.chatId === id);
    });
  }, []);

// Helper to clean legacy messages, strip warning icons, and deduplicate consecutive identical items
function normalizeAndDeduplicate(list: ChatMessageItem[]): ChatMessageItem[] {
  const result: ChatMessageItem[] = [];
  for (const item of list) {
    let text = (item.text || "").trim();

    // Clean legacy text if present (remove warning icons, replace long legacy message with brief one)
    if (
      text.includes("IMMEDIATE PROTOCOL") ||
      text.includes("⚠️") ||
      text.includes("Povidone-iodine") ||
      text.includes("Northern Mindanao Medical Center")
    ) {
      text =
        "Wash wound with soap and water for 15 minutes, apply antiseptic, and go to the nearest Animal Bite Treatment Center (ABTC). Observe the animal for 14 days.";
    }

    // Strip any warning icon prefix
    text = text.replace(/^[⚠️\s]+/, "").replace(/^IMMEDIATE PROTOCOL:?\s*/i, "").trim();

    const cleanedItem = { ...item, text };

    // Prevent consecutive identical duplicate bubbles
    const last = result[result.length - 1];
    if (
      last &&
      last.text.trim().toLowerCase() === cleanedItem.text.trim().toLowerCase() &&
      last.senderRole === cleanedItem.senderRole
    ) {
      continue;
    }

    result.push(cleanedItem);
  }
  return result;
}

  // Load saved local messages or query Supabase chat table if it exists
  const refetchMessages = useCallback(
    async (explicitChatId?: string | null, deskOverride?: "vet" | "admin") => {
      if (!isLoaded || !user?.id) return;

      try {
        const currentDesk = deskOverride !== undefined ? deskOverride : activeDeskRef.current;
        const targetDeskVetName =
          currentDesk === "admin" ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;

        let targetChatId: string | null = null;
        if (explicitChatId && explicitChatId !== "desk-switch") {
          targetChatId = explicitChatId;
        } else if (explicitChatId === "desk-switch" || (deskOverride !== undefined && deskOverride !== activeDeskRef.current)) {
          targetChatId = null;
        } else {
          targetChatId = activeChatIdRef.current;
        }

        // If explicitly passed null (e.g. pristine channel with no chats), clear messages
        if (explicitChatId === null) {
          setMessages([]);
          setIsLoadingMessages(false);
          return;
        }

        // If targetChatId is synthetic (thread-user_...), resolve real DB chat for this owner AND desk
        if (targetChatId && !isValidUuid(targetChatId)) {
          const ownerId = targetChatId.replace(/^thread-/, "");
          const { data: foundChat } = await supabase
            .from("chats")
            .select("id")
            .eq("owner_id", ownerId)
            .eq("assigned_vet_name", targetDeskVetName)
            .maybeSingle();

          if (foundChat?.id) {
            targetChatId = foundChat.id;
            _setActiveChatId(foundChat.id);
            activeChatIdRef.current = foundChat.id;
          } else {
            // New owner with no messages yet on this desk
            setMessages([]);
            setIsLoadingMessages(false);
            return;
          }
        }

        // If targetChatId is still missing, try finding user's own chat on this desk (citizens only)
        if (!targetChatId) {
          if (isStaffUser) {
            setMessages([]);
            setIsLoadingMessages(false);
            return;
          }

          const { data: ownChat } = await supabase
            .from("chats")
            .select("id, status")
            .eq("owner_id", user.id)
            .eq("assigned_vet_name", targetDeskVetName)
            .maybeSingle();

          if (ownChat?.id) {
            targetChatId = ownChat.id;
            _setActiveChatId(ownChat.id);
            activeChatIdRef.current = ownChat.id;
          } else {
            setMessages([]);
            setIsLoadingMessages(false);
            return;
          }
        }

      if (targetChatId && isValidUuid(targetChatId)) {
        setIsLoadingMessages(true);
        const { data: msgRows, error: msgError } = await supabase
          .from("chat_messages")
          .select("*, users:sender_id(full_name, email)")
          .eq("chat_id", targetChatId)
          .order("created_at", { ascending: false })
          .limit(30);

        setIsLoadingMessages(false);

        if (!msgError && msgRows && msgRows.length > 0) {
          setHasMoreOlder(msgRows.length === 30);
          const filteredRows = msgRows.filter((m: any) => {
            const meta = parseAttachmentMeta(m.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress)) return false;
            if (isMessageLocallyRemoved(m.id, user?.id)) return false;
            return true;
          });
          const chronological = [...filteredRows].reverse();
          const mapped: ChatMessageItem[] = chronological.map((m: any) => {
            const isAdmin =
              m.sender_role === "Admin" ||
              m.sender_role === "Administrator" ||
              m.sender_name?.includes("Admin");
            const isStaff = m.sender_role !== "Pet Owner";
            const meta = parseAttachmentMeta(m.attachment_url);
            const isUnsent = m.message_text === "__UNSENT__" || meta.isUnsent === true;
            return {
              id: m.id,
              chatId: m.chat_id,
                senderId: m.sender_id,
                senderRole: isAdmin ? "Admin" : isStaff ? "Veterinarian" : "Pet Owner",
                senderName: isAdmin
                  ? "CVO Inquiry & Admin Desk"
                  : isStaff
                  ? UNIFIED_VET_NAME
                  : m.sender_name,
                actualSenderName: isStaff
                  ? (m.users?.full_name || (m.sender_name && m.sender_name !== UNIFIED_VET_NAME && !m.sender_name.includes("Admin") ? m.sender_name : undefined))
                  : undefined,
                actualSenderId: m.sender_id,
                badge: isAdmin
                  ? "City Veterinary Office Admin"
                  : isStaff
                  ? UNIFIED_VET_BADGE
                  : undefined,
                text: isUnsent ? "" : m.message_text,
                isUnsent,
                timestamp: new Intl.DateTimeFormat("en-PH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }).format(new Date(m.created_at)),
                createdAt: m.created_at,
                isRead: m.is_read,
                reaction: isUnsent ? undefined : meta.reaction,
                replyTo: isUnsent ? undefined : meta.replyTo,
              };
            });

          const rxMap: Record<string, string> = {};
          mapped.forEach((m) => {
            if (m.reaction) rxMap[m.id] = m.reaction;
          });
          setReactions((prev) => ({ ...prev, ...rxMap }));

          const readMapped = isOpenRef.current
            ? mapped.map((m) => {
                const isIncoming = isStaffUser
                  ? m.senderRole === "Pet Owner"
                  : m.senderRole !== "Pet Owner";
                return isIncoming ? { ...m, isRead: true } : m;
              })
            : mapped;

          const newNormalized = normalizeAndDeduplicate(readMapped);

          setMessages((prev) => {
            // STRICT ISOLATION: Only preserve older items that belong specifically to this targetChatId!
            const olderItems = prev.filter(
              (p) => p.chatId === targetChatId && !newNormalized.some((n) => n.id === p.id)
            );
            const merged = [...olderItems, ...newNormalized].sort(
              (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
            );

            // Avoid triggering state change if items are completely unchanged
            if (
              prev.length === merged.length &&
              prev.every(
                (m, i) =>
                  m.id === merged[i].id &&
                  m.text === merged[i].text &&
                  m.reaction === merged[i].reaction &&
                  m.isRead === merged[i].isRead
              )
            ) {
              return prev;
            }
            return normalizeAndDeduplicate(merged);
          });

          if (isOpenRef.current) {
            const query = supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("chat_id", targetChatId);

            if (isStaffUser) {
              query.eq("sender_role", "Pet Owner");
            } else {
              query.neq("sender_role", "Pet Owner");
            }
            query.then(() => {});
          }
          return;
        } else {
          // Empty chat thread or error: strictly reset messages to prevent cross-chat data leakage!
          setMessages([]);
          setHasMoreOlder(false);
          return;
        }
      }
    } catch {
      setIsLoadingMessages(false);
    }
  }, [isLoaded, user?.id, supabase, isStaffUser]);

  const fetchOlderMessages = useCallback(async () => {
    if (!activeChatIdRef.current || !hasMoreOlder || isFetchingOlder || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest?.createdAt) return;

    setIsFetchingOlder(true);
    try {
      const { data: olderRows } = await supabase
        .from("chat_messages")
        .select("*, users:sender_id(full_name, email)")
        .eq("chat_id", activeChatIdRef.current)
        .lt("created_at", oldest.createdAt)
        .order("created_at", { ascending: false })
        .limit(30);

      if (olderRows) {
        if (olderRows.length < 30) {
          setHasMoreOlder(false);
        }
        if (olderRows.length > 0) {
          const filteredRows = olderRows.filter((m: any) => {
            const meta = parseAttachmentMeta(m.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress)) return false;
            if (isMessageLocallyRemoved(m.id, user?.id)) return false;
            return true;
          });
          const chronological = [...filteredRows].reverse();
          const mapped: ChatMessageItem[] = chronological.map((m: any) => {
            const isAdmin =
              m.sender_role === "Admin" ||
              m.sender_role === "Administrator" ||
              m.sender_name?.includes("Admin");
            const isStaff = m.sender_role !== "Pet Owner";
            const meta = parseAttachmentMeta(m.attachment_url);
            const isUnsent = m.message_text === "__UNSENT__" || meta.isUnsent === true;
            return {
              id: m.id,
              chatId: m.chat_id,
                  senderId: m.sender_id,
                  senderRole: isAdmin ? "Admin" : isStaff ? "Veterinarian" : "Pet Owner",
                  senderName: isAdmin
                    ? "CVO Inquiry & Admin Desk"
                    : isStaff
                    ? UNIFIED_VET_NAME
                    : m.sender_name,
                  actualSenderName: isStaff
                    ? (m.users?.full_name || (m.sender_name && m.sender_name !== UNIFIED_VET_NAME && !m.sender_name.includes("Admin") ? m.sender_name : undefined))
                    : undefined,
                  actualSenderId: m.sender_id,
                  badge: isAdmin
                    ? "City Veterinary Office Admin"
                    : isStaff
                    ? UNIFIED_VET_BADGE
                    : undefined,
                  text: isUnsent ? "" : m.message_text,
                  isUnsent,
                  timestamp: new Intl.DateTimeFormat("en-PH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }).format(new Date(m.created_at)),
                  createdAt: m.created_at,
                  isRead: m.is_read,
                  reaction: isUnsent ? undefined : meta.reaction,
                  replyTo: isUnsent ? undefined : meta.replyTo,
                };
              });

          setMessages((prev) =>
            normalizeAndDeduplicate([
              ...mapped,
              ...prev.filter((p) => p.chatId === activeChatIdRef.current),
            ])
          );
        }
      }
    } catch {
      // ignore
    } finally {
      setIsFetchingOlder(false);
    }
  }, [hasMoreOlder, isFetchingOlder, messages, supabase]);

  // Periodic heartbeat polling to ensure realtime sync across all browsers
  useEffect(() => {
    refetchMessages(activeChatId, activeDesk);
    const interval = setInterval(() => {
      refetchMessages(activeChatIdRef.current, activeDeskRef.current);
    }, 2500);
    return () => clearInterval(interval);
  }, [refetchMessages, activeChatId, activeDesk]);

  const handleIncomingTyping = useCallback(
    (data: any) => {
      if (!data) return;
      // Never process typing events from the current tab instance
      if (data.tabId && data.tabId === tabIdRef.current) return;
      // If same Clerk user and same tab, ignore
      if (data.senderId && user?.id && data.senderId === user.id && data.tabId === tabIdRef.current) return;

      if (data.isTyping) {
        setIsOtherTyping(true);
        const isStaff = data.senderRole !== "Pet Owner";
        const fallbackName = isStaff
          ? data.desk === "admin"
            ? "CVO Inquiry & Admin Desk"
            : UNIFIED_VET_NAME
          : "Citizen";
        const resolvedName = data.senderName || fallbackName;

        let resolvedInitials = data.initials;
        if (!resolvedInitials) {
          if (data.desk === "admin" || data.senderRole === "Admin" || resolvedName.includes("Admin")) {
            resolvedInitials = "AD";
          } else if (isStaff) {
            resolvedInitials = "HT";
          } else {
            resolvedInitials = getTwoLetterInitials(resolvedName);
          }
        }

        let resolvedAvatar = data.avatarUrl;
        if (!resolvedAvatar && isStaff) {
          resolvedAvatar = data.desk === "admin" ? "/partners/cdo-seal.png" : "/dr-helen-tacandong.jpg";
        }

        setTypingSenderName(resolvedName);
        setTypingInfo({
          senderId: data.senderId || "anon",
          senderName: resolvedName,
          senderRole: data.senderRole || (isStaff ? (data.desk === "admin" ? "Admin" : "Veterinarian") : "Pet Owner"),
          desk: data.desk,
          avatarUrl: resolvedAvatar || null,
          initials: resolvedInitials,
          chatId: data.chatId || null,
          recipientId: data.recipientId || null,
        });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          setIsOtherTyping(false);
          setTypingSenderName(null);
          setTypingInfo(null);
        }, 3500);
      } else {
        setIsOtherTyping(false);
        setTypingSenderName(null);
        setTypingInfo(null);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    let isSubscribed = true;

    async function loadChatMessages() {
      await refetchMessages();
    }

    loadChatMessages();

    // Initialize BroadcastChannel for local/multi-tab typing and reaction sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel("syncvet-telemedicine-typing");
      bcRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data?.type === "message_unsent" && event.data?.messageId) {
          const { messageId } = event.data;
          setReactions((prev) => {
            const next = { ...prev };
            delete next[messageId];
            return next;
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? { ...m, isUnsent: true, text: "", reaction: undefined, replyTo: undefined }
                : m
            )
          );
          return;
        }
        if (event.data?.type === "message_reaction") {
          const { messageId, reaction } = event.data;
          if (messageId) {
            setReactions((prev) => {
              const next = { ...prev };
              if (reaction) {
                next[messageId] = reaction;
              } else {
                delete next[messageId];
              }
              return next;
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, reaction: reaction || undefined } : m
              )
            );
          }
          return;
        }
        handleIncomingTyping(event.data);
      };
    }

    // Subscribe to realtime changes and typing broadcast
    const channel = supabase
      .channel("citizen-chat-realtime", { config: { broadcast: { self: false } } })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const row = payload.new;
          if (row) {
            // Strictly check if incoming message belongs to active chat thread
            const currentActiveId = activeChatIdRef.current;
            if (currentActiveId && isValidUuid(currentActiveId)) {
              if (row.chat_id !== currentActiveId) {
                return;
              }
            } else if (!currentActiveId) {
              return;
            }

            const isCurrentlyOpen = isOpenRef.current;
            const isIncoming = isStaffUser
              ? row.sender_role === "Pet Owner"
              : row.sender_role !== "Pet Owner";

            if (isCurrentlyOpen && isIncoming) {
              supabase
                .from("chat_messages")
                .update({ is_read: true })
                .eq("id", row.id)
                .then(() => {});
            }

            const { reaction: rowReaction, replyTo: rowReplyTo } = parseAttachmentMeta(row.attachment_url);

            if (rowReaction) {
              setReactions((prev) => ({ ...prev, [row.id]: rowReaction }));
            }

            setMessages((prev) => {
              // Deduplicate by DB ID
              if (prev.some((m) => m.id === row.id)) return prev;

              let rowText = (row.message_text || "").trim();
              if (
                rowText.includes("IMMEDIATE PROTOCOL") ||
                rowText.includes("⚠️") ||
                rowText.includes("Povidone-iodine") ||
                rowText.includes("Northern Mindanao Medical Center")
              ) {
                rowText =
                  "Wash wound with soap and water for 15 minutes, apply antiseptic, and go to the nearest Animal Bite Treatment Center (ABTC). Observe the animal for 14 days.";
              }
              rowText = rowText.replace(/^[⚠️\s]+/, "").replace(/^IMMEDIATE PROTOCOL:?\s*/i, "").trim();
              const lowerRowText = rowText.toLowerCase();

              // Deduplicate optimistic user message
              if (user?.id && row.sender_id === user.id) {
                const optIdx = prev.findIndex(
                  (m) =>
                    m.senderRole === "Pet Owner" &&
                    m.text.trim().toLowerCase() === lowerRowText &&
                    m.id.startsWith("msg-")
                );
                if (optIdx !== -1) {
                  const updated = [...prev];
                  updated[optIdx] = {
                    ...updated[optIdx],
                    id: row.id,
                    chatId: row.chat_id,
                    createdAt: row.created_at,
                    reaction: rowReaction,
                    replyTo: rowReplyTo || updated[optIdx].replyTo,
                    isRead: Boolean(row.is_read),
                  };
                  return updated;
                }
              }

              // Deduplicate veterinarian reply (automated or clinical)
              if (row.sender_role === "Veterinarian" || row.sender_role === "Staff") {
                const optVetIdx = prev.findIndex(
                  (m) =>
                    (m.senderRole === "Veterinarian" || m.senderRole === "Staff") &&
                    (m.text.trim().toLowerCase() === lowerRowText || m.id.startsWith("msg-reply-") || m.id.startsWith("msg-vet-"))
                );
                if (optVetIdx !== -1) {
                  const updated = [...prev];
                  updated[optVetIdx] = {
                    ...updated[optVetIdx],
                    id: row.id,
                    chatId: row.chat_id,
                    text: rowText,
                    createdAt: row.created_at,
                    reaction: rowReaction,
                    replyTo: rowReplyTo || updated[optVetIdx].replyTo,
                    senderName: UNIFIED_VET_NAME,
                    actualSenderId: row.sender_id,
                    isRead: Boolean(row.is_read),
                  };
                  return updated;
                }
              }

              // Prevent duplicate if the last message in prev already has identical text
              const last = prev[prev.length - 1];
              if (last && last.text.trim().toLowerCase() === lowerRowText) {
                return prev;
              }

              const isAdmin =
                row.sender_role === "Admin" ||
                row.sender_role === "Administrator" ||
                row.sender_name?.includes("Admin");
              const isStaff = row.sender_role !== "Pet Owner";
              return [
                ...prev,
                {
                  id: row.id,
                  chatId: row.chat_id,
                  senderId: row.sender_id,
                  senderRole: isAdmin ? "Admin" : isStaff ? "Veterinarian" : "Pet Owner",
                  senderName: isAdmin ? "CVO Inquiry & Admin Desk" : isStaff ? UNIFIED_VET_NAME : row.sender_name,
                  actualSenderName: isStaff
                    ? (row.sender_name && row.sender_name !== UNIFIED_VET_NAME && !row.sender_name.includes("Admin") ? row.sender_name : undefined)
                    : undefined,
                  actualSenderId: row.sender_id,
                  badge: isAdmin ? "City Veterinary Office Admin" : isStaff ? UNIFIED_VET_BADGE : undefined,
                  text: rowText,
                  timestamp: "Just now",
                  createdAt: row.created_at,
                  reaction: rowReaction,
                  replyTo: rowReplyTo,
                  isRead: isCurrentlyOpen && isIncoming ? true : Boolean(row.is_read),
                },
              ];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const row = payload.new;
          if (row?.id) {
            const meta = parseAttachmentMeta(row.attachment_url);
            if (isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress) || isMessageLocallyRemoved(row.id, user?.id)) {
              setMessages((prev) => prev.filter((m) => m.id !== row.id));
              return;
            }
            const isUnsent = row.message_text === "__UNSENT__" || meta.isUnsent === true;
            if (isUnsent) {
              setReactions((prev) => {
                const next = { ...prev };
                delete next[row.id];
                return next;
              });
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === row.id
                    ? {
                        ...m,
                        isUnsent: true,
                        text: "",
                        reaction: undefined,
                        replyTo: undefined,
                      }
                    : m
                )
              );
              return;
            }
            setReactions((prev) => {
              const next = { ...prev };
              if (meta.reaction) {
                next[row.id] = meta.reaction;
              } else {
                delete next[row.id];
              }
              return next;
            });
            setMessages((prev) =>
              prev.map((m) =>
                m.id === row.id
                  ? {
                      ...m,
                      text: row.message_text,
                      isEdited: row.message_text !== m.text ? true : m.isEdited,
                      isRead: row.is_read !== undefined ? row.is_read : m.isRead,
                      reaction: meta.reaction,
                      replyTo: meta.replyTo || m.replyTo,
                    }
                  : m
              )
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload: any) => {
          const old = payload.old;
          if (old?.id) {
            setReactions((prev) => {
              const next = { ...prev };
              delete next[old.id];
              return next;
            });
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
          }
        }
      )
      .on(
        "broadcast",
        { event: "new_message" },
        ({ payload }: any) => {
          if (!payload || payload.senderId === user?.id) return;
          const currentActiveId = activeChatIdRef.current;
          if (currentActiveId && isValidUuid(currentActiveId)) {
            if (payload.chatId && payload.chatId !== currentActiveId) {
              return;
            }
          }
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
        }
      )
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: any) => {
          handleIncomingTyping(payload);
        }
      )
      .on(
        "broadcast",
        { event: "message_unsent" },
        ({ payload }: any) => {
          if (!payload?.messageId) return;
          setReactions((prev) => {
            const next = { ...prev };
            delete next[payload.messageId];
            return next;
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId
                ? { ...m, isUnsent: true, text: "", reaction: undefined, replyTo: undefined }
                : m
            )
          );
        }
      )
      .on(
        "broadcast",
        { event: "message_reaction" },
        ({ payload }: any) => {
          if (!payload?.messageId) return;
          const rxVal = payload.reaction || undefined;
          setReactions((prev) => {
            const next = { ...prev };
            if (rxVal) {
              next[payload.messageId] = rxVal;
            } else {
              delete next[payload.messageId];
            }
            return next;
          });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.messageId ? { ...m, reaction: rxVal } : m
            )
          );
        }
      )
      .on(
        "broadcast",
        { event: "messages_read" },
        ({ payload }: any) => {
          if (!payload?.chatId) return;
          if (payload.readByUserId && payload.readByUserId === user?.id) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.chatId && m.chatId !== payload.chatId) return m;
              const isOutgoing = isStaffUser
                ? m.senderRole !== "Pet Owner"
                : m.senderRole === "Pet Owner";
              return isOutgoing ? { ...m, isRead: true } : m;
            })
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
      bcRef.current?.close();
    };
  }, [isLoaded, user?.id, activeChatId, supabase, handleIncomingTyping]);

  // Persist local messages
  useEffect(() => {
    if (user?.id) {
      try {
        localStorage.setItem(
          `${LOCAL_STORAGE_CHAT_KEY}_${user.id}`,
          JSON.stringify(messages)
        );
      } catch {
        // ignore
      }
    }
  }, [messages, user?.id]);

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const openChatWithPet = useCallback((pet?: { id: string; name: string }) => {
    if (pet) setSelectedPet(pet);
    setIsOpen(true);
  }, []);

  const clearChat = useCallback(async () => {
    const chatToClear = activeChatId || messages.find((m) => m.chatId)?.chatId;
    setMessages([]);
    if (user?.id) {
      try {
        localStorage.removeItem(`${LOCAL_STORAGE_CHAT_KEY}_${user.id}`);
      } catch {}
    }
    if (chatToClear) {
      try {
        await supabase.from("chat_messages").delete().eq("chat_id", chatToClear);
        await supabase.from("chats").delete().eq("id", chatToClear);
        setActiveChatId(null);
      } catch {
        // ignore
      }
    }
  }, [activeChatId, messages, user?.id, supabase]);

  const sendMessage = useCallback(
    async (text: string, channelPersona?: "vet" | "admin", replyTo?: ChatReplyInfo) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      const userMsg: ChatMessageItem = {
        id: `msg-${Date.now()}`,
        chatId: activeChatId || undefined,
        senderId: user?.id,
        senderRole: "Pet Owner",
        senderName: ownerName,
        text: cleanText,
        timestamp: "Just now",
        isRead: true,
        replyTo,
      };

      // Add single optimistic message
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      // Broadcast immediately across channels
      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: userMsg,
        });
      } catch {}

      let savedToDb = false;
      let currentChatId = activeChatId;

      // 1. Try to persist to Supabase if `chats` & `chat_messages` tables exist
      if (user?.id) {
        try {
          const currentDesk = channelPersona || activeDeskRef.current;
          const isAdminDesk = currentDesk === "admin";
          const targetDeskVetName = isAdminDesk ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;

          if (!currentChatId || !isValidUuid(currentChatId)) {
            const { data: existingChat } = await supabase
              .from("chats")
              .select("id")
              .eq("owner_id", user.id)
              .eq("assigned_vet_name", targetDeskVetName)
              .maybeSingle();

            if (existingChat?.id) {
              currentChatId = existingChat.id;
              setActiveChatId(existingChat.id);
            } else {
              const defaultSubject = isAdminDesk
                ? "CVO Inquiry & Admin Desk"
                : selectedPet?.name
                ? `Inquiry regarding ${selectedPet.name}`
                : "Veterinary Telemedicine Consultation";

              const { data: newChat, error: newChatErr } = await supabase
                .from("chats")
                .insert({
                  owner_id: user.id,
                  pet_id: selectedPet?.id || null,
                  pet_name: selectedPet?.name || null,
                  subject: defaultSubject,
                  assigned_vet_name: targetDeskVetName,
                  last_message: cleanText,
                })
                .select("id")
                .single();

              if (!newChatErr && newChat) {
                currentChatId = newChat.id;
                setActiveChatId(newChat.id);
              }
            }
          }

          if (currentChatId && isValidUuid(currentChatId)) {
            const { error: msgErr } = await supabase.from("chat_messages").insert({
              chat_id: currentChatId,
              sender_id: user.id,
              sender_role: "Pet Owner",
              sender_name: ownerName,
              message_text: cleanText,
              attachment_url: serializeAttachmentMeta({ replyTo }),
            });

            if (!msgErr) {
              savedToDb = true;
              await supabase
                .from("chats")
                .update({ last_message: cleanText, last_message_at: new Date().toISOString() })
                .eq("id", currentChatId);
            }
          }
        } catch {
          // Table doesn't exist yet; proceed with local handling
        }
      }

      // 2. Auto-reply if query matches default frequently asked questions or emergency protocol
      const lower = cleanText.toLowerCase();

      const isBiteEmergency =
        lower.includes("bit") || // matches "bite", "bitten", "biting"
        lower.includes("kagat") ||
        lower.includes("scratch") ||
        lower.includes("rabies") ||
        lower.includes("abtc") ||
        lower.includes("emergency");

      const isKaponFaq =
        lower.includes("kapon") ||
        lower.includes("spay") ||
        lower.includes("neuter") ||
        lower.includes("ligation") ||
        lower.includes("castrat");

      const isVaccineFaq =
        lower.includes("vaccin") ||
        lower.includes("bakuna") ||
        lower.includes("immuniz") ||
        lower.includes("anti-rabies") ||
        lower.includes("booster");

      const isClinicHoursFaq =
        lower.includes("hour") ||
        lower.includes("walk-in") ||
        lower.includes("walk in") ||
        lower.includes("address") ||
        lower.includes("carmen") ||
        lower.includes("seriña") ||
        lower.includes("serina") ||
        lower.includes("location") ||
        lower.includes("clinic");

      const isMatchingFaq = isBiteEmergency || isKaponFaq || isVaccineFaq || isClinicHoursFaq;

      if (isMatchingFaq) {
        setTimeout(async () => {
          const desk = channelPersona || activeDeskRef.current;
          const isAdminDesk = desk === "admin";
          let reply = "";
          let vetName = isAdminDesk ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;
          let badge = isAdminDesk ? "CVO Admin Desk" : UNIFIED_VET_BADGE;

          if (isBiteEmergency) {
            reply =
              "Wash wound with soap and water for 15 minutes, apply antiseptic, and go to the nearest Animal Bite Treatment Center (ABTC). Observe the animal for 14 days.";
            badge = "Bite Advisory";
          } else if (isKaponFaq) {
            reply =
              "Free kapon is available at our Carmen CVO Complex clinic and barangay drives for healthy pets 6 months and older. Fast pet for 8 hours prior.";
            badge = "Kapon Advisory";
          } else if (isVaccineFaq) {
            reply =
              "Free anti-rabies vaccination is available Monday to Friday, 8 AM–5 PM at our Carmen CVO Complex clinic and barangay drives.";
            badge = "Vaccine Advisory";
          } else if (isClinicHoursFaq) {
            reply =
              "Central clinic: CVO Complex, J.V. Seriña St., Carmen, CDO. Monday to Friday, 8 AM–5 PM. Hotline: (088) 857-3180.";
            badge = "Clinic Advisory";
          }

          const vetMsg: ChatMessageItem = {
            id: `msg-reply-${Date.now()}`,
            chatId: currentChatId || undefined,
            senderRole: isAdminDesk ? "Admin" : "Veterinarian",
            senderName: vetName,
            badge,
            text: reply,
            timestamp: "Just now",
            isRead: isOpenRef.current ? true : false,
          };

          setMessages((prev) => {
            // Deduplicate: If previous message has identical text, don't duplicate
            const last = prev[prev.length - 1];
            if (last && last.text.trim().toLowerCase() === reply.trim().toLowerCase()) {
              return prev;
            }
            // Check if veterinarian already replied with this exact text in recent history
            const prevVetMessages = prev.filter((m) => m.senderRole === "Veterinarian" || m.senderRole === "Staff" || m.senderRole === "Admin");
            const lastVetMsg = prevVetMessages[prevVetMessages.length - 1];
            if (lastVetMsg && lastVetMsg.text.trim().toLowerCase() === reply.trim().toLowerCase()) {
              return prev;
            }
            return [...prev, vetMsg];
          });
          setIsLoading(false);

          // If DB table is active, insert automated reply
          if (savedToDb && currentChatId && isValidUuid(currentChatId)) {
            try {
              await supabase.from("chat_messages").insert({
                chat_id: currentChatId,
                sender_role: isAdminDesk ? "Staff" : "Veterinarian",
                sender_name: vetName,
                message_text: reply,
                is_read: false,
              });
            } catch {
              // ignore
            }
          }
        }, 600);
      } else {
        setIsLoading(false);
      }
    },
    [ownerName, user?.id, activeChatId, selectedPet, supabase]
  );

  // Staff Reply: supports switching between Dr. Helen (Vet) and CVO Admin Desk (Admin)
  const sendVetReply = useCallback(
    async (
      chatId: string,
      text: string,
      actualSenderName?: string,
      persona: "vet" | "admin" = "vet",
      replyTo?: ChatReplyInfo
    ) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      const auditAuthor =
        actualSenderName ||
        user?.fullName ||
        (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Staff Clinician");

      const isAdmin = persona === "admin";
      const senderDisplayName = isAdmin ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;
      const senderRoleName = isAdmin ? "Admin" : "Veterinarian";
      // In Supabase, chat_messages_sender_role_check allows: 'Pet Owner', 'Veterinarian', 'Staff', 'System'
      const dbSenderRole = isAdmin ? "Staff" : "Veterinarian";
      const badgeText = isAdmin ? "City Veterinary Office Admin" : UNIFIED_VET_BADGE;

      let targetChat = chatId || activeChatId;

      // If targetChat is synthetic thread id (e.g. thread-user_...), ensure real chat row exists in DB
      if (targetChat && !isValidUuid(targetChat)) {
        const ownerId = targetChat.replace(/^thread-/, "");
        const { data: existingChat } = await supabase
          .from("chats")
          .select("id")
          .eq("owner_id", ownerId)
          .eq("assigned_vet_name", senderDisplayName)
          .maybeSingle();

        if (existingChat?.id) {
          targetChat = existingChat.id;
          _setActiveChatId(existingChat.id);
          activeChatIdRef.current = existingChat.id;
        } else {
          // Create chat row for this owner on this desk
          const { data: createdChat } = await supabase
            .from("chats")
            .insert({
              owner_id: ownerId,
              subject: isAdmin ? "CVO Inquiry & Admin Desk" : "Veterinary Telemedicine Consultation",
              assigned_vet_name: senderDisplayName,
              last_message: cleanText,
            })
            .select("id")
            .single();

          if (createdChat?.id) {
            targetChat = createdChat.id;
            _setActiveChatId(createdChat.id);
            activeChatIdRef.current = createdChat.id;
          }
        }
      }

      const tempId = `msg-staff-${Date.now()}`;
      const staffMsg: ChatMessageItem = {
        id: tempId,
        chatId: targetChat || undefined,
        senderId: user?.id,
        senderRole: senderRoleName,
        senderName: senderDisplayName,
        actualSenderName: auditAuthor,
        actualSenderId: user?.id,
        badge: badgeText,
        text: cleanText,
        timestamp: "Just now",
        isRead: false,
        replyTo,
      };

      setMessages((prev) => [...prev, staffMsg]);

      // Broadcast immediately across channels
      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "new_message",
          payload: staffMsg,
        });
      } catch {}

      // Persist to Supabase if available
      try {
        if (targetChat && isValidUuid(targetChat)) {
          const { data: insertedMsg, error: insertErr } = await supabase
            .from("chat_messages")
            .insert({
              chat_id: targetChat,
              sender_id: user?.id || null, // Stores actual staff account ID for internal accountability
              sender_role: dbSenderRole,
              sender_name: senderDisplayName,
              message_text: cleanText,
              attachment_url: serializeAttachmentMeta({ replyTo }),
              is_read: false,
            })
            .select("id, created_at")
            .single();

          if (!insertErr && insertedMsg?.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      id: insertedMsg.id,
                      chatId: targetChat,
                      createdAt: insertedMsg.created_at,
                    }
                  : m
              )
            );
          }

          await supabase
            .from("chats")
            .update({
              last_message: cleanText,
              last_message_at: new Date().toISOString(),
              status: "open",
            })
            .eq("id", targetChat);
        }
      } catch {
        // ignore
      }
    },
    [activeChatId, user?.id, user?.fullName, user?.firstName, user?.lastName, supabase]
  );

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      const clean = newText.trim();
      if (!clean) return false;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, text: clean, isEdited: true } : m
        )
      );

      try {
        await supabase
          .from("chat_messages")
          .update({ message_text: clean })
          .eq("id", messageId);
      } catch {
        // ignore
      }
      return true;
    },
    [supabase]
  );

  const removeMessageForMe = useCallback(
    async (messageId: string) => {
      const currentUserId = user?.id || user?.primaryEmailAddress?.emailAddress || "anonymous";

      // 1. Immediately remove from local state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // 2. Mark locally in localStorage so it never re-appears for this user on reload
      markMessageLocallyRemoved(messageId, user?.id);

      // 3. Persist to Supabase without deleting the row so receiver still has it
      try {
        const { data: currentMsg } = await supabase
          .from("chat_messages")
          .select("id, attachment_url")
          .eq("id", messageId)
          .maybeSingle();

        if (currentMsg) {
          const meta = parseAttachmentMeta(currentMsg.attachment_url);
          const existingRemoved = Array.isArray(meta.removedFor) ? meta.removedFor : [];
          const updatedRemoved = Array.from(new Set([...existingRemoved, currentUserId]));

          await supabase
            .from("chat_messages")
            .update({
              attachment_url: serializeAttachmentMeta({
                ...meta,
                removedFor: updatedRemoved,
              }),
            })
            .eq("id", messageId);
        }
      } catch {
        // ignore
      }
      return true;
    },
    [supabase, user?.id, user?.primaryEmailAddress?.emailAddress]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const target = messages.find((m) => m.id === messageId);
      if (target?.isUnsent) {
        return removeMessageForMe(messageId);
      }

      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      markMessageLocallyRemoved(messageId, user?.id);

      try {
        await supabase.from("chat_messages").delete().eq("id", messageId);
      } catch {
        // ignore
      }
      return true;
    },
    [messages, removeMessageForMe, supabase, user?.id]
  );

  const unsendMessage = useCallback(
    async (messageId: string) => {
      setReactions((prev) => {
        const next = { ...prev };
        delete next[messageId];
        return next;
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, isUnsent: true, text: "", reaction: undefined, replyTo: undefined }
            : m
        )
      );

      try {
        bcRef.current?.postMessage({
          type: "message_unsent",
          messageId,
        });
      } catch {}

      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "message_unsent",
          payload: { messageId },
        });
      } catch {}

      try {
        await supabase
          .from("chat_messages")
          .update({
            message_text: "__UNSENT__",
            attachment_url: serializeAttachmentMeta({ isUnsent: true }),
          })
          .eq("id", messageId);
      } catch {
        // ignore
      }
      return true;
    },
    [supabase]
  );

  const toggleReaction = useCallback(
    async (messageId: string, emoji = "🐾") => {
      if (!messageId) return;
      const current = reactions[messageId];
      const nextReaction = current === emoji ? null : emoji;

      // Optimistic update
      setReactions((prev) => {
        const next = { ...prev };
        if (nextReaction) {
          next[messageId] = nextReaction;
        } else {
          delete next[messageId];
        }
        return next;
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, reaction: nextReaction || undefined } : m
        )
      );

      // Local multi-tab sync
      try {
        bcRef.current?.postMessage({
          type: "message_reaction",
          messageId,
          reaction: nextReaction,
        });
      } catch {}

      // Supabase Realtime broadcast sync to other participants
      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "message_reaction",
          payload: {
            messageId,
            reaction: nextReaction,
          },
        });
      } catch {}

      // Persist to Supabase DB preserving replyTo
      if (isValidUuid(messageId)) {
        try {
          const currentMsg = messages.find((m) => m.id === messageId);
          await supabase
            .from("chat_messages")
            .update({
              attachment_url: serializeAttachmentMeta({
                reaction: nextReaction,
                replyTo: currentMsg?.replyTo,
              }),
            })
            .eq("id", messageId);
        } catch (err) {
          console.error("Failed to persist message reaction:", err);
        }
      }
    },
    [reactions, messages, supabase]
  );

  const markAllAsRead = useCallback(async () => {
    setMessages((prev) => {
      const hasUnread = prev.some((m) => {
        const isIncoming = isStaffUser
          ? m.senderRole === "Pet Owner"
          : m.senderRole !== "Pet Owner";
        return !m.isRead && isIncoming;
      });
      if (!hasUnread) return prev;
      return prev.map((m) => {
        const isIncoming = isStaffUser
          ? m.senderRole === "Pet Owner"
          : m.senderRole !== "Pet Owner";
        return isIncoming && !m.isRead ? { ...m, isRead: true } : m;
      });
    });

    const targetChatId = activeChatId || messages.find((m) => m.chatId)?.chatId;
    const isIncomingMsg = (m: ChatMessageItem) =>
      isStaffUser ? m.senderRole === "Pet Owner" : m.senderRole !== "Pet Owner";
    const unreadDbIds = messages
      .filter((m) => isIncomingMsg(m) && !m.isRead && m.id && !m.id.startsWith("msg-"))
      .map((m) => m.id);

    try {
      if (unreadDbIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", unreadDbIds);
      }
      if (targetChatId) {
        const query = supabase
          .from("chat_messages")
          .update({ is_read: true })
          .eq("chat_id", targetChatId);

        if (isStaffUser) {
          await query.eq("sender_role", "Pet Owner");
        } else {
          await query.neq("sender_role", "Pet Owner");
        }

        channelRef.current?.send({
          type: "broadcast",
          event: "messages_read",
          payload: { chatId: targetChatId, readByUserId: user?.id },
        });
      }
    } catch {
      // ignore
    }
  }, [activeChatId, messages, supabase, user?.id, isStaffUser]);

  // When messenger opens, automatically mark all messages as read
  useEffect(() => {
    if (isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  const unreadCount = useMemo(() => {
    if (isOpen) return 0;
    return messages.filter((m) => {
      const isIncoming = isStaffUser
        ? m.senderRole === "Pet Owner"
        : m.senderRole !== "Pet Owner";
      return isIncoming && !m.isRead;
    }).length;
  }, [messages, isOpen, isStaffUser]);

  // Broadcast real-time typing events to other party (via BroadcastChannel & Supabase Realtime)
  const lastTypingSentRef = useRef<number>(0);
  const stopTypingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sendTypingStatus = useCallback(
    (
      isTyping: boolean,
      senderRole = "Pet Owner",
      meta?: {
        desk?: "vet" | "admin";
        avatarUrl?: string | null;
        chatId?: string | null;
        senderName?: string;
        initials?: string;
        recipientId?: string | null;
      }
    ) => {
      const now = Date.now();
      if (isTyping && now - lastTypingSentRef.current < 700) {
        return;
      }
      lastTypingSentRef.current = now;

      const isStaff = senderRole !== "Pet Owner";
      const resolvedDesk = meta?.desk || activeDeskRef.current;

      let displayName = meta?.senderName;
      let avatarUrl = meta?.avatarUrl;
      let initials = meta?.initials;

      if (!displayName) {
        if (senderRole === "Admin" || (isStaff && resolvedDesk === "admin")) {
          displayName = "CVO Inquiry & Admin Desk";
          avatarUrl = avatarUrl || "/partners/cdo-seal.png";
          initials = initials || "AD";
        } else if (isStaff) {
          displayName = UNIFIED_VET_NAME;
          avatarUrl = avatarUrl || "/dr-helen-tacandong.jpg";
          initials = initials || "HT";
        } else {
          displayName = user?.fullName || ownerName;
          avatarUrl = avatarUrl || user?.imageUrl || null;
          initials = initials || getTwoLetterInitials(displayName);
        }
      }

      if (!initials) {
        if (displayName.includes("Admin") || resolvedDesk === "admin") {
          initials = "AD";
        } else if (displayName.includes("Tacandong") || displayName.includes("Helen")) {
          initials = "HT";
        } else {
          initials = getTwoLetterInitials(displayName);
        }
      }

      const payload = {
        tabId: tabIdRef.current,
        senderId: user?.id || "anon",
        senderName: displayName,
        actualSenderName: user?.fullName || ownerName,
        senderRole,
        desk: resolvedDesk,
        avatarUrl: avatarUrl || null,
        initials,
        chatId: meta?.chatId || activeChatId,
        recipientId: meta?.recipientId || null,
        isTyping,
      };

      try {
        bcRef.current?.postMessage(payload);
      } catch {}

      try {
        channelRef.current?.send({
          type: "broadcast",
          event: "typing",
          payload,
        });
      } catch {}

      if (isTyping) {
        if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
        stopTypingTimerRef.current = setTimeout(() => {
          const stopPayload = {
            ...payload,
            isTyping: false,
          };
          try {
            bcRef.current?.postMessage(stopPayload);
          } catch {}
          try {
            channelRef.current?.send({
              type: "broadcast",
              event: "typing",
              payload: stopPayload,
            });
          } catch {}
        }, 2500);
      }
    },
    [user?.id, user?.fullName, user?.imageUrl, ownerName, activeChatId]
  );

  const handleSetActiveDesk = useCallback((desk: "vet" | "admin") => {
    setActiveDesk(desk);
    activeDeskRef.current = desk;
    setActiveChatId(null);
    activeChatIdRef.current = null;
    refetchMessages("desk-switch", desk);
  }, [refetchMessages]);

  const broadcastMessageRead = useCallback((chatId: string) => {
    try {
      channelRef.current?.send({
        type: "broadcast",
        event: "messages_read",
        payload: { chatId, readByUserId: user?.id },
      });
    } catch {}
  }, [user?.id]);

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleOpen,
        markAllAsRead,
        openChatWithPet,
        selectedPet,
        setSelectedPet,
        messages,
        sendMessage,
        sendVetReply,
        editMessage,
        deleteMessage,
        removeMessageForMe,
        unsendMessage,
        reactions,
        toggleReaction,
        clearChat,
        broadcastMessageRead,
        isLoading,
        unreadCount,
        activeChatId,
        setActiveChatId,
        activeDesk,
        setActiveDesk: handleSetActiveDesk,
        isOtherTyping,
        typingSenderName,
        typingInfo,
        sendTypingStatus,
        refetchMessages,
        hasMoreOlder,
        isFetchingOlder,
        isLoadingMessages,
        fetchOlderMessages,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useCitizenChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useCitizenChat must be used within a ChatProvider");
  }
  return context;
}
