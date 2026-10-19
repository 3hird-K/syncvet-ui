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
  AlertTriangle,
  Syringe,
  Calendar,
  Sparkles,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import type { CVOAnnouncement, AnnouncementCategory, AnnouncementPriority } from "@/types/announcement";

interface EditAnnouncementDialogProps {
  announcement: CVOAnnouncement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnnouncementUpdated?: (announcement: CVOAnnouncement) => void;
}

const CATEGORIES: { label: AnnouncementCategory; icon: any }[] = [
  { label: "Vaccination Drive", icon: Syringe },
  { label: "Urgent Advisory", icon: AlertTriangle },
  { label: "Clinic Schedule", icon: Calendar },
  { label: "Public Health", icon: ShieldAlert },
  { label: "General", icon: Sparkles },
];

export function EditAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onAnnouncementUpdated,
}: EditAnnouncementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Vaccination Drive");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [targetBarangay, setTargetBarangay] = useState("All Cagayan de Oro");
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || "");
      setContent(announcement.content || "");
      setCategory(announcement.category || "Vaccination Drive");
      setPriority(announcement.priority || "normal");
      setTargetBarangay(announcement.target_barangay || "All Cagayan de Oro");
      setIsPinned(!!announcement.is_pinned);
    }
  }, [announcement, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement) return;

    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and details for the announcement.");
      return;
    }

    setLoading(true);
    const supabase = getPublicSupabaseClient();

    const updates = {
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      target_barangay: targetBarangay.trim() || "All Cagayan de Oro",
      is_pinned: isPinned,
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("announcements")
        .update(updates)
        .eq("id", announcement.id)
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Supabase update error:", error.message);
        // Optimistic local update
        const updatedObj: CVOAnnouncement = {
          ...announcement,
          ...updates,
        };
        onAnnouncementUpdated?.(updatedObj);
        toast.success("Announcement updated successfully (local session).");
      } else if (data) {
        onAnnouncementUpdated?.(data as CVOAnnouncement);
        toast.success("Official CVO Announcement updated live.");
      } else {
        const updatedObj: CVOAnnouncement = {
          ...announcement,
          ...updates,
        };
        onAnnouncementUpdated?.(updatedObj);
        toast.success("Announcement updated.");
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update announcement.");
    } finally {
      setLoading(false);
    }
  };

  if (!announcement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Pencil className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold">
              Edit Official Notice
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update published bulletins, advisory notices, or mobile vaccination schedules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs font-semibold">
              Announcement Headline <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mass Rabies Vaccination & Microchipping Caravan"
              className="h-9 text-xs rounded-xl"
              required
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.label;
                return (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => setCategory(cat.label)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-3.5 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Barangay & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-barangay" className="text-xs font-semibold">
                Target Barangay
              </Label>
              <Input
                id="edit-barangay"
                value={targetBarangay}
                onChange={(e) => setTargetBarangay(e.target.value)}
                placeholder="e.g. Brgy. Carmen or All CDO"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Broadcast Urgency</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPriority("normal")}
                  className={`h-9 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    priority === "normal"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("urgent")}
                  className={`h-9 px-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    priority === "urgent" || priority === "high"
                      ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400"
                      : "border-border/70 hover:bg-muted/40 text-muted-foreground"
                  }`}
                >
                  Urgent Notice
                </button>
              </div>
            </div>
          </div>

          {/* Announcement Body Content */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-content" className="text-xs font-semibold">
              Notice Details & Instructions <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="edit-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide exact locations, timings, required requirements, and veterinary precautions..."
              className="text-xs rounded-xl min-h-[100px] leading-relaxed resize-none"
              required
            />
          </div>

          {/* Pin to Top Option */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border/70 bg-muted/20">
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-amber-500" />
              <div>
                <p className="text-xs font-semibold text-foreground">Pin to top of bulletin</p>
                <p className="text-[10px] text-muted-foreground">Keep this announcement highlighted for all visitors</p>
              </div>
            </div>
            <input
              type="checkbox"
              id="edit-pinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="size-4 accent-primary rounded cursor-pointer"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs rounded-xl cursor-pointer"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-9 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
              disabled={loading}
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
