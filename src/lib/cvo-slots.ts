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
  statusLabel: string;
}

const STORAGE_KEY_SLOT_CONFIG = "syncvet_cvo_slot_configuration_v1";

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
    window.dispatchEvent(new Event("cvo-slot-config-updated"));
  } catch (err) {
    console.error("Failed to save slot configuration", err);
  }
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
      totalCapacity: 0,
      bookedCount: 0,
      remainingSlots: 0,
      isAvailable: false,
      isWeekend: true,
      isPast: false,
      statusLabel: "Weekend (Closed)",
    };
  }

  // Count booked appointments for this date and service (excluding cancelled)
  const bookedCount = bookedAppointments.filter(
    (apt) =>
      apt.date === dateStr &&
      apt.service_id === service &&
      apt.status !== "cancelled"
  ).length;

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
