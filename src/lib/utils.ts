import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
