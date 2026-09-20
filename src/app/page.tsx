import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingTicker } from "@/components/landing/landing-ticker";
import { LandingAbout } from "@/components/landing/landing-about";
import { LandingPathways } from "@/components/landing/landing-pathways";
import { LandingAffiliations } from "@/components/landing/landing-affiliations";
import { LandingGallery } from "@/components/landing/landing-gallery";
import { LandingServices } from "@/components/landing/landing-services";
import { LandingContact } from "@/components/landing/landing-contact";
import { LandingMap } from "@/components/landing/landing-map";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* 1. Floating Capsule Navigation Bar */}
      <LandingNavbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* 01 — Dedicated Android App Download Hero */}
        <LandingHero />

        {/* 01.5 — System Capabilities Infinite Ticker Tape */}
        <LandingTicker />

        {/* 02 — About Cagayan de Oro City Veterinary Office (Dr. Helen Ann P. Tacandong) */}
        <LandingAbout />

        {/* 03 — Three Pathways Care Ecosystem (Alternating Editorial Features) */}
        <LandingPathways />

        {/* 03.5 — Institutional Partnerships & Accreditations Infinite Marquee */}
        <LandingAffiliations />

        {/* 03.7 — Field Moments & Curated System Bento Gallery */}
        <LandingGallery />

        {/* 04 — Our Services Section (Municipal Care Architecture) */}
        <LandingServices />

        {/* 05 — Contact City Veterinary Office & Municipal Inquiries */}
        <LandingContact />

        {/* 06 — Office Location & Driving Directions Map */}
        <LandingMap />
      </main>

      {/* 07 — Restrained Modern Footer */}
      <LandingFooter />
    </div>
  );
}
