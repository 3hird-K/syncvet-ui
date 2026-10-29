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
import type { CVOAnnouncement, AnnouncementCategory } from "@/types/announcement";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

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

  // Fetch announcements from Supabase
  const { data: dbAnnouncements } = useQuery<CVOAnnouncement[]>({
    queryKey: ["cvo-announcements"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
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

  const announcements: CVOAnnouncement[] = useMemo(() => {
    if (dbAnnouncements && dbAnnouncements.length > 0) {
      return dbAnnouncements;
    }
    return DEFAULT_ANNOUNCEMENTS;
  }, [dbAnnouncements]);

  const pinnedAnnouncement = useMemo(() => {
    return announcements.find((a) => a.is_pinned);
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === "All") return announcements;
    return announcements.filter((a) => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  const categories = useMemo(() => {
    return ["All", "Vaccination Drive", "Clinic Schedule", "Public Health", "Urgent Advisory"];
  }, []);

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
    try {
      const willPin = !item.is_pinned;
      if (willPin && pinnedAnnouncement && pinnedAnnouncement.id !== item.id) {
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("id", pinnedAnnouncement.id);
      }
      const { error } = await supabase
        .from("announcements")
        .update({ is_pinned: willPin })
        .eq("id", item.id);

      if (error) throw error;
      toast.success(willPin ? "Pinned to top of feed" : "Post unpinned");
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update pin");
    }
  };

  // Staff Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isStaff) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Post removed from feed");
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post");
    }
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

            const opStatus = (matchedOp?.status || "").toLowerCase();
            const isInProgress = opStatus === "in-progress" || opStatus === "in progress";
            const isCompleted = opStatus === "completed";
            const isScheduled = opStatus === "scheduled";

            // Format hashtags cleanly
            const contentLines = item.content.split("\n");
            const mainText = contentLines.filter((l) => !l.startsWith("#")).join("\n").replace(/\[(?:EVENT_DATE|OP_ID):[^\]]+\]/g, "").trim();
            const hashtagLine = contentLines.find((l) => l.startsWith("#"));

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border bg-card shadow-xs transition-all duration-200 overflow-hidden",
                  isInProgress
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-500/[0.04] via-card to-card ring-1 ring-blue-500/20"
                    : item.is_pinned
                    ? "border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card"
                    : "border-border/70"
                )}
              >
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

                        {item.is_pinned && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 font-bold rounded-md"
                          >
                            <Pin className="size-2.5 fill-amber-500 text-amber-500" />
                            <span>Pinned</span>
                          </Badge>
                        )}

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
                            onClick={(e) => handleDelete(item.id, e)}
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

                {/* ── 4. Rich Event Box (if drive or outreach) ── */}
                {item.target_barangay && (
                  <div className="p-2.5 sm:p-3.5 mx-2.5 sm:mx-3.5 my-2 sm:my-2.5 mb-2.5 sm:mb-3.5 rounded-xl border border-border/80 bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="size-10 sm:size-11 rounded-xl bg-card border border-border flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-2xs">
                        <span className="text-[8px] sm:text-[9px] uppercase font-bold text-rose-600 leading-none">CVO</span>
                        <span className="text-xs sm:text-sm font-extrabold text-foreground leading-tight mt-0.5">FREE</span>
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
                          {item.target_barangay} • 100% Free Municipal Service
                          {matchedOp && (
                            <span className="ml-1 font-semibold text-foreground/80">
                              • Status: {isInProgress ? "In Progress" : isCompleted ? "Completed" : "Scheduled"}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {onSchedulePetClick && (
                      <Button
                        size="sm"
                        onClick={onSchedulePetClick}
                        className="h-7.5 sm:h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 cursor-pointer w-full sm:w-auto"
                      >
                        <Calendar className="size-3 sm:size-3.5" />
                        <span>Schedule</span>
                      </Button>
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
    </div>
  );
}
