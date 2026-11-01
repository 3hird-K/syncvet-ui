"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Megaphone,
  Pin,
  Bell,
  Syringe,
  Calendar as CalendarIcon,
  Globe,
  ShieldAlert,
  Loader2,
  Clock,
  Lock,
  Send,
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

interface CreateAnnouncementDialogProps {
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: string;
  onAnnouncementCreated?: (announcement: CVOAnnouncement) => void;
  trigger?: React.ReactNode;
  pinnedAnnouncement?: CVOAnnouncement | null;
}

const CATEGORIES: { label: AnnouncementCategory; icon: any }[] = [
  { label: "Vaccination Drive", icon: Syringe },
  { label: "Urgent Advisory", icon: Bell },
  { label: "Clinic Schedule", icon: CalendarIcon },
  { label: "Public Health", icon: ShieldAlert },
  { label: "General", icon: Globe },
];

export function CreateAnnouncementDialog({
  currentUserId,
  currentUserName = "City Veterinary Office",
  currentUserRole = "Veterinarian",
  onAnnouncementCreated,
  trigger,
  pinnedAnnouncement,
}: CreateAnnouncementDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("Vaccination Drive");
  const [priority, setPriority] = useState<AnnouncementPriority>("normal");
  const [expiryMode, setExpiryMode] = useState<"never" | "1day" | "3days" | "1week" | "custom">("never");
  const [expiresAt, setExpiresAt] = useState("");
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [isPinned, setIsPinned] = useState(false);

  // Image upload and optimization state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<{
    originalSize: number;
    compressedSize: number;
    savingsPercent: number;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    setCompressionStats(null);
  };

  // TanStack mutation for instant realtime publishing
  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      content: string;
      category: AnnouncementCategory;
      priority: AnnouncementPriority;
      author_id?: string | null;
      author_name: string;
      author_role: string;
      target_barangay?: string | null;
      is_pinned: boolean;
      is_active: boolean;
      image_file?: File | null;
    }) => {
      const supabase = getPublicSupabaseClient();

      // Upload image to Supabase Storage if attached
      let uploadedImageUrl: string | null = null;
      if (payload.image_file) {
        setIsUploading(true);
        try {
          const uploadRes = await uploadAnnouncementImage(payload.image_file);
          uploadedImageUrl = uploadRes.url;
        } catch (uploadErr: any) {
          console.error("Storage upload failed:", uploadErr);
          toast.error("Could not upload image to 'announcements' bucket. Posting without image.");
        } finally {
          setIsUploading(false);
        }
      }

      // Verify if author_id exists in users table to prevent FK constraint failure
      let verifiedAuthorId: string | null = null;
      if (payload.author_id) {
        const { data: userRec } = await supabase
          .from("users")
          .select("id")
          .eq("id", payload.author_id)
          .maybeSingle();
        if (userRec?.id) {
          verifiedAuthorId = userRec.id;
        }
      }

      if (payload.is_pinned) {
        // Automatically switch pin: unpin all existing in DB
        await supabase
          .from("announcements")
          .update({ is_pinned: false })
          .eq("is_pinned", true);
      }

      // Explicitly prepare payload with image_url support
      const dbPayload: any = {
        title: payload.title,
        content: payload.content,
        category: payload.category,
        priority: payload.priority,
        author_id: verifiedAuthorId,
        author_name: payload.author_name || "City Veterinary Office",
        author_role: payload.author_role || "Administrator",
        target_barangay: payload.target_barangay || "All Cagayan de Oro",
        is_pinned: payload.is_pinned,
        is_active: payload.is_active,
      };

      if (uploadedImageUrl) {
        dbPayload.image_url = uploadedImageUrl;
      }

      let { data, error } = await supabase
        .from("announcements")
        .insert([dbPayload])
        .select()
        .single();

      // Graceful fallback: If image_url column doesn't exist yet in Supabase table schema
      if (error && error.code === "42703" && uploadedImageUrl) {
        delete dbPayload.image_url;
        dbPayload.content = `${dbPayload.content}\n\n[IMG:${uploadedImageUrl}]`;
        const retry = await supabase
          .from("announcements")
          .insert([dbPayload])
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        console.error("Supabase announcement insert error:", error);
        throw error;
      }
      return data as CVOAnnouncement;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<CVOAnnouncement[]>(["cvo-announcements"], (old = []) => {
        const updatedOld = data.is_pinned
          ? old.map((a) => ({ ...a, is_pinned: false }))
          : old;
        return [data, ...updatedOld.filter((a) => a.id !== data.id)];
      });
      queryClient.invalidateQueries({ queryKey: ["cvo-announcements"] });
      onAnnouncementCreated?.(data);
      toast.success(
        data.is_pinned
          ? "Official CVO Announcement posted and pinned to top!"
          : "Official CVO Announcement broadcast published live!"
      );
      resetAndClose();
    },
    onError: (err: any) => {
      console.error("Failed to publish announcement to Supabase:", err);
      toast.error(err?.message || "Failed to publish announcement. Please try again.");
    },
  });

  const resetAndClose = () => {
    setTitle("");
    setContent("");
    setCategory("Vaccination Drive");
    setPriority("normal");
    setIsPinned(false);
    setExpiryMode("never");
    setExpiresAt("");
    setCustomDate(undefined);
    setSelectedFile(null);
    setPreviewDataUrl(null);
    setCompressionStats(null);
    setOpen(false);
  };

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
    if (!title.trim() || !content.trim()) {
      toast.error("Please enter both a title and details for the announcement.");
      return;
    }

    let finalContent = content.trim();
    if (expiryMode !== "never" && expiresAt) {
      finalContent = `${finalContent}\n\n[EXPIRES:${expiresAt}]`;
    }

    createMutation.mutate({
      title: title.trim(),
      content: finalContent,
      category,
      priority,
      author_id: currentUserId || null,
      author_name: currentUserName || "City Veterinary Office",
      author_role: currentUserRole || "Administrator",
      target_barangay: "All Cagayan de Oro",
      is_pinned: isPinned,
      is_active: true,
      image_file: selectedFile,
    });
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

      <DialogContent
        showCloseButton={false}
        className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-5 sm:p-6 rounded-2xl"
      >
        {/* Top-right Action Buttons: Publish Icon beside Close X */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          <button
            type="submit"
            form="create-announcement-form"
            disabled={createMutation.isPending || isUploading || isCompressing}
            className="flex size-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white shadow-2xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title={isUploading ? "Uploading image..." : "Publish Broadcast"}
            aria-label="Publish Broadcast"
          >
            {createMutation.isPending || isUploading || isCompressing ? (
              <Loader2 className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Send className="size-4" />
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

        <form id="create-announcement-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
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
              <Label htmlFor="announcement-priority" className="text-xs font-bold text-foreground">
                Priority Level
              </Label>
              <Select
                value={priority}
                onValueChange={(val) => setPriority(val as AnnouncementPriority)}
              >
                <SelectTrigger id="announcement-priority" className="h-9 w-full text-xs rounded-xl border-border bg-background cursor-pointer">
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
              <Label htmlFor="announcement-expiry" className="text-xs font-bold text-foreground flex items-center justify-between">
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
                <SelectTrigger id="announcement-expiry" className="h-9 w-full text-xs rounded-xl border-border bg-background cursor-pointer">
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

              {/* If expires in 24 hours, 3 days, or 1 week, date is LOCKED and NOT editable */}
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
            <Label htmlFor="announcement-content" className="text-xs font-bold text-foreground">
              Broadcast Message & Guidelines *
            </Label>
            <Textarea
              id="announcement-content"
              rows={4}
              placeholder="State key details: dates, barangay covered court locations, requirements (digital passport, fasting for kapon, leash), and contact numbers..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="text-xs rounded-xl resize-none leading-relaxed placeholder:text-[11px] placeholder:leading-relaxed placeholder:text-muted-foreground/60"
              required
            />
          </div>

          {/* Announcement Poster Image (Auto-Optimized to WebP) */}
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
                    {selectedFile?.name}
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">
                    Converted to WebP format • Fast mobile download
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveImage}
                  className="size-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer shrink-0"
                  title="Remove image"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ) : (
              <label className="border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-colors rounded-xl p-3 flex items-center justify-center gap-2.5 cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleFileSelect}
                  disabled={isCompressing}
                  className="hidden"
                />
                {isCompressing ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <UploadCloud className="size-4 text-primary" />
                )}
                <span>
                  {isCompressing
                    ? "Compressing image to WebP..."
                    : "Attach image or caravan poster (auto-compressed to WebP)"}
                </span>
              </label>
            )}
          </div>

          {/* Pinned Checkbox & Author Stamp */}
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
                Posting as: <strong className="text-foreground">{currentUserRole}</strong>
              </span>
            </div>

            {pinnedAnnouncement && isPinned && (
              <p className="mt-1.5 text-[10.5px] text-primary/90 font-medium pl-6 leading-tight">
                This will automatically switch the pin from <strong className="text-foreground">&ldquo;{pinnedAnnouncement.title}&rdquo;</strong> to this new broadcast.
              </p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
