"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const APK_DOWNLOAD_URL =
  "https://www.dropbox.com/scl/fi/fz9maf2qy55zx7683mxwf/syncvet.apk?rlkey=bpow4wzey0ylnzj3z73ynp2kq&st=6gwsgp8u&dl=1";

export function LandingCta() {
  return (
    <section className="py-20 md:py-28 lg:py-36 border-t border-border/70 text-center relative overflow-hidden bg-muted/20">
      {/* Background Soft Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 space-y-5 sm:space-y-6">
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[40px] leading-[1.12]">
          Take better care of <br className="hidden sm:inline" />
          what matters most.
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Keep your pet’s care organized with SyncVet. Accessible anytime for guardians, veterinarians, and field clinics.
        </p>

        <div className="pt-2 sm:pt-4 flex flex-wrap items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-10 sm:h-11 px-6 sm:px-8 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm active:scale-[0.98]"
          >
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              download="syncvet.apk"
            >
              Download Android APK
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-10 sm:h-11 px-5 sm:px-7 rounded-xl text-xs sm:text-sm font-semibold border-border hover:bg-muted/80 text-foreground transition-all"
          >
            <Link href="/sign-in">
              Sign In to Portal
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
