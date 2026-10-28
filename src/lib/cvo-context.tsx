"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import {
  type CVOConsultation,
  type CVOHealthCertificate,
  type CVOAnimalControlCase,
  type CVOInventoryItem,
  type CVOAuditLog,
  type CVOOfflineVaccinationRecord,
  type CVOFieldOperation,
  initialConsultations,
  isConsultationLockedByVet,
} from "@/data/cvo-store";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { normalizeSyncVetRole } from "@/data/syncvet-users";

interface CVOContextType {
  consultations: CVOConsultation[];
  certificates: CVOHealthCertificate[];
  animalControlCases: CVOAnimalControlCase[];
  inventory: CVOInventoryItem[];
  fieldOperations: CVOFieldOperation[];
  auditLogs: CVOAuditLog[];
  offlineRecords: CVOOfflineVaccinationRecord[];
  activeRoleView: "Administrator" | "Veterinarian" | "Staff" | "Pet Owner";
  setActiveRoleView: (role: "Administrator" | "Veterinarian" | "Staff" | "Pet Owner") => void;
  addConsultation: (consultation: Omit<CVOConsultation, "id" | "encounterNo">) => CVOConsultation;
  updateConsultationStatus: (id: string, status: CVOConsultation["status"]) => void;
  updateConsultation: (id: string, updates: Partial<CVOConsultation>) => void;
  deleteConsultation: (id: string) => Promise<boolean>;
  addCertificate: (cert: Omit<CVOHealthCertificate, "certificateNumber" | "qrCodeUrl">) => CVOHealthCertificate;
  addAnimalControlCase: (c: Omit<CVOAnimalControlCase, "caseId">) => CVOAnimalControlCase;
  updateAnimalControlStatus: (caseId: string, status: CVOAnimalControlCase["status"]) => void;
  addFieldOperation: (op: Omit<CVOFieldOperation, "id" | "opId">) => Promise<CVOFieldOperation>;
  addOfflineRecord: (rec: Omit<CVOOfflineVaccinationRecord, "id" | "timestamp" | "syncStatus">) => void;
  syncOfflineRecords: () => Promise<number>;
  addAuditLog: (log: Omit<CVOAuditLog, "id" | "timestamp">) => void;
  deductInventoryStock: (batchNumberOrId: string, quantity?: number) => Promise<boolean>;
  addInventoryBatch: (item: Omit<CVOInventoryItem, "id" | "daysToExpiry">) => Promise<boolean>;
  deleteInventoryBatch: (idOrBatchNumber: string) => Promise<boolean>;
  updateInventoryBatch: (idOrBatchNumber: string, updates: Partial<CVOInventoryItem>) => Promise<boolean>;
  isRealtimeConnected: boolean;
}

const CVOContext = createContext<CVOContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CONSULTATIONS: "cvo_consultations_v2",
  CERTIFICATES: "cvo_certificates_v2",
  ANIMAL_CONTROL: "cvo_animal_control_v2",
  INVENTORY: "cvo_inventory_v2",
  FIELD_OPERATIONS: "cvo_field_operations_v2",
  AUDIT_LOGS: "cvo_audit_logs_v2",
  OFFLINE_QUEUE: "cvo_offline_queue_v2",
  ROLE_VIEW: "cvo_active_role_view",
};

// ── Database mappers ─────────────────────────────────────────────────────────

