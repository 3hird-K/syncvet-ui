"use client";

import { format, isBefore, startOfDay, getDay } from "date-fns";

export type ProcedureServiceType = "vaccination" | "spay-neuter";

export interface SlotConfiguration {
  defaultVaccinationSlots: number; // e.g. 10
  defaultSpayNeuterSlots: number;   // e.g. 5
  dateOverrides: Record<string, { vaccination?: number; spayNeuter?: number }>;
}

export interface DaySlotStatus {
  date: string; // YYYY-MM-DD
  service: ProcedureServiceType;
  totalCapacity: number;
  bookedCount: number;
  remainingSlots: number;
  isAvailable: boolean;
  isWeekend: boolean;
  isPast: boolean;
  isClosedToday?: boolean;
  statusLabel: string;
}

import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const STORAGE_KEY_SLOT_CONFIG = "syncvet_cvo_slot_configuration_v1";
const SYSTEM_QUOTA_ANNOUNCEMENT_TITLE = "[CVO_PROCEDURE_QUOTA_CONFIG]";

const DEFAULT_CONFIG: SlotConfiguration = {
  defaultVaccinationSlots: 10,
  defaultSpayNeuterSlots: 5,
  dateOverrides: {},
};

export function getSlotConfiguration(): SlotConfiguration {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SLOT_CONFIG);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSlotConfiguration(config: SlotConfiguration) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_SLOT_CONFIG, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("cvo-slot-config-updated", { detail: config }));
  } catch (err) {
    console.error("Failed to save slot configuration", err);
  }
}

/**
 * Fetch slot configuration from Supabase with localStorage fallback
 */
export async function fetchSlotConfigurationFromDb(): Promise<SlotConfiguration> {
  const local = getSlotConfiguration();
  try {
    const supabase = getPublicSupabaseClient();
    const { data, error } = await supabase
      .from("announcements")
      .select("content")
      .eq("title", SYSTEM_QUOTA_ANNOUNCEMENT_TITLE)
      .maybeSingle();

    if (data?.content && !error) {
      const parsed = JSON.parse(data.content);
      const merged: SlotConfiguration = {
        defaultVaccinationSlots: Number(parsed.defaultVaccinationSlots) || DEFAULT_CONFIG.defaultVaccinationSlots,
        defaultSpayNeuterSlots: Number(parsed.defaultSpayNeuterSlots) || DEFAULT_CONFIG.defaultSpayNeuterSlots,
        dateOverrides: parsed.dateOverrides || {},
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_SLOT_CONFIG, JSON.stringify(merged));
      }
      return merged;
    }
  } catch (err) {
    console.warn("Notice: Fetching slot configuration from DB fallback to local:", err);
  }
  return local;
}

/**
 * Save slot configuration to both Supabase and localStorage, and broadcast realtime update
 */
export async function saveSlotConfigurationToDb(config: SlotConfiguration): Promise<void> {
  saveSlotConfiguration(config);

  try {
    const supabase = getPublicSupabaseClient();

    // Check if configuration announcement record already exists
    const { data: existing } = await supabase
      .from("announcements")
      .select("id")
      .eq("title", SYSTEM_QUOTA_ANNOUNCEMENT_TITLE)
      .maybeSingle();

    const payload = {
      title: SYSTEM_QUOTA_ANNOUNCEMENT_TITLE,
      content: JSON.stringify(config),
      category: "Clinic Schedule",
      priority: "normal",
      author_name: "CVO Administrator",
      author_role: "Administrator",
      is_active: false, // hidden from citizen announcements feed
      is_pinned: false,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      await supabase
        .from("announcements")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("announcements")
        .insert([payload]);
    }
  } catch (err) {
    console.error("Failed to persist slot configuration to Supabase:", err);
  }
}

/**
 * React hook that returns the active SlotConfiguration and keeps it synchronized in real-time
 */
