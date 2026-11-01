"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  Megaphone,
  Pin,
  Calendar,
  Syringe,
  AlertTriangle,
  ShieldAlert,
  Globe,
  MapPin,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Archive,
  QrCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateAnnouncementDialog } from "@/components/dashboard/create-announcement-dialog";
import { EditAnnouncementDialog } from "@/components/dashboard/edit-announcement-dialog";
import { DeleteAnnouncementDialog } from "@/components/dashboard/delete-announcement-dialog";
import { ScanQueueQrDialog } from "@/components/dashboard/scan-queue-qr-dialog";
import type { CVOAnnouncement, AnnouncementCategory } from "@/types/announcement";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { cn, getFieldOpGracePeriod } from "@/lib/utils";

import { useOptionalCVO } from "@/lib/cvo-context";
import type { CVOFieldOperation } from "@/data/cvo-store";

interface CVOSocialFeedProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  isStaff?: boolean;
  onSchedulePetClick?: () => void;
  onOpenChatWithNotice?: (noticeTitle: string) => void;
}

const DEFAULT_ANNOUNCEMENTS: CVOAnnouncement[] = [
  {
    id: "seed-1",
    title: "Free Barangay Anti-Rabies Vaccination Caravan",
    content:
      "The Cagayan de Oro City Veterinary Office (CVO) mobile vaccination team will be stationed at Barangay Carmen Covered Court and Barangay Nazareth this Saturday from 8:00 AM to 3:00 PM. Bring your companion animals and digital passports for complimentary immunization, deworming, and rabies protection.\n\n#SyncVet #RabiesFreeCDO #CityVeterinaryOffice",
    category: "Vaccination Drive",
    priority: "high",
    author_name: "Dr. Helen Ann P. Tacandong",
    author_role: "Veterinarian",
    target_barangay: "Brgy. Carmen & Nazareth",
    is_pinned: true,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
  },
  {
    id: "seed-2",
    title: "Daily Free Spay & Neuter (Kapon) Quotas Open",
    content:
      "Walk-in surgical quotas for canine and feline castrations/spays are open Monday through Friday at our main clinic in CVO Complex, J.V. Seriña St., Carmen. Fast your companion pets for 8 hours prior to surgical evaluation. 100% free of charge for CDO residents.\n\n#ResponsiblePetOwnership #KaponAngSolusyon",
    category: "Clinic Schedule",
    priority: "normal",
    author_name: "CVO Admin Desk",
    author_role: "Administrator",
    target_barangay: "All Cagayan de Oro",
    is_pinned: false,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(), // 18h ago
  },
  {
    id: "seed-3",
    title: "CVO Community Outreach Visit: Brgy. Lapasan",
    content:
      "Official veterinary outreach deployment to Barangay Lapasan. Services include free clinical consultations, anti-rabies vaccination, pet microchipping consultations, and vitamin administration for both dogs and cats.\n\n#BarangayOutreach #HealthyPetsCDO",
    category: "Clinic Schedule",
    priority: "urgent",
    author_name: "Neil Dime",
    author_role: "Administrator",
    target_barangay: "Brgy. Lapasan",
    is_pinned: true,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
  },
];