function mapDbConsultationToCVO(row: any): CVOConsultation {
  let formMeta: any = {};
  if (row.veterinarian_notes && typeof row.veterinarian_notes === "string" && row.veterinarian_notes.includes("__CVO_FORM_META__:")) {
    try {
      const parts = row.veterinarian_notes.split("__CVO_FORM_META__:");
      formMeta = JSON.parse(parts[1]);
    } catch {
      // ignore
    }
  }

  const rawNotes = row.veterinarian_notes
    ? row.veterinarian_notes.split("__CVO_FORM_META__:")[0].trim()
    : undefined;

  return {
    id: row.id,
    encounterNo: row.encounter_no,
    petId: row.pet_id || "",
    petName: row.pet_name,
    species: row.species,
    breed: row.breed || "",
    ownerName: row.owner_name,
    ownerContact: row.owner_contact || "",
    ownerBarangay: row.owner_barangay || "",
    vetName: row.vet_name,
    date: row.date,
    time: row.time,
    chiefComplaint: row.chief_complaint,
    symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
    vitals: {
      weightKg: Number(row.weight_kg) || 0,
      temperatureC: Number(row.temperature_c) || 0,
      heartRateBpm: row.heart_rate_bpm ? Number(row.heart_rate_bpm) : undefined,
      mucousMembrane: row.mucous_membrane || "Normal (Pink)",
    },
    diagnosis: row.diagnosis,
    treatment: row.treatment,
    medication: row.medication || "",
    dosageInstructions: row.dosage_instructions || "",
    followUpDate: row.follow_up_date || undefined,
    status: row.status,
    veterinarianNotes: rawNotes || undefined,
    serviceType: row.service_type || "Field Treatment/Consultation",
    noOfHeads: formMeta.noOfHeads ?? row.no_of_heads ?? 1,
    dateOfBirth: formMeta.dateOfBirth ?? row.date_of_birth,
    age: formMeta.age ?? row.age,
    gender: formMeta.gender ?? row.gender,
    color: formMeta.color ?? row.color,
    weightAssessment: formMeta.weightAssessment ?? row.weight_assessment,
    bodyConditionScore: formMeta.bodyConditionScore ?? row.body_condition_score,
    servicesRequested: formMeta.servicesRequested ?? row.services_requested,
    clinicalSystems: formMeta.clinicalSystems ?? row.clinical_systems,
    recommendations: formMeta.recommendations ?? row.recommendations,
    followUp: formMeta.followUp ?? row.follow_up,
  };
}

function mapDbInventoryToCVO(row: any): CVOInventoryItem {
  const expiry = new Date(row.expiration_date);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    batchNumber: row.batch_number,
    manufacturer: row.manufacturer || "",
    stock: Number(row.stock),
    unit: row.unit,
    minimumStock: Number(row.minimum_stock),
    expirationDate: row.expiration_date,
    daysToExpiry: Number.isFinite(daysToExpiry) ? daysToExpiry : 90,
    storageLocation: row.storage_location || "Cold Storage Unit 1",
    status: row.status,
    fefoPriority: Number(row.fefo_priority) || 1,
  };
}

function mapDbAnimalControlToCVO(row: any): CVOAnimalControlCase {
  return {
    caseId: row.case_id,
    animalDescription: row.animal_description,
    species: row.species,
    breedEstimate: row.breed_estimate || "",
    color: row.color || "",
    estimatedAge: row.estimated_age || "",
    gender: row.gender || "Unknown",
    dateCaptured: row.date_captured,
    captureTime: row.capture_time || "08:00 AM",
    barangay: row.barangay,
    specificLocation: row.specific_location || "",
    reason: row.reason,
    impoundingFacility: row.impounding_facility || "CVO Animal Impounding Facility — Brgy. Agusan",
    intakeOfficer: row.intake_officer,
    status: row.status,
    holdingDaysElapsed: Number(row.holding_days_elapsed) || 0,
    maxHoldingDays: Number(row.max_holding_days) || 5,
    ownerClaimant: row.owner_claimant || undefined,
    timeline: Array.isArray(row.timeline) ? row.timeline : [],
  };
}

function mapDbAuditLogToCVO(row: any): CVOAuditLog {
  const timeFormatted = new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(new Date(row.created_at));

  return {
    id: row.id,
    timestamp: timeFormatted,
    user: row.user_name,
    role: row.role,
    action: row.action,
    entity: row.entity,
    recordId: row.record_id,
    details: row.details || "",
  };
}

function mapDbFieldOperationToCVO(row: any): CVOFieldOperation {
  return {
    id: row.id,
    opId: row.op_id,
    barangay: row.barangay,
    type: row.operation_type,
    lead: row.lead,
    date: row.scheduled_date,
    petsTarget: Number(row.target_pets) || 100,
    petsVaccinated: Number(row.vaccinated_pets) || 0,
    status: row.status || "scheduled",
    notes: row.notes || undefined,
  };
}


