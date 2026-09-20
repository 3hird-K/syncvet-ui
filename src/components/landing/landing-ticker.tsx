"use client";

const tickerItems = [
  "CAGAYAN DE ORO CITY VETERINARY OFFICE",
  "VERIFIED DIGITAL PET PASSPORTS",
  "100% OFFLINE-FIRST ANDROID APP",
  "BATCH-VALIDATED ANTI-RABIES REGISTRY",
  "SMART VACCINE & DEWORMING REMINDERS",
  "MUNICIPAL ANIMAL HEALTH INTELLIGENCE",
  "LIFELONG MEDICAL TIMELINE ARCHIVE",
  "COMPASSIONATE COMMUNITY PET CARE",
];

export function LandingTicker() {
  return (
    <div
      aria-label="System capabilities ticker"
      className="relative w-full overflow-hidden border-y border-border/70 bg-muted/40 dark:bg-card/50 py-3.5 sm:py-4 select-none"
    >
      {/* Edge gradient fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <div className="animate-marquee items-center gap-6 sm:gap-8">
        {/* Set 1 */}
        {tickerItems.map((item, idx) => (
          <div key={`set-1-${idx}`} className="inline-flex items-center gap-6 sm:gap-8 shrink-0">
            <span className="text-[10px] sm:text-[11.5px] font-extrabold tracking-[0.22em] sm:tracking-[0.28em] uppercase text-foreground/75 dark:text-foreground/85 whitespace-nowrap">
              {item}
            </span>
            <span className="size-1.5 rotate-45 bg-primary/75 shrink-0" aria-hidden />
          </div>
        ))}

        {/* Set 2 (for seamless loop) */}
        {tickerItems.map((item, idx) => (
          <div key={`set-2-${idx}`} className="inline-flex items-center gap-6 sm:gap-8 shrink-0">
            <span className="text-[10px] sm:text-[11.5px] font-extrabold tracking-[0.22em] sm:tracking-[0.28em] uppercase text-foreground/75 dark:text-foreground/85 whitespace-nowrap">
              {item}
            </span>
            <span className="size-1.5 rotate-45 bg-primary/75 shrink-0" aria-hidden />
          </div>
        ))}
      </div>
    </div>
  );
}