export function CVOSocialFeed({
  currentUserId,
  currentUserName,
  currentUserRole = "Pet Owner",
  isStaff = false,
  onSchedulePetClick,
  onOpenChatWithNotice,
}: CVOSocialFeedProps) {
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();
  const cvo = useOptionalCVO();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [announcementToEdit, setAnnouncementToEdit] = useState<CVOAnnouncement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<CVOAnnouncement | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch real users from Supabase to match profile pictures
  const { data: staffProfiles } = useQuery({
    queryKey: ["cvo-staff-profiles"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("id, full_name, avatar_url, role");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch real-time field operations from Supabase to match live status
  const { data: dbFieldOps } = useQuery({
    queryKey: ["cvo-feed-field-ops"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("field_operations")
          .select("*");
        return data || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 15,
  });

  const fieldOperations = useMemo(() => {
    if (cvo?.fieldOperations && cvo.fieldOperations.length > 0) {
      return cvo.fieldOperations;
    }
    return (dbFieldOps as CVOFieldOperation[]) || [];
  }, [cvo?.fieldOperations, dbFieldOps]);

  // Fetch announcements from Supabase (both active and archived)
  const { data: dbAnnouncements } = useQuery<CVOAnnouncement[]>({
    queryKey: ["cvo-announcements"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) return [];
        return (data as CVOAnnouncement[]) || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // Realtime subscription for announcements and field operations
  useEffect(() => {
    const channel = supabase
      .channel("cvo-fb-feed-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "field_operations" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo-feed-field-ops"] });
          queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Match announcement to corresponding field operation
  const getFieldOp = (item: CVOAnnouncement) => {
    // 1. Try matching [OP_ID:FO-xxxx] in content
    const opIdMatch = item.content.match(/\[OP_ID:(FO-[^\]]+)\]/i);
    if (opIdMatch && opIdMatch[1]) {
      const match = fieldOperations.find(
        (f: any) => (f.op_id || f.opId) === opIdMatch[1]
      );
      if (match) return match;
    }

    // 2. Match by barangay name in target_barangay or title
    const rawBarangay = (item.target_barangay || item.title || "")
      .replace(/CVO Outreach Visit:\s*/i, "")
      .replace(/^Brgy\.\s*/i, "")
      .replace(/^Barangay\s*/i, "")
      .trim()
      .toLowerCase();

    if (rawBarangay) {
      const match = fieldOperations.find((f: any) => {
        const b = (f.barangay || "").trim().toLowerCase();
        return b && (b.includes(rawBarangay) || rawBarangay.includes(b));
      });
      if (match) return match;
    }

    return null;
  };

// Helper to inspect expiry from content tag or field
function getAnnouncementExpiry(content?: string, expiresAt?: string | null): string | null {
  if (expiresAt) return expiresAt.slice(0, 10);
  if (!content) return null;
  const match = content.match(/\[EXPIRES:([^\]]+)\]/i);
  return match ? match[1].trim() : null;
}

function isAnnouncementExpired(content?: string, expiresAt?: string | null): boolean {
  const expiry = getAnnouncementExpiry(content, expiresAt);
  if (!expiry) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return expiry < todayStr;
}

function stripAnnouncementTags(text?: string): string {
  if (!text) return "";
  return text
    .replace(/\[(?:EVENT_DATE|OP_ID|EXPIRES|IMG):[^\]]+\]/gi, "")
    .trim();
}

  const announcements: CVOAnnouncement[] = useMemo(() => {
    if (dbAnnouncements && dbAnnouncements.length > 0) {
      return dbAnnouncements;
    }
    return DEFAULT_ANNOUNCEMENTS;
  }, [dbAnnouncements]);

  const categories = useMemo(() => {
    return ["All", "Vaccination Drive", "Clinic Schedule", "Public Health", "Urgent Advisory"];
  }, []);

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;

    // Filter out expired announcements so they are not shown to users
    list = list.filter((a) => !isAnnouncementExpired(a.content, a.expires_at));

    if (selectedCategory !== "All") {
      list = list.filter((a) => a.category === selectedCategory);
    }
    // Float pinned post to the very top (Featured), followed by newest created_at
    return [...list].sort((a, b) => {
      const aPinned = a.is_pinned ? 1 : 0;
      const bPinned = b.is_pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [announcements, selectedCategory]);

  const pinnedAnnouncement = useMemo(() => {
    return filteredAnnouncements.find((a) => a.is_pinned);
  }, [filteredAnnouncements]);

  // Helper to resolve profile picture
  const getAuthorAvatar = (authorName: string, authorId?: string | null, matchedOp?: any) => {
    // 1. If field operation has a vetProfile avatarUrl, use it directly
    if (matchedOp?.vetProfile?.avatarUrl) {
      return matchedOp.vetProfile.avatarUrl;
    }
    if (matchedOp?.notes && matchedOp.notes.includes("__CVO_FIELD_META__:")) {
      try {
        const metaPart = matchedOp.notes.split("__CVO_FIELD_META__:")[1];
        const parsed = JSON.parse(metaPart);
        if (parsed?.vetProfile?.avatarUrl) {
          return parsed.vetProfile.avatarUrl;
        }
      } catch {}
    }

    // 2. If authorId matches a user profile
    if (staffProfiles && authorId) {
      const match = staffProfiles.find((u) => u.id === authorId);
      if (match?.avatar_url) return match.avatar_url;
    }

    // 3. Match normalized name against staffProfiles (stripping prefixes and titles)
    if (staffProfiles && authorName) {
      const clean = authorName
        .replace(/^(Dr\.|Dra\.|Atty\.)\s*/i, "")
        .replace(/,\s*(DVM|MD|RN|DDS).*$/i, "")
        .trim()
        .toLowerCase();

      const matchByName = staffProfiles.find((u) => {
        if (!u.full_name) return false;
        const uClean = u.full_name
          .replace(/^(Dr\.|Dra\.|Atty\.)\s*/i, "")
          .replace(/,\s*(DVM|MD|RN|DDS).*$/i, "")
          .trim()
          .toLowerCase();
        return uClean === clean || clean.includes(uClean) || uClean.includes(clean);
      });
      if (matchByName?.avatar_url) return matchByName.avatar_url;
    }

    // 4. Default fallback for Dr. Helen
    if (authorName.toLowerCase().includes("helen") || authorName.toLowerCase().includes("tacandong")) {
      return "/dr-helen-tacandong.jpg";
    }

    return null;
  };



  // Relative time format like Facebook
  const formatFacebookTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "Just now";
      return formatDistanceToNow(date, { addSuffix: false });
    } catch {
      return "Just now";
    }
  };

  // Staff Pin toggle
  const handleTogglePin = async (item: CVOAnnouncement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStaff) return;
    const willPin = !item.is_pinned;

    try {
      if (willPin) {
        // Automatically unpin all other pinned announcements in Supabase
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("is_pinned", true);

        // Pin this item
        const { error } = await supabase
          .from("announcements")
          .update({ is_pinned: true })
          .eq("id", item.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("id", item.id);
        if (error) throw error;
      }

      // Optimistically update query cache immediately so UI switches instantly
      queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
        old.map((a) => ({
          ...a,
          is_pinned: willPin ? a.id === item.id : (a.id === item.id ? false : a.is_pinned),
        }))
      );

      toast.success(willPin ? `"${item.title}" is now pinned to the top!` : "Post unpinned");
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update pin");
    }
  };

  // Staff Delete
  const handleDelete = (item: CVOAnnouncement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStaff) return;
    setAnnouncementToDelete(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── Filter Pills (Facebook style navigation bar) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card text-muted-foreground border-border/70 hover:bg-muted/70 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* ── Facebook-Style Feed Stream ── */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-border/70 bg-card space-y-2">
            <Megaphone className="size-8 text-muted-foreground/40 mx-auto" />
            <h3 className="font-bold text-sm text-foreground">No posts in this feed</h3>
            <p className="text-xs text-muted-foreground">
              Check back soon for new public veterinary announcements.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((item) => {
            const isUrgent = item.priority === "urgent" || item.priority === "high";

            const matchedOp = getFieldOp(item);
            const avatarUrl = getAuthorAvatar(item.author_name, item.author_id, matchedOp);
            const isVeterinarian = item.author_role.toLowerCase().includes("vet");

            const grace = matchedOp ? getFieldOpGracePeriod(matchedOp.date, matchedOp.status) : null;
            const isGraceCompleted = grace?.isPastGracePeriod ?? false;
            const opStatus = (matchedOp?.status || "").toLowerCase();
            const isCompleted = opStatus === "completed" || isGraceCompleted;
            const isInProgress = (opStatus === "in-progress" || opStatus === "in progress") && !isGraceCompleted && !isCompleted;
            const isScheduled = opStatus === "scheduled" && !isGraceCompleted && !isCompleted;
            const isFieldVisit = Boolean(
              matchedOp ||
              (item.content && item.content.includes("[OP_ID:")) ||
              /outreach|caravan|field operation|field visit|mobile clinic/i.test(item.title)
            );

            // Format hashtags cleanly and strip any internal metadata tags
            const imageUrl = item.image_url || item.content.match(/\[IMG:(https?:\/\/[^\]]+)\]/i)?.[1];
            const contentLines = item.content.split("\n");
            const mainText = stripAnnouncementTags(
              contentLines.filter((l) => !l.startsWith("#")).join("\n")
            );
            const hashtagLine = contentLines.find((l) => l.startsWith("#"));

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-card shadow-xs transition-all duration-200 overflow-hidden",
                  isInProgress
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-500/[0.04] via-card to-card ring-1 ring-blue-500/20"
                    : item.is_pinned
                    ? "border-primary/40 ring-1 ring-primary/20 shadow-xs bg-gradient-to-b from-primary/[0.02] via-card to-card"
                    : "border-border/70"
                )}
              >
                {/* ── Facebook-Style Pinned Post Top Bar ── */}
                {item.is_pinned && (
                  <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
                      <Pin className="size-3.5 fill-primary text-primary rotate-45" />
                      <span>Pinned post</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/25 px-2.5 py-0.5 rounded-full"
                    >
                      Featured Announcement
                    </Badge>
                  </div>
                )}

                {/* ── 1. Facebook Post Header ── */}
                <div className="p-3 sm:p-4 pb-2 sm:pb-2.5 flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <Avatar className="size-9 sm:size-10.5 rounded-full border border-border/80 shadow-2xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={item.author_name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white font-bold text-xs">
                        {item.author_name
                          .replace(/^Dr\.\s*/i, "")
                          .trim()
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <span className="font-bold text-xs sm:text-sm text-foreground hover:underline cursor-pointer truncate max-w-[140px] xs:max-w-[190px] sm:max-w-none">
                          {item.author_name}
                        </span>

                        {/* Facebook-style Verified Blue Badge */}
                        <span
                          className="inline-flex items-center gap-0.5 text-[#1877F2] shrink-0"
                          title="Official Cagayan de Oro City Veterinary Office Verified"
                        >
                          <CheckCircle2 className="size-3.5 fill-[#1877F2] text-white" />
                        </span>

                        {/* ── Live Field Operation Status Badge ── */}
                        {isInProgress && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] px-2.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:border-blue-500/60 gap-1.5 font-bold rounded-full shadow-2xs transition-colors cursor-default"
                            title="Field outreach visit is currently in progress"
                          >
                            <Clock className="size-3 text-blue-600 dark:text-blue-400" />
                            <span>In Progress</span>
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] px-2.5 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 gap-1.5 font-bold rounded-full shadow-2xs transition-colors cursor-default"
                            title="Field outreach mission concluded"
                          >
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                            <span>Completed</span>
                          </Badge>
                        )}
                        {isScheduled && (
                          <Badge
                            variant="outline"
                            className="text-[9.5px] px-2.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 hover:border-amber-500/50 gap-1.5 font-bold rounded-full shadow-2xs transition-colors cursor-default"
                            title="Scheduled upcoming outreach"
                          >
                            <Calendar className="size-3 text-amber-600 dark:text-amber-400" />
                            <span>Scheduled</span>
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap leading-tight mt-0.5">
                        <span className="text-primary font-medium">
                          {isVeterinarian ? "City Veterinarian" : "CVO Administrator"}
                        </span>
                        <span>·</span>
                        <span>{formatFacebookTime(item.created_at)}</span>
                        <span>·</span>
                        <span title="Public bulletin" className="inline-flex items-center">
                          <Globe className="size-3 text-muted-foreground/80" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Header Actions (Only visible for CVO Staff to Pin, Edit, or Delete) */}
                  {isStaff && (
                    <div className="flex items-center gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                            title="Manage announcement"
                          >
                            <MoreHorizontal className="size-4.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl text-xs">
                          <DropdownMenuItem
                            onClick={(e) => handleTogglePin(item, e)}
                            className="cursor-pointer gap-2 py-2"
                          >
                            <Pin className="size-4 text-amber-500" />
                            <span>{item.is_pinned ? "Unpin Post" : "Pin to Top"}</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnnouncementToEdit(item);
                              setEditDialogOpen(true);
                            }}
                            className="cursor-pointer gap-2 py-2"
                          >
                            <Pencil className="size-4 text-muted-foreground" />
                            <span>Edit Post</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDelete(item, e)}
                            className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="size-4 text-destructive" />
                            <span>Delete Post</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>

                {/* ── 2. Post Text Content ── */}
                <div className="px-3.5 sm:px-4 pb-3 space-y-1.5">
                  <h4 className="text-sm sm:text-base font-extrabold text-foreground tracking-tight leading-snug">
                    {item.title}
                  </h4>

                  <p className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed whitespace-pre-line">
                    {mainText}
                  </p>

                  {hashtagLine && (
                    <p className="text-xs text-[#1877F2] dark:text-blue-400 font-medium pt-1">
                      {hashtagLine}
                    </p>
                  )}
                </div>

                {/* ── 3. Attached Poster Image ── */}
                {imageUrl && (
                  <div className="px-3.5 sm:px-4 pb-3.5">
                    <div className="rounded-2xl overflow-hidden border border-border/70 bg-black/[0.03] dark:bg-black/30 shadow-2xs flex items-center justify-center">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-auto max-h-[540px] object-contain rounded-2xl mx-auto"
                        loading="lazy"
                      />
                    </div>
                  </div>
                )}

                {/* ── 4. Rich Event Box (Only for Outreach & Field Visits) ── */}
                {isFieldVisit && (
                  <div className="p-2.5 sm:p-3.5 mx-2.5 sm:mx-3.5 my-2 sm:my-2.5 mb-2.5 sm:mb-3.5 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="size-10 sm:size-11 rounded-xl bg-card border border-border flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-2xs">
                        <span className="text-[8px] sm:text-[9px] uppercase font-bold text-rose-600 leading-none">CVO</span>
                        <span className="text-xs sm:text-sm font-extrabold text-foreground leading-tight mt-0.5">FIELD</span>
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="text-xs font-bold text-foreground truncate">
                            {item.title}
                          </p>
                          {isInProgress && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-2 py-0 h-4 bg-blue-500/15 hover:bg-blue-500/25 text-blue-700 dark:text-blue-300 border-blue-500/40 hover:border-blue-500/60 font-bold gap-1 rounded-md transition-colors cursor-default"
                            >
                              <Clock className="size-2.5 text-blue-600 dark:text-blue-400" />
                              <span>In Progress</span>
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-2 py-0 h-4 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50 font-bold gap-1 rounded-md transition-colors cursor-default"
                            >
                              <CheckCircle2 className="size-2.5 text-emerald-600" />
                              <span>Completed</span>
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                          {item.target_barangay} • 100% Free Municipal Outreach
                          {matchedOp && (
                            <span className="ml-1 font-semibold text-foreground/80">
                              • Status: {isInProgress ? "In Progress" : isCompleted ? "Completed" : "Scheduled"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {isCompleted ? (
                      <Button
                        size="sm"
                        disabled
                        className="h-7.5 sm:h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl bg-muted text-muted-foreground border border-border/70 shadow-2xs shrink-0 w-full sm:w-auto cursor-default"
                      >
                        <CheckCircle2 className="size-3 sm:size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Concluded</span>
                      </Button>
                    ) : (
                      <ScanQueueQrDialog
                        trigger={
                          <Button
                            size="sm"
                            className="h-7.5 sm:h-8 px-3 text-xs font-bold gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs shrink-0 cursor-pointer w-full sm:w-auto"
                          >
                            <QrCode className="size-3 sm:size-3.5" />
                            <span>Scan Attendance QR</span>
                          </Button>
                        }
                      />
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* Staff Edit Dialog */}
      {announcementToEdit && (
        <EditAnnouncementDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open);
            if (!open) setAnnouncementToEdit(null);
          }}
          announcement={announcementToEdit}
          onAnnouncementUpdated={() => queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] })}
        />
      )}

      {/* Staff Delete Dialog */}
      <DeleteAnnouncementDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setAnnouncementToDelete(null);
        }}
        announcement={announcementToDelete}
      />
    </div>
  );
}
