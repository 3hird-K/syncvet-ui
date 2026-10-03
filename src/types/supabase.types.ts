import type { Database, Json } from "./database.types";

export type { Database, Json } from "./database.types";

export type SupabaseUser = Database["public"]["Tables"]["users"]["Row"];
export type SupabaseUserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type SupabaseUserUpdate = Database["public"]["Tables"]["users"]["Update"];

export type SupabasePet = Database["public"]["Tables"]["pets"]["Row"];
export type SupabasePetInsert = Database["public"]["Tables"]["pets"]["Insert"];
export type SupabasePetUpdate = Database["public"]["Tables"]["pets"]["Update"];

export type SupabaseAppointment = Database["public"]["Tables"]["appointments"]["Row"];
export type SupabaseAppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type SupabaseAppointmentUpdate = Database["public"]["Tables"]["appointments"]["Update"];

export type SupabaseTransaction = Database["public"]["Tables"]["service_transactions"]["Row"];
export type SupabaseTransactionInsert = Database["public"]["Tables"]["service_transactions"]["Insert"];
export type SupabaseTransactionUpdate = Database["public"]["Tables"]["service_transactions"]["Update"];

export type SyncVetRole = "Administrator" | "Vaccinator" | "Veterinarian" | "Pet Owner";

export const SYNCVET_ROLES: readonly SyncVetRole[] = [
  "Administrator",
  "Vaccinator",
  "Veterinarian",
  "Pet Owner",
] as const;