export function useSlotConfiguration() {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<SlotConfiguration>(() => getSlotConfiguration());

  const { data: config = localConfig, isLoading } = useQuery<SlotConfiguration>({
    queryKey: ["cvo-slot-configuration"],
    queryFn: fetchSlotConfigurationFromDb,
    initialData: localConfig,
    staleTime: 10_000,
  });

  useEffect(() => {
    const supabase = getPublicSupabaseClient();
    const channelName = `cvo-quota-sync-${Math.random().toString(36).substring(2, 9)}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "announcements" },
        (payload: any) => {
          if (payload.new?.title === SYSTEM_QUOTA_ANNOUNCEMENT_TITLE && payload.new?.content) {
            try {
              const parsed = JSON.parse(payload.new.content);
              saveSlotConfiguration(parsed);
              setLocalConfig(parsed);
              queryClient.setQueryData(["cvo-slot-configuration"], parsed);
              queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
              queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });
            } catch {}
          }
        }
      )
      .subscribe();

    const handleLocalUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SlotConfiguration>;
      const newConf = customEvent.detail || getSlotConfiguration();
      setLocalConfig(newConf);
      queryClient.setQueryData(["cvo-slot-configuration"], newConf);
    };

    window.addEventListener("cvo-slot-config-updated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("cvo-slot-config-updated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, [queryClient]);

  const updateConfig = async (newConfig: SlotConfiguration) => {
    setLocalConfig(newConfig);
    queryClient.setQueryData(["cvo-slot-configuration"], newConfig);
    await saveSlotConfigurationToDb(newConfig);
  };

  return {
    slotConfig: config,
    isLoading,
    updateConfig,
  };
}

export function getCapacityForDate(date: Date, service: ProcedureServiceType, config?: SlotConfiguration): number {
  const currentConfig = config || getSlotConfiguration();
  const dateStr = format(date, "yyyy-MM-dd");
  
  if (currentConfig.dateOverrides[dateStr]) {
    const override = currentConfig.dateOverrides[dateStr];
    if (service === "vaccination" && override.vaccination !== undefined) {
      return override.vaccination;
    }
    if (service === "spay-neuter" && override.spayNeuter !== undefined) {
      return override.spayNeuter;
    }
  }

  return service === "vaccination"
    ? currentConfig.defaultVaccinationSlots
    : currentConfig.defaultSpayNeuterSlots;
}

/**
 * Calculates slot availability for a given date and service based on booked appointments list
 */
export function calculateSlotStatus({
  date,
  service,
  bookedAppointments = [],
  config,
}: {
  date: Date;
  service: ProcedureServiceType;
  bookedAppointments: Array<{ date: string; service_id: string; status: string }>;
  config?: SlotConfiguration;
}): DaySlotStatus {
  const dateStr = format(date, "yyyy-MM-dd");
  const dayOfWeek = getDay(date);
  const today = startOfDay(new Date());
  const checkDay = startOfDay(date);

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPast = isBefore(checkDay, today);
  const totalCapacity = getCapacityForDate(date, service, config);

  if (isPast) {
    return {
      date: dateStr,
      service,
      totalCapacity,
      bookedCount: 0,
      remainingSlots: 0,
      isAvailable: false,
      isWeekend,
      isPast: true,
      statusLabel: "Past Date",
    };
  }

  if (isWeekend) {
    return {
      date: dateStr,
      service,
      totalCapacity,
      bookedCount: 0,
      remainingSlots: 0,
      isAvailable: false,
      isWeekend: true,
      isPast: false,
      statusLabel: "Weekend (Closed)",
    };
  }

  // Same-day operating hours check: Same-day booking is open 8:00 AM – 5:00 PM (Monday – Friday).
  // If user wants to book for today, but current time is before 8:00 AM or at/after 5:00 PM (17:00),
  // clinic hours have ended/not opened yet, so same-day booking is disabled.
  const isToday = checkDay.getTime() === today.getTime();
  const now = new Date();
  const currentHour = now.getHours();
  const isSameDayClosed = isToday && (currentHour < 8 || currentHour >= 17);

  if (isSameDayClosed) {
    return {
      date: dateStr,
      service,
      totalCapacity,
      bookedCount: 0,
      remainingSlots: 0,
      isAvailable: false,
      isWeekend: false,
      isPast: false,
      isClosedToday: true,
      statusLabel: currentHour >= 17
        ? "Closed for Today (Hours Ended 5:00 PM)"
        : "Clinic Closed (Opens 8:00 AM)",
    };
  }

  // Count booked appointments for this date and service (deducted upon QR check-in on the day of appointment)
  const bookedCount = bookedAppointments.filter((apt) => {
    if (apt.date !== dateStr || apt.service_id !== service) return false;
    if (apt.status === "cancelled") return false;
    if (isToday) {
      // For today, procedure slot is deducted when pet owner scans QR code (checked in)
      return (
        apt.status === "checked-in" ||
        apt.status === "in-consultation" ||
        apt.status === "completed" ||
        apt.status === "serving" ||
        Boolean((apt as any).notes?.includes("[Checked in"))
      );
    }
    return true;
  }).length;

  const remainingSlots = Math.max(0, totalCapacity - bookedCount);
  const isAvailable = remainingSlots > 0;

  let statusLabel = "";
  if (!isAvailable) {
    statusLabel = "Fully Booked (0 slots left)";
  } else if (remainingSlots <= 2) {
    statusLabel = `Filling Fast (${remainingSlots} slot${remainingSlots === 1 ? "" : "s"} left)`;
  } else {
    statusLabel = `${remainingSlots} of ${totalCapacity} slots available`;
  }

  return {
    date: dateStr,
    service,
    totalCapacity,
    bookedCount,
    remainingSlots,
    isAvailable,
    isWeekend: false,
    isPast: false,
    statusLabel,
  };
}

export const PROCEDURE_SERVICES: Record<
  ProcedureServiceType,
  {
    id: ProcedureServiceType;
    title: string;
    shortTitle: string;
    description: string;
    category: string;
    defaultSlots: number;
    operatingHours: string;
    timeSlots: string[];
    prepGuidelines: string[];
    eligibilityNotice: string;
  }
> = {
  "vaccination": {
    id: "vaccination",
    title: "Rabies & Core Preventive Vaccination",
    shortTitle: "Vaccination",
    description: "Certified government immunization against rabies and fatal viral infections administered by City Veterinary clinicians.",
    category: "Preventive Immunization",
    defaultSlots: 10,
    operatingHours: "Monday – Friday",
    timeSlots: [],
    prepGuidelines: [
      "Pet must be at least 3 months old for anti-rabies vaccine.",
      "Pet must be clinically healthy with no active fever, diarrhea, or coughing.",
      "Bring pet digital passport QR code or prior vaccination card if available.",
      "Keep dogs on a secure leash and cats inside a well-ventilated carrier.",
    ],
    eligibilityNotice: "100% Free under City Government of Cagayan de Oro Municipal Health Program.",
  },
  "spay-neuter": {
    id: "spay-neuter",
    title: "Low-Cost / Free Spay & Neuter (Kapon) Surgery",
    shortTitle: "Spay & Neuter",
    description: "Surgical sterilization by licensed veterinary surgeons to prevent unwanted litters, reproductive cancers, and roaming behaviors.",
    category: "Surgical Procedures",
    defaultSlots: 5,
    operatingHours: "Monday – Friday",
    timeSlots: [],
    prepGuidelines: [
      "STRICT FASTING: No food for 8 to 12 hours before arrival (prevents vomiting during anesthesia). Clean water allowed until 6:00 AM.",
      "Pet must be at least 6 months old and not in heat or actively nursing.",
      "Pet must be free from tick/flea infestations and clinically healthy.",
      "Bring a clean blanket or towel for recovery and a safe carrier or harness.",
    ],
    eligibilityNotice: "Sterilization slots are limited to 5 procedures daily to ensure comprehensive pre-op and recovery monitoring.",
  },
};
