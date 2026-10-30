"use client";

import { format, parseISO, isValid } from "date-fns";
import { getPublicSupabaseClient } from "@/lib/supabase/client";

export interface QueueTicket {
  id: string; // e.g. "q_ticket_1793265000"
  ticketNumber: string; // e.g. "Q-001"
  queueSequence: number; // e.g. 1
  appointmentId: string;
  date: string; // "YYYY-MM-DD"
  checkInTime: string; // "08:30 AM"
  checkedInAt: string; // ISO string
  ownerId: string;
  ownerName: string;
  ownerContact?: string;
  ownerBarangay?: string;
  petId?: string;
  petName: string;
  species: "Dog" | "Cat" | string;
  breed?: string;
  serviceId: "vaccination" | "spay-neuter" | "consultation" | string;
  serviceTitle: string;
  status: "waiting" | "in-consultation" | "completed" | "skipped";
  servingVet?: string;
  consultationRoom?: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  encounterNo?: string;
}

export interface DailyQueueState {
  date: string; // "YYYY-MM-DD"
  activeTickets: QueueTicket[];
  nowServingTicketNumber: string | null;
  servingVet?: string;
  servingRoom?: string;
  lastCalledAt?: string;
}

const STORAGE_PREFIX = "syncvet_clinic_queue_";

export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getDailyQueue(dateStr: string = getTodayDateStr()): DailyQueueState {
  if (typeof window === "undefined") {
    return {
      date: dateStr,
      activeTickets: [],
      nowServingTicketNumber: null,
    };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.activeTickets)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Notice: Failed reading local queue state:", err);
  }

  return {
    date: dateStr,
    activeTickets: [],
    nowServingTicketNumber: null,
  };
}

