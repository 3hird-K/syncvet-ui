"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useClerkSupabaseClient } from "@/lib/supabase/client";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const supabase = useClerkSupabaseClient();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || hasSynced.current) return;

    const currentUser = user;

    async function syncUserToSupabase() {
      try {
        hasSynced.current = true;
        const email = currentUser.primaryEmailAddress?.emailAddress ?? "";
        const fullName =
          currentUser.fullName ||
          `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim();

        // Extract and combine both unsafeMetadata and publicMetadata from Clerk
        const unsafeMeta = (currentUser.unsafeMetadata || {}) as Record<string, unknown>;
        const publicMeta = (currentUser.publicMetadata || {}) as Record<string, unknown>;
        const combinedMeta = { ...publicMeta, ...unsafeMeta };

        // Normalize specific fields from Clerk metadata
        const role =
          (unsafeMeta.roleTitle as string) ||
          (publicMeta.roleTitle as string) ||
          (publicMeta.role as string) ||
          "citizen";
        const address =
          (unsafeMeta.address as string) || (publicMeta.address as string) || null;
        const phoneNumber =
          (unsafeMeta.mobileNumber as string) ||
          (unsafeMeta.phoneNumber as string) ||
          currentUser.primaryPhoneNumber?.phoneNumber ||
          null;
        const profileCompleted =
          (unsafeMeta.profileCompleted as boolean) ??
          (publicMeta.profileCompleted as boolean) ??
          false;

        // Upsert user into Supabase `public.users` table
        const { error } = await supabase.from("users").upsert(
          {
            id: currentUser.id,
            email,
            first_name: currentUser.firstName ?? "",
            last_name: currentUser.lastName ?? "",
            full_name: fullName,
            avatar_url: currentUser.imageUrl ?? "",
            role,
            address,
            phone_number: phoneNumber,
            profile_completed: profileCompleted,
            raw_user_meta_data: combinedMeta,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

        if (error) {
          console.warn("Supabase user sync notice:", error.message);
        }

        // If Clerk metadata includes an array of pets, auto-sync them to public.pets table as well
        if (Array.isArray(unsafeMeta.pets) && unsafeMeta.pets.length > 0) {
          for (const petItem of unsafeMeta.pets) {
            if (petItem && typeof petItem === "object") {
              const pet = petItem as Record<string, unknown>;
              if (pet.name) {
                try {
                  await supabase
                    .from("pets")
                    .upsert(
                      {
                        id: (pet.id as string) || undefined,
                        owner_id: currentUser.id,
                        name: String(pet.name),
                        species: String(pet.species || pet.type || "Canine"),
                        breed: (pet.breed as string) || null,
                        microchip_number:
                          (pet.microchip as string) ||
                          (pet.microchipNumber as string) ||
                          null,
                        rabies_vaccinated: Boolean(
                          pet.rabiesVaccinated || pet.vaccinated
                        ),
                      },
                      { onConflict: "id" }
                    );
                } catch {
                  // Ignore per-pet upsert error if table schema differs
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Clerk to Supabase sync error:", err);
      }
    }

    syncUserToSupabase();
  }, [isLoaded, isSignedIn, user, supabase]);

  return <>{children}</>;
}
