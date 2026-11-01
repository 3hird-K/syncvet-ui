"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
  Save,
  X,
  ImageIcon,
  Sparkles,
  UploadCloud,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  compressImage,
  uploadAnnouncementImage,
  deleteAnnouncementImage,
  formatFileSize,
} from "@/lib/image-compression";
import type { CVOAnnouncement, AnnouncementCategory, AnnouncementPriority } from "@/types/announcement";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  // Image editing & WebP compression state
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || "");
      let cleanContent = announcement.content || "";
      let foundExpiry = announcement.expires_at ? announcement.expires_at.slice(0, 10) : "";
      const match = cleanContent.match(/\[EXPIRES:([^\]]+)\]/i);
      if (match) {
        if (!foundExpiry) foundExpiry = match[1].trim();
        cleanContent = cleanContent.replace(/\[EXPIRES:[^\]]+\]/gi, "").trim();
      }

      // Extract existing image
      const imgMatch = cleanContent.match(/\[IMG:(https?:\/\/[^\]]+)\]/i);
      const imgUrl = announcement.image_url || imgMatch?.[1] || null;
      if (imgMatch) {
        cleanContent = cleanContent.replace(/\[IMG:[^\]]+\]/gi, "").trim();
      }

      setContent(cleanContent);
      setCategory(announcement.category || "Vaccination Drive");
      setPriority(announcement.priority || "normal");
      setIsPinned(!!announcement.is_pinned);

      setExistingImageUrl(imgUrl);
      setSelectedFile(null);
      setPreviewDataUrl(imgUrl);
      setRemoveImage(false);
      setCompressionStats(null);

      if (foundExpiry) {
        setExpiryMode("custom");
        setExpiresAt(foundExpiry);
        try {
          setCustomDate(new Date(foundExpiry));
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP).");
      return;
    }

    try {
      setIsCompressing(true);
      const result = await compressImage(file);
      setSelectedFile(file);
      setPreviewDataUrl(result.dataUrl);
      setRemoveImage(false);
      setCompressionStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        savingsPercent: result.savingsPercent,
      });
      toast.success(
        `Optimized to WebP: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} (${result.savingsPercent}% saved!)`
      );
    } catch (err: any) {
      console.error("Compression error:", err);
      toast.error("Failed to process image. Please try another image.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewDataUrl(null);
    setExistingImageUrl(null);
    setRemoveImage(true);
    setCompressionStats(null);
  };

  const hasOtherPinned = Boolean(
    pinnedAnnouncement && announcement && pinnedAnnouncement.id !== announcement.id
  );

  const editMutation = useMutation({
    mutationFn: async (updates: {
      title: string;
      content: string;
      category: AnnouncementCategory;
      priority: AnnouncementPriority;
      target_barangay?: string | null;
      is_pinned: boolean;
      image_url: string | null;
    }) => {
      if (!announcement) throw new Error("No announcement selected");
      const supabase = getPublicSupabaseClient();

      if (updates.is_pinned === true) {
        // Automatically switch pin: unpin any other announcement in DB
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("is_pinned", true);
      }

      const dbUpdates: any = {
        title: updates.title,
        content: updates.content,
        category: updates.category,
        priority: updates.priority,
        target_barangay: updates.target_barangay || "All Cagayan de Oro",
        is_pinned: updates.is_pinned,
        image_url: updates.image_url,
        updated_at: new Date().toISOString(),
      };

      let { data, error } = await supabase
        .from("announcements")
        .update(dbUpdates)
        .eq("id", announcement.id)
        .select()
        .single();

      // Graceful fallback if image_url column doesn't exist yet in Supabase table schema
      if (error && error.code === "42703") {
        delete dbUpdates.image_url;
        if (updates.image_url) {
          dbUpdates.content = `${dbUpdates.content}\n\n[IMG:${updates.image_url}]`;
        }
        const retry = await supabase
          .from("announcements")
          .update(dbUpdates)
          .eq("id", announcement.id)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Supabase announcement update error:", error);
        throw error;
      }

      // If the announcement had a previous image and it was changed or removed, clean up old storage file
      const originalImageUrl =
        announcement.image_url ||
        announcement.content?.match(/\[IMG:(https?:\/\/[^\]]+)\]/i)?.[1];
      if (originalImageUrl && updates.image_url !== originalImageUrl) {
        deleteAnnouncementImage(originalImageUrl).catch((err) =>
          console.warn("Could not delete old announcement image from storage:", err)
        );
      }

      return data as CVOAnnouncement;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) =>
        old.map((a) => {
          if (a.id === data.id) return data;
          if (data.is_pinned) return { ...a, is_pinned: false };
          return a;
        })
      );
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
      onAnnouncementUpdated?.(data);
      toast.success("Official CVO Announcement updated live.");
      onOpenChange(false);
    },
    onError: (err: any) => {
      console.error("Supabase announcement update error:", err);
      toast.error(err?.message || "Failed to update announcement. Please try again.");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement) return;

    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and details for the announcement.");
      return;
    }

    let finalContent = content.replace(/\[EXPIRES:[^\]]+\]/gi, "").replace(/\[IMG:[^\]]+\]/gi, "").trim();
    if (expiryMode !== "never" && expiresAt) {
      finalContent = `${finalContent}\n\n[EXPIRES:${expiresAt}]`;
    }

    let finalImageUrl: string | null = existingImageUrl;

    if (removeImage) {
      finalImageUrl = null;
    }

    // Upload newly selected image if user picked a new file
    if (selectedFile) {
      setIsUploading(true);
      try {
        const uploadRes = await uploadAnnouncementImage(selectedFile);
        finalImageUrl = uploadRes.url;
      } catch (uploadErr: any) {
        console.error("Storage upload failed:", uploadErr);
        toast.error("Could not upload new image to storage.");
      } finally {
        setIsUploading(false);
      }
    }

    editMutation.mutate({
      title: title.trim(),
      content: finalContent,
      category,
      priority,
      target_barangay: "All Cagayan de Oro",
      is_pinned: isPinned,
      image_url: finalImageUrl,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 sm:p-6 rounded-2xl"
      >
        {/* Top-right Action Buttons: Save Icon beside Close X */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          <button
            type="submit"
            form="edit-announcement-form"
            disabled={editMutation.isPending || isCompressing || isUploading}
            className="flex size-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white shadow-2xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title="Save Changes"
            aria-label="Save Changes"
          >
            {editMutation.isPending || isUploading ? (
              <Loader2 className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Save className="size-4" />
            )}
          </button>

          <DialogClose asChild>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/80 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
              title="Close dialog"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </div>

        <DialogHeader className="space-y-1 pr-20">
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

        <form id="edit-announcement-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as AnnouncementPriority)}
              >
                <SelectTrigger id="edit-announcement-priority" className="h-9 w-full text-xs rounded-xl border-border bg-background cursor-pointer">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="normal" className="text-xs">Normal Notice</SelectItem>
                  <SelectItem value="high" className="text-xs">High Importance</SelectItem>
                  <SelectItem value="urgent" className="text-xs">Urgent Alert</SelectItem>
                  <SelectItem value="low" className="text-xs">Low / Informational</SelectItem>
                </SelectContent>
              </Select>
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
              <Select
                value={expiryMode}
                onValueChange={(val) => handleExpiryChange(val as any)}
              >
                <SelectTrigger id="edit-announcement-expiry" className="h-9 w-full text-xs rounded-xl border-border bg-background cursor-pointer">
                  <SelectValue placeholder="Select expiration" />
                </SelectTrigger>
                <SelectContent className="rounded-xl text-xs">
                  <SelectItem value="never" className="text-xs">Never expires (Permanent)</SelectItem>
                  <SelectItem value="1day" className="text-xs">Expires in 24 hours</SelectItem>
                  <SelectItem value="3days" className="text-xs">Expires in 3 days</SelectItem>
                  <SelectItem value="1week" className="text-xs">Expires in 1 week</SelectItem>
                  <SelectItem value="custom" className="text-xs">Custom expiration date...</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Announcement Poster Image (View, Change, or Upload New) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ImageIcon className="size-3.5 text-primary" />
                <span>Notice Poster / Photo</span>
                <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span>
              </Label>
              {compressionStats && (
                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Sparkles className="size-3 text-emerald-500" />
                  {formatFileSize(compressionStats.originalSize)} → {formatFileSize(compressionStats.compressedSize)} ({compressionStats.savingsPercent}% saved)
                </span>
              )}
            </div>

            {previewDataUrl ? (
              <div className="relative rounded-xl border border-border/80 bg-muted/30 p-2.5 overflow-hidden flex items-center gap-3">
                <div className="size-16 rounded-lg overflow-hidden border border-border shrink-0 bg-background">
                  <img
                    src={previewDataUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-xs font-bold text-foreground truncate">
                    {selectedFile?.name || "Current Notice Poster"}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {selectedFile ? "Optimized WebP • Ready to save" : "Attached to this announcement"}
                  </p>
                  <div className="pt-0.5">
                    <label
                      htmlFor="edit-announcement-image-input"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <UploadCloud className="size-3" />
                      <span>Change image</span>
                    </label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveImage}
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="edit-announcement-image-input"
                className={cn(
                  "flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer text-center space-y-1.5",
                  isCompressing && "opacity-50 pointer-events-none"
                )}
              >
                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {isCompressing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadCloud className="size-4" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    {isCompressing ? "Optimizing image..." : "Click to attach or change photo"}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Automatically compressed to fast WebP format
                  </p>
                </div>
              </label>
            )}

            <input
              id="edit-announcement-image-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={handleFileSelect}
              disabled={isCompressing || editMutation.isPending || isUploading}
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
