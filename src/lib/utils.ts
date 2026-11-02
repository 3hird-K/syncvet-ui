import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, isValid, startOfDay, endOfDay, addDays, isBefore, isAfter, format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTwoLetterInitials(name?: string | null): string {
  if (!name || !name.trim()) return "SV";
  const clean = name.replace(/^(Dr\.|Atty\.|Engr\.|Hon\.|Mr\.|Ms\.|Mrs\.)\s*/i, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (name.slice(0, 2) || "SV").toUpperCase();
}

export function getTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "Asia/Manila",
    }).format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function isTodayDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const today = getTodayDateString();
  const normalized = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  return normalized === today;
}

/**
 * Operating rule for all CVO clinic bookings & schedules
 * (Consultations, Spay/Neuter, Vaccinations, Follow-ups):
 * - Operating Schedule: Monday – Friday, 8:00 AM – 5:00 PM.
 * - Weekends (Saturday & Sunday) are disabled.
 * - Past dates are disabled.
 * - If date is today, and the current local time has reached or exceeded 5:00 PM (17:00)
 *   or is before 8:00 AM, same-day scheduling is closed and today must be disabled.
 */
export function isClinicDateDisabled(date: Date): boolean {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  // 1. Disable past dates
  if (checkDate < today) return true;

  // 2. Disable weekends (Sunday = 0, Saturday = 6)
  const day = checkDate.getDay();
  if (day === 0 || day === 6) return true;

  // 3. Same-day check: If checkDate is today, disable if current time exceeded 5:00 PM (17:00) or before 8:00 AM
  if (checkDate.getTime() === today.getTime()) {
    const currentHour = now.getHours();
    if (currentHour >= 17 || currentHour < 8) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the next available valid clinic booking date (skipping weekends and past 5:00 PM cutoff).
 */
export function getNextAvailableClinicDate(): Date {
  const now = new Date();
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  // If today is past 5:00 PM (17:00), advance to tomorrow
  if (now.getHours() >= 17) {
    d.setDate(d.getDate() + 1);
  }

  // Advance past any weekends (Saturday or Sunday)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

/**
 * Checks if the daily clinic queue has automatically closed for the date.
 * Clinical transactions operate 8:00 AM – 5:00 PM, and the queue automatically closes at 6:00 PM (18:00).
 * Past dates are always closed.
 */
export function isClinicQueueClosed(targetDate?: string | Date | null): boolean {
  const now = new Date();
  if (!targetDate) {
    return now.getHours() >= 18;
  }

  const cleanDate = typeof targetDate === "string"
    ? (targetDate.includes("T") ? targetDate.split("T")[0] : targetDate.trim())
    : format(targetDate, "yyyy-MM-dd");

  const todayStr = format(now, "yyyy-MM-dd");

  if (cleanDate < todayStr) return true; // Past dates are closed
  if (cleanDate > todayStr) return false; // Future dates are not closed yet

  // If today, closes at 6:00 PM (18:00)
  return now.getHours() >= 18;
}

/**
 * Checks if a clinical consultation or encounter schedule has elapsed past its date,
 * or if scheduled for today and past the 6:00 PM (18:00) queue closing cut-off,
 * without being completed or cancelled (matching the Admin Queue Overdue status).
 */
export function isConsultationOverdue(dateStr?: string | null, status?: string | null): boolean {
  if (!dateStr) return false;
  if (status === "completed" || status === "cancelled") return false;
  try {
    const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
    const parsed = parseISO(cleanDate);
    if (!isValid(parsed)) return false;

    const now = new Date();
    const todayStart = startOfDay(now);
    const targetStart = startOfDay(parsed);

    // 1. If scheduled before today, it is overdue
    if (isBefore(targetStart, todayStart)) {
      return true;
    }

    // 2. If scheduled for today, it becomes overdue after 6:00 PM (18:00)
    if (targetStart.getTime() === todayStart.getTime()) {
      return now.getHours() >= 18;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Evaluates the 1-day grace period for Barangay Field Operations.
 * Once the operation date is done, 1 full calendar day grace period is granted
 * for field staff to wrap up logs, vaccination tallies, and notes.
 *
 * After that 1-day grace period has elapsed:
 * - The operation is locked from editing.
 * - The operation status is automatically marked as "completed".
 * - The public announcement is archived.
 */
export function getFieldOpGracePeriod(dateStr?: string | null, status?: string | null) {
  if (!dateStr) {
    return {
      isPastGracePeriod: false,
      isGracePeriodActive: false,
      isLocked: false,
      gracePeriodEnd: null,
    };
  }

  try {
    const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
    const parsed = parseISO(cleanDate);
    if (!isValid(parsed)) {
      return { isPastGracePeriod: false, isGracePeriodActive: false, isLocked: false, gracePeriodEnd: null };
    }

    // Grace period ends at 23:59:59 of the day AFTER the scheduled outreach date.
    // e.g. Event: Oct 30 -> 1-day grace period is Oct 31 -> Grace period ends Oct 31 23:59:59.
    const gracePeriodEnd = endOfDay(addDays(startOfDay(parsed), 1));
    const now = new Date();

    const isPastGracePeriod = isAfter(now, gracePeriodEnd);
    const isGracePeriodActive = isAfter(now, endOfDay(parsed)) && !isPastGracePeriod;
    const isLocked = isPastGracePeriod || status === "completed" || status === "cancelled";

    return {
      isPastGracePeriod,
      isGracePeriodActive,
      isLocked,
      gracePeriodEnd,
    };
  } catch {
    return { isPastGracePeriod: false, isGracePeriodActive: false, isLocked: false, gracePeriodEnd: null };
  }
}

/**
 * Format bytes to human readable format (KB, MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}


