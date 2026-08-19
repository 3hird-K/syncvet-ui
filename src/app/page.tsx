import { AosProvider } from "@/components/landing/aos-provider";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingValueProp } from "@/components/landing/landing-value-prop";
import { LandingHealthShowcase } from "@/components/landing/landing-health-showcase";
import { LandingAppointmentsShowcase } from "@/components/landing/landing-appointments-showcase";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingEmotionalMoment } from "@/components/landing/landing-emotional-moment";
import { LandingCta } from "@/components/landing/landing-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <AosProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
        {/* 1. Floating Capsule Navigation Bar */}
        <LandingNavbar />

        {/* Main Content */}
        <main className="flex-1">
          {/* 01 — Dedicated Android App Download Hero (Scannable QR & Direct APK) */}
          <LandingHero />

          {/* 02 — Product / Value Introduction */}
          <LandingValueProp />

          {/* 03 — Pet Health & Digital Passport Showcase */}
          <LandingHealthShowcase />

          {/* 04 — Appointments & Smart Reminders Showcase */}
          <LandingAppointmentsShowcase />

          {/* 05 — Simple How It Works Progression */}
          <LandingHowItWorks />

          {/* 06 — Emotional Pet Care Moment */}
          <LandingEmotionalMoment />

          {/* 07 — Confident Final Call to Action */}
          <LandingCta />
        </main>

        {/* 08 — Restrained Modern Footer */}
        <LandingFooter />
      </div>
    </AosProvider>
  );
}
