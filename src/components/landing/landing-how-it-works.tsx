"use client";

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Register your pet guardian profile in under two minutes with secure authentication.",
  },
  {
    number: "02",
    title: "Add your pets",
    description: "Enroll your companions and generate instant scannable digital health passports.",
  },
  {
    number: "03",
    title: "Manage their care",
    description: "Log vaccinations, monitor batch numbers, and automate proactive booster timelines.",
  },
  {
    number: "04",
    title: "Stay connected",
    description: "Access verified records anywhere and share seamlessly with veterinary providers.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 lg:py-32 border-t border-border/70 relative scroll-mt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12 sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2.5">
            How It Works
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-3 sm:mb-4">
            Simple steps to connected pet care.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Designed to remove friction from veterinary recordkeeping and keep your pets protected throughout their lives.
          </p>
        </div>

        {/* 4 Steps with subtle connecting line & clean editorial hierarchy */}
        <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-10">
          
          {/* Subtle horizontal connecting line on large screens */}
          <div className="hidden lg:block absolute top-6 left-12 right-12 h-px bg-border/80 pointer-events-none -z-10" />

          {steps.map((step) => (
            <div key={step.number} className="space-y-3 sm:space-y-4 group">
              <div className="size-10 sm:size-11 rounded-2xl bg-card border border-border/80 flex items-center justify-center shadow-xs transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
                <span className="text-xs sm:text-sm font-mono font-bold text-primary">
                  {step.number}
                </span>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5 sm:mb-2 group-hover:text-primary transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
