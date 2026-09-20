import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Creates an authenticated Supabase client for Server Components,
 * Server Actions, or Route Handlers using Clerk auth context.
 */
export async function createClerkSupabaseServerClient() {
  const { getToken } = await auth();

  return createClient(supabaseUrl, supabaseAnonKey, {
    accessToken: async () => {
      return (await getToken()) ?? null;
    },
  });
}

/**
 * Creates a public unauthenticated Supabase client for server-side usage.
 */
export function createPublicSupabaseServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}
