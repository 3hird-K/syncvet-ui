import { differenceInDays, parseISO, format, isValid, addYears, subWeeks } from "date-fns";

export interface PetVaccinationStatus {
  isVaccinated: boolean;
  lastVaccinationDate?: string;
  nextBoosterDate?: string;
  daysUntilBooster?: number;
  /** True if within 14 days before due date, or overdue */
  isDueSoon: boolean;
  /** True if booster due date has already passed */
  isOverdue: boolean;
  /** True if pet is allowed to book a vaccination appointment */
  canBookVaccination: boolean;
  /** Explanatory message for why booking is enabled or disabled */
  reason: string;
  badgeText: string;
  unlockDateText?: string;
}

/**
 * Calculates annual vaccination validity and booster reminder rules:
 * - Anti-rabies and core vaccines are valid for 1 year (365 days).
 * - Once vaccinated, vaccination transaction is disabled until 2 weeks before the 1-year due date.
 * - 2 weeks (14 days) before due date: reminders trigger and booking unlocks.
 * - Overdue: booking is urgent and open.
 * - Unvaccinated: booking is open.
 */
export function getPetVaccinationStatus(pet: any): PetVaccinationStatus {
  if (!pet) {
    return {
      isVaccinated: false,
      canBookVaccination: true,
      isDueSoon: false,
      isOverdue: false,
      reason: "No pet record found.",
      badgeText: "Unvaccinated",
    };
  }

  const isVaccinated = Boolean(pet.rabiesVaccinated || pet.is_vaccinated || pet.rabies_vaccinated);

  if (!isVaccinated) {
    return {
      isVaccinated: false,
      canBookVaccination: true,
      isDueSoon: false,
      isOverdue: false,
      reason: "No active vaccination on file. Annual anti-rabies vaccination is recommended.",
      badgeText: "Unvaccinated",
    };
  }

  // Determine last vaccination date and next booster date (1 year later)
  const nextDateStr = pet.nextVaccinationDate || pet.next_vaccination_date;
  const lastDateStr = pet.lastVaccinationDate || pet.last_vaccination_date;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let nextBooster: Date | null = null;
  if (nextDateStr) {
    const parsed = parseISO(nextDateStr);
    if (isValid(parsed)) nextBooster = parsed;
  }

  if (!nextBooster && lastDateStr) {
    const parsedLast = parseISO(lastDateStr);
    if (isValid(parsedLast)) {
      nextBooster = addYears(parsedLast, 1);
    }
  }

  // Default to May 10, 2027 if pet has vaccinated flag but no explicit date
  if (!nextBooster) {
    nextBooster = parseISO("2027-05-10");
  }

  nextBooster.setHours(0, 0, 0, 0);
  const formattedNext = format(nextBooster, "MMM d, yyyy");

  // Calculate days remaining
  const diffDays = differenceInDays(nextBooster, today);

  // 2 weeks (14 days) rule
  const isOverdue = diffDays < 0;
  const isDueSoon = diffDays >= 0 && diffDays <= 14;

  if (isOverdue) {
    return {
      isVaccinated: true,
      lastVaccinationDate: lastDateStr,
      nextBoosterDate: format(nextBooster, "yyyy-MM-dd"),
      daysUntilBooster: diffDays,
      isDueSoon: true,
      isOverdue: true,
      canBookVaccination: true,
      reason: `Annual booster was due on ${formattedNext} (${Math.abs(diffDays)} days overdue). Please schedule vaccination immediately.`,
      badgeText: `Overdue (${Math.abs(diffDays)}d)`,
    };
  }

  if (isDueSoon) {
    return {
      isVaccinated: true,
      lastVaccinationDate: lastDateStr,
      nextBoosterDate: format(nextBooster, "yyyy-MM-dd"),
      daysUntilBooster: diffDays,
      isDueSoon: true,
      isOverdue: false,
      canBookVaccination: true,
      reason: `Annual booster is due on ${formattedNext} (in ${diffDays === 0 ? "today" : `${diffDays} days`}). 2-week renewal window is open.`,
      badgeText: `Due in ${diffDays}d`,
    };
  }

  // Still valid and > 14 days away from due date: Vaccination transaction is disabled!
  const unlockDate = subWeeks(nextBooster, 2);
  const formattedUnlock = format(unlockDate, "MMM d, yyyy");

  return {
    isVaccinated: true,
    lastVaccinationDate: lastDateStr,
    nextBoosterDate: format(nextBooster, "yyyy-MM-dd"),
    daysUntilBooster: diffDays,
    isDueSoon: false,
    isOverdue: false,
    canBookVaccination: false,
    reason: `${pet.name} is fully vaccinated and protected until ${formattedNext}. Vaccination is required once every year; booking unlocks 2 weeks prior (${formattedUnlock}).`,
    badgeText: `Protected until ${formattedNext}`,
    unlockDateText: formattedUnlock,
  };
}
