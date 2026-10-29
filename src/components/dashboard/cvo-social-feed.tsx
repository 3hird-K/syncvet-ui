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
  Heart,
  Share2,
  Bookmark,
  MessageSquare,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ThumbsUp,
  X,
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

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [savedPosts, setSavedPosts] = useState<Record<string, boolean>>({});
  const [hiddenPosts, setHiddenPosts] = useState<Record<string, boolean>>({});
  const [announcementToEdit, setAnnouncementToEdit] = useState<CVOAnnouncement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Initialize reactions from localStorage
  useEffect(() => {
    try {
      const storedLikes = localStorage.getItem("cvo-fb-likes");
      if (storedLikes) setLikedPosts(JSON.parse(storedLikes));

      const storedCounts = localStorage.getItem("cvo-fb-like-counts");
      if (storedCounts) setLikeCounts(JSON.parse(storedCounts));

      const storedSaves = localStorage.getItem("cvo-fb-saves");
      if (storedSaves) setSavedPosts(JSON.parse(storedSaves));
    } catch {
      // ignore
    }
  }, []);

  // Fetch real users from Supabase
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

  // Realtime subscription
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
    let list = announcements.filter((a) => !hiddenPosts[a.id]);
    if (selectedCategory === "All") return list;
    return list.filter((a) => a.category === selectedCategory);
  }, [announcements, selectedCategory, hiddenPosts]);

  const categories = useMemo(() => {
    return ["All", "Vaccination Drive", "Clinic Schedule", "Public Health", "Urgent Advisory"];
  }, []);

  // Helper to resolve avatar
  const getAuthorAvatar = (authorName: string, authorId?: string | null) => {
    if (staffProfiles) {
      if (authorId) {
        const match = staffProfiles.find((u) => u.id === authorId);
        if (match?.avatar_url) return match.avatar_url;
      }
      const matchByName = staffProfiles.find(
        (u) => u.full_name?.toLowerCase().trim() === authorName?.toLowerCase().trim()
      );
      if (matchByName?.avatar_url) return matchByName.avatar_url;
    }
    if (authorName.toLowerCase().includes("helen") || authorName.toLowerCase().includes("tacandong")) {
      return "/dr-helen-tacandong.jpg";
    }
    return null;
  };

  // Helper to map photos to post topics like Facebook
  const getPostImage = (item: CVOAnnouncement) => {
    if (item.category === "Vaccination Drive") {
      return "/gallery/real_cvo_carmen.jpg";
    }
    if (item.category === "Clinic Schedule" && item.title.toLowerCase().includes("spay")) {
      return "/gallery/clinic-care.jpg";
    }
    if (item.target_barangay?.includes("Lapasan") || item.title.toLowerCase().includes("lapasan")) {
      return "/gallery/real_cvo_balulang.jpg";
    }
    if (item.priority === "urgent" || item.category === "Urgent Advisory") {
      return "/gallery/barangay-drive.jpg";
    }
    return "/gallery/clean_cvo_dogday.jpg";
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

  // Toggle Like reaction
  const handleToggleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isLiked = !likedPosts[id];
    const baseCount = id === "seed-1" ? 42 : id === "seed-2" ? 28 : 53;
    const currentCount = likeCounts[id] ?? baseCount;
    const newCount = isLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    const newLiked = { ...likedPosts, [id]: isLiked };
    const newCounts = { ...likeCounts, [id]: newCount };

    setLikedPosts(newLiked);
    setLikeCounts(newCounts);

    try {
      localStorage.setItem("cvo-fb-likes", JSON.stringify(newLiked));
      localStorage.setItem("cvo-fb-like-counts", JSON.stringify(newCounts));
    } catch {
      // ignore
    }
  };

  // Share post
  const handleShare = (item: CVOAnnouncement, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `[Cagayan de Oro CVO Bulletin]\n${item.title}\n${item.content}\n\nShared via SyncVet CVO Portal`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      toast.success("Broadcast bulletin link copied to clipboard!");
    } else {
      toast.info("Notice ready to share");
    }
  };

  // Save post
  const handleToggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isSaved = !savedPosts[id];
    const newSaves = { ...savedPosts, [id]: isSaved };
    setSavedPosts(newSaves);
    try {
      localStorage.setItem("cvo-fb-saves", JSON.stringify(newSaves));
    } catch {
      // ignore
    }
    toast.success(isSaved ? "Saved to your bookmarks" : "Removed from bookmarks");
  };

  // Hide post from view
  const handleHidePost = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenPosts((prev) => ({ ...prev, [id]: true }));
    toast.info("Post hidden from your feed");
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
            const isLiked = !!likedPosts[item.id];
            const baseLike = item.id === "seed-1" ? 42 : item.id === "seed-2" ? 28 : 53;
            const likeCount = likeCounts[item.id] ?? baseLike;
            const isSaved = !!savedPosts[item.id];
            const isUrgent = item.priority === "urgent" || item.priority === "high";

            const avatarUrl = getAuthorAvatar(item.author_name, item.author_id);
            const postImage = getPostImage(item);
            const isVeterinarian = item.author_role.toLowerCase().includes("vet");

            // Format hashtags cleanly
            const contentLines = item.content.split("\n");
            const mainText = contentLines.filter((l) => !l.startsWith("#")).join("\n").replace(/\[(?:EVENT_DATE|OP_ID):[^\]]+\]/g, "").trim();
            const hashtagLine = contentLines.find((l) => l.startsWith("#"));

            return (
              <article
                key={item.id}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-200 overflow-hidden",
                  item.is_pinned && "border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card"
                )}
              >
                {/* ── 1. Facebook Post Header ── */}
                <div className="p-3.5 sm:p-4 pb-2.5 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="size-10 sm:size-10.5 rounded-full border border-border/80 shadow-2xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity">
                      {avatarUrl ? (
                        <AvatarImage src={avatarUrl} alt={item.author_name} className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white font-bold text-xs">
                        {item.author_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground hover:underline cursor-pointer truncate">
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

                  {/* Header Actions (3-dots & Close) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                          title="More options"
                        >
                          <MoreHorizontal className="size-4.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 rounded-xl text-xs">
                        <DropdownMenuItem
                          onClick={(e) => handleToggleSave(item.id, e)}
                          className="cursor-pointer gap-2 py-2"
                        >
                          <Bookmark className={cn("size-4", isSaved && "fill-primary text-primary")} />
                          <span>{isSaved ? "Remove from Saved" : "Save post"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={(e) => handleHidePost(item.id, e)}
                          className="cursor-pointer gap-2 py-2"
                        >
                          <X className="size-4" />
                          <span>Hide post</span>
                        </DropdownMenuItem>

                        {isStaff && (
                          <>
                            <DropdownMenuSeparator />
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
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(item.id, e)}
                              className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="size-4 text-destructive" />
                              <span>Delete Post</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleHidePost(item.id, e)}
                      className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                      title="Hide post"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
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

                {/* ── 3. Facebook Full-Width Media Image ── */}
                {postImage && (
                  <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] bg-muted overflow-hidden cursor-pointer group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={postImage}
                      alt={item.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-102"
                      loading="lazy"
                    />

                    {/* Target Barangay Pill Overlay */}
                    {item.target_barangay && (
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold shadow-md">
                        <MapPin className="size-3.5 text-primary shrink-0" />
                        <span>{item.target_barangay}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 4. Rich Event Box (if drive or outreach) ── */}
                {item.target_barangay && (
                  <div className="p-3.5 mx-3.5 my-2.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 rounded-xl bg-card border border-border flex flex-col items-center justify-center font-bold text-center shrink-0 shadow-2xs">
                        <span className="text-[9px] uppercase font-bold text-rose-600 leading-none">CVO</span>
                        <span className="text-sm font-extrabold text-foreground leading-tight mt-0.5">FREE</span>
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {item.target_barangay} • 100% Free Municipal Service
                        </p>
                      </div>
                    </div>

                    {onSchedulePetClick && (
                      <Button
                        size="sm"
                        onClick={onSchedulePetClick}
                        className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs shrink-0 cursor-pointer"
                      >
                        <Calendar className="size-3.5" />
                        <span>Schedule</span>
                      </Button>
                    )}
                  </div>
                )}

                {/* ── 5. Facebook Reaction Counts Bar ── */}
                <div className="px-3.5 sm:px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b border-border/40">
                  <div className="flex items-center gap-1.5">
                    {/* Overlapping Like & Love circles */}
                    <div className="flex items-center -space-x-1">
                      <div className="size-5 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-2xs ring-1 ring-card">
                        <ThumbsUp className="size-2.5 fill-white" />
                      </div>
                      <div className="size-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xs ring-1 ring-card">
                        <Heart className="size-2.5 fill-white" />
                      </div>
                    </div>
                    <span className="font-medium text-[11px] text-foreground/80">{likeCount}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onOpenChatWithNotice?.(item.title)}
                      className="hover:underline cursor-pointer"
                    >
                      {item.id === "seed-1" ? "14 citizen inquiries" : "8 inquiries"}
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={(e) => handleShare(item, e)}
                      className="hover:underline cursor-pointer"
                    >
                      {item.id === "seed-1" ? "21 shares" : "12 shares"}
                    </button>
                  </div>
                </div>

                {/* ── 6. Facebook 3-Button Action Bar (Like, Comment/Ask, Share) ── */}
                <div className="px-2 py-1 grid grid-cols-3 gap-1">
                  {/* Like Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleLike(item.id, e)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 cursor-pointer",
                      isLiked
                        ? "text-[#1877F2] font-bold bg-[#1877F2]/10"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <ThumbsUp
                      className={cn(
                        "size-4 transition-transform",
                        isLiked ? "fill-[#1877F2] scale-110" : ""
                      )}
                    />
                    <span>Like</span>
                  </button>

                  {/* Comment / Ask City Vet Button */}
                  <button
                    type="button"
                    onClick={() => onOpenChatWithNotice?.(item.title)}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors duration-150 cursor-pointer"
                  >
                    <MessageSquare className="size-4" />
                    <span>Inquire</span>
                  </button>

                  {/* Share Button */}
                  <button
                    type="button"
                    onClick={(e) => handleShare(item, e)}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors duration-150 cursor-pointer"
                  >
                    <Share2 className="size-4" />
                    <span>Share</span>
                  </button>
                </div>
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