export function CVOProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getPublicSupabaseClient(), []);
  const queryClient = useQueryClient();

  const { user, isLoaded: isUserLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [offlineRecords, setOfflineRecords] = useState<CVOOfflineVaccinationRecord[]>([]);
  const [activeRoleView, setActiveRoleView] = useState<"Administrator" | "Veterinarian" | "Staff" | "Pet Owner">("Administrator");

  // Sync role view with logged in user role (e.g. Administrator, Pet Owner)
  useEffect(() => {
    if (!isUserLoaded || !user) return;
    const meta = user.unsafeMetadata as { roleTitle?: string; accountType?: string } | undefined;
    const userEmail = user.primaryEmailAddress?.emailAddress?.toLowerCase();
    const isAdminEmail = userEmail === "dime.neil03@gmail.com";

    const checkUserRole = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const dbRole = data?.role ? normalizeSyncVetRole(data.role) : null;
        const effectiveRole =
          dbRole ||
          (isAdminEmail ? "Administrator" : meta?.roleTitle ? normalizeSyncVetRole(meta.roleTitle) : "Pet Owner");

        if (effectiveRole === "Administrator" || effectiveRole === "Veterinarian") {
          setActiveRoleView(effectiveRole);
        } else {
          setActiveRoleView("Pet Owner");
        }
      } catch {
        if (isAdminEmail) {
          setActiveRoleView("Administrator");
        } else {
          setActiveRoleView("Pet Owner");
        }
      }
    };
    checkUserRole();
  }, [isUserLoaded, user, supabase]);

  // ── TanStack Query 1: Consultations ──
  const { data: consultations = [] } = useQuery<CVOConsultation[]>({
    queryKey: ["cvo_consultations"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("consultations")
          .select("*")
          .order("date", { ascending: false });

        if (error) return initialConsultations;
        const mapped = (data || []).map(mapDbConsultationToCVO);
        return mapped.length > 0 ? mapped : initialConsultations;
      } catch {
        return initialConsultations;
      }
    },
    staleTime: 1000 * 30,
  });

  // ── Health Certificates (Disabled / Not utilized in CVO system) ──
  const certificates: CVOHealthCertificate[] = useMemo(() => [], []);

  // ── TanStack Query 3: FEFO Inventory ──
  const { data: inventory = [] } = useQuery<CVOInventoryItem[]>({
    queryKey: ["cvo_inventory"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("inventory_items")
          .select("*")
          .order("fefo_priority", { ascending: true });

        if (error || !data) {
          return [];
        }
        return (data || []).map(mapDbInventoryToCVO);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // ── TanStack Query 4: Animal Control Cases ──
  const { data: animalControlCases = [] } = useQuery<CVOAnimalControlCase[]>({
    queryKey: ["cvo_animal_control"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("animal_control_cases")
          .select("*")
          .order("date_captured", { ascending: false });

        if (error) return [];
        return (data || []).map(mapDbAnimalControlToCVO);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // ── TanStack Query 5: Audit Logs ──
  const { data: auditLogs = [] } = useQuery<CVOAuditLog[]>({
    queryKey: ["cvo_audit_logs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("audit_logs")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) return [];
        return (data || []).map(mapDbAuditLogToCVO);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // ── TanStack Query 6: Field Operations ──
  const { data: fieldOperations = [] } = useQuery<CVOFieldOperation[]>({
    queryKey: ["cvo_field_operations"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("field_operations")
          .select("*")
          .order("scheduled_date", { ascending: false });

        if (error) return [];
        return (data || []).map(mapDbFieldOperationToCVO);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 30,
  });

  // ── Supabase Realtime Subscriptions via TanStack Query ──
  useEffect(() => {
    setMounted(true);

    // Purge legacy dummy storage caches
    try {
      [
        "cvo_consultations_v1",
        "cvo_certificates_v1",
        "cvo_animal_control_v1",
        "cvo_inventory_v1",
        "cvo_audit_logs_v1",
      ].forEach((key) => localStorage.removeItem(key));

      const savedOffline = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (savedOffline) setOfflineRecords(JSON.parse(savedOffline));

      const savedRole = localStorage.getItem(STORAGE_KEYS.ROLE_VIEW);
      if (savedRole) setActiveRoleView(savedRole as any);
    } catch (e) {
      console.error("Local storage load notice", e);
    }

    const channel = supabase
      .channel("cvo-command-center-realtime")
      // 1. Consultations
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "consultations" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            toast.info(`Live Realtime: New Encounter ${row.encounter_no || ""}`, {
              description: `Patient: ${row.pet_name || "Pet"} • Attending: ${row.vet_name || "Veterinarian"}`,
            });
          }
        }
      )
      // 3. Inventory
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
        }
      )
      // 4. Animal Control Cases
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "animal_control_cases" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["cvo_animal_control"] });
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            toast.warning(`Live Realtime: Animal Control Case ${row.case_id || ""}`, {
              description: `Apprehended in Brgy. ${row.barangay || "CDO"} • Status: ${row.status}`,
            });
          }
        }
      )
      // 5. Field Operations
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "field_operations" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["cvo_field_operations"] });
          if (payload.eventType === "INSERT") {
            const row = payload.new as any;
            toast.info(`Live Realtime: Field Operation Scheduled`, {
              description: `${row.operation_type || "Drive"} in Brgy. ${row.barangay || "CDO"}`,
            });
          }
        }
      )
      // 6. Audit Logs
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "audit_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["cvo_audit_logs"] });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, queryClient]);

  // Save changes to localStorage for offline persistence
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEYS.CONSULTATIONS, JSON.stringify(consultations));
      localStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));
      localStorage.setItem(STORAGE_KEYS.ANIMAL_CONTROL, JSON.stringify(animalControlCases));
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
      localStorage.setItem(STORAGE_KEYS.FIELD_OPERATIONS, JSON.stringify(fieldOperations));
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
      localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(offlineRecords));
    } catch {}
  }, [consultations, certificates, animalControlCases, inventory, fieldOperations, auditLogs, offlineRecords, mounted]);

  // ── Actions & Mutations with Instant TanStack Cache & Supabase Sync ──

  const addAuditLog = (log: Omit<CVOAuditLog, "id" | "timestamp">) => {
    const timeFormatted = new Intl.DateTimeFormat("en-PH", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(new Date());

    const newEntry: CVOAuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: timeFormatted,
    };

    // Optimistic UI update in TanStack Query
    queryClient.setQueryData<CVOAuditLog[]>(["cvo_audit_logs"], (old = []) => [newEntry, ...old]);

    // Push to Supabase if table exists
    void (async () => {
      try {
        await supabase.from("audit_logs").insert({
          user_name: log.user,
          role: log.role,
          action: log.action,
          entity: log.entity,
          record_id: log.recordId,
          details: log.details,
        });
      } catch (err) {
        console.warn("Supabase audit log insert notice", err);
      }
    })();
  };

  const addConsultation = (c: Omit<CVOConsultation, "id" | "encounterNo">): CVOConsultation => {
    const id = `c-${Date.now()}`;
    const nextEncNum = 480 + consultations.length + 1;
    const encounterNo = `ENC-2026-${String(nextEncNum).padStart(5, "0")}`;
    const newConsultation: CVOConsultation = {
      ...c,
      id,
      encounterNo,
    };

    // Optimistic TanStack Query update
    queryClient.setQueryData<CVOConsultation[]>(["cvo_consultations"], (old = []) => [newConsultation, ...old]);

    // Serialize CVO form metadata so full clinical systems and services are preserved
    const formMeta: Record<string, any> = {};
    if (c.noOfHeads) formMeta.noOfHeads = c.noOfHeads;
    if (c.dateOfBirth) formMeta.dateOfBirth = c.dateOfBirth;
    if (c.age) formMeta.age = c.age;
    if (c.gender) formMeta.gender = c.gender;
    if (c.color) formMeta.color = c.color;
    if (c.weightAssessment) formMeta.weightAssessment = c.weightAssessment;
    if (c.bodyConditionScore) formMeta.bodyConditionScore = c.bodyConditionScore;
    if (c.servicesRequested) formMeta.servicesRequested = c.servicesRequested;
    if (c.clinicalSystems) formMeta.clinicalSystems = c.clinicalSystems;
    if (c.recommendations) formMeta.recommendations = c.recommendations;
    if (c.followUp !== undefined) formMeta.followUp = c.followUp;

    let encodedNotes = c.veterinarianNotes || "";
    if (Object.keys(formMeta).length > 0) {
      encodedNotes = `${encodedNotes} __CVO_FORM_META__:${JSON.stringify(formMeta)}`;
    }

    // Sync to Supabase
    void (async () => {
      try {
        await supabase.from("consultations").insert({
          encounter_no: encounterNo,
          pet_id: c.petId || null,
          pet_name: c.petName,
          species: c.species,
          breed: c.breed || null,
          owner_name: c.ownerName,
          owner_contact: c.ownerContact || null,
          owner_barangay: c.ownerBarangay || null,
          vet_name: c.vetName,
          date: c.date,
          time: c.time,
          chief_complaint: c.chiefComplaint,
          symptoms: c.symptoms || [],
          weight_kg: c.vitals.weightKg,
          temperature_c: c.vitals.temperatureC,
          heart_rate_bpm: c.vitals.heartRateBpm || null,
          mucous_membrane: c.vitals.mucousMembrane || null,
          diagnosis: c.diagnosis,
          treatment: c.treatment,
          medication: c.medication || null,
          dosage_instructions: c.dosageInstructions || null,
          follow_up_date: c.followUpDate || null,
          status: c.status,
          service_type: c.serviceType,
          veterinarian_notes: encodedNotes || null,
        });
      } catch (err) {
        console.warn("Supabase consultation insert notice", err);
      }
    })();

    addAuditLog({
      user: c.vetName,
      role: "Veterinarian",
      action: "Created Clinical Consultation",
      entity: "Consultation",
      recordId: encounterNo,
      details: `Encounter recorded for ${c.petName} (${c.species}, Owner: ${c.ownerName}). Diagnosis: ${c.diagnosis}`,
    });

    return newConsultation;
  };

  const updateConsultationStatus = (id: string, status: CVOConsultation["status"]) => {
    // Optimistic TanStack Query update
    queryClient.setQueryData<CVOConsultation[]>(["cvo_consultations"], (old = []) =>
      old.map((c) => (c.id === id ? { ...c, status } : c))
    );

    // Sync to Supabase
    void (async () => {
      try {
        await supabase
          .from("consultations")
          .update({ status })
          .or(`id.eq.${id},encounter_no.eq.${id}`);
      } catch (err) {
        console.warn("Supabase consultation update notice", err);
      }
    })();
  };
  const updateConsultation = (id: string, updates: Partial<CVOConsultation>) => {
    // Optimistic TanStack Query update
    queryClient.setQueryData<CVOConsultation[]>(["cvo_consultations"], (old = []) =>
      old.map((c) => (c.id === id || c.encounterNo === id ? { ...c, ...updates } : c))
    );

    // Sync to Supabase
    void (async () => {
      try {
        const formMeta: Record<string, any> = {};
        if (updates.clinicalSystems !== undefined) formMeta.clinicalSystems = updates.clinicalSystems;
        if (updates.servicesRequested !== undefined) formMeta.servicesRequested = updates.servicesRequested;
        if (updates.bodyConditionScore !== undefined) formMeta.bodyConditionScore = updates.bodyConditionScore;
        if (updates.recommendations !== undefined) formMeta.recommendations = updates.recommendations;
        if (updates.followUp !== undefined) formMeta.followUp = updates.followUp;

        const dbPayload: Record<string, any> = {};
        if (updates.status !== undefined) dbPayload.status = updates.status;
        if (updates.vetName !== undefined) dbPayload.vet_name = updates.vetName;
        if (updates.diagnosis !== undefined) dbPayload.diagnosis = updates.diagnosis;
        if (updates.treatment !== undefined) dbPayload.treatment = updates.treatment;
        if (updates.medication !== undefined) dbPayload.medication = updates.medication;
        if (updates.dosageInstructions !== undefined) dbPayload.dosage_instructions = updates.dosageInstructions;
        if (updates.chiefComplaint !== undefined) dbPayload.chief_complaint = updates.chiefComplaint;
        if (updates.symptoms !== undefined) dbPayload.symptoms = updates.symptoms;
        if (updates.followUpDate !== undefined) dbPayload.follow_up_date = updates.followUpDate;

        if (updates.vitals) {
          if (updates.vitals.weightKg !== undefined) dbPayload.weight_kg = updates.vitals.weightKg;
          if (updates.vitals.temperatureC !== undefined) dbPayload.temperature_c = updates.vitals.temperatureC;
          if (updates.vitals.heartRateBpm !== undefined) dbPayload.heart_rate_bpm = updates.vitals.heartRateBpm;
          if (updates.vitals.mucousMembrane !== undefined) dbPayload.mucous_membrane = updates.vitals.mucousMembrane;
        }

        let baseNotes = updates.veterinarianNotes !== undefined ? updates.veterinarianNotes : "";
        if (Object.keys(formMeta).length > 0) {
          dbPayload.veterinarian_notes = `${baseNotes} __CVO_FORM_META__:${JSON.stringify(formMeta)}`.trim();
        } else if (updates.veterinarianNotes !== undefined) {
          dbPayload.veterinarian_notes = baseNotes;
        }

        await supabase
          .from("consultations")
          .update(dbPayload)
          .or(`id.eq.${id},encounter_no.eq.${id}`);
      } catch (err) {
        console.warn("Supabase consultation clinical update notice", err);
      }
    })();
  };

  const deleteConsultation = async (id: string): Promise<boolean> => {
    // Check if the consultation is locked by vet response/modifications
    const existing = consultations.find((c) => c.id === id || c.encounterNo === id);
    if (existing && isConsultationLockedByVet(existing)) {
      toast.error("Cannot Delete Official Record", {
        description: "Official consultations that have been reviewed, diagnosed, or attended by a veterinarian cannot be deleted.",
      });
      return false;
    }

    // Optimistic TanStack Query update
    queryClient.setQueryData<CVOConsultation[]>(["cvo_consultations"], (old = []) =>
      old.filter((c) => c.id !== id && c.encounterNo !== id)
    );

    try {
      const { error } = await supabase
        .from("consultations")
        .delete()
        .or(`id.eq.${id},encounter_no.eq.${id}`);

      if (error) {
        console.warn("Supabase consultation delete error:", error.message);
        return false;
      }

      addAuditLog({
        user: activeRoleView,
        role: activeRoleView,
        action: "Deleted Consultation Record",
        entity: "Consultation",
        recordId: id,
        details: `Encounter ${id} removed from municipal records`,
      });

      return true;
    } catch (err) {
      console.error("Delete consultation failed:", err);
      return false;
    }
  };

  const addCertificate = (
    cert: Omit<CVOHealthCertificate, "certificateNumber" | "qrCodeUrl">
  ): CVOHealthCertificate => {
    return {
      ...cert,
      certificateNumber: "N/A",
      qrCodeUrl: "",
    };
  };

  const addAnimalControlCase = (c: Omit<CVOAnimalControlCase, "caseId">): CVOAnimalControlCase => {
    const nextNum = 90 + animalControlCases.length;
    const caseId = `AC-2026-${String(nextNum).padStart(4, "0")}`;
    const newCase: CVOAnimalControlCase = {
      ...c,
      caseId,
    };

    // Optimistic TanStack Query update
    queryClient.setQueryData<CVOAnimalControlCase[]>(["cvo_animal_control"], (old = []) => [newCase, ...old]);

    // Sync to Supabase
    void (async () => {
      try {
        await supabase.from("animal_control_cases").insert({
          case_id: caseId,
          animal_description: c.animalDescription,
          species: c.species,
          breed_estimate: c.breedEstimate,
          color: c.color,
          estimated_age: c.estimatedAge,
          gender: c.gender,
          date_captured: c.dateCaptured,
          capture_time: c.captureTime,
          barangay: c.barangay,
          specific_location: c.specificLocation,
          reason: c.reason,
          impounding_facility: c.impoundingFacility,
          intake_officer: c.intakeOfficer,
          status: c.status,
          holding_days_elapsed: c.holdingDaysElapsed,
          max_holding_days: c.maxHoldingDays,
          timeline: c.timeline,
        });
      } catch (err) {
        console.warn("Supabase animal control insert notice", err);
      }
    })();

    addAuditLog({
      user: c.intakeOfficer,
      role: "Veterinarian",
      action: "Apprehended / Impounded Animal",
      entity: "Animal Control",
      recordId: caseId,
      details: `${c.species} impounded at ${c.specificLocation}, Barangay ${c.barangay}. Reason: ${c.reason}`,
    });

    return newCase;
  };

  const updateAnimalControlStatus = (caseId: string, status: CVOAnimalControlCase["status"]) => {
    const timeFormatted = new Intl.DateTimeFormat("en-PH", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date());

    queryClient.setQueryData<CVOAnimalControlCase[]>(["cvo_animal_control"], (old = []) =>
      old.map((item) => {
        if (item.caseId === caseId) {
          return {
            ...item,
            status,
            timeline: [
              ...item.timeline,
              {
                timestamp: timeFormatted,
                stage: `Status updated to ${status.toUpperCase()}`,
                officer: "CVO Animal Welfare Division",
                notes: `Case status marked as ${status}.`,
              },
            ],
          };
        }
        return item;
      })
    );

    void (async () => {
      try {
        await supabase
          .from("animal_control_cases")
          .update({ status })
          .eq("case_id", caseId);
      } catch (err) {
        console.warn("Supabase animal control status update notice", err);
      }
    })();
  };

  const addOfflineRecord = (rec: Omit<CVOOfflineVaccinationRecord, "id" | "timestamp" | "syncStatus">) => {
    const newRecord: CVOOfflineVaccinationRecord = {
      ...rec,
      id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      syncStatus: "pending",
    };
    setOfflineRecords((prev) => [newRecord, ...prev]);
    toast.success("Saved to Local Field Cache", {
      description: `Vaccination record for ${rec.petName} saved locally. Ready to synchronize when online.`,
    });
  };

  const syncOfflineRecords = async (): Promise<number> => {
    const pending = offlineRecords.filter((r) => r.syncStatus === "pending");
    if (pending.length === 0) {
      toast.info("Queue is Empty", {
        description: "All field records are already synchronized with central CVO servers.",
      });
      return 0;
    }

    // Try batch insertion into Supabase vaccination_records
    try {
      const recordsToInsert = pending.map((p) => ({
        record_no: `VAX-2026-${String(Math.floor(10000 + Math.random() * 90000))}`,
        pet_name: p.petName,
        species: p.species,
        breed: p.breed,
        owner_name: p.ownerName,
        owner_contact: p.ownerContact,
        vaccine_name: p.vaccineBrand,
        batch_number: p.batchNumber,
        administered_date: p.administeredDate,
        next_due_date: p.nextDueDate,
        veterinarian: p.vaccinatorName,
        barangay: p.barangay,
        status: "complete",
      }));

      await supabase.from("vaccination_records").insert(recordsToInsert);
      queryClient.invalidateQueries({ queryKey: ["vaccination_records"] });
    } catch (e) {
      console.warn("Offline batch push notice", e);
    }

    setOfflineRecords((prev) =>
      prev.map((r) => (r.syncStatus === "pending" ? { ...r, syncStatus: "synced" } : r))
    );

    addAuditLog({
      user: "Field Mobile Unit",
      role: "Veterinarian",
      action: "Synchronized Offline Field Records",
      entity: "Field Operations",
      recordId: `SYNC-${Date.now()}`,
      details: `Successfully synchronized ${pending.length} anti-rabies vaccination records from barangay operations into CVO central database.`,
    });

    toast.success("Synchronization Complete", {
      description: `${pending.length} field vaccination records successfully pushed to CVO Central Server.`,
    });

    return pending.length;
  };

  const addFieldOperation = async (op: Omit<CVOFieldOperation, "id" | "opId">): Promise<CVOFieldOperation> => {
    const id = `fo-${Date.now()}`;
    const nextOpNum = fieldOperations.length + 1;
    const opId = `FO-2026-${String(nextOpNum).padStart(3, "0")}`;
    const newOp: CVOFieldOperation = {
      ...op,
      id,
      opId,
    };

    // Optimistic TanStack update
    queryClient.setQueryData<CVOFieldOperation[]>(["cvo_field_operations"], (old = []) => [newOp, ...old]);

    // Push to Supabase if table exists
    void (async () => {
      try {
        await supabase.from("field_operations").insert({
          op_id: opId,
          barangay: op.barangay,
          operation_type: op.type,
          lead: op.lead,
          scheduled_date: op.date,
          target_pets: op.petsTarget,
          vaccinated_pets: op.petsVaccinated,
          status: op.status,
          notes: op.notes,
        });
      } catch (err) {
        console.warn("Supabase field_operations insert notice", err);
      }
    })();

    addAuditLog({
      user: "Current Operator",
      role: "Veterinarian",
      action: "Field Operation Scheduled",
      entity: "Field Operations",
      recordId: opId,
      details: `Scheduled ${op.type} in Barangay ${op.barangay}. Lead: ${op.lead}.`,
    });

    return newOp;
  };

  const deductInventoryStock = async (batchNumberOrId: string, quantity: number = 1): Promise<boolean> => {
    try {
      const item = inventory.find((i) => i.batchNumber === batchNumberOrId || i.id === batchNumberOrId);
      if (!item) return false;
      const newStock = Math.max(0, item.stock - quantity);
      const newStatus = newStock === 0 ? "expired" : newStock <= item.minimumStock ? "low-stock" : "in-stock";

      queryClient.setQueryData<CVOInventoryItem[]>(["cvo_inventory"], (old = []) =>
        old.map((i) =>
          i.batchNumber === batchNumberOrId || i.id === batchNumberOrId
            ? { ...i, stock: newStock, status: newStatus }
            : i
        )
      );

      await supabase
        .from("inventory_items")
        .update({ stock: newStock, status: newStatus })
        .or(`id.eq.${item.id},batch_number.eq.${item.batchNumber}`);

      queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
      return true;
    } catch {
      return false;
    }
  };

  const addInventoryBatch = async (newItem: Omit<CVOInventoryItem, "id" | "daysToExpiry">): Promise<boolean> => {
    try {
      const generatedUuid = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : undefined;

      const expiry = new Date(newItem.expirationDate);
      const diffTime = expiry.getTime() - new Date().getTime();
      const daysToExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          ...(generatedUuid ? { id: generatedUuid } : {}),
          name: newItem.name,
          category: newItem.category,
          batch_number: newItem.batchNumber,
          manufacturer: newItem.manufacturer,
          stock: newItem.stock,
          unit: newItem.unit,
          minimum_stock: newItem.minimumStock,
          expiration_date: newItem.expirationDate,
          storage_location: newItem.storageLocation,
          status: newItem.status,
          fefo_priority: newItem.fefoPriority,
        })
        .select()
        .single();

      if (error) {
        console.error("Supabase inventory insert error:", error);
        return false;
      }

      const insertedItem: CVOInventoryItem = data ? mapDbInventoryToCVO(data) : {
        ...newItem,
        id: generatedUuid || `inv-${Date.now()}`,
        daysToExpiry: Number.isFinite(daysToExpiry) ? daysToExpiry : 90,
      };

      queryClient.setQueryData<CVOInventoryItem[]>(["cvo_inventory"], (old = []) => [
        insertedItem,
        ...old.filter((i) => i.id !== insertedItem.id && i.batchNumber !== insertedItem.batchNumber),
      ]);

      queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
      return true;
    } catch (err) {
      console.error("addInventoryBatch error:", err);
      return false;
    }
  };

  const deleteInventoryBatch = async (idOrBatchNumber: string): Promise<boolean> => {
    try {
      queryClient.setQueryData<CVOInventoryItem[]>(["cvo_inventory"], (old = []) =>
        old.filter((i) => i.id !== idOrBatchNumber && i.batchNumber !== idOrBatchNumber)
      );

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrBatchNumber);
      if (isUuid) {
        await supabase.from("inventory_items").delete().eq("id", idOrBatchNumber);
      } else {
        await supabase.from("inventory_items").delete().eq("batch_number", idOrBatchNumber);
      }
      queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
      return true;
    } catch {
      return false;
    }
  };

  const updateInventoryBatch = async (idOrBatchNumber: string, updates: Partial<CVOInventoryItem>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.batchNumber !== undefined) dbUpdates.batch_number = updates.batchNumber;
      if (updates.manufacturer !== undefined) dbUpdates.manufacturer = updates.manufacturer;
      if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.minimumStock !== undefined) dbUpdates.minimum_stock = updates.minimumStock;
      if (updates.expirationDate !== undefined) dbUpdates.expiration_date = updates.expirationDate;
      if (updates.storageLocation !== undefined) dbUpdates.storage_location = updates.storageLocation;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.fefoPriority !== undefined) dbUpdates.fefo_priority = updates.fefoPriority;

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrBatchNumber);
      if (isUuid) {
        await supabase.from("inventory_items").update(dbUpdates).eq("id", idOrBatchNumber);
      } else {
        await supabase.from("inventory_items").update(dbUpdates).eq("batch_number", idOrBatchNumber);
      }
      queryClient.invalidateQueries({ queryKey: ["cvo_inventory"] });
      return true;
    } catch {
      return false;
    }
  };

  const value = useMemo(
    () => ({
      consultations,
      certificates,
      animalControlCases,
      inventory,
      fieldOperations,
      auditLogs,
      offlineRecords,
      activeRoleView,
      setActiveRoleView: (role: "Administrator" | "Veterinarian" | "Staff" | "Pet Owner") => {
        setActiveRoleView(role);
        try {
          localStorage.setItem(STORAGE_KEYS.ROLE_VIEW, role);
        } catch {}
      },
      addConsultation,
      updateConsultationStatus,
      updateConsultation,
      deleteConsultation,
      addCertificate,
      addAnimalControlCase,
      updateAnimalControlStatus,
      addFieldOperation,
      addOfflineRecord,
      syncOfflineRecords,
      addAuditLog,
      deductInventoryStock,
      addInventoryBatch,
      deleteInventoryBatch,
      updateInventoryBatch,
      isRealtimeConnected,
    }),
    [
      consultations,
      certificates,
      animalControlCases,
      inventory,
      fieldOperations,
      auditLogs,
      offlineRecords,
      activeRoleView,
      isRealtimeConnected,
      deductInventoryStock,
      addInventoryBatch,
      deleteInventoryBatch,
      updateInventoryBatch,
    ]
  );

  return <CVOContext.Provider value={value}>{children}</CVOContext.Provider>;
}

export function useCVO() {
  const context = useContext(CVOContext);
  if (!context) {
    throw new Error("useCVO must be used within a CVOProvider");
  }
  return context;
}

export function useOptionalCVO() {
  return useContext(CVOContext);
}

