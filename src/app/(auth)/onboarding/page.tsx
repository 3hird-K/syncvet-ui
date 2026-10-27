"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { OnboardingWizard } from "@/components/auth/onboarding-wizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Check if user already exists and fetch role & completion status
  const { data: dbUser, isLoading: isDbLoading } = useQuery({
    queryKey: ["onboarding-profile-check", user?.id, user?.primaryEmailAddress?.emailAddress],
    queryFn: async () => {
      if (!user?.id) return null;
      try {
        let { data } = await supabase
          .from("users")
          .select("role, profile_completed, phone_number, address")
          .eq("id", user.id)
          .maybeSingle();

        if (!data && user.primaryEmailAddress?.emailAddress) {
          const res = await supabase
            .from("users")
            .select("role, profile_completed, phone_number, address")
            .ilike("email", user.primaryEmailAddress.emailAddress)
            .maybeSingle();
          data = res.data;
        }

        return data;
      } catch {
        return null;
      }
    },
    enabled: isLoaded && !!user?.id,
  });

  const unsafeMeta = (user?.unsafeMetadata || {}) as Record<string, unknown>;
  const publicMeta = (user?.publicMetadata || {}) as Record<string, unknown>;

  const emailLower = user?.primaryEmailAddress?.emailAddress?.toLowerCase() || "";
  const isAdminEmail = emailLower === "dime.neil03@gmail.com";

  const rawRole =
    dbUser?.role ||
    (publicMeta.roleTitle as string) ||
    (publicMeta.role as string) ||
    (unsafeMeta.roleTitle as string) ||
    (unsafeMeta.role as string) ||
    (isAdminEmail ? "Administrator" : unsafeMeta.accountType === "pet_owner" ? "Pet Owner" : undefined);

  const userRole = normalizeSyncVetRole(rawRole);

  // Administrators and Veterinarians NEVER need onboarding pages
  const isStaff = isAdminEmail || userRole === "Administrator" || userRole === "Veterinarian";

  const isProfileComplete = useMemo(() => {
    if (isStaff) return true;
    if (!isLoaded || isDbLoading) return false;
    const completedInDb = dbUser?.profile_completed === true && !!dbUser?.phone_number && !!dbUser?.address;
    const completedInClerk = unsafeMeta?.profileCompleted === true && !!unsafeMeta?.phoneNumber && !!unsafeMeta?.address;
    return completedInDb || completedInClerk;
  }, [isStaff, isLoaded, isDbLoading, dbUser, unsafeMeta]);

  useEffect(() => {
    if (!isLoaded) return;

    // If user is not authenticated, redirect to sign-in
    if (!isSignedIn || !user) {
      router.replace("/sign-in");
      return;
    }

    // Administrators and Veterinarians bypass onboarding and go directly to Dashboard
    if (isStaff) {
      router.replace("/dashboard");
      return;
    }

    // If pet owner profile is already complete, redirect to Pet Owner portal
    if (isProfileComplete) {
      router.replace("/pet-owner");
    }
  }, [isLoaded, isSignedIn, user, isStaff, isProfileComplete, router]);

  // Loading state while checking session and role status
  if (!isLoaded || isDbLoading || isStaff || isProfileComplete) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {isStaff
              ? "Connecting to CVO Staff Dashboard..."
              : isProfileComplete
              ? "Your profile is verified. Redirecting to your portal..."
              : "Verifying your municipal Google session..."}
          </p>
        </div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
