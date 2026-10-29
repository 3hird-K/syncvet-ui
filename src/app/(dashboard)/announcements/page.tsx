"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
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
  Clock,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Plus,
  MoreHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
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
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
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
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
];

export default function AnnouncementsManagementPage() {
  const { user } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [announcementToEdit, setAnnouncementToEdit] = useState<CVOAnnouncement | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Fetch current user details
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("role, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";
  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (isAdminEmail ? "Administrator" : "Veterinarian")
  );
  const authorName = dbUser?.full_name || user?.fullName || "City Veterinary Staff";

  // Fetch announcements
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
      .channel("announcements-page-realtime")
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
    return announcements.find((a) => a.is_pinned) || null;
  }, [announcements]);

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === "All") return announcements;
    return announcements.filter((a) => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  const categories = useMemo(() => {
    return ["All", "Vaccination Drive", "Clinic Schedule", "Public Health", "Urgent Advisory"];
  }, []);

  const handleTogglePin = async (item: CVOAnnouncement) => {
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
      toast.success(willPin ? `Pinned "${item.title}" to top of citizen feed` : "Post unpinned");
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update pin");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this announcement from citizen feeds?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("Announcement deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete post");
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (!isValid(date)) return "Recently";
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "Recently";
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
          className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-2xs">
              <Megaphone className="size-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              Public Bulletins & Announcements
            </h1>
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse ml-1" title="Realtime Citizen Sync Active" />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Compose and broadcast official veterinary notices, anti-rabies vaccination drives, and clinic advisories directly to CDO pet owners.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <CreateAnnouncementDialog
            currentUserId={user?.id}
            currentUserName={authorName}
            currentUserRole={userRole}
            pinnedAnnouncement={pinnedAnnouncement}
            trigger={
              <Button className="h-10 px-4 text-xs font-bold gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer">
                <Plus className="size-4" />
                <span>Post Notice</span>
              </Button>
            }
          />
        </div>
      </div>

      {/* ── Quick Composer Action Bar ── */}
      <Card className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-11 rounded-full border border-border shadow-2xs shrink-0">
              <AvatarImage src={dbUser?.avatar_url || user?.imageUrl || undefined} alt={authorName} />
              <AvatarFallback className="bg-primary/15 text-primary font-bold text-sm">
                {authorName.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold text-foreground">
                Broadcast an official notice to CDO citizens
              </p>
              <p className="text-xs text-muted-foreground">
                Notices publish live into citizen feeds and mobile views immediately without images.
              </p>
            </div>
          </div>

          <CreateAnnouncementDialog
            currentUserId={user?.id}
            currentUserName={authorName}
            currentUserRole={userRole}
            pinnedAnnouncement={pinnedAnnouncement}
            trigger={
              <button
                type="button"
                className="w-full sm:w-auto h-10 px-4 rounded-xl border border-border/80 bg-background/80 hover:bg-background text-xs font-semibold text-muted-foreground hover:text-foreground text-left flex items-center justify-between gap-3 cursor-pointer shadow-2xs transition-colors"
              >
                <span>What advisory would you like to broadcast today?</span>
                <Megaphone className="size-4 text-primary shrink-0" />
              </button>
            }
          />
        </div>
      </Card>

      {/* ── Filter Pills Bar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

        <span className="text-xs text-muted-foreground font-medium">
          Showing <strong className="text-foreground">{filteredAnnouncements.length}</strong> active broadcast{filteredAnnouncements.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* ── Main Content Grid: Live Feed (8 cols) + Citizen View Sync Preview (4 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Announcements List */}
        <div className="lg:col-span-8 space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
              <Megaphone className="size-10 text-muted-foreground/40 mx-auto" />
              <h3 className="font-bold text-base text-foreground">No announcements in this category</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Click &ldquo;Post Notice&rdquo; above to publish official vaccination drives or health advisories to CDO citizens.
              </p>
            </Card>
          ) : (
            filteredAnnouncements.map((item) => {
              const badge = getCategoryBadge(item.category);
              const Icon = badge.icon;
              const isUrgent = item.priority === "urgent" || item.priority === "high";

              const contentLines = item.content.split("\n");
              const mainText = contentLines
                .filter((l) => !l.startsWith("#"))
                .join("\n")
                .replace(/\[(?:EVENT_DATE|OP_ID):[^\]]+\]/g, "")
                .trim();
              const hashtagLine = contentLines.find((l) => l.startsWith("#"));

              return (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 space-y-3.5",
                    item.is_pinned && "border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card shadow-sm"
                  )}
                >
                  {/* Row 1: Badges & Management Controls */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 font-bold gap-1 rounded-md", badge.className)}>
                        <Icon className="size-3" />
                        <span>{item.category}</span>
                      </Badge>

                      {item.is_pinned && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30 gap-1 font-bold rounded-md"
                        >
                          <Pin className="size-2.5 fill-amber-500 text-amber-500" />
                          <span>Pinned to Top</span>
                        </Badge>
                      )}

                      {isUrgent && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-2 py-0.5 uppercase font-extrabold tracking-wider border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 rounded-md"
                        >
                          Urgent
                        </Badge>
                      )}

                      {item.expires_at && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1 font-medium rounded-md"
                        >
                          <Clock className="size-2.5 text-amber-500" />
                          <span>Expires {new Date(item.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </Badge>
                      )}
                    </div>

                    {/* Staff Actions Dropdown (3 dots) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer shrink-0"
                          title="More options"
                        >
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 rounded-xl text-xs shadow-md p-1">
                        <DropdownMenuItem
                          onClick={() => handleTogglePin(item)}
                          className="cursor-pointer gap-2 py-2 text-xs font-medium"
                        >
                          <Pin className={cn("size-3.5", item.is_pinned ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                          <span>{item.is_pinned ? "Unpin Post" : "Pin to Top"}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setAnnouncementToEdit(item);
                            setEditDialogOpen(true);
                          }}
                          className="cursor-pointer gap-2 py-2 text-xs font-medium"
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                          <span>Edit Notice</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1" />

                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="cursor-pointer gap-2 py-2 text-xs font-medium text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                        >
                          <Trash2 className="size-3.5 text-rose-600" />
                          <span>Delete Notice</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Title & Body Text */}
                  <div className="space-y-1.5">
                    <h3 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                      {mainText}
                    </p>

                    {hashtagLine && (
                      <p className="text-xs text-primary font-medium pt-1">
                        {hashtagLine}
                      </p>
                    )}
                  </div>

                  {/* Rich Event Banner if target barangay */}
                  {item.target_barangay && (
                    <div className="p-3 rounded-xl border border-border/80 bg-muted/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-9 rounded-lg bg-card border border-border flex flex-col items-center justify-center font-bold text-center shrink-0">
                          <span className="text-[8px] uppercase font-bold text-rose-600 leading-none">CVO</span>
                          <span className="text-xs font-extrabold text-foreground leading-tight mt-0.5">FREE</span>
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {item.target_barangay} • 100% Free Municipal Service
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        Citizen Caravan
                      </span>
                    </div>
                  )}

                  {/* Footer Meta Row: Author, Barangay, and Published Time */}
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2 text-xs text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-foreground truncate">{item.author_name}</span>
                      <span>•</span>
                      <span className="text-primary font-medium">{item.author_role}</span>
                      {item.target_barangay && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-muted-foreground truncate">
                            <MapPin className="size-3 text-primary shrink-0" />
                            {item.target_barangay}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground/80 shrink-0">
                      <Clock className="size-3" />
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Column: Broadcast Guidelines */}
        <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-4">

          {/* Card 2: Publishing Policy Notice */}
          <Card className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
              Official Publishing Rules
            </h4>

            <div className="space-y-2.5 text-xs text-foreground/90">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>No Media Images:</strong> Bulletins focus strictly on clear, authoritative text directives to maintain fast mobile delivery.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Target Barangay:</strong> Always specify the host barangay covered court for outreach caravans.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Fasting Directives:</strong> Spay/Neuter advisories should remind pet owners of the 8-hour pre-operative fasting.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                <p>
                  <strong>Auto-Expiry:</strong> Set dates for time-sensitive vaccine caravans so they cleanly archive after the event date.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Announcement Dialog */}
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
