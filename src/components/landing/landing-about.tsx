"use client";

import * as React from "react";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MotionFadeIn, MotionStagger, MotionItem } from "./motion-wrapper";

const CVO_STATS = [
  {
    target: 50,
    prefix: "",
    suffix: "K+",
    label: "Annual Vaccinations Administered",
  },
  {
    target: 80,
    prefix: "",
    suffix: "",
    label: "Barangays Actively Served",
  },
  {
    target: 30,
    prefix: "",
    suffix: "+",
    label: "Years Municipal Animal Health",
  },
  {
    target: 1,
    prefix: "#",
    suffix: " Leader",
    scramble: true,
    label: "Zoonosis Control in Region X",
  },
];

/* Rumble Counter: Starts at 0, rumbles rapidly up to target value with easing and slot scramble */
function RumbleCounter({
  target,
  prefix = "",
  suffix = "",
  scramble = false,
  duration = 1.8,
}: {
  target: number;
  prefix?: string;
  suffix?: string;
  scramble?: boolean;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.25 });
  const [displayVal, setDisplayVal] = React.useState<number | string>(0);

  React.useEffect(() => {
    if (!isInView) {
      setDisplayVal(0);
      return;
    }

    const startTime = performance.now();
    const durationMs = duration * 1000;
    let animId: number;

    // Smooth exponential ease-out curve (fast initial rumble, silky landing)
    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = easeOutExpo(progress);

      if (scramble && progress < 0.82) {
        // High-energy rumble scramble for small numbers
        const pool = [4, 8, 2, 7, 3, 9, 5, 6, 2, 1];
        const idx = Math.floor(elapsed / 65) % pool.length;
        setDisplayVal(pool[idx]);
      } else {
        const current = Math.round(eased * target);
        setDisplayVal(current);
      }

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayVal(target);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isInView, target, duration, scramble]);

  return (
    <span ref={ref} className="inline-flex items-baseline tabular-nums whitespace-pre">
      {prefix && <span>{prefix}</span>}
      <span>{displayVal}</span>
      {suffix && <span>{suffix}</span>}
    </span>
  );
}

/* Official bare brand icons matching reference style (black & white default, brand hover) */
function FacebookGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
      />
    </svg>
  );
}

function GlobeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function MailGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

const CVO_SOCIALS = [
  {
    name: "Facebook",
    icon: FacebookGlyph,
    href: "https://www.facebook.com/CityVetCDO",
    label: "City Veterinary Office - Cagayan de Oro Facebook",
    hoverColor: "hover:text-[#1877F2]",
  },
  {
    name: "Portal",
    icon: GlobeGlyph,
    href: "https://cagayandeoro.gov.ph",
    label: "Cagayan de Oro Official Portal",
    hoverColor: "hover:text-[#0066CC]",
  },
  {
    name: "Email",
    icon: MailGlyph,
    href: "mailto:cityvet@cagayandeoro.gov.ph",
    label: "Email City Veterinary Office",
    hoverColor: "hover:text-[#EA4335]",
  },
];

