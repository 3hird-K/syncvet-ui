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
  ChevronDown,
  ChevronUp,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatDistanceToNow } from "date-fns";

interface CVOAnnouncementsCardProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  isStaff?: boolean;
}

const DEFAULT_ANNOUNCEMENTS: CVOAnnouncement[] = [
  {
    id: "seed-1",
    title: "Free Barangay Anti-Rabies Vaccination Caravan",
    content:
      "The Cagayan de Oro City Veterinary Office (CVO) mobile vaccination team will be stationed at Barangay Carmen Covered Court and Barangay Nazareth this Saturday from 8:00 AM to 3:00 PM. Bring your companion animals and digital passports for complimentary immunization and deworming.",
    category: "Vaccination Drive",
    priority: "high",
    author_name: "Dr. Helen Ann P. Tacandong",
    author_role: "Veterinarian",
    target_barangay: "Brgy. Carmen & Nazareth",
    is_pinned: true,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2h ago
  },
  {
    id: "seed-2",
    title: "Daily Free Spay & Neuter (Kapon) Quotas Open",
    content:
      "Walk-in surgical quotas for canine and feline castrations/spays are open Monday through Friday at our main clinic in CVO Complex, J.V. Seriña St., Carmen. Please fast your pets from solid food for 8 hours prior to surgical evaluation.",
    category: "Clinic Schedule",
    priority: "normal",
    author_name: "CVO Admin Desk",
    author_role: "Administrator",
    target_barangay: "All Cagayan de Oro",
    is_pinned: false,
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

export function CVOAnnouncementsCard({
  currentUserId,
  currentUserName,
  currentUserRole = "Pet Owner",
  isStaff = false,
}: CVOAnnouncementsCardProps) {
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();
  const [localList, setLocalList] = useState<CVOAnnouncement[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [announcementToEdit, setAnnouncementToEdit] = useState<CVOAnnouncement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch announcements from Supabase
  const { data: dbAnnouncements, isLoading } = useQuery<CVOAnnouncement[]>({
    queryKey: ["cvo-announcements"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          // If table doesn't exist yet, return empty array so fallback is used gracefully
          return [];
        }
        return (data as CVOAnnouncement[]) || [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // Realtime subscription on announcements table
  useEffect(() => {
    const channel = supabase
      .channel("cvo-announcements-realtime")
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

  // Auto-delete expired announcements from database
  useEffect(() => {
    if (!dbAnnouncements || dbAnnouncements.length === 0) return;
    const now = Date.now();
    const expired = dbAnnouncements.filter((a) => {
      if (a.expires_at) {
        try {
          const exp = new Date(a.expires_at);
          if (a.expires_at.length === 10) exp.setHours(23, 59, 59, 999);
          if (exp.getTime() <= now) return true;
        } catch {}
      }
      if (a.content) {
        const match = a.content.match(/\[EVENT_DATE:(\d{4}-\d{2}-\d{2})\]/);
        if (match) {
          try {
            const exp = new Date(match[1]);
            exp.setHours(23, 59, 59, 999);
            if (exp.getTime() <= now) return true;
          } catch {}
        }
      }
      return false;
    });

    if (expired.length > 0) {
      expired.forEach(async (item) => {
        try {
          await supabase.from("announcements").delete().eq("id", item.id);
        } catch {
          // ignore
        }
      });
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    }
  }, [dbAnnouncements, supabase, queryClient]);

  // Combine DB announcements + local created announcements (if any) or fallback, filtering out expired ones
  const announcements = useMemo(() => {
    const combined: CVOAnnouncement[] = [];
    const seenIds = new Set<string>();
    const now = Date.now();

    const isExpired = (item: CVOAnnouncement) => {
      if (item.expires_at) {
        try {
          const exp = new Date(item.expires_at);
          if (item.expires_at.length === 10) exp.setHours(23, 59, 59, 999);
          if (exp.getTime() <= now) return true;
        } catch {}
      }
      if (item.content) {
        const match = item.content.match(/\[EVENT_DATE:(\d{4}-\d{2}-\d{2})\]/);
        if (match) {
          try {
            const exp = new Date(match[1]);
            exp.setHours(23, 59, 59, 999);
            if (exp.getTime() <= now) return true;
          } catch {}
        }
      }
      return false;
    };

    // 1. Add locally published in this session
    for (const item of localList) {
      if (!seenIds.has(item.id) && !isExpired(item)) {
        seenIds.add(item.id);
        combined.push(item);
      }
    }

    // 2. Add from Supabase DB
    if (dbAnnouncements && dbAnnouncements.length > 0) {
      for (const item of dbAnnouncements) {
        if (!seenIds.has(item.id) && !isExpired(item)) {
          seenIds.add(item.id);
          combined.push(item);
        }
      }
    } else if (localList.length === 0) {
      // 3. Fallback seeds if database is still fresh/unmigrated
      return DEFAULT_ANNOUNCEMENTS.filter((item) => !isExpired(item));
    }

    // Sort pinned first, then created_at desc
    return combined.sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [dbAnnouncements, localList]);

  // Track the currently pinned announcement across the bulletin
  const pinnedAnnouncement = useMemo(() => {
    return announcements.find((a) => a.is_pinned) || null;
  }, [announcements]);

  const handleCreated = (item: CVOAnnouncement) => {
    setLocalList((prev) => [item, ...prev]);
    queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
  };

  const handleUpdated = (updated: CVOAnnouncement) => {
    setLocalList((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await supabase.from("announcements").delete().eq("id", id);
      setLocalList((prev) => prev.filter((a) => a.id !== id));
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
      toast.success("Announcement removed.");
    } catch {
      setLocalList((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement removed.");
    }
  };

  const handleTogglePin = async (item: CVOAnnouncement, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const willPin = !item.is_pinned;

    try {
      if (willPin) {
        // Automatically switch pin: unpin any other existing pinned announcement in DB
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("is_pinned", true);

        // Pin this announcement
        await supabase
          .from("announcements")
          .update({ is_pinned: true })
          .eq("id", item.id);

        // Update local query cache immediately
        queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
          old.map((a) => ({
            ...a,
            is_pinned: a.id === item.id,
          }))
        );
        setLocalList((prev) =>
          prev.map((a) => ({
            ...a,
            is_pinned: a.id === item.id,
          }))
        );

        toast.success(`"${item.title}" is now pinned to the top!`);
      } else {
        // Unpin this announcement
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("id", item.id);

        queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
          old.map((a) => (a.id === item.id ? { ...a, is_pinned: false } : a))
        );
        setLocalList((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_pinned: false } : a))
        );

        toast.success("Announcement unpinned.");
      }

      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error("Failed to update pin status", { description: err?.message });
    }
  };

  const getCategoryBadge = (cat: AnnouncementCategory) => {
    switch (cat) {
      case "Vaccination Drive":
        return {
          icon: Syringe,
          className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        };
      case "Urgent Advisory":
        return {
          icon: AlertTriangle,
          className: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
        };
      case "Clinic Schedule":
        return {
          icon: Calendar,
          className: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
        };
      case "Public Health":
        return {
          icon: ShieldAlert,
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
        };
      default:
        return {
          icon: Globe,
          className: "bg-primary/10 text-primary border-primary/20",
        };
    }
  };

  const formatTime = (isoString: string) => {
    try {
      return formatDistanceToNow(new Date(isoString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <Card className="rounded-2xl border border-border/80 bg-card shadow-2xs overflow-hidden flex flex-col">
      <CardHeader className="p-3.5 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-8 sm:size-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
              <Megaphone className="size-4 sm:size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CardTitle className="text-xs sm:text-sm md:text-base font-bold text-foreground leading-tight">
                  CVO Announcements
                </CardTitle>
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Live Broadcast Feed" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-snug">
                Official notices & vaccination bulletins
              </p>
            </div>
          </div>

          {/* If user is staff (Admin or Veterinarian), show Post Notice button */}
          {isStaff && (
            <div className="shrink-0">
              <CreateAnnouncementDialog
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserRole={currentUserRole}
                onAnnouncementCreated={handleCreated}
                pinnedAnnouncement={pinnedAnnouncement}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3 max-h-[460px] overflow-y-auto">
        {announcements.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
            <Megaphone className="size-6 text-muted-foreground/50 mx-auto" />
            <p className="font-semibold text-foreground">No active announcements</p>
            <p className="text-[11px]">All CVO field updates will appear here.</p>
          </div>
        ) : (
          announcements.map((item) => {
            const badge = getCategoryBadge(item.category);
            const Icon = badge.icon;
            const isExpanded = expandedId === item.id;
            const isUrgent = item.priority === "urgent" || item.priority === "high";

            return (
              <div
                key={item.id}
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  item.is_pinned
                    ? "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                    : "bg-card hover:bg-muted/30 border-border/70 hover:border-border"
                } ${isUrgent && !item.is_pinned ? "border-l-4 border-l-red-500" : ""}`}
              >
                {/* Meta Row: Badges + Timestamp + Pin */}
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 font-bold gap-1 rounded-md ${badge.className}`}
                    >
                      <Icon className="size-2.5" />
                      <span>{item.category}</span>
                    </Badge>

                    {item.is_pinned && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30 gap-1 font-bold"
                      >
                        <Pin className="size-2.5" />
                        <span>Pinned</span>
                      </Badge>
                    )}

                    {isUrgent && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 uppercase font-extrabold tracking-wider border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-300"
                      >
                        Urgent
                      </Badge>
                    )}

                    {item.expires_at && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 font-medium"
                      >
                        <Clock className="size-2.5 text-amber-500" />
                        <span>Expires {new Date(item.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </Badge>
                    )}
                  </div>

                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {formatTime(item.created_at)}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                  {item.title}
                </h4>

                {/* Content */}
                <p
                  className={`text-xs text-muted-foreground mt-1.5 leading-relaxed ${
                    isExpanded ? "whitespace-pre-line" : "line-clamp-2"
                  }`}
                >
                  {item.content.replace(/\[(?:EVENT_DATE|OP_ID):[^\]]+\]/g, "").trim()}
                </p>

                {/* Footer Strip: Target Area + Author Tag */}
                <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="size-3 text-primary shrink-0" />
                    <span className="truncate">
                      {item.author_name}
                      <span className="text-muted-foreground/60 ml-1">({item.author_role})</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.target_barangay && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                        <MapPin className="size-2.5 text-primary" />
                        {item.target_barangay}
                      </span>
                    )}

                    {/* Staff 3-dots actions menu */}
                    {isStaff && (
                      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md cursor-pointer transition-colors"
                              title="More actions (pin, edit, delete)"
                            >
                              <MoreVertical className="size-3.5" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs shadow-md rounded-xl p-1 bg-popover">
                            <DropdownMenuItem
                              onClick={(e) => handleTogglePin(item, e)}
                              className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
                            >
                              <Pin className={`size-3.5 ${item.is_pinned ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                              <span>{item.is_pinned ? "Unpin Announcement" : "Pin to Top"}</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setAnnouncementToEdit(item);
                                setEditDialogOpen(true);
                              }}
                              className="cursor-pointer gap-2 py-1.5 text-xs font-medium"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                              <span>Update / Edit</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1" />

                            <DropdownMenuItem
                              onClick={(e) => handleDelete(item.id, e)}
                              className="cursor-pointer gap-2 py-1.5 text-xs font-medium text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Delete Announcement</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Edit Announcement Modal */}
      <EditAnnouncementDialog
        announcement={announcementToEdit}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onAnnouncementUpdated={handleUpdated}
        pinnedAnnouncement={pinnedAnnouncement}
      />
    </Card>
  );
}
