"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { normalizeSyncVetRole } from "@/data/syncvet-users";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Routes reserved exclusively for City Veterinary Office Staff (Admin, Vet, Vaccinator)
const STAFF_ONLY_ROUTES = [
  "/dashboard",
  "/vaccination-records",
  "/consultations",
  "/pet-registry",
  "/vaccine-inventory",
  "/field-operations",
  "/manage-users",
  "/users",
  "/owners",
  "/animal-control",
  "/barangay-analytics",
  "/certificates",
];

// Routes reserved for Pet Owners
const PET_OWNER_ROUTES = [
  "/pet-owner",
];

export function DashboardRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { user, isLoaded } = useUser();
  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  const { data: dbUser, isLoading: isDbLoading } = useQuery({
    queryKey: ["current-user-role", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: isLoaded && !!user?.id,
  });

  const metadata = user?.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
  const userEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  const isAdminEmail = userEmail === "dime.neil03@gmail.com";

  const userRole = normalizeSyncVetRole(
    dbUser?.role ||
    metadata?.roleTitle ||
    (isAdminEmail ? "Administrator" : metadata?.accountType === "pet_owner" ? "Pet Owner" : undefined)
  );

  const isStaff =
    isAdminEmail ||
    userRole === "Administrator" ||
    userRole === "Veterinarian" ||
    userRole === "Vaccinator";

  const isPetOwner = !isStaff && userRole === "Pet Owner";

  const isStaffRoute = STAFF_ONLY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
  const isPetOwnerRoute = PET_OWNER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // 1. Pet Owner attempting to view municipal staff operations
  const isPetOwnerUnauthorized = isLoaded && !isDbLoading && isPetOwner && isStaffRoute;

  // 2. Staff attempting to view citizen portal
  const isStaffOnPetOwnerRoute = isLoaded && !isDbLoading && isStaff && isPetOwnerRoute;

  // 3. Non-admin attempting to access user management
  const isNonAdminOnManageUsers =
    isLoaded &&
    !isDbLoading &&
    pathname.startsWith("/manage-users") &&
    userRole !== "Administrator" &&
    !isAdminEmail;

  useEffect(() => {
    if (isPetOwnerUnauthorized) {
      router.replace("/pet-owner");
    } else if (isStaffOnPetOwnerRoute) {
      router.replace("/dashboard");
    } else if (isNonAdminOnManageUsers) {
      router.replace("/dashboard");
    }
  }, [isPetOwnerUnauthorized, isStaffOnPetOwnerRoute, isNonAdminOnManageUsers, router]);

  // Show skeleton during auth/role resolution or while redirecting unauthorized user
  if (!isLoaded || isDbLoading) {
    return <DashboardSkeleton variant={isStaffRoute ? "admin" : "pet-owner"} />;
  }

  if (isPetOwnerUnauthorized) {
    return <DashboardSkeleton variant="pet-owner" />;
  }

  if (isStaffOnPetOwnerRoute || isNonAdminOnManageUsers) {
    return <DashboardSkeleton variant="admin" />;
  }

  return <>{children}</>;
}
