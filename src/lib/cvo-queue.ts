"use client";

import { format, parseISO, isValid } from "date-fns";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { isClinicQueueClosed, isBeforeClinicOpen } from "@/lib/utils";

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
  petPhotoUrl?: string;
  species: "Dog" | "Cat" | string;
  breed?: string;
  serviceId: "vaccination" | "spay-neuter" | "consultation" | string;
  serviceTitle: string;
  status: "waiting" | "in-consultation" | "completed" | "skipped" | "overdue";
  servingVet?: string;
  consultationRoom?: string;
  calledAt?: string;
  completedAt?: string;
  notes?: string;
  encounterNo?: string;
  checkedInVia?: "qr" | "manual";
}

export interface DailyQueueState {
  date: string; // "YYYY-MM-DD"
  activeTickets: QueueTicket[];
  nowServingTicketNumber: string | null;
  servingVet?: string;
  servingRoom?: string;
  lastCalledAt?: string;
  isClosed?: boolean;
  closedReason?: string;
}

const STORAGE_PREFIX = "syncvet_clinic_queue_";

export function getTodayDateStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function getDailyQueue(dateStr: string = getTodayDateStr()): DailyQueueState {
  const isClosed = isClinicQueueClosed(dateStr);

  if (typeof window === "undefined") {
    return {
      date: dateStr,
      activeTickets: [],
      nowServingTicketNumber: null,
      isClosed,
      closedReason: isClosed
        ? "Clinic transactions (8:00 AM – 5:00 PM) automatically closed at 6:00 PM. Unattended queue tickets marked as overdue."
        : undefined,
    };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.activeTickets)) {
        // Clean out legacy auto-injected tickets that were never scanned/checked-in via QR
        let validTickets = parsed.activeTickets.filter((t: QueueTicket) => {
          if (t.id && t.id.startsWith("ticket_consultation_") && !t.checkedInVia) {
            return false;
          }
          return true;
        });

        let changed = false;

        // Automatically mark unattended tickets as "overdue" if queue has closed at 6:00 PM
        if (isClosed) {
          validTickets = validTickets.map((t: QueueTicket) => {
            if (t.status === "waiting" || t.status === "in-consultation") {
              changed = true;
              return { ...t, status: "overdue" as const };
            }
            return t;
          });
        }

        const effectiveNowServing = isClosed ? null : parsed.nowServingTicketNumber;
        if (parsed.nowServingTicketNumber && isClosed) changed = true;

        const resultState: DailyQueueState = {
          ...parsed,
          activeTickets: validTickets,
          nowServingTicketNumber: effectiveNowServing,
          isClosed,
          closedReason: isClosed
            ? "Clinic transactions (8:00 AM – 5:00 PM) automatically closed at 6:00 PM. Unattended queue tickets marked as overdue."
            : undefined,
        };

        if (changed || validTickets.length !== parsed.activeTickets.length) {
          localStorage.setItem(`${STORAGE_PREFIX}${dateStr}`, JSON.stringify(resultState));
        }

        return resultState;
      }
    }
  } catch (err) {
    console.warn("Notice: Failed reading local queue state:", err);
  }

  return {
    date: dateStr,
    activeTickets: [],
    nowServingTicketNumber: null,
    isClosed,
    closedReason: isClosed
      ? "Clinic transactions (8:00 AM – 5:00 PM) automatically closed at 6:00 PM. Unattended queue tickets marked as overdue."
      : undefined,
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
      .select("*, users:owner_id (full_name, phone_number, address), pets:pet_id (id, name, species, breed, photo_url)")
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
        const petPhotoUrl = petData?.photo_url || apt.photo_url || apt.pet_photo_url;

        const ticketStatus: QueueTicket["status"] =
          apt.status === "in-consultation" || apt.status === "serving"
            ? "in-consultation"
            : "waiting";

        if (existingIdx >= 0) {
          if (tickets[existingIdx].status !== ticketStatus || (!tickets[existingIdx].petPhotoUrl && petPhotoUrl)) {
            tickets[existingIdx] = {
              ...tickets[existingIdx],
              status: ticketStatus,
              petPhotoUrl: petPhotoUrl || tickets[existingIdx].petPhotoUrl,
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
            petPhotoUrl,
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

  const matchesConsultation = (t: QueueTicket, c: any, encounterId: string) =>
    t.appointmentId === encounterId ||
    (!!t.encounterNo && t.encounterNo === encounterId) ||
    (t.serviceId === "consultation" &&
      (t.petName || "").toLowerCase().trim() === (c.petName || "").toLowerCase().trim() &&
      (t.ownerName || "").toLowerCase().trim() === (c.ownerName || "").toLowerCase().trim());

  consultations.forEach((c) => {
    // Only include consultations scheduled for today
    const cDate = c.date || "";
    if (cDate !== dateStr && !cDate.startsWith(dateStr)) return;

    const encounterId = c.encounterNo || c.id;

    if (c.status === "scheduled" || (c as any).isUnofficial) {
      // Unofficial/reserved schedules must remain in "Scheduled Transactions" only.
      // They may enter Today's Clinic Queue exclusively after the owner scans the
      // station QR code (which issues a verified ticket and changes the status to
      // "waiting"). Remove any unverified ticket auto-injected by older builds.
      for (let i = tickets.length - 1; i >= 0; i--) {
        const ticket = tickets[i];
        const isVerifiedCheckIn =
          ticket.checkedInVia === "qr" || ticket.checkedInVia === "manual";
        if (matchesConsultation(ticket, c, encounterId) && !isVerifiedCheckIn) {
          tickets.splice(i, 1);
          updated = true;
        }
      }
      return;
    }

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

    const existingIdx = tickets.findIndex((t) => matchesConsultation(t, c, encounterId));

    const ticketStatus: QueueTicket["status"] =
      c.status === "in-consultation" || c.status === "treatment"
        ? "in-consultation"
        : "waiting";

    if (existingIdx >= 0) {
      const existingTicket = tickets[existingIdx];
      // Do not resurrect a ticket that was explicitly skipped (no-show) or marked overdue.
      // The owner must re-scan the clinic QR to rejoin with a fresh ticket number.
      if (existingTicket.status === "skipped" || existingTicket.status === "overdue") {
        return;
      }
      if (existingTicket.status !== ticketStatus) {
        tickets[existingIdx] = {
          ...existingTicket,
          status: ticketStatus,
          servingVet:
            c.attendingVet ||
            existingTicket.servingVet ||
            (ticketStatus === "in-consultation" ? "Dr. Helen Ann P. Tacandong, DVM" : undefined),
          consultationRoom:
            existingTicket.consultationRoom ||
            (ticketStatus === "in-consultation" ? "Consultation Desk 1" : undefined),
        };
        updated = true;
      }
    }
    // Note: Do NOT auto-push un-checked-in consultations into the queue.
    // Patients only appear in the live clinic queue once they scan the QR code at reception!
  });

  // Automatically mark any unattended tickets as overdue if queue is closed after 6:00 PM
  if (current.isClosed) {
    tickets.forEach((t, i) => {
      if (t.status === "waiting" || t.status === "in-consultation") {
        tickets[i] = { ...t, status: "overdue" };
        updated = true;
      }
    });
  }

  if (updated) {
    // If queue is closed, no ticket is being served.
    // Otherwise keep the ticket already marked as now serving if it is still
    // in consultation; only fall back to any other in-consultation ticket.
    const activeInConsultation = current.isClosed
      ? undefined
      : tickets.find(
          (t) =>
            t.ticketNumber === current.nowServingTicketNumber &&
            t.status === "in-consultation"
        ) || tickets.find((t) => t.status === "in-consultation");
    const newState: DailyQueueState = {
      ...current,
      activeTickets: tickets,
      nowServingTicketNumber: current.isClosed ? null : (activeInConsultation ? activeInConsultation.ticketNumber : current.nowServingTicketNumber),
      servingVet: current.isClosed ? undefined : (activeInConsultation ? activeInConsultation.servingVet || "Dr. Helen Ann P. Tacandong, DVM" : current.servingVet),
      servingRoom: current.isClosed ? undefined : (activeInConsultation ? activeInConsultation.consultationRoom || "Consultation Desk 1" : current.servingRoom),
      isClosed: current.isClosed,
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
  encounterNo,
  notes,
  ownerId,
  ownerName,
  ownerContact,
  ownerBarangay,
  petId,
  petName,
  petPhotoUrl,
  species = "Dog",
  breed = "",
  serviceId = "vaccination",
  serviceTitle = "Anti-Rabies Vaccination",
  dateStr = getTodayDateStr(),
  checkedInVia = "qr",
}: {
  appointmentId: string;
  encounterNo?: string;
  notes?: string;
  ownerId: string;
  ownerName: string;
  ownerContact?: string;
  ownerBarangay?: string;
  petId?: string;
  petName: string;
  petPhotoUrl?: string;
  species?: string;
  breed?: string;
  serviceId?: string;
  serviceTitle?: string;
  dateStr?: string;
  checkedInVia?: "qr" | "manual";
}): { ticket: QueueTicket; isExisting: boolean; state: DailyQueueState } {
  const current = getDailyQueue(dateStr);

  // The clinic opens at 8:00 AM — block any queue check-in before then.
  if (isBeforeClinicOpen(dateStr)) {
    throw new Error(
      "Clinic check-in opens at 8:00 AM (operating hours 8:00 AM – 5:00 PM). Please scan the clinic QR code once the clinic opens."
    );
  }

  // If queue is closed (past 6:00 PM cut-off), do not allow new active queue tickets
  if (current.isClosed) {
    const closedTicket: QueueTicket = {
      id: `ticket_closed_${Date.now()}`,
      ticketNumber: "CLOSED",
      queueSequence: 0,
      appointmentId,
      encounterNo,
      notes,
      date: dateStr,
      checkInTime: format(new Date(), "h:mm a"),
      checkedInAt: new Date().toISOString(),
      ownerId,
      ownerName,
      ownerContact,
      ownerBarangay,
      petId,
      petName,
      petPhotoUrl,
      species,
      breed,
      serviceId,
      serviceTitle,
      status: "overdue",
      checkedInVia,
    };
    return { ticket: closedTicket, isExisting: false, state: current };
  }

  // Check if this appointment is already checked in.
  // A ticket that was skipped (no-show) or marked overdue (cut-off) can be re-scanned;
  // the owner is issued a fresh ticket at the end of the line.
  const existing = current.activeTickets.find(
    (t) =>
      t.appointmentId === appointmentId ||
      (encounterNo && t.encounterNo === encounterNo) ||
      (t.ownerId === ownerId && t.petName.toLowerCase().trim() === petName.toLowerCase().trim() && t.status !== "completed")
  );

  const isRejoin = !!existing && (existing.status === "skipped" || existing.status === "overdue");

  if (existing && !isRejoin) {
    return { ticket: existing, isExisting: true, state: current };
  }

  // If rejoining after a no-show, drop the missed ticket so the owner gets a fresh number.
  const baseTickets = isRejoin
    ? current.activeTickets.filter((t) => t.id !== existing!.id)
    : current.activeTickets;

  // Calculate next sequential ticket number (based on the highest sequence in use)
  const nextSeq =
    baseTickets.reduce((max, t) => Math.max(max, t.queueSequence || 0), 0) + 1;
  const ticketNumber = `Q-${String(nextSeq).padStart(3, "0")}`;
  const now = new Date();
  const timeStr = format(now, "h:mm a");

  const newTicket: QueueTicket = {
    id: `ticket_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ticketNumber,
    queueSequence: nextSeq,
    appointmentId,
    encounterNo,
    notes,
    date: dateStr,
    checkInTime: timeStr,
    checkedInAt: now.toISOString(),
    ownerId,
    ownerName,
    ownerContact,
    ownerBarangay,
    petId,
    petName,
    petPhotoUrl,
    species,
    breed,
    serviceId,
    serviceTitle,
    status: "waiting",
    checkedInVia,
  };

  const updatedState: DailyQueueState = {
    ...current,
    activeTickets: [...baseTickets, newTicket],
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
  if (current.isClosed) {
    return current;
  }
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

  let targetAppointmentId: string | null = null;
  const updatedTickets = current.activeTickets.map((t) => {
    if (t.ticketNumber === ticketNumber) {
      targetAppointmentId = t.appointmentId;
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

  // Sync to Supabase in background: a no-show appointment is marked as missed.
  if (targetAppointmentId) {
    try {
      const supabase = getPublicSupabaseClient();
      supabase
        .from("appointments")
        .update({ status: "missed" })
        .eq("id", targetAppointmentId)
        .then();
    } catch {}
  }

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
  nextTicket: QueueTicket | null;
  ticketsAhead: number;
  isMyTurn: boolean;
  isInConsultation: boolean;
  isNext: boolean;
  totalWaiting: number;
  isQueueClosed: boolean;
  isOverdue: boolean;
} {
  const queue = getDailyQueue(dateStr);
  const isQueueClosed = !!queue.isClosed;

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

  // Find pet owner's ticket for today (prioritizing in-consultation, then waiting, then overdue).
  // Skipped (no-show) and completed tickets are also returned so the owner sees a clear status
  // (a skipped owner can re-scan the QR to rejoin with a fresh ticket).
  const myTicket =
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "in-consultation") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "waiting") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "overdue") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "skipped") ||
    queue.activeTickets.find((t) => matchesTicket(t) && t.status === "completed") ||
    null;

  const isOverdue = !!myTicket && myTicket.status === "overdue";
  const nowServing =
    queue.activeTickets.find((t) => t.ticketNumber === queue.nowServingTicketNumber) || null;

  // The next patient to call is the earliest waiting ticket. This stays valid
  // even while another patient is currently in consultation.
  const nextTicket =
    queue.activeTickets
      .filter((t) => t.status === "waiting")
      .sort((a, b) => a.queueSequence - b.queueSequence)[0] || null;

  let ticketsAhead = 0;
  let isMyTurn = false;
  let isInConsultation = false;

  if (myTicket && !isQueueClosed && !isOverdue) {
    // Only the ticket explicitly marked as "now serving" is actually being called.
    // Other tickets may still carry an "in-consultation" status from earlier
    // calls, so we must not treat every one of them as the owner's call.
    if (queue.nowServingTicketNumber === myTicket.ticketNumber) {
      isMyTurn = true;
      isInConsultation = myTicket.status === "in-consultation";
      ticketsAhead = 0;
    } else {
      // Count all active patients ahead of this ticket in the queue sequence.
      ticketsAhead = queue.activeTickets.filter(
        (t) =>
          t.ticketNumber !== myTicket.ticketNumber &&
          (t.status === "waiting" || t.status === "in-consultation") &&
          t.queueSequence < myTicket.queueSequence
      ).length;
    }
  }

  const isNext =
    !!nextTicket &&
    !!myTicket &&
    !isQueueClosed &&
    !isOverdue &&
    !isMyTurn &&
    myTicket.status === "waiting" &&
    nextTicket.ticketNumber === myTicket.ticketNumber;

  const totalWaiting = isQueueClosed ? 0 : queue.activeTickets.filter((t) => t.status === "waiting").length;

  return {
    myTicket,
    nowServing,
    nextTicket,
    ticketsAhead,
    isMyTurn,
    isInConsultation,
    isNext,
    totalWaiting,
    isQueueClosed,
    isOverdue,
  };
}
