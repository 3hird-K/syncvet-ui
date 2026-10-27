import type { Database } from "@/types/database.types";

export type SupabaseUser = Database["public"]["Tables"]["users"]["Row"];

export type SyncVetRole =
  | "Administrator"
  | "Veterinarian"
  | "Pet Owner";

export const SYNCVET_ROLES: readonly SyncVetRole[] = [
  "Administrator",
  "Veterinarian",
  "Pet Owner",
] as const;

/**
 * Normalizes any database or legacy role string to one of the 3 standard SyncVet roles.
 */
export function normalizeSyncVetRole(role: string | null | undefined): SyncVetRole {
  if (!role) return "Pet Owner";
  const r = role.toLowerCase().trim();
  if (r.includes("admin")) return "Administrator";
  if (r.includes("vet")) return "Veterinarian";
  if (r.includes("owner") || r.includes("citizen") || r.includes("pet") || r.includes("viewer")) return "Pet Owner";
  // Any legacy field or vaccinator roles gracefully map to Veterinarian
  if (r.includes("vaccin") || r.includes("field") || r.includes("officer")) return "Veterinarian";
  return "Pet Owner";
}

export function formatRoleLabel(role: string | null | undefined): string {
  return normalizeSyncVetRole(role).toUpperCase();
}

/**
 * Calculate user stats based on Supabase real records
 */
export function syncVetUserStats(users: SupabaseUser[]) {
  const total = users.length;
  const admins = users.filter((u) => normalizeSyncVetRole(u.role) === "Administrator").length;
  const veterinarians = users.filter((u) => normalizeSyncVetRole(u.role) === "Veterinarian").length;
  const petOwners = users.filter((u) => normalizeSyncVetRole(u.role) === "Pet Owner").length;
  return { total, admins, veterinarians, petOwners };
}
