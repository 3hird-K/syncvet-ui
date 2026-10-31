"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole, type SyncVetRole } from "@/data/syncvet-users";
import { cvoBarangays } from "@/data/cvo-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  User,
  Mail,
  ShieldAlert,
  Stethoscope,
  Loader2,
  Camera,
  Lock,
  Save,
  X,
  Search,
  MapPin,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
        .select("role, avatar_url, full_name, first_name, last_name, phone_number, address")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as {
    roleTitle?: string;
    accountType?: string;
    phoneNumber?: string;
    mobileNumber?: string;
    barangay?: string;
    streetAddress?: string;
    landmark?: string;
    address?: string;
  } | undefined;
  const initialRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );
  const isAdmin = initialRole === "Administrator";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [barangay, setBarangay] = useState("");
  const [barangaySearch, setBarangaySearch] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [role, setRole] = useState<SyncVetRole>(initialRole);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  // Filtered Barangays (computed when user starts typing)
  const filteredBarangays = useMemo(() => {
    const q = barangaySearch.toLowerCase().trim();
    if (!q) return [];
    return cvoBarangays.filter((b) => b.toLowerCase().includes(q));
  }, [barangaySearch]);

  const popularBarangays = useMemo(
    () => ["Carmen", "Nazareth", "Lapasan", "Macasandig", "Kauswagan", "Bulua"],
    []
  );

  useEffect(() => {
    if (open) {
      if (user) {
        setFirstName(user.firstName || dbUser?.first_name || "");
        setLastName(user.lastName || dbUser?.last_name || "");
        setPhoneNumber(
          dbUser?.phone_number ||
          (user.unsafeMetadata?.phoneNumber as string) ||
          (user.unsafeMetadata?.mobileNumber as string) ||
          ""
        );

        // Parse barangay, streetAddress, landmark from metadata or DB address
        const meta = user.unsafeMetadata as Record<string, unknown> | undefined;
        let initBrgy = (meta?.barangay as string) || "";
        let initStreet = (meta?.streetAddress as string) || "";
        let initLandmark = (meta?.landmark as string) || "";
        let rawAddr = dbUser?.address || (meta?.address as string) || "";

        if (rawAddr) {
          const landmarkMatch = rawAddr.match(/\(Near\s+([^)]+)\)/i);
          if (landmarkMatch) {
            if (!initLandmark) initLandmark = landmarkMatch[1].trim();
            rawAddr = rawAddr.replace(/\(Near\s+[^)]+\)/i, "");
          }
        }

        // Validate if initBrgy is an actual single CDO barangay name
        const isBrgyValid = cvoBarangays.some(
          (b) => b.toLowerCase() === initBrgy.toLowerCase().trim()
        );

        if (!isBrgyValid) {
          // If initBrgy was stored as a full address string from older saves, search for the real barangay
          const textToSearch = `${initBrgy} ${rawAddr}`.trim();
          const match = cvoBarangays.find((b) =>
            new RegExp(`\\b${b.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(textToSearch)
          );
          if (match) {
            initBrgy = match;
            if (!initStreet) {
              const parts = textToSearch.split(new RegExp(match, "i"));
              const before = parts[0]?.replace(/[,\s]+$/, "").trim();
              if (before) {
                initStreet = before;
              }
            }
          } else {
            initBrgy = "";
          }
        } else {
          if (!initStreet && rawAddr) {
            const parts = rawAddr.split(new RegExp(initBrgy, "i"));
            const before = parts[0]?.replace(/[,\s]+$/, "").trim();
            if (before) {
              initStreet = before;
            }
          }
        }

        setBarangay(initBrgy);
        setBarangaySearch(initBrgy);
        setStreetAddress(initStreet);
        setLandmark(initLandmark);
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Update profile image if changed
      if (selectedFile) {
        await user.setProfileImage({ file: selectedFile });
      } else if (isRemovingImage && user.hasImage) {
        await user.setProfileImage({ file: null });
      }

      // Compute full standardized address like onboarding
      const fullAddressParts = [
        streetAddress.trim(),
        landmark.trim() ? `(Near ${landmark.trim()})` : "",
        barangay.trim(),
        "Cagayan de Oro City, Misamis Oriental",
      ].filter(Boolean);
      const fullAddress = barangay.trim()
        ? fullAddressParts.join(", ")
        : streetAddress.trim();

      // 2. Update user name (and role only if user is an Administrator) in Clerk
      const targetRole = isAdmin ? role : initialRole;
      const clerkUpdates: {
        firstName: string;
        lastName: string;
        unsafeMetadata?: Record<string, unknown>;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phoneNumber: phoneNumber.trim(),
          mobileNumber: phoneNumber.trim(),
          barangay: barangay.trim(),
          streetAddress: streetAddress.trim(),
          landmark: landmark.trim(),
          address: fullAddress,
          ...(isAdmin
            ? {
                roleTitle: targetRole,
                accountType: targetRole === "Pet Owner" ? "pet_owner" : targetRole.toLowerCase(),
              }
            : {}),
        },
      };

      await user.update(clerkUpdates);

      // 3. Reload user to refresh cached resources
      await user.reload();

      // 4. Synchronize updated avatar, name, phone, address (and role only if Administrator) to Supabase immediately
      const supabase = getPublicSupabaseClient();
      const updatedFullName = `${firstName.trim()} ${lastName.trim()}`.trim() || user.fullName || "";
      const updatedAvatarUrl = user.imageUrl || null;

      const supabaseUpdates: Record<string, unknown> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        full_name: updatedFullName,
        avatar_url: updatedAvatarUrl,
        phone_number: phoneNumber.trim() || null,
        address: fullAddress || null,
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
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[90] bg-black/60 backdrop-blur-xs"
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:max-w-[580px] max-h-[90vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-3xl border border-border/80 bg-card p-6 shadow-2xl z-[100]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {/* Top-right Action Buttons: Save beside Close X */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          <button
            type="submit"
            form="edit-profile-form"
            disabled={loading || !isLoaded}
            className="flex size-8 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white shadow-2xs transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            title="Save Changes"
            aria-label="Save Changes"
          >
            {loading ? (
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

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-4"
        >
          <DialogHeader className="space-y-1.5 pb-2 pr-20">
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

          <form id="edit-profile-form" onSubmit={handleSave} className="space-y-3 pt-0.5">
            {/* First Name & Last Name */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="firstName" className="text-xs font-semibold text-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Neil"
                  className="h-8.5 rounded-lg text-xs px-2.5"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-xs font-semibold text-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Dime"
                  className="h-8.5 rounded-lg text-xs px-2.5"
                  required
                />
              </div>
            </div>

            {/* Contact Number */}
            <div className="space-y-1">
              <Label htmlFor="phoneNumber" className="text-xs font-semibold text-foreground">
                Contact Number
              </Label>
              <Input
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. 0917 123 4567"
                className="h-8.5 rounded-lg text-xs px-2.5"
              />
            </div>

            {/* Location Section - matches Onboarding Wizard location pattern */}
            <div className="space-y-2.5 pt-0.5">
              {/* Barangay in CDO */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <span>Barangay in CDO</span>
                  </Label>
                  {barangay ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="size-2.5" />
                      Selected: {barangay}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      Type to see suggestions
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Type CDO Barangay (e.g. Carmen, Nazareth, Lapasan)..."
                    value={barangaySearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBarangaySearch(val);
                      const match = cvoBarangays.find(
                        (b) => b.toLowerCase() === val.toLowerCase().trim()
                      );
                      if (match) {
                        setBarangay(match);
                      } else if (barangay && val !== barangay) {
                        setBarangay("");
                      }
                    }}
                    className={cn(
                      "h-8.5 text-xs pl-8 pr-7 rounded-lg bg-background border border-border/80 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                      barangay && "border-emerald-500/60 font-semibold text-foreground"
                    )}
                  />
                  {barangaySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarangaySearch("");
                        setBarangay("");
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      title="Clear Barangay"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>

                {/* Suggestions / Popular pills underneath */}
                {barangaySearch.trim().length > 0 ? (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar text-xs">
                    {filteredBarangays.length === 0 ? (
                      <span className="text-[10.5px] text-muted-foreground italic px-1">
                        No barangay found matching &ldquo;{barangaySearch}&rdquo;
                      </span>
                    ) : (
                      filteredBarangays.slice(0, 10).map((b) => {
                        const isSelected = barangay.toLowerCase() === b.toLowerCase();
                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              setBarangay(b);
                              setBarangaySearch(b);
                            }}
                            className={cn(
                              "shrink-0 px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs scale-[1.02]"
                                : "bg-background border-border/80 hover:border-primary/60 hover:bg-primary/5 text-foreground"
                            )}
                          >
                            {isSelected ? (
                              <Check className="size-2.5" />
                            ) : (
                              <MapPin className="size-2.5 text-primary" />
                            )}
                            <span>{b}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar text-xs">
                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">Popular:</span>
                    {popularBarangays.map((b) => {
                      const isSelected = barangay.toLowerCase() === b.toLowerCase();
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setBarangay(b);
                            setBarangaySearch(b);
                          }}
                          className={cn(
                            "shrink-0 px-2 py-0.5 rounded-md text-[10.5px] font-semibold transition-all cursor-pointer flex items-center gap-1 border shadow-2xs",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-xs scale-[1.02]"
                              : "bg-background border-border/80 hover:border-primary/60 hover:bg-primary/5 text-foreground"
                          )}
                        >
                          {isSelected ? (
                            <Check className="size-2" />
                          ) : (
                            <MapPin className="size-2 text-primary" />
                          )}
                          <span>{b}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Street / House No. / Zone and Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label htmlFor="streetAddress" className="text-xs font-semibold text-foreground">
                    Street / House No. / Zone
                  </Label>
                  <Input
                    id="streetAddress"
                    placeholder="e.g. Zone 10, Block 4 Lot 12"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className="h-8.5 rounded-lg text-xs px-2.5"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="landmark" className="text-xs font-semibold text-muted-foreground">
                    Landmark (Optional)
                  </Label>
                  <Input
                    id="landmark"
                    placeholder="e.g. Near Barangay Hall"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    className="h-8.5 rounded-lg text-xs px-2.5"
                  />
                </div>
              </div>
            </div>

            {/* Account Role Field */}
            <div className="space-y-1">
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
                  <SelectTrigger id="accountRole" className="h-8.5 rounded-lg text-xs bg-background cursor-pointer px-2.5">
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
                <div className="h-8.5 rounded-lg border border-border/70 bg-muted/30 px-2.5 flex items-center justify-between text-xs text-foreground select-none">
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
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
