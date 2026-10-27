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

export type SyncVetRole = "Administrator" | "Veterinarian" | "Pet Owner";

export const SYNCVET_ROLES: readonly SyncVetRole[] = [
  "Administrator",
  "Veterinarian",
  "Pet Owner",
] as const;

// ── CVO Realtime Types matching Supabase Tables ──

export interface SupabaseConsultation {
  id: string;
  encounter_no: string;
  pet_id: string | null;
  pet_name: string;
  species: "Dog" | "Cat" | "Livestock" | "Other";
  breed: string | null;
  owner_id: string | null;
  owner_name: string;
  owner_contact: string | null;
  owner_barangay: string | null;
  vet_name: string;
  date: string;
  time: string;
  chief_complaint: string;
  symptoms: string[] | null;
  weight_kg: number | null;
  temperature_c: number | null;
  heart_rate_bpm: number | null;
  mucous_membrane: string | null;
  diagnosis: string;
  treatment: string;
  medication: string | null;
  dosage_instructions: string | null;
  follow_up_date: string | null;
  status: "waiting" | "in-consultation" | "treatment" | "completed";
  service_type: string;
  veterinarian_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseCertificate {
  id: string;
  certificate_number: string;
  qr_code_url: string | null;
  issue_date: string;
  valid_until: string;
  purpose: "Domestic Air/Sea Travel" | "Inter-Barangay Transport" | "General Health Declaration" | "Adoption Clearance";
  pet_id: string | null;
  pet_name: string;
  species: "Dog" | "Cat" | "Livestock";
  breed: string | null;
  sex: "Male" | "Female" | null;
  age: string | null;
  color: string | null;
  microchip_or_tag: string | null;
  owner_id: string | null;
  owner_name: string;
  owner_address: string | null;
  owner_barangay: string | null;
  owner_contact: string | null;
  rabies_vaccination: {
    brand: string;
    batchNumber: string;
    dateGiven: string;
    validUntil: string;
    vaccinator: string;
  } | Json;
  findings: string;
  fit_for_travel: boolean;
  issuing_office: string;
  issuing_vet: string;
  vet_license_no: string | null;
  vet_ptr_no: string | null;
  status: "valid" | "expired" | "revoked";
  created_at: string;
  updated_at: string;
}

export interface SupabaseInventoryItem {
  id: string;
  name: string;
  category: "Vaccines" | "Medicines" | "Medical Supplies" | "Surgical Supplies" | "Equipment";
  batch_number: string;
  manufacturer: string | null;
  stock: number;
  unit: "doses" | "vials" | "tablets" | "boxes" | "units";
  minimum_stock: number;
  expiration_date: string;
  storage_location: string | null;
  status: "in-stock" | "low-stock" | "expiring-soon" | "expired";
  fefo_priority: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAnimalControlCase {
  id: string;
  case_id: string;
  animal_description: string;
  species: "Dog" | "Cat" | "Livestock";
  breed_estimate: string | null;
  color: string | null;
  estimated_age: string | null;
  gender: "Male" | "Female" | "Unknown" | null;
  date_captured: string;
  capture_time: string | null;
  barangay: string;
  specific_location: string | null;
  reason: "Stray Roaming" | "Rabies Observation (Bite Incident)" | "Animal Cruelty Rescue" | "Public Safety Complaint";
  impounding_facility: string | null;
  intake_officer: string;
  status: "impounded" | "claimed" | "released" | "adopted" | "closed";
  holding_days_elapsed: number;
  max_holding_days: number;
  owner_claimant: Json | null;
  timeline: {
    timestamp: string;
    stage: string;
    officer: string;
    notes: string;
  }[] | Json;
  created_at: string;
  updated_at: string;
}

export interface SupabaseVaccinationRecord {
  id: string;
  record_no: string;
  pet_id: string | null;
  pet_name: string;
  species: string | null;
  breed: string | null;
  owner_id: string | null;
  owner_name: string;
  owner_contact: string | null;
  vaccine_name: string;
  batch_number: string | null;
  administered_date: string;
  next_due_date: string | null;
  veterinarian: string;
  barangay: string | null;
  status: "complete" | "overdue" | "scheduled";
  created_at: string;
  updated_at: string;
}

export interface SupabaseFieldOperation {
  id: string;
  op_id: string;
  barangay: string;
  operation_type: string;
  lead: string;
  scheduled_date: string;
  target_pets: number;
  vaccinated_pets: number;
  status: "scheduled" | "in-progress" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAuditLog {
  id: string;
  user_name: string;
  role: string;
  action: string;
  entity: string;
  record_id: string;
  details: string | null;
  created_at: string;
}

