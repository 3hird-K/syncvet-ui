"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Megaphone,
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

interface CreateAnnouncementDialogProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  onAnnouncementCreated?: (announcement: CVOAnnouncement) => void;
  trigger?: React.ReactNode;
}

const CATEGORIES: { label: AnnouncementCategory; icon: any }[] = [
  { label: "Vaccination Drive", icon: Syringe },
  { label: "Urgent Advisory", icon: AlertTriangle },
  { label: "Clinic Schedule", icon: Calendar },
  { label: "Public Health", icon: ShieldAlert },
  { label: "General", icon: Sparkles },
];

export function CreateAnnouncementDialog({
  currentUserId,
  currentUserName = "City Veterinary Office",
  currentUserRole = "Veterinarian",
  onAnnouncementCreated,
  trigger,
}: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Vaccination Drive");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [targetBarangay, setTargetBarangay] = useState("All Cagayan de Oro");
  const [isPinned, setIsPinned] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and details for the announcement.");
      return;
    }

    setLoading(true);
    const supabase = getPublicSupabaseClient();

    const newAnnouncement: Partial<CVOAnnouncement> = {
      title: title.trim(),
      content: content.trim(),
      category,
      priority,
      author_id: currentUserId || null,
      author_name: currentUserName,
      author_role: currentUserRole,
      target_barangay: targetBarangay.trim() || "All Cagayan de Oro",
      is_pinned: isPinned,
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert([newAnnouncement])
        .select()
        .single();

      if (error) {
        // If the table doesn't exist yet, we still provide an optimistic local object for testing!
        console.warn("Supabase insert error (table may need migration):", error.message);
        const fallbackCreated: CVOAnnouncement = {
          id: `local-${Date.now()}`,
          title: newAnnouncement.title!,
          content: newAnnouncement.content!,
          category: newAnnouncement.category!,
          priority: newAnnouncement.priority!,
          author_id: newAnnouncement.author_id,
          author_name: newAnnouncement.author_name!,
          author_role: newAnnouncement.author_role!,
          target_barangay: newAnnouncement.target_barangay,
          is_pinned: newAnnouncement.is_pinned!,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        onAnnouncementCreated?.(fallbackCreated);
        toast.success("Announcement broadcast published (Stored locally - please run migration in Supabase SQL editor).");
      } else {
        onAnnouncementCreated?.(data as CVOAnnouncement);
        toast.success("Official CVO Announcement broadcast published live!");
      }

      // Reset and close
      setTitle("");
      setContent("");
      setCategory("Vaccination Drive");
      setPriority("normal");
      setIsPinned(false);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to post announcement. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="h-8 px-2.5 gap-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-xl shadow-xs cursor-pointer hover:bg-primary/90"
          >
            <Megaphone className="size-3.5" />
            <span>Post Notice</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg p-5 sm:p-6 rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Megaphone className="size-4" />
            </div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              Broadcast CVO Announcement
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Publish an official advisory, vaccination campaign schedule, or municipal clinic notice for Cagayan de Oro pet owners.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title" className="text-xs font-bold text-foreground">
              Announcement Title *
            </Label>
            <Input
              id="announcement-title"
              placeholder="e.g. Barangay Carmen Free Anti-Rabies Vaccination Drive"
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
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
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

          {/* Priority & Scope in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="announcement-priority" className="text-xs font-bold text-foreground">
                Priority Level
              </Label>
              <select
                id="announcement-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
                className="w-full text-xs rounded-xl border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="normal">Normal Notice</option>
                <option value="high">High Importance</option>
                <option value="urgent">Urgent Alert</option>
                <option value="low">Low / Informational</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="announcement-barangay" className="text-xs font-bold text-foreground">
                Target Area / Barangay
              </Label>
              <Input
                id="announcement-barangay"
                placeholder="All Cagayan de Oro"
                value={targetBarangay}
                onChange={(e) => setTargetBarangay(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Content / Message */}
          <div className="space-y-1.5">
            <Label htmlFor="announcement-content" className="text-xs font-bold text-foreground">
              Broadcast Message & Guidelines *
            </Label>
            <Textarea
              id="announcement-content"
              rows={4}
              placeholder="State key details: dates, barangay covered court locations, requirements (digital passport, fasting for kapon, leash), and contact numbers..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs rounded-xl resize-none leading-relaxed"
              required
            />
          </div>

          {/* Pinned Checkbox & Author Stamp */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/70">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary accent-primary"
              />
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <Pin className="size-3 text-primary" /> Pin announcement to top
              </span>
            </label>

            <span className="text-[11px] text-muted-foreground truncate">
              Posting as: <strong className="text-foreground">{currentUserRole}</strong>
            </span>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="text-xs font-bold rounded-xl gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer hover:bg-primary/90"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>Publish Broadcast</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
