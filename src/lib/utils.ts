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
