"use client";

import {
  PawPrint,
  FileHeart,
  CalendarCheck,
  BellRing,
} from "lucide-react";

const capabilities = [
  {
    number: "01",
    icon: PawPrint,
    title: "Pet Profiles",
    description:
      "Centralized companion identification with verifiable digital QR passports, breed lineage, and microchip registration.",
    tag: "Digital ID",
  },
  {
    number: "02",
    icon: FileHeart,
    title: "Health Records",
    description:
      "Batch-traceable vaccination logs, validated anti-rabies certificates, and lifelong medical histories accessible anytime.",
    tag: "Clinical Logs",
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Care Appointments",
    description:
      "Seamless scheduling for veterinary consultations and municipal community vaccination field drives.",
    tag: "Scheduling",
  },
  {
    number: "04",
    icon: BellRing,
    title: "Smart Reminders",
    description:
      "Intelligent proactive alerts calculated from vaccine lot dates, deworming cycles, and medication schedules.",
    tag: "Automation",
  },
];

export function LandingValueProp() {
  return (
    <section id="overview" className="py-16 md:py-24 lg:py-28 border-t border-border/70 relative scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header (Editorial alignment) */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
            Core Capabilities
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-3 sm:mb-4">
            Everything important, <br className="hidden sm:inline" />
            right when you need it.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            A unified platform engineered for pet guardians and veterinary providers to collaborate effortlessly on lifelong companion wellbeing.
          </p>
        </div>

        {/* 4-Item Editorial Grid with subtle numbering and consistent icon weights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
          {capabilities.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between pt-5 sm:pt-6 border-t border-border/80 transition-colors hover:border-primary/50"
              >
                <div>
                  <div className="flex items-center justify-between mb-3.5 sm:mb-4">
                    <div className="size-8 sm:size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      <Icon className="size-4 sm:size-4.5" strokeWidth={2} />
                    </div>
                    <span className="text-xs font-mono font-bold text-muted-foreground/60 group-hover:text-primary transition-colors">
                      {item.number}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 sm:mt-6 pt-3 flex items-center">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground tracking-wide uppercase">
                    {item.tag}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
