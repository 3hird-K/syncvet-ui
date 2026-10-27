"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole, type SyncVetRole } from "@/data/syncvet-users";
import { toast } from "sonner";
import {
  User,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Stethoscope,
  Syringe,
  Loader2,
  Camera,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PawIcon } from "@/components/icons/paw-icon";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getRoleBadge(role: SyncVetRole) {
  switch (role) {
    case "Administrator":
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold text-rose-500 border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 rounded-full"
        >
          <ShieldAlert className="size-3 mr-1 text-rose-500" />
          Administrator
        </Badge>
      );
    case "Veterinarian":
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold text-emerald-500 border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 rounded-full"
        >
          <Stethoscope className="size-3 mr-1 text-emerald-500" />
          Veterinarian
        </Badge>
      );
    case "Pet Owner":
    default:
      return (
        <Badge
          variant="outline"
          className="text-[10px] font-bold text-emerald-600 border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 rounded-full"
        >
          <PawIcon className="size-3 mr-1 text-emerald-600" />
          Pet Owner
        </Badge>
      );
  }
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, isLoaded } = useUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch real user record from Supabase to accurately reflect current role & profile
  const { data: dbUser } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getPublicSupabaseClient();
      const { data } = await supabase
        .from("users")
        .select("role, avatar_url, full_name, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const initialRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );
  const isAdmin = initialRole === "Administrator";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<SyncVetRole>(initialRole);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.firstName || dbUser?.first_name || "");
        setLastName(user.lastName || dbUser?.last_name || "");
      }
      setRole(initialRole);
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsRemovingImage(false);
    }
  }, [user, dbUser, open, initialRole]);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const displayName = `${firstName} ${lastName}`.trim() || user?.fullName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "user@syncvet.gov.ph";

  // Compute current image to display in Avatar
  const currentAvatarSrc = isRemovingImage
    ? undefined
    : previewUrl || user?.imageUrl || dbUser?.avatar_url || undefined;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", {
        description: "Please select an image file (PNG, JPG, WEBP).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", {
        description: "Image size should be less than 5MB.",
      });
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setIsRemovingImage(false);
  };

  const handleTriggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Update profile image if changed
      if (selectedFile) {
        await user.setProfileImage({ file: selectedFile });
      } else if (isRemovingImage && user.hasImage) {
        await user.setProfileImage({ file: null });
      }

      // 2. Update user name (and role only if user is an Administrator) in Clerk
      const targetRole = isAdmin ? role : initialRole;
      const clerkUpdates: {
        firstName: string;
        lastName: string;
        unsafeMetadata?: Record<string, unknown>;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (isAdmin) {
        clerkUpdates.unsafeMetadata = {
          ...user.unsafeMetadata,
          roleTitle: targetRole,
          accountType: targetRole === "Pet Owner" ? "pet_owner" : targetRole.toLowerCase(),
        };
      }

      await user.update(clerkUpdates);

      // 3. Reload user to refresh cached resources
      await user.reload();

      // 4. Synchronize updated avatar, name (and role only if Administrator) to Supabase immediately
      const supabase = getPublicSupabaseClient();
      const updatedFullName = `${firstName.trim()} ${lastName.trim()}`.trim() || user.fullName || "";
      const updatedAvatarUrl = user.imageUrl || null;

      const supabaseUpdates: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: updatedFullName,
        avatar_url: updatedAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (isAdmin) {
        supabaseUpdates.role = targetRole;
      }

      await supabase
        .from("users")
        .update(supabaseUpdates)
        .eq("id", user.id);

      // Invalidate TanStack query cache so sidebar and all tables reflect the updated info immediately
      queryClient.invalidateQueries({ queryKey: ["current-user-role", user.id] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-owners"] });
      queryClient.invalidateQueries({ queryKey: ["supabase-pet-owners-list"] });

      toast.success("Profile Updated", {
        description: selectedFile
          ? "Your profile photo and details have been updated."
          : isAdmin
          ? `Profile details and role (${targetRole}) have been saved.`
          : "Your profile details have been saved successfully.",
      });
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Failed to update profile. Please try again.";
      toast.error("Update Failed", { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] rounded-3xl border border-border/80 bg-card p-6 shadow-2xl overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-4"
        >
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2 text-primary font-bold text-base">
              <User className="size-4.5" />
              <DialogTitle className="text-lg font-extrabold tracking-tight">
                Edit Profile
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isAdmin
                ? "Update your personal details, role, and account information for SyncVet."
                : "Update your personal details and account information for SyncVet."}
            </DialogDescription>
          </DialogHeader>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={loading}
          />

          {/* Profile Card Overview with Photo Upload and Dynamic Role Badge */}
          <div className="rounded-2xl bg-muted/40 p-3.5 border border-border/60">
            <div className="flex items-center gap-3.5">
              {/* Interactive Avatar */}
              <div className="relative group shrink-0">
                <Avatar className="size-14 border-2 border-background shadow-xs ring-2 ring-primary/20 transition-all duration-200 group-hover:ring-primary/40">
                  {currentAvatarSrc && (
                    <AvatarImage src={currentAvatarSrc} alt={displayName} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-emerald-700 text-white flex items-center justify-center">
                    <PawIcon className="size-6 text-white" />
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={handleTriggerFileSelect}
                  disabled={loading}
                  aria-label="Upload profile picture"
                  className="absolute inset-0 rounded-full bg-black/45 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[1px]"
                >
                  <Camera className="size-4" />
                  <span className="text-[8px] font-bold mt-0.5">Change</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerFileSelect}
                  disabled={loading}
                  aria-label="Change photo button"
                  className="absolute -bottom-0.5 -right-0.5 size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs ring-2 ring-background hover:bg-primary/90 transition-transform hover:scale-110 cursor-pointer"
                >
                  <Camera className="size-2.5" />
                </button>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-sm font-extrabold text-foreground leading-tight">
                    {displayName}
                  </p>
                  {selectedFile && (
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                      New photo
                    </Badge>
                  )}
                  {isRemovingImage && (
                    <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/10">
                      Photo removed
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Mail className="size-3 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{userEmail}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  {/* Dynamic role reflection */}
                  {getRoleBadge(role)}
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs font-semibold text-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Neil"
                  className="h-10 rounded-xl text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs font-semibold text-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Dime"
                  className="h-10 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            {/* Account Role Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="accountRole" className="text-xs font-semibold text-foreground">
                  Account Role
                </Label>
                {!isAdmin && (
                  <span className="text-[10.5px] text-muted-foreground flex items-center gap-1 font-medium">
                    <Lock className="size-3 text-muted-foreground/70" />
                    Role locked (Admin only)
                  </span>
                )}
              </div>

              {isAdmin ? (
                <Select value={role} onValueChange={(val: SyncVetRole) => setRole(val)}>
                  <SelectTrigger id="accountRole" className="h-10 rounded-xl text-xs bg-background cursor-pointer">
                    <SelectValue placeholder="Select account role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pet Owner" className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <PawIcon className="size-3.5 text-emerald-600" />
                        <span>Pet Owner (Citizen)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Administrator" className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-3.5 text-rose-500" />
                        <span>Administrator (CVO Admin)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Veterinarian" className="text-xs cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Stethoscope className="size-3.5 text-emerald-500" />
                        <span>Veterinarian (Clinician)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 rounded-xl border border-border/70 bg-muted/30 px-3 flex items-center justify-between text-xs text-foreground select-none">
                  <div className="flex items-center gap-2 font-medium">
                    {initialRole === "Veterinarian" && <Stethoscope className="size-3.5 text-emerald-500" />}
                    {initialRole === "Pet Owner" && <PawIcon className="size-3.5 text-emerald-600" />}
                    <span>
                      {initialRole === "Pet Owner"
                        ? "Pet Owner (Citizen)"
                        : "Veterinarian (Clinician)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold bg-muted/60 px-2 py-0.5 rounded-md border border-border/40">
                    <Lock className="size-2.5 text-muted-foreground" />
                    <span>Admin Only</span>
                  </div>
                </div>
              )}
            </div>

            {/* Readonly Verified Email Notice */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span>Google Account Connected</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                Verified
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-10 w-full rounded-xl text-xs font-semibold hover:bg-muted/80 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !isLoaded}
                className="h-10 w-full rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