export function LandingAbout() {
  return (
    <section
      id="about"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/70 bg-background py-6 sm:py-8 lg:py-9 min-h-[calc(100vh-4rem)] flex flex-col justify-center"
    >
      {/* Background Ambience */}
      <div className="absolute top-1/3 left-0 w-[450px] h-[450px] bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto w-full max-w-7xl px-5 sm:px-10">
        <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
          
          {/* ── LEFT: Editorial Leadership Story (lg: 7 cols) ── */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            <MotionFadeIn direction="up">
              <div className="flex items-center gap-3">
                <span className="h-px w-8 bg-primary/70" />
                <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.3em] uppercase text-primary">
                  CITY VETERINARY OFFICE · CAGAYAN DE ORO
                </span>
              </div>
            </MotionFadeIn>

            <MotionFadeIn direction="up" delay={0.05}>
              <h2 className="text-2xl sm:text-3xl lg:text-[2.6rem] font-semibold tracking-tight text-foreground leading-[1.12]">
                Dedicated to care that speaks{" "}
                <em className="font-serif font-medium text-primary italic">
                  in results,
                </em>{" "}
                not promises.
              </h2>
            </MotionFadeIn>

            <MotionFadeIn direction="up" delay={0.1}>
              <p className="text-xs sm:text-sm lg:text-[14.5px] leading-relaxed text-muted-foreground max-w-xl font-normal">
                Under the leadership of City Veterinarian{" "}
                <strong className="text-foreground font-semibold">
                  Dr. Helen Ann P. Tacandong
                </strong>
                , the Cagayan de Oro City Veterinary Office (CVO) delivers frontline
                clinical excellence across all 80 barangays. Through SyncVet, we
                bridge municipal veterinary infrastructure directly with pet guardians—digitizing
                vaccination passports, safeguarding public animal health, and preventing zoonotic diseases.
              </p>
            </MotionFadeIn>

            <MotionFadeIn direction="up" delay={0.15}>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Button
                  asChild
                  size="lg"
                  className="h-11 px-6 sm:px-7 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-[0.98] inline-flex items-center gap-2"
                >
                  <a
                    href="https://www.facebook.com/CityVetCDO"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Connect with City Vet</span>
                    <ArrowUpRight className="size-4" />
                  </a>
                </Button>

                <a
                  href="tel:0888572185"
                  className="text-xs sm:text-sm font-semibold tracking-wider text-primary uppercase underline decoration-primary/40 underline-offset-8 transition-colors hover:text-primary/80 inline-flex items-center"
                >
                  <span>or call (088) 857-2185</span>
                </a>
              </div>
            </MotionFadeIn>

            {/* Official Social Links (Black & White Brand Glyphs, No Circular Border, Brand Colors on Hover) */}
            <MotionFadeIn direction="up" delay={0.2}>
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-5 text-foreground">
                <div className="flex items-center gap-4 sm:gap-4.5">
                  {CVO_SOCIALS.map((social) => {
                    const Icon = social.icon;
                    return (
                      <a
                        key={social.name}
                        href={social.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={social.label}
                        aria-label={social.label}
                        className={`text-foreground/90 dark:text-foreground/90 transition-all duration-200 hover:scale-115 ${social.hoverColor} flex items-center justify-center`}
                      >
                        <Icon className="size-5" />
                      </a>
                    );
                  })}
                </div>
                <span className="hidden sm:inline-block h-3.5 w-px bg-border/80" />
                <span className="text-[11px] text-muted-foreground">
                  BSP Bldg, Archbishop Hayes St, Cagayan de Oro
                </span>
              </div>
            </MotionFadeIn>
          </div>

          {/* ── RIGHT: Head of Office Executive Portrait Card (lg: 5 cols) ── */}
          <MotionFadeIn
            direction="up"
            delay={0.12}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <div className="relative w-[270px] sm:w-[310px] lg:w-[335px] xl:w-[350px] aspect-[3/4]">
              {/* Offset Primary Border Accent: Identical twin frame shifted up-right */}
              <div className="absolute inset-0 translate-x-3 -translate-y-3 sm:translate-x-3.5 sm:-translate-y-3.5 rounded-2xl border border-primary/40 pointer-events-none -z-10 hidden sm:block" />

              {/* Main Portrait Frame */}
              <div className="relative size-full overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl group">
                <Image
                  src="/dr-helen-tacandong.jpg"
                  alt="Dr. Helen Ann P. Tacandong — City Veterinarian, Cagayan de Oro City Veterinary Office"
                  fill
                  sizes="(max-width: 640px) 270px, (max-width: 1024px) 310px, 350px"
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Floating Executive Title Badge: Balanced and docked at bottom */}
              <div className="absolute -bottom-4 left-3 right-3 sm:left-4 sm:right-4 rounded-xl border border-border/90 bg-card/95 backdrop-blur-md px-4 py-2.5 sm:px-5 sm:py-3 shadow-[0_16px_35px_-10px_rgba(0,0,0,0.35)]">
                <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                  Dr. Helen Ann P. Tacandong
                </p>
                <p className="mt-0.5 text-[8.5px] sm:text-[9.5px] tracking-[0.18em] text-primary uppercase font-semibold">
                  City Veterinarian · CVO Cagayan de Oro
                </p>
              </div>
            </div>
          </MotionFadeIn>

        </div>

        {/* ── BOTTOM: Key Municipal Performance Metrics Grid ── */}
        <div className="mt-7 sm:mt-8 border-t border-border/70 pt-4 sm:pt-5">
          <MotionStagger
            staggerDelay={0.08}
            className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:gap-x-8"
          >
            {CVO_STATS.map((stat, idx) => (
              <MotionItem key={idx} variant="fadeUp">
                <dd className="text-2xl sm:text-3xl lg:text-[2.15rem] font-extrabold tracking-tight text-foreground">
                  <RumbleCounter
                    target={stat.target}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    scramble={stat.scramble}
                  />
                </dd>
                <dt className="mt-0.5 text-[10px] sm:text-[11px] leading-snug tracking-[0.14em] uppercase text-muted-foreground font-medium">
                  {stat.label}
                </dt>
              </MotionItem>
            ))}
          </MotionStagger>
        </div>

      </div>
    </section>
  );
}
