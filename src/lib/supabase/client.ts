import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";
import { useMemo } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

let publicSupabaseClient: SupabaseClient | null = null;

/**
 * Public Supabase client for unauthenticated or public queries.
 * Returns a singleton instance to avoid infinite re-render loops and duplicated client connections.
 */
export function getPublicSupabaseClient(): SupabaseClient {
  if (!publicSupabaseClient) {
    publicSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return publicSupabaseClient;
}

/**
 * React hook that returns an authenticated Supabase client using the active Clerk session.
 * Passes the Clerk JWT seamlessly to Supabase so Row-Level Security (RLS) can read `auth.jwt() ->> 'sub'`.
 */
export function useClerkSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      accessToken: async () => {
        // Obtains the active Clerk JWT token to authorize Supabase queries
        return (await session?.getToken()) ?? null;
      },
    });
  }, [session]);
}
