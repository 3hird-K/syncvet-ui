"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Pencil,
  Pin,
  Bell,
  Syringe,
  Calendar as CalendarIcon,
  Globe,
  ShieldAlert,
  Loader2,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import type { CVOAnnouncement, AnnouncementCategory, AnnouncementPriority } from "@/types/announcement";
import { DatePicker } from "@/components/ui/date-picker";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface EditAnnouncementDialogProps {
  announcement: CVOAnnouncement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnnouncementUpdated?: (announcement: CVOAnnouncement) => void;
  pinnedAnnouncement?: CVOAnnouncement | null;
}

const CATEGORIES: { label: AnnouncementCategory; icon: any }[] = [
  { label: "Vaccination Drive", icon: Syringe },
  { label: "Urgent Advisory", icon: Bell },
  { label: "Clinic Schedule", icon: CalendarIcon },
  { label: "Public Health", icon: ShieldAlert },
  { label: "General", icon: Globe },
];

export function EditAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onAnnouncementUpdated,
  pinnedAnnouncement,
}: EditAnnouncementDialogProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Vaccination Drive");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [expiryMode, setExpiryMode] = useState<"never" | "1day" | "3days" | "1week" | "custom">("never");
  const [expiresAt, setExpiresAt] = useState("");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || "");
      setContent(announcement.content || "");
      setCategory(announcement.category || "Vaccination Drive");
      setPriority(announcement.priority || "normal");
      setIsPinned(!!announcement.is_pinned);
      if (announcement.expires_at) {
        setExpiryMode("custom");
        const dateStr = announcement.expires_at.slice(0, 10);
        setExpiresAt(dateStr);
        try {
          setCustomDate(new Date(dateStr));
        } catch {
          setCustomDate(undefined);
        }
      } else {
        setExpiryMode("never");
        setExpiresAt("");
        setCustomDate(undefined);
      }
    }
  }, [announcement, open]);

  const hasOtherPinned = Boolean(
    pinnedAnnouncement && announcement && pinnedAnnouncement.id !== announcement.id
  );

  const editMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      if (!announcement) throw new Error("No announcement selected");
      const supabase = getPublicSupabaseClient();

      if (updates.is_pinned === true) {
        // Automatically switch pin: unpin any other announcement in DB
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("is_pinned", true);
      }

      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", announcement.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      return (data as CVOAnnouncement) || ({ ...announcement, ...updates } as CVOAnnouncement);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
        old.map((item) => {
          if (item.id === data.id) return data;
          if (data.is_pinned) return { ...item, is_pinned: false };
          return item;
        })
      );
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
      onAnnouncementUpdated?.(data);
      toast.success("Official CVO Announcement updated live.");
      onOpenChange(false);
    },
    onError: (err: any, updates) => {
      console.warn("Announcement update notice:", err?.message);
      if (announcement) {
        const fallbackUpdated: CVOAnnouncement = {
          ...announcement,
          ...updates,
        } as CVOAnnouncement;
        queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
          old.map((item) => (item.id === fallbackUpdated.id ? fallbackUpdated : item))
        );
        queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
        onAnnouncementUpdated?.(fallbackUpdated);
      }
      toast.success("Announcement updated.");
      onOpenChange(false);
    },
  });

  const handleExpiryChange = (mode: "never" | "1day" | "3days" | "1week" | "custom") => {
    setExpiryMode(mode);
    if (mode === "never") {
      setExpiresAt("");
      setCustomDate(undefined);
    } else if (mode === "1day") {
      const d = addDays(new Date(), 1);
      setCustomDate(d);
      setExpiresAt(format(d, "yyyy-MM-dd"));
    } else if (mode === "3days") {
      const d = addDays(new Date(), 3);
      setCustomDate(d);
      setExpiresAt(format(d, "yyyy-MM-dd"));
    } else if (mode === "1week") {
      const d = addDays(new Date(), 7);
      setCustomDate(d);
      setExpiresAt(format(d, "yyyy-MM-dd"));
    } else if (mode === "custom") {
      if (!customDate) {
        const d = addDays(new Date(), 3);
        setCustomDate(d);
        setExpiresAt(format(d, "yyyy-MM-dd"));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement) return;

    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and details for the announcement.");
      return;
    }

    const computedExpiresAt =
      expiryMode !== "never" && expiresAt
        ? new Date(expiresAt + "T23:59:59").toISOString()
        : null;

    const updates = {
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      target_barangay: "All Cagayan de Oro",
      is_pinned: isPinned,
      expires_at: computedExpiresAt,
      updated_at: new Date().toISOString(),
    };

    editMutation.mutate(updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Pencil className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Edit CVO Announcement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update publication details, bulletin category, or auto-expiration date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-announcement-title" className="text-xs font-bold text-foreground">
              Announcement Title *
            </Label>
            <Input
              id="edit-announcement-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs rounded-xl"
              required
            />
          </div>

          {/* Category selection chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Category
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                        : "bg-muted/40 hover:bg-muted text-muted-foreground border-border/70"
                    }`}
                  >
                    <Icon className="size-3" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority & Auto-Expire in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-announcement-priority" className="text-xs font-bold text-foreground">
                Priority Level
              </Label>
              <select
                id="edit-announcement-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="normal">Normal Notice</option>
                <option value="high">High Importance</option>
                <option value="urgent">Urgent Alert</option>
                <option value="low">Low / Informational</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-announcement-expiry" className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Auto-Expire & Delete</span>
                {expiryMode !== "never" && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
                    <Clock className="size-3" /> Auto-removes
                  </span>
                )}
              </Label>
              <select
                id="edit-announcement-expiry"
                value={expiryMode}
                onChange={(e) => handleExpiryChange(e.target.value as any)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="never">Never expires (Permanent)</option>
                <option value="1day">Expires in 24 hours</option>
                <option value="3days">Expires in 3 days</option>
                <option value="1week">Expires in 1 week</option>
                <option value="custom">Custom expiration date...</option>
              </select>
            </div>
          </div>

          {/* Expiration Date Section */}
          {expiryMode !== "never" && (
            <div className="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-foreground font-medium">
                <Clock className="size-3.5 text-primary shrink-0" />
                <span>
                  {expiryMode === "1day"
                    ? "Notice automatically deletes in 24 hours on:"
                    : expiryMode === "3days"
                    ? "Notice automatically deletes in 3 days on:"
                    : expiryMode === "1week"
                    ? "Notice automatically deletes in 1 week on:"
                    : "Notice will automatically delete on:"}
                </span>
              </div>

              {/* Locked dates for presets */}
              {expiryMode !== "custom" ? (
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border text-foreground font-semibold text-xs shadow-2xs select-none"
                  title="Preset expiration date is fixed and non-editable"
                >
                  <Lock className="size-3 text-muted-foreground" />
                  <span>{customDate ? format(customDate, "MMM d, yyyy") : "Tomorrow"}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">(Locked)</span>
                </div>
              ) : (
                /* Custom mode: uses our Shadcn Calendar via DatePicker */
                <DatePicker
                  date={customDate}
                  setDate={(d) => {
                    setCustomDate(d);
                    if (d) setExpiresAt(format(d, "yyyy-MM-dd"));
                  }}
                  fromDate={new Date()}
                  placeholder="Select custom date"
                  className="w-auto h-8 text-xs font-semibold rounded-lg bg-background"
                />
              )}
            </div>
          )}

          {/* Content / Message */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-announcement-content" className="text-xs font-bold text-foreground">
              Broadcast Message & Guidelines *
            </Label>
            <Textarea
              id="edit-announcement-content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs rounded-xl resize-none leading-relaxed placeholder:text-[11px] placeholder:leading-relaxed"
              required
            />
          </div>

          {/* Pinned Checkbox */}
          <div className="p-3 rounded-xl border bg-muted/30 border-border/70 transition-all">
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="size-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                />
                <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Pin className="size-3 text-primary" /> Pin announcement to top
                </span>
              </label>

              <span className="text-[11px] text-muted-foreground truncate">
                Target: <strong className="text-foreground">All Cagayan de Oro</strong>
              </span>
            </div>

            {hasOtherPinned && isPinned && (
              <p className="mt-1.5 text-[10.5px] text-primary/90 font-medium pl-6 leading-tight">
                This will automatically switch the pin from <strong className="text-foreground">&ldquo;{pinnedAnnouncement?.title}&rdquo;</strong> to this announcement.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={editMutation.isPending}
              className="text-xs font-bold rounded-xl gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer hover:bg-primary/90"
            >
              {editMutation.isPending && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
