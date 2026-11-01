"use client";

import { useState } from "react";
import { Loader2, Trash2, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { deleteAnnouncementImage } from "@/lib/image-compression";
import type { CVOAnnouncement } from "@/types/announcement";

interface DeleteAnnouncementDialogProps {
  announcement: CVOAnnouncement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function DeleteAnnouncementDialog({
  announcement,
  open,
  onOpenChange,
  onDeleted,
}: DeleteAnnouncementDialogProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!announcement) return;
    setLoading(true);

    try {
      const supabase = getPublicSupabaseClient();
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", announcement.id);

      if (error) throw error;

      // Clean up storage image if one exists to preserve free storage tier
      const imgMatch = announcement.image_url || announcement.content?.match(/\[IMG:(https?:\/\/[^\]]+)\]/i)?.[1];
      if (imgMatch) {
        await deleteAnnouncementImage(imgMatch);
      }

      // Optimistically remove from query cache immediately
      queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
        old.filter((a) => a.id !== announcement.id)
      );
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });

      toast.success("Announcement Deleted", {
        description: `"${announcement.title}" has been permanently removed from citizen feeds.`,
      });

      if (onDeleted) onDeleted();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Failed to delete announcement:", err);
      toast.error(err?.message || "Failed to delete announcement. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cleanSnippet = announcement?.content
    ? announcement.content.replace(/\[(?:EVENT_DATE|OP_ID|EXPIRES):[^\]]+\]/gi, "").trim()
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[440px] p-6 bg-background rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2 pb-1">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center border border-destructive/20 shrink-0">
              <AlertTriangle className="size-5" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="size-8 rounded-full border border-border/60 bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-all"
              title="Close"
            >
              <X className="size-4" />
            </Button>
          </div>
          <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
            Delete Announcement
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to remove this announcement from citizen feeds? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {announcement && (
          <div className="p-3.5 bg-muted/30 rounded-xl border border-border/60 text-xs space-y-2 my-2">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-foreground line-clamp-1">{announcement.title}</span>
              <Badge variant="outline" className="text-[9.5px] shrink-0 font-medium px-2 py-0.5">
                {announcement.category}
              </Badge>
            </div>
            {cleanSnippet && (
              <p className="text-muted-foreground text-[11px] line-clamp-2 leading-relaxed">
                {cleanSnippet}
              </p>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10.5px] text-muted-foreground">
              <span>Author: {announcement.author_name}</span>
              <span>{announcement.target_barangay || "All Cagayan de Oro"}</span>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2 gap-2 sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="text-xs font-bold rounded-xl gap-2 cursor-pointer shadow-xs"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            <span>Delete Notice</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
