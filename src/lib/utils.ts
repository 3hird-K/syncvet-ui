import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, isValid, startOfDay, isBefore } from "date-fns";

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
 * Checks if a clinical consultation or encounter schedule has elapsed past its date
 * without being completed or cancelled (matching the Admin Queue Overdue status).
 */
export function isConsultationOverdue(dateStr?: string | null, status?: string | null): boolean {
  if (!dateStr) return false;
  if (status === "completed" || status === "cancelled") return false;
  try {
    const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
    const parsed = parseISO(cleanDate);
    if (!isValid(parsed)) return false;
    const todayStart = startOfDay(new Date());
    return isBefore(startOfDay(parsed), todayStart);
  } catch {
    return false;
  }
}

