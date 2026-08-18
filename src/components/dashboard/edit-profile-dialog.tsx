"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { User, Mail, ShieldCheck, BadgeCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleTitle, setRoleTitle] = useState("Administrator");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      const metadata = user.unsafeMetadata as { roleTitle?: string } | undefined;
      if (metadata?.roleTitle) setRoleTitle(metadata.roleTitle);
    }
  }, [user, open]);

  const displayName = `${firstName} ${lastName}`.trim() || user?.fullName || "User";
  const userInitials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const userEmail = user?.primaryEmailAddress?.emailAddress || "user@syncvet.gov.ph";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        unsafeMetadata: {
          ...user.unsafeMetadata,
          roleTitle: roleTitle.trim(),
        },
      });

      toast.success("Profile Updated", {
        description: "Your name and account details have been saved.",
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
      <DialogContent className="sm:max-w-[440px] rounded-3xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <div className="flex items-center gap-2 text-primary font-bold text-base">
            <User className="size-4.5" />
            <DialogTitle className="text-lg font-extrabold tracking-tight">
              Edit Profile
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Update your personal details and account information for SyncVet.
          </DialogDescription>
        </DialogHeader>

        {/* Profile Card Overview */}
        <div className="flex items-center gap-3.5 rounded-2xl bg-muted/40 p-3 border border-border/60">
          <Avatar className="size-12 shrink-0 border-2 border-background shadow-xs">
            {user?.imageUrl && <AvatarImage src={user.imageUrl} alt={displayName} />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-orange-500 text-sm font-bold text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-foreground leading-tight">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Mail className="size-3 text-muted-foreground/70" />
              <span>{userEmail}</span>
            </p>
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

          {/* Role / Job Title */}
          <div className="space-y-1.5">
            <Label htmlFor="roleTitle" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BadgeCheck className="size-3.5 text-primary" /> Role / Title
            </Label>
            <Input
              id="roleTitle"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Administrator, IT Officer"
              className="h-10 rounded-xl text-xs"
            />
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

          {/* Half-width action buttons */}
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
      </DialogContent>
    </Dialog>
  );
}
