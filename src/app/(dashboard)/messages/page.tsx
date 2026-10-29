"use client";

import { useState, useRef, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  useCitizenChat,
  UNIFIED_VET_NAME,
  UNIFIED_VET_BADGE,
  isDifferentDay,
  formatDateDivider,
  getShortFirstName,
  ChatMessageItem,
  ChatReplyInfo,
  parseAttachmentMeta,
  isValidUuid,
  isMessageRemovedForUser,
  isMessageLocallyRemoved,
  markMessageLocallyRemoved,
} from "@/lib/chat-context";
import { useUser } from "@clerk/nextjs";
import { useCVO } from "@/lib/cvo-context";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Phone,
  Smile,
  Send,
  ThumbsUp,
  Stethoscope,
  Building2,
  Clock,
  PawPrint,
  Check,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Reply,
  ChevronDown,
  ChevronLeft,
  Loader2,
  PanelLeft,
  Undo2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConversationProfileDrawer } from "@/components/chat/conversation-profile-drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, getTwoLetterInitials } from "@/lib/utils";
import { toast } from "sonner";

import { normalizeSyncVetRole } from "@/data/syncvet-users";

function formatThreadTime(isoString?: string | null): string {
  if (!isoString) return "Just now";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Just now";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      return new Intl.DateTimeFormat("en-PH", { weekday: "short" }).format(date);
    }
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(date);
  } catch {
    return "Just now";
  }
}

interface ThreadSubtitleOptions {
  thread: any;
  currentUserId?: string | null;
  activeChatId?: string | null;
  activeMessages: ChatMessageItem[];
  reactions: Record<string, string>;
}

function getThreadSubtitleSnippet({
  thread,
  currentUserId,
  activeChatId,
  activeMessages,
  reactions,
}: ThreadSubtitleOptions): { snippet: string; hasReaction: boolean } {
  const citizenFullName = thread.users?.full_name || "Registered Pet Owner";
  const citizenFirstName = getShortFirstName(citizenFullName);

  // 1. If currently open thread with active messages in state
  const isActive = (activeChatId || "") === thread.id && activeMessages.length > 0;
  if (isActive) {
    const lastMsg = activeMessages[activeMessages.length - 1];
    const reaction = reactions[lastMsg.id] || lastMsg.reaction;
    const isStaffMsg =
      lastMsg.senderRole === "Admin" ||
      lastMsg.senderRole === "Administrator" ||
      lastMsg.senderRole === "Veterinarian" ||
      lastMsg.senderRole === "Staff" ||
      (lastMsg.senderName && lastMsg.senderName.includes("Admin"));
    const isOutgoing = (currentUserId && lastMsg.senderId === currentUserId) || isStaffMsg;

    if (lastMsg.isUnsent || lastMsg.text === "__UNSENT__") {
      return {
        snippet: isOutgoing ? "You unsent a message" : `${citizenFirstName} unsent a message`,
        hasReaction: false,
      };
    }

    if (reaction) {
      return {
        snippet: isOutgoing
          ? `${citizenFirstName} reacted ${reaction} to your message`
          : `You reacted ${reaction} to their message`,
        hasReaction: true,
      };
    }

    const clean = (lastMsg.text || "").replace(/^Pet:\s*[^•\n]+•\s*/i, "").trim();
    if (clean === "Tap to consult" || clean === "Inquiry open on file") {
      return { snippet: clean, hasReaction: false };
    }
    return {
      snippet: isOutgoing ? `You: ${clean}` : `${citizenFirstName}: ${clean}`,
      hasReaction: false,
    };
  }

  // 2. If recent chat message row exists from DB
  if (thread.latest_message_item) {
    const item = thread.latest_message_item;
    const reaction = item.reaction;
    const isOutgoing =
      (currentUserId && item.sender_id === currentUserId) ||
      item.sender_role === "Admin" ||
      item.sender_role === "Veterinarian" ||
      item.sender_role === "Staff";

    const isUnsentItem =
      item.isUnsent ||
      item.message_text === "__UNSENT__" ||
      (typeof item.attachment_url === "string" &&
        (item.attachment_url === "unsent" || item.attachment_url.includes('"isUnsent":true')));

    if (isUnsentItem) {
      return {
        snippet: isOutgoing ? "You unsent a message" : `${citizenFirstName} unsent a message`,
        hasReaction: false,
      };
    }

    if (reaction) {
      return {
        snippet: isOutgoing
          ? `${citizenFirstName} reacted ${reaction} to your message`
          : `You reacted ${reaction} to their message`,
        hasReaction: true,
      };
    }

    const raw = item.message_text || thread.last_message || "";
    const clean = raw.replace(/^Pet:\s*[^•\n]+•\s*/i, "").trim();
    if (clean === "Tap to consult" || clean === "Inquiry open on file") {
      return { snippet: clean, hasReaction: false };
    }
    return {
      snippet: isOutgoing ? `You: ${clean}` : `${citizenFirstName}: ${clean}`,
      hasReaction: false,
    };
  }

  // 3. Fallback to thread.last_message
  const rawLast = thread.last_message || "";
  if (rawLast === "__UNSENT__" || rawLast.toLowerCase().includes("unsent a message")) {
    return {
      snippet: rawLast.includes("You") ? "You unsent a message" : `${citizenFirstName} unsent a message`,
      hasReaction: false,
    };
  }
  if (!thread.hasRealDbChat || rawLast.includes("Tap to consult")) {
    return {
      snippet: "Tap to consult",
      hasReaction: false,
    };
  }

  const cleanLast = rawLast.replace(/^Pet:\s*[^•\n]+•\s*/i, "").trim();
  if (!cleanLast || cleanLast.toLowerCase() === "inquiry open on file") {
    return {
      snippet: "Inquiry open on file",
      hasReaction: false,
    };
  }

  return {
    snippet: `${citizenFirstName}: ${cleanLast}`,
    hasReaction: false,
  };
}

function isThreadUserTyping(
  thread: any,
  typingInfo: any,
  isOtherTyping: boolean,
  activeDesk: string,
  isVeterinarian: boolean
): boolean {
  if (!isOtherTyping || !typingInfo) return false;

  // 1. Desk isolation
  if (typingInfo.desk && typingInfo.desk !== activeDesk) {
    return false;
  }

  // 2. Staff view: only citizens/pet owners trigger thread typing
  if (isVeterinarian) {
    if (
      typingInfo.senderRole === "Admin" ||
      typingInfo.senderRole === "Administrator" ||
      typingInfo.senderRole === "Veterinarian" ||
      typingInfo.senderRole === "Staff"
    ) {
      return false;
    }

    const threadOwnerId = thread.owner_id;
    const threadId = thread.id;

    // Match by senderId
    if (threadOwnerId && typingInfo.senderId && typingInfo.senderId === threadOwnerId) {
      return true;
    }

    // Match by chatId
    if (
      typingInfo.chatId &&
      (typingInfo.chatId === threadId ||
        typingInfo.chatId === threadOwnerId ||
        typingInfo.chatId === `thread-${threadOwnerId}`)
    ) {
      return true;
    }

    // Match by citizen name
    const threadFullName = (thread.users?.full_name || "").toLowerCase().trim();
    const typingFullName = (typingInfo.senderName || "").toLowerCase().trim();
    if (
      threadFullName &&
      typingFullName &&
      (threadFullName === typingFullName ||
        threadFullName.includes(typingFullName) ||
        typingFullName.includes(threadFullName))
    ) {
      return true;
    }

    return false;
  } else {
    // Citizen view: channel typing (vet or admin)
    if (typingInfo.senderRole === "Pet Owner") return false;
    const threadChatId = thread?.id;
    if (typingInfo.chatId && threadChatId && typingInfo.chatId !== threadChatId) {
      return false;
    }
    if (activeDesk === "vet" && (typingInfo.senderRole === "Veterinarian" || typingInfo.desk === "vet")) {
      return true;
    }
    if (activeDesk === "admin" && (typingInfo.senderRole === "Admin" || typingInfo.desk === "admin")) {
      return true;
    }
    return false;
  }
}

