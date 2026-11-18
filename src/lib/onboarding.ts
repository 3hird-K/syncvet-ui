import type { SupabaseClient } from "@supabase/supabase-js";

export const ONBOARDING_PROFILE_QUERY_KEY = "onboarding-profile-check";

export type OnboardingProfile = {
  role?: string | null;
  profile_completed?: boolean | null;
  phone_number?: string | null;
  address?: string | null;
};

/**
 * Onboarding data lives on the `public.users` row (there is no separate onboarding
 * table). A row counts as onboarded when the completion flag is set or when the
 * onboarding fields filled in by the wizard are present.
 */
export function hasOnboardingDataInDb(
  profile: OnboardingProfile | null | undefined
): boolean {
  if (!profile) return false;

  return (
    profile.profile_completed === true ||
    !!profile.phone_number?.trim() ||
    !!profile.address?.trim()
  );
}

/**
 * Fetch the onboarding status for the signed-in user. Falls back to email because
 * some existing records were created before the Clerk user id was stored.
 */
export async function fetchOnboardingProfile(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null
): Promise<OnboardingProfile | null> {
  const columns = "role, profile_completed, phone_number, address";

  let { data } = await supabase
    .from("users")
    .select(columns)
    .eq("id", userId)
    .maybeSingle();

  if (!data && email) {
    const byEmail = await supabase
      .from("users")
      .select(columns)
      .ilike("email", email)
      .maybeSingle();
    data = byEmail.data;
  }

  return (data as OnboardingProfile | null) ?? null;
}