export function saveDailyQueue(state: DailyQueueState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${state.date}`, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("syncvet-queue-updated", { detail: state }));

    // Realtime broadcast across devices and browsers
    try {
      const supabase = getPublicSupabaseClient();
      supabase.channel("cvo-queue-realtime-channel").send({
        type: "broadcast",
        event: "queue_state_updated",
        payload: state,
      });
    } catch {}
  } catch (err) {
    console.error("Failed saving daily queue state:", err);
  }
}

/**
 * Sync today's queue tickets with Supabase appointments in real time
 */
export async function syncQueueFromSupabase(
  dateStr: string = getTodayDateStr()
): Promise<DailyQueueState> {
  const current = getDailyQueue(dateStr);
  if (typeof window === "undefined") return current;

  try {
    const supabase = getPublicSupabaseClient();
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("*, users:owner_id (full_name, phone_number, address), pets:pet_id (id, name, species, breed)")
      .eq("date", dateStr)
      .in("status", ["checked-in", "in-consultation", "serving"]);

    if (!error && Array.isArray(appointments) && appointments.length > 0) {
      let updated = false;
      const tickets = [...current.activeTickets];

      appointments.forEach((apt: any) => {
        let ticketNum = "";
        const match = apt.notes?.match(/Ticket\s+(Q-\d+)/i);
        if (match) {
          ticketNum = match[1];
        }

        const existingIdx = tickets.findIndex(
          (t) => t.appointmentId === apt.id || (ticketNum && t.ticketNumber === ticketNum)
        );

        const serviceTitle =
          apt.service_id === "spay-neuter"
            ? "Low-Cost / Free Spay & Neuter Surgery"
            : apt.service_id === "vaccination"
            ? "Rabies & Core Preventive Vaccination"
            : "Clinical Consultation";

        const ownerUser = Array.isArray(apt.users) ? apt.users[0] : apt.users;
        const petData = Array.isArray(apt.pets) ? apt.pets[0] : apt.pets;
        const ownerName = ownerUser?.full_name || "Pet Owner";
        const ownerBarangay = ownerUser?.address || "Carmen, CDO";
        const species = petData?.species || apt.species || "Dog";
        const breed = petData?.breed || apt.breed || "";

        const ticketStatus: QueueTicket["status"] =
          apt.status === "in-consultation" || apt.status === "serving"
            ? "in-consultation"
            : "waiting";

        if (existingIdx >= 0) {
          if (tickets[existingIdx].status !== ticketStatus) {
            tickets[existingIdx] = {
              ...tickets[existingIdx],
              status: ticketStatus,
            };
            updated = true;
          }
        } else {
          const seq = tickets.length + 1;
          const assignedNum = ticketNum || `Q-${String(seq).padStart(3, "0")}`;
          const createdDate = apt.created_at ? new Date(apt.created_at) : new Date();
          tickets.push({
            id: `ticket_${apt.id}`,
            ticketNumber: assignedNum,
            queueSequence: seq,
            appointmentId: apt.id,
            date: dateStr,
            checkInTime: format(createdDate, "h:mm a"),
            checkedInAt: apt.created_at || new Date().toISOString(),
            ownerId: apt.owner_id,
            ownerName,
            ownerContact: ownerUser?.phone_number,
            ownerBarangay,
            petId: apt.pet_id,
            petName: petData?.name || apt.pet_name || "Pet",
            species,
            breed,
            serviceId: apt.service_id || "consultation",
            serviceTitle,
            status: ticketStatus,
          });
          updated = true;
        }
      });

      if (updated || tickets.length !== current.activeTickets.length) {
        const newState: DailyQueueState = {
          ...current,
          activeTickets: tickets,
        };
        saveDailyQueue(newState);
        return newState;
      }
    }
  } catch (err) {
    console.warn("Notice: Error syncing queue from Supabase:", err);
  }

  return current;
}

/**
 * Sync active CVO consultations into today's queue without consuming procedure slots
 */
export function syncConsultationsToQueue(
  consultations: any[],
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);
  if (!Array.isArray(consultations) || consultations.length === 0) return current;

  let updated = false;
  const tickets = [...current.activeTickets];

  consultations.forEach((c) => {
    // Only include consultations scheduled for today
    const cDate = c.date || "";
    if (cDate !== dateStr && !cDate.startsWith(dateStr)) return;

    const encounterId = c.encounterNo || c.id;

    if (c.status === "completed" || c.status === "cancelled") {
      const idx = tickets.findIndex(
        (t) => t.appointmentId === encounterId || (t.encounterNo && t.encounterNo === encounterId)
      );
      if (idx >= 0 && tickets[idx].status !== "completed") {
        tickets[idx] = { ...tickets[idx], status: "completed" };
        updated = true;
      }
      return;
    }

    const existingIdx = tickets.findIndex(
      (t) =>
        t.appointmentId === encounterId ||
        (t.encounterNo && t.encounterNo === encounterId) ||
        (t.serviceId === "consultation" &&
          t.petName.toLowerCase().trim() === (c.petName || "").toLowerCase().trim() &&
          t.ownerName.toLowerCase().trim() === (c.ownerName || "").toLowerCase().trim())
    );

    const ticketStatus: QueueTicket["status"] =
      c.status === "in-consultation" || c.status === "treatment"
        ? "in-consultation"
        : "waiting";

    if (existingIdx >= 0) {
      if (tickets[existingIdx].status !== ticketStatus) {
        tickets[existingIdx] = {
          ...tickets[existingIdx],
          status: ticketStatus,
          servingVet:
            c.attendingVet ||
            tickets[existingIdx].servingVet ||
            (ticketStatus === "in-consultation" ? "Dr. Helen Ann P. Tacandong, DVM" : undefined),
          consultationRoom:
            tickets[existingIdx].consultationRoom ||
            (ticketStatus === "in-consultation" ? "Consultation Desk 1" : undefined),
        };
        updated = true;
      }
    } else {
      const seq = tickets.length + 1;
      const assignedNum = `Q-${String(seq).padStart(3, "0")}`;
      const now = new Date();
      tickets.push({
        id: `ticket_consultation_${encounterId}`,
        ticketNumber: assignedNum,
        queueSequence: seq,
        appointmentId: encounterId,
        encounterNo: c.encounterNo,
        notes: c.chiefComplaint || (c.symptoms && c.symptoms.length > 0 ? c.symptoms.join(", ") : undefined),
        date: dateStr,
        checkInTime: c.time || format(now, "h:mm a"),
        checkedInAt: c.createdAt || now.toISOString(),
        ownerId: c.ownerId || c.owner_id || c.ownerName,
        ownerName: c.ownerName || "Pet Owner",
        ownerContact: c.ownerContact,
        ownerBarangay: c.ownerBarangay || "Cagayan de Oro City",
        petId: c.petId,
        petName: c.petName || "Pet",
        species: c.species || "Dog",
        breed: c.breed || "",
        serviceId: "consultation",
        serviceTitle: "Clinical Consultation",
        status: ticketStatus,
        servingVet:
          ticketStatus === "in-consultation"
            ? c.attendingVet || "Dr. Helen Ann P. Tacandong, DVM"
            : undefined,
        consultationRoom:
          ticketStatus === "in-consultation" ? "Consultation Desk 1" : undefined,
      });
      updated = true;
    }
  });

  if (updated || tickets.length !== current.activeTickets.length) {
    // If any ticket is actively in consultation, set nowServingTicketNumber to it
    const activeInConsultation = tickets.find((t) => t.status === "in-consultation");
    const newState: DailyQueueState = {
      ...current,
      activeTickets: tickets,
      nowServingTicketNumber: activeInConsultation ? activeInConsultation.ticketNumber : current.nowServingTicketNumber,
      servingVet: activeInConsultation ? activeInConsultation.servingVet || "Dr. Helen Ann P. Tacandong, DVM" : current.servingVet,
      servingRoom: activeInConsultation ? activeInConsultation.consultationRoom || "Consultation Desk 1" : current.servingRoom,
    };
    saveDailyQueue(newState);
    return newState;
  }

  return current;
}

/**
 * Check in a pet owner with an active appointment into today's queue
 */
export function checkInPetOwnerToQueue({
  appointmentId,
  ownerId,
  ownerName,
  ownerContact,
  ownerBarangay,
  petId,
  petName,
  species = "Dog",
  breed = "",
  serviceId = "vaccination",
  serviceTitle = "Anti-Rabies Vaccination",
  dateStr = getTodayDateStr(),
}: {
  appointmentId: string;
  ownerId: string;
  ownerName: string;
  ownerContact?: string;
  ownerBarangay?: string;
  petId?: string;
  petName: string;
  species?: string;
  breed?: string;
  serviceId?: string;
  serviceTitle?: string;
  dateStr?: string;
}): { ticket: QueueTicket; isExisting: boolean; state: DailyQueueState } {
  const current = getDailyQueue(dateStr);

  // Check if this appointment is already checked in
  const existing = current.activeTickets.find(
    (t) => t.appointmentId === appointmentId || (t.ownerId === ownerId && t.petName === petName && t.status !== "completed")
  );

  if (existing) {
    return { ticket: existing, isExisting: true, state: current };
  }

  // Calculate next sequential ticket number
  const nextSeq = current.activeTickets.length + 1;
  const ticketNumber = `Q-${String(nextSeq).padStart(3, "0")}`;
  const now = new Date();
  const timeStr = format(now, "h:mm a");

  const newTicket: QueueTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ticketNumber,
    queueSequence: nextSeq,
    appointmentId,
    date: dateStr,
    checkInTime: timeStr,
    checkedInAt: now.toISOString(),
    ownerId,
    ownerName,
    ownerContact,
    ownerBarangay,
    petId,
    petName,
    species,
    breed,
    serviceId,
    serviceTitle,
    status: "waiting",
  };

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: [...current.activeTickets, newTicket],
  };

  saveDailyQueue(updatedState);
  return { ticket: newTicket, isExisting: false, state: updatedState };
}

/**
 * Staff calls next ticket in queue
 */
export function callQueueTicket(
  ticketNumber: string,
  vetName: string = "Dr. Helen Ann P. Tacandong, DVM",
  room: string = "Consultation Desk 1",
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);
  const now = new Date().toISOString();

  let targetAppointmentId: string | null = null;
  const updatedTickets = current.activeTickets.map((t) => {
    if (t.ticketNumber === ticketNumber) {
      targetAppointmentId = t.appointmentId;
      return {
        ...t,
        status: "in-consultation" as const,
        servingVet: vetName,
        consultationRoom: room,
        calledAt: now,
      };
    }
    return t;
  });

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: updatedTickets,
    nowServingTicketNumber: ticketNumber,
    servingVet: vetName,
    servingRoom: room,
    lastCalledAt: now,
  };

  saveDailyQueue(updatedState);

  // Sync to Supabase in background
  if (targetAppointmentId) {
    try {
      const supabase = getPublicSupabaseClient();
      supabase
        .from("appointments")
        .update({ status: "in-consultation" })
        .eq("id", targetAppointmentId)
        .then();
    } catch {}
  }

  return updatedState;
}

/**
 * Mark a ticket as completed
 */
export function completeQueueTicket(
  ticketNumber: string,
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);
  const now = new Date().toISOString();

  let targetAppointmentId: string | null = null;
  const updatedTickets = current.activeTickets.map((t) => {
    if (t.ticketNumber === ticketNumber) {
      targetAppointmentId = t.appointmentId;
      return {
        ...t,
        status: "completed" as const,
        completedAt: now,
      };
    }
    return t;
  });

  // If this was the currently serving ticket, pick next waiting ticket or null
  let nextServing = current.nowServingTicketNumber;
  if (current.nowServingTicketNumber === ticketNumber) {
    const nextWaiting = updatedTickets.find((t) => t.status === "in-consultation");
    nextServing = nextWaiting ? nextWaiting.ticketNumber : null;
  }

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: updatedTickets,
    nowServingTicketNumber: nextServing,
  };

  saveDailyQueue(updatedState);

  // Sync to Supabase in background
  if (targetAppointmentId) {
    try {
      const supabase = getPublicSupabaseClient();
      supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", targetAppointmentId)
        .then();
    } catch {}
  }

  return updatedState;
}

/**
 * Skip a ticket (no show)
 */
export function skipQueueTicket(
  ticketNumber: string,
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);

  const updatedTickets = current.activeTickets.map((t) => {
    if (t.ticketNumber === ticketNumber) {
      return {
        ...t,
        status: "skipped" as const,
      };
    }
    return t;
  });

  let nextServing = current.nowServingTicketNumber;
  if (current.nowServingTicketNumber === ticketNumber) {
    nextServing = null;
  }

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: updatedTickets,
    nowServingTicketNumber: nextServing,
  };

  saveDailyQueue(updatedState);
  return updatedState;
}

/**
 * Remove / cancel a ticket from the queue
 */
export function removeQueueTicket(
  ticketNumber: string,
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);
  const updatedTickets = current.activeTickets.filter((t) => t.ticketNumber !== ticketNumber);

  let nextServing = current.nowServingTicketNumber;
  if (current.nowServingTicketNumber === ticketNumber) {
    const nextWaiting = updatedTickets.find((t) => t.status === "in-consultation");
    nextServing = nextWaiting ? nextWaiting.ticketNumber : null;
  }

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: updatedTickets,
    nowServingTicketNumber: nextServing,
  };

  saveDailyQueue(updatedState);
  return updatedState;
}

/**
 * Reset a pet owner's queue status for today
 */
export function resetPetOwnerQueue(
  ownerId: string,
  dateStr: string = getTodayDateStr()
): DailyQueueState {
  const current = getDailyQueue(dateStr);
  const updatedTickets = current.activeTickets.filter((t) => t.ownerId !== ownerId);

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: updatedTickets,
  };

  saveDailyQueue(updatedState);
  return updatedState;
}

export type PetOwnerQueueLookup =
  | string
  | {
      ownerId?: string;
      userName?: string;
      userEmail?: string;
      petNames?: string[];
      encounterNos?: string[];
      appointmentIds?: string[];
    };

/**
 * Get the active ticket information for a pet owner
 */
export function getPetOwnerQueueStatus(
  lookup: PetOwnerQueueLookup,
  dateStr: string = getTodayDateStr()
): {
  myTicket: QueueTicket | null;
  nowServing: QueueTicket | null;
  ticketsAhead: number;
  isMyTurn: boolean;
  isInConsultation: boolean;
  totalWaiting: number;
} {
  const queue = getDailyQueue(dateStr);

  const ownerId = typeof lookup === "string" ? lookup : lookup.ownerId || "";
  const userName = typeof lookup === "string" ? "" : lookup.userName || "";
  const petNames = typeof lookup === "string" ? [] : (lookup.petNames || []).map((n) => n.toLowerCase().trim());
  const encounterNos = typeof lookup === "string" ? [] : (lookup.encounterNos || []).map((e) => e.toLowerCase().trim());
  const appointmentIds = typeof lookup === "string" ? [] : (lookup.appointmentIds || []).map((a) => a.toLowerCase().trim());

  const cleanOwnerId = (ownerId || "").toLowerCase().trim();
  const cleanUserName = (userName || "").toLowerCase().trim();

  const matchesTicket = (t: QueueTicket) => {
    const tOwnerId = (t.ownerId || "").toLowerCase().trim();
    const tOwnerName = (t.ownerName || "").toLowerCase().trim();
    const tPetName = (t.petName || "").toLowerCase().trim();
    const tEncounter = (t.encounterNo || "").toLowerCase().trim();
    const tAppointment = (t.appointmentId || "").toLowerCase().trim();

    if (cleanOwnerId && (tOwnerId === cleanOwnerId || tOwnerName.includes(cleanOwnerId) || cleanOwnerId.includes(tOwnerName))) return true;
    if (cleanUserName && (tOwnerName === cleanUserName || tOwnerName.includes(cleanUserName) || cleanUserName.includes(tOwnerName))) return true;
    if (encounterNos.length > 0 && (encounterNos.includes(tEncounter) || encounterNos.includes(tAppointment))) return true;
    if (appointmentIds.length > 0 && appointmentIds.includes(tAppointment)) return true;
    if (petNames.length > 0 && petNames.includes(tPetName)) return true;
    return false;
  };

  // Find pet owner's active ticket for today (prioritizing in-consultation, then waiting, then non-completed)
  const myTicket =
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "in-consultation") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "waiting") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status !== "completed") ||
    null;

  const nowServing =
    queue.activeTickets.find((t) => t.ticketNumber === queue.nowServingTicketNumber) || null;

  let ticketsAhead = 0;
  let isMyTurn = false;
  let isInConsultation = false;

  if (myTicket) {
    if (myTicket.status === "in-consultation") {
      isInConsultation = true;
      isMyTurn = true;
      ticketsAhead = 0;
    } else if (queue.nowServingTicketNumber === myTicket.ticketNumber) {
      isMyTurn = true;
      ticketsAhead = 0;
    } else if (myTicket.status === "waiting") {
      // Count how many waiting tickets came before this ticket
      ticketsAhead = queue.activeTickets.filter(
        (t) =>
          (t.status === "waiting" || t.status === "in-consultation") &&
          t.queueSequence < myTicket.queueSequence
      ).length;
    }
  }

  const totalWaiting = queue.activeTickets.filter((t) => t.status === "waiting").length;

  return {
    myTicket,
    nowServing,
    ticketsAhead,
    isMyTurn,
    isInConsultation,
    totalWaiting,
  };
}