function MessagesContent() {
  const { user, isLoaded } = useUser();
  const { activeRoleView } = useCVO();

  // Query current user's DB role for strict access control
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role-messages", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userAccountRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (metadata?.accountType === "pet_owner" ? "Pet Owner" : activeRoleView)
  );

  const isAdminAccount =
    userAccountRole === "Administrator" ||
    dbUser?.role === "Administrator" ||
    metadata?.roleTitle === "Administrator" ||
    metadata?.accountType === "administrator";

  // If the account is a pure Veterinarian, they should only access the Vet Desk, never CVO Admin. Administrators have access to both desks.
  const isVetAccount = !isAdminAccount && (userAccountRole === "Veterinarian" || activeRoleView === "Veterinarian");
  const isVeterinarian = activeRoleView !== "Pet Owner" && userAccountRole !== "Pet Owner";
  const searchParams = useSearchParams();
  const paramDesk = searchParams.get("desk") as "vet" | "admin" | null;
  const paramChatId = searchParams.get("chatId");
  const paramOwnerId = searchParams.get("ownerId");

  const {
    messages,
    sendMessage,
    sendVetReply,
    editMessage,
    deleteMessage,
    unsendMessage,
    removeMessageForMe,
    reactions,
    toggleReaction,
    clearChat,
    isLoading,
    selectedPet,
    setSelectedPet,
    activeChatId,
    setActiveChatId,
    activeDesk,
    setActiveDesk,
    isOtherTyping,
    typingSenderName,
    typingInfo,
    sendTypingStatus,
    broadcastMessageRead,
    hasMoreOlder,
    isFetchingOlder,
    isLoadingMessages,
    fetchOlderMessages,
  } = useCitizenChat();

  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "urgent">("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatReplyInfo | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("chat");

  // Auto-shrink Chats sidebar on smaller screen sizes (< 1024px)
  useEffect(() => {
    let previousWidth = typeof window !== "undefined" ? window.innerWidth : 1200;

    // Auto-shrink on initial mount if screen is small
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }

    const handleResize = () => {
      const currentWidth = window.innerWidth;
      // When resizing down across 1024px, auto-collapse
      if (currentWidth < 1024 && previousWidth >= 1024) {
        setIsSidebarCollapsed(true);
      }
      // When resizing up across 1024px, auto-expand
      else if (currentWidth >= 1024 && previousWidth < 1024) {
        setIsSidebarCollapsed(false);
      }
      previousWidth = currentWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Backreading and scroll management states
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [hasNewUnseen, setHasNewUnseen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const prevMessagesLengthRef = useRef(messages.length);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
    setShowScrollBottom(false);
    setHasNewUnseen(false);
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceFromBottom < 80;
    isNearBottomRef.current = isNear;

    if (isNear) {
      setShowScrollBottom(false);
      setHasNewUnseen(false);
    } else {
      setShowScrollBottom(true);
    }

    if (el.scrollTop < 40 && hasMoreOlder && !isFetchingOlder) {
      handleLoadOlder();
    }
  };

  const handleLoadOlder = async () => {
    const el = scrollContainerRef.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    const prevScrollTop = el?.scrollTop || 0;

    await fetchOlderMessages();

    requestAnimationFrame(() => {
      if (scrollContainerRef.current) {
        const diff = scrollContainerRef.current.scrollHeight - prevScrollHeight;
        scrollContainerRef.current.scrollTop = prevScrollTop + diff;
      }
    });
  };

  const handleStartEdit = (msg: ChatMessageItem) => {
    setEditingMessageId(msg.id);
    setInputText(msg.text);
    setReplyingTo(null);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setInputText("");
  };

  const handleSaveEdit = async () => {
    if (!editingMessageId) return;
    const clean = inputText.trim();
    if (!clean) return;
    await editMessage(editingMessageId, clean);
    setEditingMessageId(null);
    setInputText("");
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
      : getShortFirstName(msg.senderName || contactName || "Pet Owner");
    setReplyingTo({
      id: msg.id,
      senderName: name,
      text: msg.text,
    });
    inputRef.current?.focus();
  };

  const scrollToMessage = (targetId?: string) => {
    if (!targetId) return;
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2200);
    }
  };

  // Sync initial staff desk based on active role if no explicit paramDesk is provided
  const hasSyncedInitialRef = useRef(false);
  useEffect(() => {
    if (isVetAccount) {
      if (activeDesk !== "vet") setActiveDesk("vet");
      hasSyncedInitialRef.current = true;
      return;
    }

    if (hasSyncedInitialRef.current) return;
    if (paramDesk === "admin" || paramDesk === "vet") {
      setActiveDesk(paramDesk);
      hasSyncedInitialRef.current = true;
      return;
    }

    if (isAdminAccount || activeRoleView === "Administrator") {
      setActiveDesk("admin");
      hasSyncedInitialRef.current = true;
    } else {
      setActiveDesk("vet");
      hasSyncedInitialRef.current = true;
    }
  }, [isAdminAccount, activeRoleView, isVetAccount, setActiveDesk, paramDesk, activeDesk]);

  // Strict guard: Veterinarians are never permitted to view or open CVO Admin chats
  useEffect(() => {
    if (isVetAccount && activeDesk !== "vet") {
      setActiveDesk("vet");
    }
  }, [isVetAccount, activeDesk, setActiveDesk]);

  // Real-time user presence tracking from Clerk and Supabase
  const { data: presenceMap = {} } = useQuery<
    Record<
      string,
      {
        isActive: boolean;
        statusText: string;
        lastSeenAt: string | null;
        minutesAgo: number | null;
      }
    >
  >({
    queryKey: ["users-presence-map"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/presence");
        if (!res.ok) return {};
        return await res.json();
      } catch {
        return {};
      }
    },
    refetchInterval: 8000,
  });

  // Heartbeat ping while the current user has this tab active
  useEffect(() => {
    if (!user?.id) return;
    const sendHeartbeat = () => {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);



  const handleDeleteMessage = async (msgId: string) => {
    const target = messages.find((m) => m.id === msgId);
    if (target?.isUnsent) {
      await removeMessageForMe(msgId);
      toast.success("Message removed for you");
      return;
    }
    await deleteMessage(msgId);
    toast.success("Message deleted");
  };

  const handleUnsendMessage = async (msgId: string) => {
    const success = await unsendMessage(msgId);
    if (success) {
      toast.success("Message unsent");
    } else {
      toast.error("Failed to unsend message");
    }
  };

  const isSendingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getPublicSupabaseClient();

  // Auto-resize textarea height to accommodate multiline word wrapping like Messenger
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      if (inputText) {
        inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
      }
    }
  }, [inputText]);

  const staffAuthorName =
    user?.fullName ||
    (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "Staff Account");

  // Query real registered pets for citizen context
  const { data: userPets = [] } = useQuery({
    queryKey: ["messages-page-pets", user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("pets")
          .select("id, name, species, breed, owner_id, users(email, full_name)");
        if (!data) return [];
        const userEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
        const userFullName = (user?.fullName || "").toLowerCase();

        return data.filter((p: any) => {
          if (user?.id && p.owner_id === user.id) return true;
          if (userEmail && p.users?.email && p.users.email.toLowerCase() === userEmail) return true;
          if (userFullName && p.users?.full_name && p.users.full_name.toLowerCase() === userFullName) return true;
          if (userEmail === "itcgeek03@gmail.com") return p.owner_id === "user_3Jh5rWy35KtlFbJMi1wroOXOYot";
          return false;
        });
      } catch {
        return [];
      }
    },
    enabled: isLoaded,
  });

  // Query all active chat threads from Supabase (for veterinarians/staff)
  const { data: dbChatThreads = [], refetch: refetchThreads } = useQuery({
    queryKey: ["veterinarian-chat-threads"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("chats")
          .select("*, users:owner_id(id, full_name, email, phone_number, address, avatar_url)")
          .order("last_message_at", { ascending: false });

        if (error || !data) return [];

        const chatIds = data.map((c: any) => c.id).filter(Boolean);
        if (chatIds.length > 0) {
          const { data: recentMsgs } = await supabase
            .from("chat_messages")
            .select("id, chat_id, message_text, sender_id, sender_name, sender_role, attachment_url, is_read, created_at")
            .in("chat_id", chatIds)
            .order("created_at", { ascending: false });

          if (recentMsgs && recentMsgs.length > 0) {
            const latestByChat: Record<string, any> = {};
            const unreadByChat: Record<string, boolean> = {};

            for (const msg of recentMsgs) {
              const meta = parseAttachmentMeta(msg.attachment_url);
              const isRemoved =
                isMessageRemovedForUser(meta, user?.id, user?.primaryEmailAddress?.emailAddress) ||
                isMessageLocallyRemoved(msg.id, user?.id);
              if (isRemoved) continue;

              if (!latestByChat[msg.chat_id]) {
                latestByChat[msg.chat_id] = {
                  ...msg,
                  reaction: meta.reaction,
                  isUnsent: meta.isUnsent || msg.message_text === "__UNSENT__",
                };
              }

              // Check if unread incoming message from citizen
              const isStaffMsg =
                msg.sender_role === "Admin" ||
                msg.sender_role === "Administrator" ||
                msg.sender_role === "Veterinarian" ||
                msg.sender_role === "Staff";
              if (!isStaffMsg && msg.is_read === false) {
                unreadByChat[msg.chat_id] = true;
              }
            }

            return data.map((c: any) => ({
              ...c,
              latest_message_item: latestByChat[c.id] || null,
              has_unread: !!unreadByChat[c.id],
            }));
          }
        }

        return data;
      } catch {
        return [];
      }
    },
    refetchInterval: 3000,
  });

  const vetUnreadCount = useMemo(() => {
    return dbChatThreads.filter((c: any) =>
      c.assigned_vet_name !== "CVO Inquiry & Admin Desk" &&
      !c.subject?.toLowerCase().includes("admin") &&
      c.has_unread
    ).length;
  }, [dbChatThreads]);

  const adminUnreadCount = useMemo(() => {
    return dbChatThreads.filter((c: any) =>
      (c.assigned_vet_name === "CVO Inquiry & Admin Desk" || c.subject?.toLowerCase().includes("admin")) &&
      c.has_unread
    ).length;
  }, [dbChatThreads]);

  // Query all registered users from Supabase to ensure all pet owners appear
  const { data: dbRegisteredUsers = [] } = useQuery<any[]>({
    queryKey: ["messages-all-registered-users"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .order("created_at", { ascending: false });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    refetchInterval: 6000,
  });

  // Query all registered pets from Supabase
  const { data: allRegisteredPets = [] } = useQuery<any[]>({
    queryKey: ["messages-all-registered-pets"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .order("created_at", { ascending: false });
        if (error || !data) return [];
        return data;
      } catch {
        return [];
      }
    },
    refetchInterval: 8000,
  });

  // Build unified pet owners list for staff/veterinarians (only real Supabase users)
  const unifiedPetOwnerThreads = useMemo(() => {
    const list: any[] = [];
    const seenUserIds = new Set<string>();

    const currentUserId = user?.id;
    const currentUserEmail = (user?.primaryEmailAddress?.emailAddress || "").toLowerCase();
    const currentFullName = (user?.fullName || "").toLowerCase();

    // 1. Include active chat threads from Supabase matching the current activeDesk
    const relevantDbChats = dbChatThreads.filter((chat: any) => {
      if (activeDesk === "admin") {
        return (
          chat.assigned_vet_name === "CVO Inquiry & Admin Desk" ||
          chat.subject?.toLowerCase().includes("admin")
        );
      } else {
        return (
          chat.assigned_vet_name !== "CVO Inquiry & Admin Desk" &&
          !chat.subject?.toLowerCase().includes("admin")
        );
      }
    });

    for (const chat of relevantDbChats) {
      const ownerId = chat.owner_id || chat.id;

      // PREVENT SELF-CHAT BUG: Staff (Admin / Vet) cannot chat with themselves!
      if (currentUserId && (chat.owner_id === currentUserId || chat.id === currentUserId)) {
        continue;
      }
      const chatEmail = (chat.users?.email || "").toLowerCase();
      if (currentUserEmail && chatEmail === currentUserEmail) {
        continue;
      }
      const chatName = (chat.users?.full_name || "").toLowerCase();
      if (currentFullName && chatName === currentFullName) {
        continue;
      }

      if (ownerId) seenUserIds.add(ownerId);

      const userRecord = dbRegisteredUsers.find((u: any) => u.id === chat.owner_id);
      const rawAvatar = chat.users?.avatar_url || chat.users?.image_url || userRecord?.avatar_url || userRecord?.image_url;
      const cleanAvatar = rawAvatar && typeof rawAvatar === "string" && rawAvatar.trim() !== "" ? rawAvatar.trim() : null;

      list.push({
        id: chat.id,
        owner_id: chat.owner_id,
        avatar_url: cleanAvatar,
        users: {
          full_name: chat.users?.full_name || userRecord?.full_name || "Registered Citizen",
          email: chat.users?.email || userRecord?.email,
          phone: chat.users?.phone_number || userRecord?.phone_number,
          address: chat.users?.address || userRecord?.address,
          avatar_url: cleanAvatar,
        },
        pet_name: chat.pet_name || "Pet",
        pet_species: chat.pet_species || "Dog",
        pet_breed: chat.pet_breed || "Mixed",
        last_message: chat.last_message || "Inquiry open on file",
        last_message_at: chat.last_message_at || chat.created_at,
        latest_message_item: chat.latest_message_item || null,
        status: chat.status || "open",
        unread: !!chat.has_unread,
        hasRealDbChat: true,
        assigned_vet_name: chat.assigned_vet_name,
        subject: chat.subject,
      });
    }

    // 2. Include registered pet owners from users table
    for (const u of dbRegisteredUsers) {
      // PREVENT SELF-CHAT BUG: Never include the logged in admin/vet themselves
      if (currentUserId && u.id === currentUserId) continue;
      const uEmail = (u.email || "").toLowerCase();
      if (currentUserEmail && uEmail === currentUserEmail) continue;
      const uName = (u.full_name || "").toLowerCase();
      if (currentFullName && uName === currentFullName) continue;

      const role = normalizeSyncVetRole(u.role);
      const isOwnerRole = role === "Pet Owner" || (u.role && u.role.toLowerCase().includes("owner"));
      if (!isOwnerRole) continue;
      if (seenUserIds.has(u.id)) continue;
      seenUserIds.add(u.id);

      const ownerPets = allRegisteredPets.filter((p: any) => p.owner_id === u.id);
      const primaryPet = ownerPets[0];
      const rawAvatar = u.avatar_url || u.image_url;
      const cleanAvatar = rawAvatar && typeof rawAvatar === "string" && rawAvatar.trim() !== "" ? rawAvatar.trim() : null;

      list.push({
        id: `thread-${u.id}`,
        owner_id: u.id,
        avatar_url: cleanAvatar,
        users: {
          full_name: u.full_name || u.email || "Registered Citizen",
          email: u.email,
          phone: u.phone_number,
          address: u.address,
          avatar_url: cleanAvatar,
        },
        pet_name: primaryPet?.name || "Registered Pet",
        pet_species: primaryPet?.species || "Dog",
        pet_breed: primaryPet?.breed || "Mixed",
        last_message: "Tap to consult",
        last_message_at: u.created_at || new Date().toISOString(),
        latest_message_item: null,
        status: "open",
        unread: false,
        hasRealDbChat: false,
      });
    }

    return list;
  }, [dbChatThreads, dbRegisteredUsers, allRegisteredPets, activeDesk, user]);

  // Handle URL query parameters for explicit desk / chat selection
  useEffect(() => {
    if (isVetAccount) {
      if (activeDesk !== "vet") setActiveDesk("vet");
    } else if (paramDesk === "admin" || paramDesk === "vet") {
      setActiveDesk(paramDesk);
    }
    if (paramChatId) {
      setActiveChatId(paramChatId);
    } else if (paramOwnerId && unifiedPetOwnerThreads.length > 0) {
      const match = unifiedPetOwnerThreads.find((t: any) => t.owner_id === paramOwnerId);
      if (match?.id) {
        setActiveChatId(match.id);
      }
    }
  }, [isVetAccount, paramDesk, paramChatId, paramOwnerId, unifiedPetOwnerThreads, setActiveDesk, setActiveChatId, activeDesk]);

  // Mark active chat incoming messages as read
  useEffect(() => {
    if (!activeChatId || !isValidUuid(activeChatId)) return;
    supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("chat_id", activeChatId)
      .neq("sender_id", user?.id)
      .eq("is_read", false)
      .then(() => {
        broadcastMessageRead(activeChatId);
        refetchThreads();
      });
  }, [activeChatId, user?.id, supabase, refetchThreads, messages.length, broadcastMessageRead]);

  // Query logged-in user's chats for citizen view
  const { data: myCitizenChats = [], refetch: refetchCitizenChats } = useQuery<any[]>({
    queryKey: ["my-citizen-chats", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        const { data } = await supabase
          .from("chats")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });
        return data || [];
      } catch {
        return [];
      }
    },
    enabled: isLoaded && !!user?.id && !isVeterinarian,
    refetchInterval: 2500,
  });

  const vetChat = useMemo(() => {
    return (
      myCitizenChats.find(
        (c: any) =>
          c.assigned_vet_name === UNIFIED_VET_NAME ||
          (c.assigned_vet_name !== "CVO Inquiry & Admin Desk" &&
            !c.subject?.toLowerCase().includes("admin"))
      ) || null
    );
  }, [myCitizenChats]);

  const adminChat = useMemo(() => {
    return (
      myCitizenChats.find(
        (c: any) =>
          c.assigned_vet_name === "CVO Inquiry & Admin Desk" ||
          c.subject?.toLowerCase().includes("admin")
      ) || null
    );
  }, [myCitizenChats]);

  // Citizen view: channel switcher sets activeChatId cleanly
  useEffect(() => {
    if (!isVeterinarian) {
      if (activeDesk === "vet") {
        setActiveChatId(vetChat?.id || null);
      } else {
        setActiveChatId(adminChat?.id || null);
      }
    }
  }, [isVeterinarian, activeDesk, vetChat?.id, adminChat?.id, setActiveChatId]);

  // Sync active thread selection: automatically select the top thread if none is selected (for staff only!)
  useEffect(() => {
    if (isVeterinarian && unifiedPetOwnerThreads.length > 0) {
      const exists = unifiedPetOwnerThreads.some(
        (t: any) =>
          t.id === activeChatId ||
          t.owner_id === activeChatId ||
          `thread-${t.owner_id}` === activeChatId
      );
      if (!activeChatId || !exists) {
        setActiveChatId(unifiedPetOwnerThreads[0].id);
      }
    }
  }, [isVeterinarian, unifiedPetOwnerThreads, activeChatId, setActiveChatId]);


  // Current active conversation details
  const activeThread = useMemo(() => {
    if (unifiedPetOwnerThreads.length > 0) {
      return (
        unifiedPetOwnerThreads.find(
          (t: any) =>
            t.id === activeChatId ||
            t.owner_id === activeChatId ||
            `thread-${t.owner_id}` === activeChatId
        ) || unifiedPetOwnerThreads[0]
      );
    }
    return null;
  }, [unifiedPetOwnerThreads, activeChatId]);

  // Strictly scoped messages for the currently active conversation
  const activeChatMessages = useMemo(() => {
    const currentChatId = activeChatId || activeThread?.id;
    if (!currentChatId) return [];
    if (isValidUuid(currentChatId)) {
      return messages.filter((m) => !m.chatId || m.chatId === currentChatId);
    }
    return messages.filter(
      (m) =>
        m.chatId === currentChatId ||
        (activeThread?.owner_id && m.senderId === activeThread.owner_id)
    );
  }, [messages, activeChatId, activeThread]);

  // Messenger-style seen receipt: Find the latest outgoing message read by the other party
  const lastReadOutgoingId = useMemo(() => {
    for (let i = activeChatMessages.length - 1; i >= 0; i--) {
      const m = activeChatMessages[i];
      const isStaffMsg =
        m.senderRole === "Veterinarian" ||
        m.senderRole === "Staff" ||
        m.senderRole === "Admin" ||
        m.senderRole === "Administrator";
      const isOut = isVeterinarian ? isStaffMsg : !isStaffMsg;
      if (isOut && !m.isUnsent) {
        // If an incoming message was sent after this outgoing message, the recipient has seen it
        const hasIncomingAfter = activeChatMessages.slice(i + 1).some((afterMsg) => {
          const afterIsStaff =
            afterMsg.senderRole === "Veterinarian" ||
            afterMsg.senderRole === "Staff" ||
            afterMsg.senderRole === "Admin" ||
            afterMsg.senderRole === "Administrator";
          return isVeterinarian ? !afterIsStaff : afterIsStaff;
        });

        if ((m.isRead ?? false) || hasIncomingAfter) {
          return m.id;
        }
      }
    }
    return null;
  }, [activeChatMessages, isVeterinarian]);

  const contactAvatarUrl = isVeterinarian
    ? activeThread?.avatar_url || activeThread?.users?.avatar_url || activeThread?.users?.image_url
    : activeDesk === "admin"
    ? "/partners/cdo-seal.png"
    : "/dr-helen-tacandong.jpg";

  const contactName = isVeterinarian
    ? activeThread?.users?.full_name || "Pet Owner"
    : activeDesk === "admin"
    ? "CVO Inquiry & Admin Desk"
    : UNIFIED_VET_NAME;

  const contactSubtitle = isVeterinarian
    ? activeDesk === "admin"
      ? `Public Administration Inquiry • Citizen: ${activeThread?.users?.full_name || "Pet Owner"} • Pet: ${activeThread?.pet_name || "Registered Pet"}`
      : `Telemedicine Consultation • Citizen: ${activeThread?.users?.full_name || "Pet Owner"} • Pet: ${activeThread?.pet_name || "Registered Pet"} (${activeThread?.pet_species || "Dog"} • ${activeThread?.pet_breed || "Mixed"})`
    : activeDesk === "admin"
    ? "City Veterinary Office Admin Desk • Active duty hours: 8:00 AM - 5:00 PM"
    : "City Veterinary Office (CVO) • Telemedicine clinical guidance desk";

  // Dynamic Presence Status (Clerk & Supabase)
  const currentActiveUserPresence = isVeterinarian && activeThread?.owner_id ? presenceMap[activeThread.owner_id] : null;
  const isCurrentActive = isVeterinarian
    ? (currentActiveUserPresence?.isActive ?? false)
    : true; // Official CVO channels are on-duty
  const activeStatusLabel = isVeterinarian
    ? (currentActiveUserPresence?.statusText || "Offline")
    : "Active now";

  // Only display the typing indicator if the typing event strictly matches the currently viewed desk and conversation
  const shouldShowTypingIndicator = useMemo(() => {
    if (!isOtherTyping || !typingInfo) return false;

    // 1. Desk persona isolation:
    // If typing from "vet" desk, it must ONLY show when viewing "vet" desk!
    // If typing from "admin" desk, it must ONLY show when viewing "admin" desk!
    if (typingInfo.desk && typingInfo.desk !== activeDesk) {
      return false;
    }

    // 2. Role and conversation matching:
    if (isVeterinarian) {
      // For staff view:
      // Ignore typing events from other staff members
      if (typingInfo.senderRole === "Admin" || typingInfo.senderRole === "Veterinarian") {
        return false;
      }
      // If typing has a specific chatId, ensure it matches the active citizen thread
      const activeOwnerId = activeThread?.owner_id;
      const activeThreadId = activeThread?.id;
      if (
        typingInfo.chatId &&
        activeChatId &&
        typingInfo.chatId !== activeChatId &&
        typingInfo.chatId !== activeThreadId &&
        typingInfo.chatId !== activeOwnerId &&
        typingInfo.chatId !== `thread-${activeOwnerId}`
      ) {
        return false;
      }
    } else {
      // For citizen view:
      // Only show typing if staff is replying to THIS specific citizen's active chat / channel
      if (typingInfo.senderRole === "Pet Owner") {
        return false;
      }
      const myActiveChat = activeDesk === "admin" ? adminChat?.id : vetChat?.id;
      if (typingInfo.chatId && myActiveChat && typingInfo.chatId !== myActiveChat) {
        return false;
      }
    }

    return true;
  }, [isOtherTyping, typingInfo, activeDesk, isVeterinarian, activeChatId, activeThread, adminChat?.id, vetChat?.id]);

  const isVetChannelTyping = Boolean(
    !isVeterinarian &&
      isOtherTyping &&
      typingInfo &&
      (typingInfo.senderRole === "Veterinarian" ||
        (typingInfo.senderRole !== "Pet Owner" && (typingInfo.desk === "vet" || !typingInfo.desk))) &&
      (!typingInfo.chatId || !vetChat?.id || typingInfo.chatId === vetChat.id)
  );

  const isAdminChannelTyping = Boolean(
    !isVeterinarian &&
      isOtherTyping &&
      typingInfo &&
      (typingInfo.senderRole === "Admin" ||
        (typingInfo.senderRole !== "Pet Owner" && typingInfo.desk === "admin")) &&
      (!typingInfo.chatId || !adminChat?.id || typingInfo.chatId === adminChat.id)
  );

  // Resolved typing indicator identity
  const resolvedTypingAvatar = useMemo(() => {
    if (typingInfo?.avatarUrl) return typingInfo.avatarUrl;
    if (!isVeterinarian) {
      return activeDesk === "admin" ? "/partners/cdo-seal.png" : "/dr-helen-tacandong.jpg";
    }
    return contactAvatarUrl || null;
  }, [typingInfo, isVeterinarian, activeDesk, contactAvatarUrl]);

  const resolvedTypingInitials = useMemo(() => {
    if (typingInfo?.initials) return typingInfo.initials;
    if (!isVeterinarian) {
      return activeDesk === "admin" ? "AD" : "HT";
    }
    return getTwoLetterInitials(typingSenderName || contactName);
  }, [typingInfo, isVeterinarian, activeDesk, typingSenderName, contactName]);

  const resolvedTypingName = useMemo(() => {
    if (typingInfo?.senderName) return typingInfo.senderName;
    if (!isVeterinarian) {
      return activeDesk === "admin" ? "CVO Inquiry & Admin Desk" : UNIFIED_VET_NAME;
    }
    return contactName || "Citizen";
  }, [typingInfo, isVeterinarian, activeDesk, contactName]);

  // Initial scroll to bottom when messages load/reload
  useEffect(() => {
    if (!initialScrollDoneRef.current && activeChatMessages.length > 0) {
      initialScrollDoneRef.current = true;
      setTimeout(() => {
        scrollToBottom("instant");
      }, 60);
    }
  }, [activeChatMessages.length]);

  // Reset initial scroll flag on conversation switch
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [activeChatId, activeDesk]);

  // Handle incoming / new messages without jumping when backreading
  useEffect(() => {
    if (activeChatMessages.length > prevMessagesLengthRef.current) {
      const lastMsg = activeChatMessages[activeChatMessages.length - 1];
      const isOutgoing = lastMsg && (isVeterinarian ? lastMsg.senderRole !== "Pet Owner" : lastMsg.senderRole === "Pet Owner");

      if (isOutgoing || isNearBottomRef.current) {
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        setShowScrollBottom(true);
        setHasNewUnseen(true);
      }
    }
    prevMessagesLengthRef.current = activeChatMessages.length;
  }, [activeChatMessages, isVeterinarian]);

  // When typing indicator appears and user is already at the bottom
  useEffect(() => {
    if (shouldShowTypingIndicator && isNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [shouldShowTypingIndicator]);

  // Filtered threads list for search & tabs
  const filteredThreads = useMemo(() => {
    return unifiedPetOwnerThreads.filter((t: any) => {
      const name = (t.users?.full_name || "").toLowerCase();
      const pet = (t.pet_name || "").toLowerCase();
      const msg = (t.last_message || "").toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch = !q || name.includes(q) || pet.includes(q) || msg.includes(q);
      if (!matchesSearch) return false;

      if (filterTab === "unread") {
        return t.unread || t.status === "open" || t.last_message?.includes("?");
      }
      if (filterTab === "urgent") {
        return (
          t.isUrgent ||
          msg.includes("bite") ||
          msg.includes("emergency") ||
          msg.includes("blood") ||
          msg.includes("rabies") ||
          msg.includes("fever")
        );
      }
      return true;
    });
  }, [unifiedPetOwnerThreads, searchQuery, filterTab]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (isSendingRef.current || !textToSend) return;

    isSendingRef.current = true;
    const currentReply = replyingTo;
    setInputText("");
    setReplyingTo(null);
    sendTypingStatus(
      false,
      isVeterinarian ? (activeDesk === "admin" ? "Admin" : "Veterinarian") : "Pet Owner",
      {
        desk: activeDesk,
        chatId: activeChatId || activeThread?.id,
      }
    );

    try {
      if (isVeterinarian) {
        const targetId = activeChatId || activeThread?.id || (activeThread?.owner_id ? `thread-${activeThread.owner_id}` : "");
        await sendVetReply(targetId, textToSend, staffAuthorName, activeDesk, currentReply || undefined);
        refetchThreads();
      } else {
        await sendMessage(textToSend, activeDesk, currentReply || undefined);
        refetchCitizenChats();
        refetchThreads();
      }
    } finally {
      isSendingRef.current = false;
      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
      inputRef.current?.focus();
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

  const clinicalTemplates = [
    "Please bring your pet to our Carmen CVO Complex central clinic for a physical assessment.",
    "Animal Bite Protocol: Wash wound with soap & water for 15 mins. Head immediately to ABTC.",
    "Fasting Advisory: Ensure your pet fasts from food for 8 hours prior to the kapon procedure.",
    "Your pet's municipal anti-rabies immunity record is up to date on file with the City Veterinary Office.",
    "Walk-in clinic is open Monday to Friday, 8:00 AM to 5:00 PM at CVO Complex, J.V. Seriña St., Carmen.",
  ];

  const quickQuestions = [
    "What should I do if my dog is bitten?",
    "Free Kapon schedule",
    "Anti-rabies vaccine hours",
    "Clinic walk-in hours in Carmen",
  ];

  return (
    <div
      className={cn(
        "flex flex-col bg-background text-foreground overflow-hidden",
        !isVeterinarian
          ? "h-[calc(100vh-56px)] max-w-[1140px] mx-auto w-full px-0 sm:px-4"
          : "h-[calc(100vh-68px)]"
      )}
    >
      {/* ── Main Messenger Container (Exact Messenger Split-View Layout) ── */}
      <div
        className={cn(
          "flex-1 flex overflow-hidden",
          !isVeterinarian
            ? "sm:border sm:border-border/60 sm:rounded-2xl sm:shadow-xs bg-card/40 sm:my-3 border-t border-border/50"
            : "border-t border-border/50"
        )}
      >
        {/* ── 1. Left Sidebar: Chats List (Auto-shrinks on smaller screens & full-width on mobile list view) ── */}
        <aside
          className={cn(
            "flex-col border-r border-border/60 bg-card/60 backdrop-blur-xs shrink-0 select-none transition-all duration-300 ease-in-out",
            mobileView === "list" ? "w-full flex" : "hidden md:flex",
            isSidebarCollapsed ? "md:w-[72px]" : "md:w-80 lg:w-88 xl:w-96"
          )}
        >
          {/* Sidebar Top: "Chats" Header with Minimize / Expand Button */}
          <div className="p-3.5 pb-2 flex items-center justify-between border-b border-border/40 shrink-0">
            <div className={cn(isSidebarCollapsed && "md:hidden")}>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Chats
              </h1>
              <p className="text-[11px] text-muted-foreground md:hidden font-medium">
                Official Cagayan de Oro City Veterinary Telemedicine
              </p>
            </div>
            {/* Desktop-only collapse/expand button */}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden md:flex size-7 rounded-lg items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title={isSidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Minimize sidebar"}
            >
              <PanelLeft className="size-4" />
            </button>
          </div>

          {/* ── Collapsed Compact View: ONLY rendered on desktop/tablet when collapsed ── */}
          {isSidebarCollapsed && (
            <div className="hidden md:flex flex-1 flex-col items-center py-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
              {isVeterinarian ? (
                <>
                  {/* Compact Desk Switcher */}
                  <div className="flex flex-col items-center gap-2 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDesk("vet");
                        setActiveChatId(null);
                      }}
                      className={cn(
                        "size-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                        activeDesk === "vet"
                          ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                          : "opacity-60 hover:opacity-100"
                      )}
                      title="Dr. Helen (Vet Desk)"
                    >
                      <Avatar className="size-9 rounded-full overflow-hidden bg-emerald-600">
                        <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen" className="object-cover" />
                        <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">HT</AvatarFallback>
                      </Avatar>
                      {vetUnreadCount > 0 && (
                        <span
                          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background shadow-xs"
                          title={`${vetUnreadCount} unread`}
                        >
                          {vetUnreadCount > 9 ? "9+" : vetUnreadCount}
                        </span>
                      )}
                    </button>

                    {!isVetAccount && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveDesk("admin");
                          setActiveChatId(null);
                        }}
                        className={cn(
                          "size-10 rounded-full flex items-center justify-center transition-all cursor-pointer relative",
                          activeDesk === "admin"
                            ? "ring-2 ring-teal-500 ring-offset-2 ring-offset-background"
                            : "opacity-60 hover:opacity-100"
                        )}
                        title="CVO Admin Desk"
                      >
                        <Avatar className="size-9 rounded-full overflow-hidden bg-white border border-teal-500/30">
                          <AvatarImage src="/partners/cdo-seal.png" alt="CVO Admin" className="object-contain p-0.5" />
                          <AvatarFallback className="bg-teal-700 text-white text-[9px] font-bold">AD</AvatarFallback>
                        </Avatar>
                        {adminUnreadCount > 0 && (
                          <span
                            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center ring-2 ring-background shadow-xs"
                            title={`${adminUnreadCount} unread`}
                          >
                            {adminUnreadCount > 9 ? "9+" : adminUnreadCount}
                          </span>
                        )}
                      </button>
                    )}
                    <div className="w-8 h-px bg-border/60 my-1" />
                  </div>

                  {/* Compact Pet Owners List */}
                  <div className="flex flex-col items-center gap-2 w-full px-2">
                    {filteredThreads.map((thread: any) => {
                      const isSelected = activeChatId === thread.id;
                      const isThreadTyping = isThreadUserTyping(
                        thread,
                        typingInfo,
                        isOtherTyping,
                        activeDesk,
                        isVeterinarian
                      );
                      const citizenFullName =
                        thread.users?.full_name ||
                        (thread.users?.first_name ? `${thread.users.first_name} ${thread.users.last_name || ""}`.trim() : null) ||
                        thread.subject ||
                        "Pet Owner";
                      const threadAvatarUrl = thread.avatar_url || thread.users?.avatar_url || thread.users?.image_url;
                      const initials = getTwoLetterInitials(citizenFullName);
                      const ownerPresence = thread.owner_id ? presenceMap[thread.owner_id] : null;
                      const isOwnerActive = ownerPresence?.isActive ?? false;

                      return (
                        <button
                          key={thread.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setIsProfileOpen(true);
                            } else {
                              setActiveChatId(thread.id);
                              setMobileView("chat");
                            }
                          }}
                          title={`${citizenFullName}${isThreadTyping ? " • Typing..." : ""}${thread.pet_name ? ` • Pet: ${thread.pet_name}` : ""}${isSelected ? " • Click to view profile info & history" : ""}`}
                          className={cn(
                            "relative size-11 rounded-full flex items-center justify-center transition-all cursor-pointer group",
                            isSelected
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "hover:scale-105"
                          )}
                        >
                          <Avatar className="size-10 rounded-full border border-border/50">
                            {threadAvatarUrl && <AvatarImage src={threadAvatarUrl} alt={citizenFullName} />}
                            <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          {/* Active presence dot: ONLY shown on bottom-right when online */}
                          {isOwnerActive && (
                            <span
                              className="absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card bg-emerald-500 shadow-2xs"
                              title="Active now"
                            />
                          )}
                          {/* Typing indicator: Clean 3-dots animation pill */}
                          {isThreadTyping ? (
                            <div
                              className="absolute -bottom-1 -right-1.5 z-20 flex items-center gap-0.5 bg-zinc-900 border border-white/20 shadow-md px-1.5 py-0.5 rounded-full animate-in zoom-in-75"
                              title={`${citizenFullName} is typing...`}
                            >
                              <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                              <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                              <span className="size-1 rounded-full bg-white animate-bounce" />
                            </div>
                          ) : !isSelected && thread.unread ? (
                            /* Unread message: Clean Messenger-style blue dot (distinct from green presence) */
                            <span
                              className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary ring-2 ring-background shadow-xs"
                              title="Unread messages"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Compact Citizen View: Channels Only */
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDesk("vet");
                      setActiveChatId(vetChat?.id || null);
                      setMobileView("chat");
                    }}
                    title={`Dr. Helen Ann P. Tacandong (Telemedicine)${isVetChannelTyping ? " • Typing..." : ""}`}
                    className={cn(
                      "relative size-11 rounded-full flex items-center justify-center transition-all cursor-pointer group",
                      activeDesk === "vet"
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-105"
                    )}
                  >
                    <Avatar className="size-10 rounded-full border border-emerald-500/40 overflow-hidden bg-emerald-600">
                      <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen" className="object-cover" />
                      <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                        <Stethoscope className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" title="Active now" />
                    {isVetChannelTyping && (
                      <div
                        className="absolute -bottom-1 -right-1.5 z-20 flex items-center gap-0.5 bg-zinc-900 border border-white/20 shadow-md px-1.5 py-0.5 rounded-full animate-in zoom-in-75"
                        title="Typing..."
                      >
                        <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1 rounded-full bg-white animate-bounce" />
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDesk("admin");
                      setActiveChatId(adminChat?.id || null);
                      setMobileView("chat");
                    }}
                    title={`CVO Inquiry & Admin Desk${isAdminChannelTyping ? " • Typing..." : ""}`}
                    className={cn(
                      "relative size-11 rounded-full flex items-center justify-center transition-all cursor-pointer group",
                      activeDesk === "admin"
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-105"
                    )}
                  >
                    <Avatar className="size-10 rounded-full border border-teal-500/40 overflow-hidden bg-white">
                      <AvatarImage src="/partners/cdo-seal.png" alt="CVO Admin" className="object-contain p-1" />
                      <AvatarFallback className="bg-teal-700 text-white font-bold text-xs">
                        <Building2 className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" title="Active now" />
                    {isAdminChannelTyping && (
                      <div
                        className="absolute -bottom-1 -right-1.5 z-20 flex items-center gap-0.5 bg-zinc-900 border border-white/20 shadow-md px-1.5 py-0.5 rounded-full animate-in zoom-in-75"
                        title="Typing..."
                      >
                        <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.3s]" />
                        <span className="size-1 rounded-full bg-white animate-bounce [animation-delay:-0.15s]" />
                        <span className="size-1 rounded-full bg-white animate-bounce" />
                      </div>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Full Rich View with Names, Badges, Info & Subtitles ── */}
          {/* Always shown on mobile list view, and on desktop when not collapsed */}
          {(!isSidebarCollapsed || mobileView === "list") && (
            <div className={cn("flex-1 flex flex-col overflow-y-auto", isSidebarCollapsed && "md:hidden")}>
              {/* Active Desk / Account Perspective Switcher (For Staff/Admins) */}
              {isVeterinarian && (
            <div className="px-3 pb-2">
              {isVetAccount ? (
                /* When the account is Veterinarian, they cannot open CVO admin chats - strictly Vet Desk */
                <div className="flex items-center gap-2.5 p-2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-xl border border-emerald-500/30 shadow-2xs select-none">
                  <Avatar className="size-8 rounded-full shrink-0 border border-emerald-500/40 overflow-hidden bg-emerald-600">
                    <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen" className="object-cover" />
                    <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">HT</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold truncate text-foreground leading-tight">Dr. Helen</p>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
                        Vet Desk
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5 font-medium">
                      Telemedicine & Clinical Consultations
                    </p>
                  </div>
                </div>
              ) : (
                /* Administrator perspective: can switch between Dr. Helen (Vet Desk) and CVO Admin (Admin Desk) */
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl border border-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDesk("vet");
                      setActiveChatId(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-lg text-left transition-all cursor-pointer",
                      activeDesk === "vet"
                        ? "bg-card text-foreground shadow-xs border border-emerald-500/40 ring-1 ring-emerald-500/20"
                        : "hover:bg-card/50 text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                  >
                    <Avatar className="size-7 rounded-full shrink-0 border border-emerald-500/30 overflow-hidden bg-emerald-600">
                      <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen" className="object-cover" />
                      <AvatarFallback className="bg-emerald-600 text-white text-[9px] font-bold">HT</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold truncate text-foreground leading-tight">Dr. Helen</p>
                        {vetUnreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-600 text-white shrink-0">
                            {vetUnreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold truncate leading-tight">
                        Vet Desk
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveDesk("admin");
                      setActiveChatId(null);
                    }}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-lg text-left transition-all cursor-pointer",
                      activeDesk === "admin"
                        ? "bg-card text-foreground shadow-xs border border-teal-500/40 ring-1 ring-teal-500/20"
                        : "hover:bg-card/50 text-muted-foreground hover:text-foreground border border-transparent"
                    )}
                  >
                    <Avatar className="size-7 rounded-full shrink-0 border border-teal-500/30 bg-white overflow-hidden">
                      <AvatarImage src="/partners/cdo-seal.png" alt="CVO Admin" className="object-contain p-0.5" />
                      <AvatarFallback className="bg-teal-700 text-white text-[9px] font-bold">AD</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold truncate text-foreground leading-tight">CVO Admin</p>
                        {adminUnreadCount > 0 && (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-teal-600 text-white shrink-0 animate-pulse">
                            {adminUnreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold truncate leading-tight">
                        Admin Desk
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rounded Pill Search Bar & Filter Pills (Staff only: Veterinarian & Admin have pet owners to search & filter) */}
          {isVeterinarian && (
            <>
              {/* Rounded Pill Search Bar */}
              <div className="px-3 py-1.5">
                <div className="flex items-center rounded-full bg-muted/60 dark:bg-muted/40 px-3.5 py-1.5 border border-border/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                  <Search className="size-4 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground/70"
                  />
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto text-xs shrink-0 [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0",
                    filterTab === "all"
                      ? "bg-primary/15 text-primary dark:bg-primary/25 font-bold"
                      : "text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("unread")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0",
                    filterTab === "unread"
                      ? "bg-primary/15 text-primary dark:bg-primary/25 font-bold"
                      : "text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  Unread
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("urgent")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0",
                    filterTab === "urgent"
                      ? "bg-red-500/15 text-red-600 dark:bg-red-500/25 font-bold"
                      : "text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  Urgent & Bites
                </button>
              </div>
            </>
          )}

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-1">
            {isVeterinarian ? (
              filteredThreads.length === 0 ? (
                /* Empty search or no chats */
                <div className="p-6 text-center text-muted-foreground space-y-2">
                  <User className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-xs font-semibold">No Pet Owners Found</p>
                  <p className="text-[11px]">
                    {searchQuery
                      ? `No registered pet owner matches "${searchQuery}".`
                      : "No registered pet owners available."}
                  </p>
                </div>
              ) : (
                filteredThreads.map((thread: any) => {
                  const isSelected = (activeChatId || activeThread?.id) === thread.id;
                  const isThreadTyping = isThreadUserTyping(
                    thread,
                    typingInfo,
                    isOtherTyping,
                    activeDesk,
                    isVeterinarian
                  );
                  const isThreadUnread = !isSelected && !!thread.unread;
                  const citizenFullName = thread.users?.full_name || "Registered Pet Owner";
                  const threadAvatarUrl = thread.avatar_url || thread.users?.avatar_url || thread.users?.image_url;
                  const initials = getTwoLetterInitials(citizenFullName);
                  const subtitleInfo = getThreadSubtitleSnippet({
                    thread,
                    currentUserId: user?.id,
                    activeChatId: activeChatId || activeThread?.id,
                    activeMessages: activeChatMessages,
                    reactions,
                  });
                  const timeText = formatThreadTime(thread.last_message_at);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => {
                        setActiveChatId(thread.id);
                        setMobileView("chat");
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer group",
                        isSelected
                          ? "bg-primary/10 border border-primary/20 text-foreground"
                          : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {/* Avatar with Dynamic Online Presence Indicator */}
                      <div className="relative shrink-0">
                        <Avatar className="size-11 rounded-full border border-border/50">
                          {threadAvatarUrl && <AvatarImage src={threadAvatarUrl} alt={citizenFullName} />}
                          <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        {(() => {
                          const ownerPresence = thread.owner_id ? presenceMap[thread.owner_id] : null;
                          const isOwnerActive = ownerPresence?.isActive ?? false;
                          const ownerStatus = ownerPresence?.statusText || "Offline";
                          return (
                            <span
                              className={cn(
                                "absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-card transition-colors",
                                isOwnerActive ? "bg-emerald-500 shadow-2xs" : "bg-zinc-400 dark:bg-zinc-600"
                              )}
                              title={isOwnerActive ? "Active now" : ownerStatus}
                            />
                          );
                        })()}
                      </div>

                      {/* Text Snippet */}
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span
                            className={cn(
                              "text-xs truncate",
                              isThreadUnread
                                ? "font-bold text-foreground"
                                : "font-normal text-muted-foreground"
                            )}
                          >
                            {citizenFullName}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] shrink-0 font-mono ml-2",
                              isThreadUnread
                                ? "font-semibold text-foreground"
                                : "font-normal text-muted-foreground/70"
                            )}
                          >
                            {timeText}
                          </span>
                        </div>
                        {isThreadTyping ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate animate-in fade-in-50 duration-150">
                            <span className="flex items-center gap-1">
                              <span>Typing</span>
                              <span className="inline-flex items-center gap-0.5 ml-0.5">
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce" />
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] truncate">
                            <span
                              className={cn(
                                "truncate",
                                isThreadUnread
                                  ? "text-foreground font-semibold"
                                  : "text-muted-foreground font-normal"
                              )}
                            >
                              {subtitleInfo.snippet}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Unread Indicator: ONLY rendered if unread */}
                      {isThreadUnread && (
                        <span className="size-2 rounded-full bg-primary shrink-0 shadow-xs ml-1" title="Unread" />
                      )}
                    </button>
                  );
                })
              )
            ) : (
              /* Citizen View: Channels (Veterinarian & Admin Inquiry Desk) + Pet Switcher */
              <div className="space-y-3">
                <div className="px-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Official CVO Channels
                  </p>
                  <div className="space-y-1.5">
                    {/* Channel 1: City Veterinarian */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDesk("vet");
                        setActiveChatId(vetChat?.id || null);
                        setMobileView("chat");
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer group",
                        activeDesk === "vet"
                          ? "bg-primary/15 border border-primary/25 shadow-2xs"
                          : "hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10 rounded-full border border-emerald-500/40 overflow-hidden bg-emerald-600">
                          <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen Ann P. Tacandong" className="object-cover" />
                          <AvatarFallback className="bg-emerald-600 text-white font-bold text-xs">
                            <Stethoscope className="size-4.5" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <p className="font-bold text-xs text-foreground truncate">
                            Dr. Helen Ann P. Tacandong
                          </p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-bold shrink-0">
                            Telemedicine
                          </Badge>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
                          City Veterinarian • CVO
                        </p>
                        {isVetChannelTyping ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate animate-in fade-in-50 duration-150">
                            <span className="flex items-center gap-1">
                              <span>Dr. Helen is typing</span>
                              <span className="inline-flex items-center gap-0.5 ml-0.5">
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce" />
                              </span>
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground truncate">
                            Clinical advice & rabies protocols
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Channel 2: CVO Admin & Inquiry Desk */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDesk("admin");
                        setActiveChatId(adminChat?.id || null);
                        setMobileView("chat");
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-colors cursor-pointer group",
                        activeDesk === "admin"
                          ? "bg-primary/15 border border-primary/25 shadow-2xs"
                          : "hover:bg-muted/50 border border-transparent"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="size-10 rounded-full border border-teal-500/40 overflow-hidden bg-white">
                          <AvatarImage src="/partners/cdo-seal.png" alt="CVO Inquiry & Admin Desk" className="object-contain p-1" />
                          <AvatarFallback className="bg-teal-700 text-white font-bold text-xs">
                            <Building2 className="size-4.5" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <p className="font-bold text-xs text-foreground truncate">
                            CVO Inquiry & Admin Desk
                          </p>
                          <Badge variant="outline" className="text-[8px] px-1 py-0 text-teal-600 border-teal-500/30 bg-teal-500/10 font-bold shrink-0">
                            Public Desk
                          </Badge>
                        </div>
                        <p className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold truncate">
                          City Veterinary Office Admin
                        </p>
                        {isAdminChannelTyping ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate animate-in fade-in-50 duration-150">
                            <span className="flex items-center gap-1">
                              <span>CVO Admin is typing</span>
                              <span className="inline-flex items-center gap-0.5 ml-0.5">
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
                                <span className="size-1 rounded-full bg-muted-foreground/60 animate-bounce" />
                              </span>
                            </span>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground truncate">
                            Kapon schedules, anti-rabies & walk-ins
                          </p>
                        )}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
            </div>
          )}
        </aside>

        {/* ── 2. Center/Right: Active Chat Window (Takes full 100% width on mobile) ── */}
        <main
          className={cn(
            "flex-1 flex flex-col bg-background relative overflow-hidden",
            mobileView === "list" ? "hidden md:flex" : "flex w-full"
          )}
        >
          {/* Header */}
          <header className="h-15 px-3 sm:px-4 md:px-5 border-b border-border/60 bg-card/70 backdrop-blur-xs flex items-center justify-between shrink-0 shadow-2xs z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Mobile Back Button to Chats List */}
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="md:hidden size-8 rounded-lg flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0 -ml-1"
                title="Back to conversation list"
                aria-label="Back to conversation list"
              >
                <ChevronLeft className="size-5" />
              </button>

              {/* Profile Header Trigger (Only clickable for Veterinarian/Staff viewing Pet Owner profile) */}
              {isVeterinarian ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left hover:bg-muted/60 transition-colors p-1 sm:p-1.5 -m-1 rounded-xl cursor-pointer group focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
                  title="Click to view profile info, registered pets & clinical history"
                  aria-label="View conversation profile info"
                >
                  <div className="relative shrink-0">
                    <Avatar className="size-10 rounded-full border border-border/50 overflow-hidden bg-card group-hover:ring-2 group-hover:ring-primary/50 transition-all">
                      {contactAvatarUrl && (
                        <AvatarImage
                          src={contactAvatarUrl}
                          alt={contactName}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs">
                        {getTwoLetterInitials(contactName)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card transition-colors",
                        isCurrentActive ? "bg-emerald-500 shadow-2xs" : "bg-zinc-400 dark:bg-zinc-600"
                      )}
                      title={activeStatusLabel}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span>{contactName}</span>
                        <Info className="size-3 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                      </h2>
                      <span
                        className={cn(
                          "text-[10px] font-semibold flex items-center gap-1.5 transition-colors shrink-0",
                          isCurrentActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground/80"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            isCurrentActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
                          )}
                        />
                        {activeStatusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate group-hover:text-muted-foreground/90 transition-colors">
                      {contactSubtitle}
                    </p>
                  </div>
                </button>
              ) : (
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 p-1 sm:p-1.5 -m-1">
                  <div className="relative shrink-0">
                    <Avatar className="size-10 rounded-full border border-border/50 overflow-hidden bg-card">
                      {contactAvatarUrl && (
                        <AvatarImage
                          src={contactAvatarUrl}
                          alt={contactName}
                          className={activeDesk === "admin" ? "object-contain p-1 bg-white" : "object-cover"}
                        />
                      )}
                      <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-xs">
                        {activeDesk === "admin" ? <Building2 className="size-4.5" /> : <Stethoscope className="size-4.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-card transition-colors",
                        isCurrentActive ? "bg-emerald-500 shadow-2xs" : "bg-zinc-400 dark:bg-zinc-600"
                      )}
                      title={activeStatusLabel}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-foreground truncate">
                        <span>{contactName}</span>
                      </h2>
                      <span
                        className={cn(
                          "text-[10px] font-semibold flex items-center gap-1.5 transition-colors shrink-0",
                          isCurrentActive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground/80"
                        )}
                      >
                        <span
                          className={cn(
                            "size-1.5 rounded-full shrink-0",
                            isCurrentActive ? "bg-emerald-500 animate-pulse" : "bg-zinc-400 dark:bg-zinc-600"
                          )}
                        />
                        {activeStatusLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {contactSubtitle}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Header Right Actions: Profile button only visible for Veterinarians/Staff */}
            {isVeterinarian && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProfileOpen(true)}
                  className="h-8 px-2.5 sm:px-3 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg border border-border/60 shadow-2xs cursor-pointer group transition-all"
                  title="View Profile Information, Pets & History"
                  aria-label="View Profile Information, Pets & History"
                >
                  <User className="size-3.5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">Profile</span>
                </Button>
              </div>
            )}
          </header>

          {/* Message Stream */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5"
          >
            {/* Top Skeleton: Loading older messages while backreading */}
            {isFetchingOlder && (
              <div className="py-2.5 px-3 mb-3 space-y-2 border-b border-border/40 animate-in fade-in duration-150">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  <span>Loading earlier messages...</span>
                </div>
                <div className="flex items-start gap-2 opacity-70">
                  <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="h-8 w-48 rounded-2xl rounded-tl-xs bg-muted/80 animate-pulse" />
                </div>
                <div className="flex justify-end opacity-70">
                  <div className="h-8 w-40 rounded-2xl rounded-br-xs bg-primary/20 animate-pulse" />
                </div>
              </div>
            )}
            {hasMoreOlder && !isFetchingOlder && (
              <div className="flex justify-center my-2">
                <button
                  type="button"
                  onClick={handleLoadOlder}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium px-3 py-1 rounded-full hover:bg-muted/70 transition-colors cursor-pointer border border-border/50 shadow-2xs"
                >
                  Load older messages
                </button>
              </div>
            )}

            {/* Initial loading skeleton */}
            {isLoadingMessages && activeChatMessages.length === 0 && !activeChatId?.startsWith("thread-") && (
              <div className="py-4 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-8 w-44 rounded-2xl rounded-tl-xs bg-muted/80 animate-pulse" />
                    <div className="h-6 w-28 rounded-2xl bg-muted/60 animate-pulse" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="h-8 w-48 rounded-2xl rounded-br-xs bg-primary/20 animate-pulse" />
                </div>
                <div className="flex items-start gap-2">
                  <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="h-10 w-56 rounded-2xl rounded-tl-xs bg-muted/80 animate-pulse" />
                </div>
                <div className="flex justify-end">
                  <div className="h-8 w-32 rounded-2xl rounded-br-xs bg-primary/20 animate-pulse" />
                </div>
              </div>
            )}
            {/* Friendly Conversation Header */}
            <div className="text-center py-6 space-y-2 border-b border-border/30 mb-4">
              {isVeterinarian ? (
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="group cursor-pointer inline-block focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 rounded-full"
                  title="Click to view profile info, registered pets & history"
                >
                  <Avatar className="size-20 rounded-full mx-auto border-2 border-primary/20 shadow-md overflow-hidden bg-card group-hover:border-primary/60 group-hover:scale-105 transition-all">
                    {contactAvatarUrl && (
                      <AvatarImage
                        src={contactAvatarUrl}
                        alt={contactName}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-lg">
                      {getTwoLetterInitials(contactName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              ) : (
                <div className="inline-block rounded-full">
                  <Avatar className="size-20 rounded-full mx-auto border-2 border-primary/20 shadow-md overflow-hidden bg-card">
                    {contactAvatarUrl && (
                      <AvatarImage
                        src={contactAvatarUrl}
                        alt={contactName}
                        className={activeDesk === "admin" ? "object-contain p-2.5 bg-white" : "object-cover"}
                      />
                    )}
                    <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-lg">
                      {activeDesk === "admin" ? <Building2 className="size-8" /> : <Stethoscope className="size-8" />}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
              <div>
                {isVeterinarian ? (
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="font-extrabold text-base text-foreground hover:text-primary transition-colors cursor-pointer group inline-flex items-center gap-1.5"
                    title="Click to view profile info, registered pets & history"
                  >
                    <span>{contactName}</span>
                    <Info className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ) : (
                  <h3 className="font-extrabold text-base text-foreground inline-flex items-center justify-center">
                    {contactName}
                  </h3>
                )}
                <p className="text-xs text-muted-foreground">{contactSubtitle}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {!isVeterinarian
                    ? activeDesk === "admin"
                      ? "Connected to Cagayan de Oro City Veterinary Office (CVO) Public Assistance & Administration Desk."
                      : "You're connected on City Veterinary Office Official Telemedicine Channel."
                    : `Official conversation record for registered pet owner ${contactName} • ${activeStatusLabel}.`}
                </p>
                {isVeterinarian && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsProfileOpen(true)}
                      className="h-7 px-3 text-xs gap-1.5 rounded-full border-border/60 hover:bg-muted/70 hover:text-primary cursor-pointer text-muted-foreground shadow-2xs"
                    >
                      <User className="size-3 text-primary" />
                      <span>View Profile & History</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Render Messages */}
            {activeChatMessages.map((msg, idx) => {
              const isAdmin = msg.senderRole === "Admin" || msg.senderRole === "Administrator" || msg.senderName?.includes("Admin");
              const isVet = msg.senderRole === "Veterinarian" || msg.senderRole === "Staff";
              const isStaffMessage = isVet || isAdmin;
              const isOutgoing = isVeterinarian ? isStaffMessage : !isStaffMessage;

              const prevMsg = idx > 0 ? activeChatMessages[idx - 1] : null;
              const nextMsg = idx < activeChatMessages.length - 1 ? activeChatMessages[idx + 1] : null;

              const prevIsStaff = prevMsg ? (prevMsg.senderRole !== "Pet Owner") : false;
              const prevIsOutgoing = prevMsg ? (isVeterinarian ? prevIsStaff : !prevIsStaff) : false;

              const nextIsStaff = nextMsg ? (nextMsg.senderRole !== "Pet Owner") : false;
              const nextIsOutgoing = nextMsg ? (isVeterinarian ? nextIsStaff : !nextIsStaff) : false;

              // Check day difference (compress unless it's a difference of a day of not chatting)
              const diffDayFromPrev = prevMsg ? isDifferentDay(prevMsg.createdAt, msg.createdAt) : false;
              const diffDayToNext = nextMsg ? isDifferentDay(msg.createdAt, nextMsg.createdAt) : false;

              const isPrevSame = prevMsg !== null && prevIsOutgoing === isOutgoing && !diffDayFromPrev;
              const isNextSame = nextMsg !== null && nextIsOutgoing === isOutgoing && !diffDayToNext;

              const isGroupStart = !isPrevSame;
              const isGroupEnd = !isNextSame;
              const isMiddle = isPrevSame && isNextSame;
              const isSingle = !isPrevSame && !isNextSame;
              const isLastReadOutgoing = msg.id === lastReadOutgoingId;

              const showDateDivider = idx === 0 || diffDayFromPrev;
              const hasPaw = (reactions[msg.id] || msg.reaction) === "🐾";
              const isLikeOnly = msg.text.trim() === "👍";
              const isEditing = editingMessageId === msg.id;

              const senderDisplayName = isAdmin
                ? "CVO Inquiry & Admin Desk"
                : isVet
                ? UNIFIED_VET_NAME
                : (msg.senderName || activeThread?.users?.full_name || "Pet Owner");

              // Dynamic bubble radii matching Facebook Messenger compressed styling
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
                  key={msg.id || idx}
                  id={`msg-${msg.id}`}
                  className={cn(
                    "rounded-xl transition-all duration-300",
                    isGroupStart ? (idx === 0 ? "mt-0" : "mt-3.5") : "mt-[2px]",
                    hasPaw && !isGroupEnd && "mb-1.5",
                    highlightedMessageId === msg.id && "bg-primary/10 ring-2 ring-primary/40 p-1"
                  )}
                >
                  {/* Date Separator Divider between days of chatting */}
                  {showDateDivider && (
                    <div className="flex items-center justify-center my-3.5 select-none animate-in fade-in-50">
                      <span className="text-[10.5px] font-semibold text-muted-foreground/80 bg-muted/60 dark:bg-muted/40 px-3 py-0.5 rounded-full border border-border/40 shadow-2xs">
                        {formatDateDivider(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex items-end gap-1.5 group animate-in fade-in-50 duration-150 relative",
                      isOutgoing ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Incoming Sender Avatar: Only appears on the last message of the group, matching Image 3 */}
                    {!isOutgoing && (
                      isGroupEnd ? (
                        <Avatar className="size-8 rounded-full shrink-0 mb-0.5 border border-border/40 overflow-hidden bg-card">
                          {isVeterinarian ? (
                            <>
                              {contactAvatarUrl && (
                                <AvatarImage src={contactAvatarUrl} alt={senderDisplayName} className="object-cover" />
                              )}
                              <AvatarFallback className="bg-muted text-foreground text-[10px] font-bold">
                                {getTwoLetterInitials(senderDisplayName)}
                              </AvatarFallback>
                            </>
                          ) : isAdmin ? (
                            <>
                              <AvatarImage src="/partners/cdo-seal.png" alt="CVO Admin Desk" className="object-contain p-0.5 bg-white" />
                              <AvatarFallback className="bg-teal-700 text-white font-bold text-[10px]">
                                <Building2 className="size-3.5" />
                              </AvatarFallback>
                            </>
                          ) : (
                            <>
                              <AvatarImage src="/dr-helen-tacandong.jpg" alt="Dr. Helen Ann P. Tacandong" className="object-cover" />
                              <AvatarFallback className="bg-emerald-600 text-white font-bold text-[10px]">
                                <Stethoscope className="size-3.5" />
                              </AvatarFallback>
                            </>
                          )}
                        </Avatar>
                      ) : (
                        <div className="size-8 shrink-0" aria-hidden="true" />
                      )
                    )}

                    {/* Facebook Messenger Style Hover Action Bar (On left of outgoing bubble) */}
                    {isOutgoing && !isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-muted-foreground self-center shrink-0 mb-1">
                        {!msg.isUnsent ? (
                          <>
                            {/* Reply Button */}
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              className="size-7 rounded-full hover:bg-muted/70 flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Reply"
                            >
                              <Reply className="size-3.5" />
                            </button>

                            {/* Edit Button */}
                            {!isLikeOnly && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(msg)}
                                className="size-7 rounded-full hover:bg-muted/70 flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                                title="Edit message"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                            )}

                            {/* Unsend Button */}
                            <button
                              type="button"
                              onClick={() => handleUnsendMessage(msg.id)}
                              className="size-7 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer text-muted-foreground"
                              title="Unsend message"
                            >
                              <Undo2 className="size-3.5" />
                            </button>
                          </>
                        ) : (
                          /* Remove For You Button on unsent tombstone */
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="size-7 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer text-muted-foreground"
                            title="Remove for you"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <div className={cn("max-w-[78%] sm:max-w-[70%] min-w-0 flex flex-col space-y-0.5", isOutgoing ? "items-end" : "items-start")}>
                      {/* Quoted Message / Reply Header (Matching Facebook Messenger Interface) */}
                      {msg.replyTo && (
                        <div className={cn("flex flex-col space-y-1 mb-1 max-w-full min-w-0", isOutgoing ? "items-end text-right" : "items-start text-left")}>
                          <div className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium px-1 max-w-full min-w-0", isOutgoing ? "flex-row-reverse" : "flex-row")}>
                            <Reply className={cn("size-3 text-muted-foreground/80 shrink-0", isOutgoing && "scale-x-[-1]")} />
                            <span className="truncate min-w-0">
                              <strong className="text-foreground/90 font-semibold">{isOutgoing ? "You" : getShortFirstName(senderDisplayName)}</strong>
                              {" replied to "}
                              <strong className="text-foreground/90 font-semibold">{getShortFirstName(msg.replyTo.senderName)}</strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => scrollToMessage(msg.replyTo?.id)}
                            className={cn(
                              "text-left text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer select-none max-w-full min-w-0",
                              isOutgoing ? "self-end" : "self-start",
                              "bg-muted/70 hover:bg-muted text-muted-foreground border-border/60 hover:border-primary/40",
                              "hover:shadow-2xs active:scale-[0.99]"
                            )}
                            title="Click to view replied message"
                          >
                            <span className="line-clamp-2 italic break-words [overflow-wrap:anywhere] [word-break:break-word]">
                              {msg.replyTo.text === "__UNSENT__" ? "Unsent message" : msg.replyTo.text}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Sender Name: Only rendered at the start of a group for incoming messages WITHOUT a reply header */}
                      {!isOutgoing && isGroupStart && !msg.replyTo && (
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground px-1 mb-0.5">
                          <span>{getShortFirstName(senderDisplayName)}</span>
                          {(isAdmin || isVet) && (
                            <span
                              className={cn(
                                "text-[9px] px-1.5 py-0 rounded font-semibold",
                                isAdmin
                                  ? "text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20"
                                  : "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                              )}
                            >
                              {isAdmin ? "Admin Desk" : "Veterinarian"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content: Rendered directly without inline textarea */}
                      {msg.isUnsent ? (
                        /* FB Messenger Style Unsent Pill */
                        <div
                          className={cn(
                            "py-1.5 px-3.5 text-xs italic rounded-2xl border border-dashed border-border/80 text-muted-foreground/80 select-none bg-muted/20 transition-all shadow-2xs",
                            isOutgoing ? "self-end text-right" : "self-start text-left"
                          )}
                        >
                          {isOutgoing
                            ? "You unsent a message"
                            : `${getShortFirstName(senderDisplayName)} unsent a message`}
                        </div>
                      ) : isLikeOnly ? (
                        /* Standalone FB Messenger style Thumbs Up - NO CONTAINER */
                        <div className={cn("py-1 px-0.5 flex items-center relative", isOutgoing ? "self-end" : "self-start")}>
                          <ThumbsUp className="size-9 sm:size-10 fill-primary text-primary transition-transform hover:scale-110 cursor-pointer drop-shadow-xs" />
                          {hasPaw && (
                            <button
                              type="button"
                              onClick={() => toggleReaction(msg.id)}
                              className={cn(
                                "absolute -bottom-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-card border border-border shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer",
                                isOutgoing ? "-left-1" : "-right-1"
                              )}
                              title="Remove paw reaction"
                            >
                              <PawPrint className="size-2.5 text-primary fill-primary" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Speech Bubble with dynamic Messenger radii */
                        <div className={cn("relative group/bubble inline-block max-w-full min-w-0", isOutgoing ? "self-end" : "self-start")}>
                          <div
                            className={cn(
                              "px-3.5 py-2 text-[13px] leading-relaxed shadow-2xs whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] transition-all",
                              bubbleRadiusClass,
                              isOutgoing
                                ? "bg-primary text-primary-foreground font-normal"
                                : "bg-muted/80 dark:bg-muted text-foreground"
                            )}
                          >
                            {msg.text}
                          </div>
                          {hasPaw && (
                            <button
                              type="button"
                              onClick={() => {
                                if (!isOutgoing) toggleReaction(msg.id);
                              }}
                              disabled={isOutgoing}
                              className={cn(
                                "absolute -bottom-2 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-card border border-border/80 shadow-xs transition-transform",
                                isOutgoing
                                  ? "left-2 cursor-default select-none pointer-events-none"
                                  : "right-2 hover:scale-110 active:scale-95 cursor-pointer"
                              )}
                              title={isOutgoing ? "Paw reaction" : "Remove paw reaction"}
                            >
                              <PawPrint className="size-2.5 text-primary fill-primary" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* "Edited" indicator: Displayed directly below this specific message if edited */}
                      {msg.isEdited && !msg.isUnsent && (
                        <div
                          className={cn(
                            "text-[10px] text-muted-foreground/75 px-1 mt-0.5 font-medium select-none",
                            isOutgoing ? "text-right self-end" : "text-left self-start"
                          )}
                        >
                          Edited
                        </div>
                      )}

                      {/* Timestamp & Delivery: Displayed on the last message of the group */}
                      {isGroupEnd && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] text-muted-foreground/70 px-1 mt-0.5",
                            isOutgoing ? "justify-end self-end" : "justify-start self-start"
                          )}
                        >
                          <span>{msg.timestamp}</span>

                          {/* Internal Staff Audit Pill: only visible to staff/veterinarians */}
                          {isVeterinarian && isStaffMessage && msg.actualSenderName && (
                            <span className="font-mono text-[9px] px-1 py-0 rounded bg-muted text-muted-foreground border border-border/50">
                              Audit: {msg.actualSenderName}
                            </span>
                          )}

                          {/* Seen Profile Avatar / Delivered Checkmark on Outgoing */}
                          {isOutgoing && !msg.isUnsent && (
                            isLastReadOutgoing ? (
                              <div
                                className="inline-flex items-center gap-1 animate-in fade-in zoom-in-75 duration-200 select-none group/seen"
                                title={`Seen by ${contactName}`}
                              >
                                <Avatar className="size-3.5 sm:size-4 rounded-full border border-background shadow-xs ring-1 ring-border/40 overflow-hidden bg-muted transition-transform hover:scale-125">
                                  {contactAvatarUrl ? (
                                    <AvatarImage
                                      src={contactAvatarUrl}
                                      alt={contactName}
                                      className={contactAvatarUrl.includes("cdo-seal") ? "object-contain p-0.5 bg-white" : "object-cover"}
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-[7px] font-bold bg-primary/20 text-primary uppercase">
                                    {getTwoLetterInitials(contactName)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            ) : (
                              <span title="Delivered" className="inline-flex items-center">
                                <CheckCheck className="size-3 text-muted-foreground/50" />
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {/* If read avatar lands on an intermediate outgoing message */}
                      {!isGroupEnd && isOutgoing && !msg.isUnsent && isLastReadOutgoing && (
                        <div className="flex justify-end px-1 mt-0.5 select-none animate-in fade-in zoom-in-75 duration-200">
                          <div
                            className="inline-flex items-center"
                            title={`Seen by ${contactName}`}
                          >
                            <Avatar className="size-3.5 sm:size-4 rounded-full border border-background shadow-xs ring-1 ring-border/40 overflow-hidden bg-muted transition-transform hover:scale-125">
                              {contactAvatarUrl ? (
                                <AvatarImage
                                  src={contactAvatarUrl}
                                  alt={contactName}
                                  className={contactAvatarUrl.includes("cdo-seal") ? "object-contain p-0.5 bg-white" : "object-cover"}
                                />
                              ) : null}
                              <AvatarFallback className="text-[7px] font-bold bg-primary/20 text-primary uppercase">
                                {getTwoLetterInitials(contactName)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Facebook Messenger Style Hover Action Bar (On right of incoming bubble) */}
                    {!isOutgoing && !isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-muted-foreground self-center shrink-0 mb-1">
                        {!msg.isUnsent ? (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleReaction(msg.id)}
                              className={cn(
                                "size-7 rounded-full hover:bg-muted/70 flex items-center justify-center transition-colors cursor-pointer",
                                hasPaw
                                  ? "text-primary bg-primary/10"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                              title={hasPaw ? "Remove paw reaction" : "React with paw"}
                            >
                              <PawPrint className={cn("size-3.5", hasPaw && "fill-primary")} />
                            </button>

                            {/* Reply Button */}
                            <button
                              type="button"
                              onClick={() => handleStartReply(msg)}
                              className="size-7 rounded-full hover:bg-muted/70 flex items-center justify-center transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                              title="Reply"
                            >
                              <Reply className="size-3.5" />
                            </button>
                          </>
                        ) : (
                          /* Direct Delete / Remove For You Button on unsent tombstone */
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="size-7 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors cursor-pointer text-muted-foreground"
                            title="Remove for you"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Messenger Typing Indicator (Scoped strictly to matching desk & conversation) */}
            {shouldShowTypingIndicator && (
              <div className="flex items-center gap-2 text-muted-foreground animate-in fade-in-50 duration-200 mt-3">
                <Avatar className="size-7 rounded-full shrink-0 border border-border/50 shadow-2xs overflow-hidden bg-card">
                  {resolvedTypingAvatar && (
                    <AvatarImage
                      src={resolvedTypingAvatar}
                      alt={resolvedTypingName}
                      className={
                        resolvedTypingAvatar.includes("cdo-seal")
                          ? "object-contain p-0.5 bg-white"
                          : "object-cover"
                      }
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-[10px] font-bold">
                    {resolvedTypingInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted/80 dark:bg-muted px-3.5 py-2.5 rounded-2xl rounded-bl-xs flex items-center gap-1 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-[11px] text-muted-foreground/80 italic font-medium">
                  {resolvedTypingName.includes("CVO")
                    ? "CVO Admin Desk is typing..."
                    : resolvedTypingName.includes("Tacandong")
                    ? "Dr. Helen is typing..."
                    : `${resolvedTypingName.split(" ")[0]} is typing...`}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Floating Jump to Latest Button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              className="absolute bottom-20 right-6 z-20 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-card/95 hover:bg-card border border-border/80 shadow-lg text-xs font-semibold text-foreground backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <ChevronDown className="size-3.5 text-primary group-hover:translate-y-0.5 transition-transform" />
              <span>Latest messages</span>
              {hasNewUnseen && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              )}
            </button>
          )}

          {/* Quick FAQ / Clinical Template Drawer (Collapsible) */}
          {showTemplates && (
            <div className="p-3 border-t border-border/50 bg-card/90 backdrop-blur-xs space-y-2 animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="size-3.5 text-primary" />
                  {isVeterinarian ? "Clinical Protocol Templates" : "Frequently Asked Questions"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowTemplates(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(isVeterinarian ? clinicalTemplates : quickQuestions).map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (isVeterinarian) {
                        setInputText(item);
                        inputRef.current?.focus();
                      } else {
                        handleSend(item);
                      }
                      setShowTemplates(false);
                    }}
                    className="px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-medium border border-border/60 transition-colors cursor-pointer text-left"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Active Edit Message Banner (Matching Facebook Messenger Screenshot) ── */}
          {editingMessageId && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-muted/70 dark:bg-muted/50 text-xs animate-in slide-in-from-bottom-2 duration-150">
              <span className="font-semibold text-foreground text-xs">Edit message</span>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Cancel edit"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* ── Active Reply Preview Bar ── */}
          {replyingTo && !editingMessageId && (
            <div className="px-4 py-2 bg-muted/70 dark:bg-muted/50 border-t border-border/60 flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Reply className="size-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">
                    Replying to <span className="text-primary font-bold">{getShortFirstName(replyingTo.senderName)}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
                    {replyingTo.text}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="size-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                title="Cancel reply"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          {/* ── Chat Bottom Input Bar (Clean with auto-expanding multiline word wrap) ── */}
          <footer className="p-2.5 sm:p-3 border-t border-border/60 bg-card/80 backdrop-blur-xs flex items-end gap-1.5 sm:gap-2 shrink-0">
            {/* Clinical Templates & FAQs */}
            <button
              type="button"
              onClick={() => setShowTemplates((prev) => !prev)}
              className={cn(
                "size-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 mb-0.5",
                showTemplates ? "bg-primary text-white" : "hover:bg-muted/70 text-primary"
              )}
              title="Clinical Templates & FAQs"
              aria-label="Clinical Templates & FAQs"
            >
              <Stethoscope className="size-4.5" />
            </button>

            {/* Rounded Pill / Expanding Capsule Input Bar */}
            <div className="flex-1 flex items-end rounded-2xl bg-muted/60 dark:bg-muted/40 px-3.5 py-1.5 border border-border/40 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all min-h-[40px] max-h-36">
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={(e) => {
                  const val = e.target.value;
                  setInputText(val);
                  if (inputRef.current) {
                    inputRef.current.style.height = "auto";
                    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
                  }
                  const isTypingNow = Boolean(val.trim());
                  const staffRole = activeDesk === "admin" ? "Admin" : "Veterinarian";
                  sendTypingStatus(
                    isTypingNow,
                    isVeterinarian ? staffRole : "Pet Owner",
                    {
                      desk: activeDesk,
                      chatId: activeChatId || activeThread?.id,
                      avatarUrl: isVeterinarian
                        ? activeDesk === "admin"
                          ? "/partners/cdo-seal.png"
                          : "/dr-helen-tacandong.jpg"
                        : user?.imageUrl || null,
                      senderName: isVeterinarian
                        ? activeDesk === "admin"
                          ? "CVO Inquiry & Admin Desk"
                          : UNIFIED_VET_NAME
                        : user?.fullName || "Pet Owner",
                      initials: isVeterinarian
                        ? activeDesk === "admin"
                          ? "AD"
                          : "HT"
                        : getTwoLetterInitials(user?.fullName || "Pet Owner"),
                    }
                  );
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  isVeterinarian
                    ? activeDesk === "admin"
                      ? "Reply as CVO Inquiry & Admin Desk..."
                      : "Reply as Dr. Helen Ann P. Tacandong (City Veterinarian)..."
                    : activeDesk === "admin"
                    ? "Message CVO Inquiry & Admin Desk..."
                    : "Message Dr. Helen Ann P. Tacandong (Telemedicine)..."
                }
                disabled={isLoading}
                className="w-full bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/70 resize-none max-h-32 min-h-[24px] leading-relaxed py-1 overflow-y-auto"
              />
              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => `${prev} 😊`);
                  inputRef.current?.focus();
                }}
                className="size-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 ml-1.5 mb-0.5"
                title="Emoji"
              >
                <Smile className={cn("size-4.5", editingMessageId ? "text-blue-500 fill-blue-500/20" : "text-muted-foreground")} />
              </button>
            </div>

            {/* Send Button, Save Edit Button, or Thumbs Up */}
            {editingMessageId ? (
              <button
                type="button"
                onClick={handleSaveEdit}
                className="size-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 mb-0.5"
                title="Save edit"
              >
                <Check className="size-4.5 stroke-[2.5]" />
              </button>
            ) : inputText.trim() ? (
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading}
                className="size-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all shadow-xs cursor-pointer shrink-0 mb-0.5"
                title={
                  isVeterinarian
                    ? activeDesk === "admin"
                      ? "Send as CVO Admin Desk"
                      : "Send as Dr. Helen"
                    : "Send Message"
                }
                aria-label="Send Message"
              >
                <Send className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSend("👍")}
                className="p-1.5 hover:scale-115 active:scale-95 text-primary transition-transform cursor-pointer shrink-0 flex items-center justify-center mb-0.5"
                title="Send Thumbs Up"
                aria-label="Send Thumbs Up"
              >
                <ThumbsUp className="size-6 fill-primary" />
              </button>
            )}
          </footer>
        </main>

        {/* ── 3. Optional Right Information Drawer (Messenger Details) ── */}
        {showInfoSidebar && (
          <aside className="w-72 border-l border-border/60 bg-card/90 backdrop-blur-xs p-4 flex flex-col space-y-4 overflow-y-auto animate-in slide-in-from-right duration-200 shrink-0">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="font-bold text-sm text-foreground">Chat Details</span>
              <button
                type="button"
                onClick={() => setShowInfoSidebar(false)}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2">
              <Avatar className="size-16 rounded-full mx-auto border-2 border-border/60 shadow-xs">
                {contactAvatarUrl && <AvatarImage src={contactAvatarUrl} alt={contactName} />}
                <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold text-lg">
                  {!isVeterinarian ? (
                    activeDesk === "admin" ? <Building2 className="size-7" /> : <Stethoscope className="size-7" />
                  ) : (
                    getTwoLetterInitials(contactName)
                  )}
                </AvatarFallback>
              </Avatar>
              <h4 className="font-bold text-sm text-foreground">{contactName}</h4>
              <p className="text-xs text-muted-foreground">{contactSubtitle}</p>
              <div className="pt-1 flex items-center justify-center">
                <span
                  className={cn(
                    "text-[10px] font-semibold inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border",
                    isCurrentActive
                      ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : "text-muted-foreground bg-muted border-border/50"
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      isCurrentActive ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"
                    )}
                  />
                  {activeStatusLabel}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5 border border-border/50">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" /> Central Clinic
                </p>
                <p className="text-[11px] text-muted-foreground">CVO Complex, J.V. Seriña St., Carmen, CDO</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5 border border-border/50">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" /> Clinic Hours
                </p>
                <p className="text-[11px] text-muted-foreground">Mon–Fri, 8:00 AM – 5:00 PM</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5 border border-border/50">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="size-3.5 text-amber-500" /> CVO Emergency Hotline
                </p>
                <p className="font-mono text-xs font-bold text-foreground">(088) 857-3180</p>
              </div>

              <button
                type="button"
                onClick={clearChat}
                className="w-full py-2 px-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-4"
              >
                <RotateCcw className="size-3.5" />
                <span>Clear Local Chat View</span>
              </button>
            </div>
          </aside>
        )}
        {/* Profile & History Drawer (Only for Veterinarians/Staff viewing Pet Owner profile) */}
        <ConversationProfileDrawer
          isOpen={isProfileOpen && isVeterinarian}
          onOpenChange={setIsProfileOpen}
          activeThread={activeThread}
          isVeterinarian={isVeterinarian}
          activeDesk={activeDesk}
          contactName={contactName}
          contactAvatarUrl={contactAvatarUrl}
          contactSubtitle={contactSubtitle}
          activeStatusLabel={activeStatusLabel}
          isCurrentActive={isCurrentActive}
        />
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full w-full flex items-center justify-center p-8 bg-background">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
