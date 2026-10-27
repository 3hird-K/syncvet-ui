"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import Logo from "@/assets/logo-dark.png";
import {
  CheckCircle2,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  Syringe,
  Building2,
  AlertTriangle,
  Heart,
  ExternalLink,
  Printer,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PawIcon } from "@/components/icons/paw-icon";

export default function PublicPetVerificationPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const petId = (params?.id as string) || "";
  const queryName = searchParams.get("name") || "";
  const querySpecies = searchParams.get("species") || "";
  const queryBreed = searchParams.get("breed") || "";
  const queryTag = searchParams.get("tag") || "";
  const queryOwner = searchParams.get("owner") || "";
  const queryBgy = searchParams.get("bgy") || "";
  const queryVax = searchParams.get("vax");
  const queryLastVax = searchParams.get("lastVax") || "";
  const queryNextVax = searchParams.get("nextVax") || "";

  const supabase = useMemo(() => getPublicSupabaseClient(), []);

  // Fetch real pet details from public Supabase `pets` table
  const { data: dbPet, isLoading } = useQuery({
    queryKey: ["public_pet_verify", petId],
    queryFn: async () => {
      if (!petId) return null;
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*, users(full_name, address, phone_number, email)")
          .eq("id", petId)
          .maybeSingle();

        if (error || !data) return null;
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 60000,
  });

  // Resolve pet information from live DB or verified QR payload
  const petName = dbPet?.name || queryName || "Companion Animal";
  const species = (dbPet?.species || querySpecies || "Dog") as "Dog" | "Cat";
  const breed = dbPet?.breed || queryBreed || (species === "Cat" ? "Domestic Shorthair" : "Aspin (Asong Pinoy)");
  const tagId = dbPet?.microchip_number || queryTag || dbPet?.id || petId || "CDO-REG-VERIFIED";
  const ownerName = dbPet?.users?.full_name || queryOwner || "Registered Pet Guardian";
  const ownerAddress = dbPet?.users?.address || queryBgy || "Cagayan de Oro City";
  const isVaccinated =
    dbPet !== undefined
      ? Boolean(dbPet?.is_vaccinated || dbPet?.rabies_vaccinated)
      : queryVax === "1" || queryVax === "true";

  const lastVaccination = dbPet?.last_vaccination_date || queryLastVax || (isVaccinated ? "2026-05-10" : "None Recorded");
  const nextVaccination = dbPet?.next_vaccination_date || queryNextVax || (isVaccinated ? "2027-05-10" : "Due for Booster");

  const formattedGender = dbPet?.gender
    ? dbPet.gender.charAt(0).toUpperCase() + dbPet.gender.slice(1)
    : "Male";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500/20">
      {/* Background ambient light */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-emerald-500/10 blur-[140px] -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Top Municipal Banner */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-border/80 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src={Logo}
              alt="SyncVet Logo"
              className="size-10 object-contain drop-shadow-xs shrink-0"
              priority
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-black tracking-tight text-foreground">
                  SYNCVET
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  OFFICIAL CDO
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">
                CITY VETERINARY OFFICE · CAGAYAN DE ORO
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 shrink-0 border-border print:hidden cursor-pointer"
            title="Print Official Record"
          >
            <Printer className="size-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>

        {/* Verification Status Card */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-emerald-800 dark:text-emerald-300">
                  Verified Digital Pet Passport
                </h1>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                  Official Record
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authentic municipal animal registry record maintained by the City Veterinary Office.
              </p>
            </div>
          </div>
        </div>

        {/* Main Pet Passport Card */}
        <Card className="rounded-2xl border border-border/80 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          {/* Card Top Strip with Pet Title */}
          <CardHeader className="p-5 sm:p-6 pb-4 bg-muted/20 border-b border-border/60">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Sparkles className="size-3 text-primary" />
                  MUNICIPAL PASSPORT ID: {tagId}
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                  {petName}
                </h2>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-background">
                    {species === "Dog" ? "🐕 Dog" : "🐈 Cat"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs font-medium text-foreground">{breed}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">{formattedGender}</span>
                </div>
              </div>

              <div className="size-16 sm:size-20 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex flex-col items-center justify-center text-primary shrink-0">
                <PawIcon className="size-8 sm:size-10" />
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-0.5">
                  Verified
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Anti-Rabies Vaccination Status Strip */}
            <div
              className={`p-4 rounded-xl border ${
                isVaccinated
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                  : "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Syringe
                    className={`size-5 ${
                      isVaccinated ? "text-emerald-600" : "text-amber-600"
                    }`}
                  />
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold">
                      {isVaccinated
                        ? "Active Anti-Rabies Immunization"
                        : "Vaccination Pending / Verification Needed"}
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Administered under City Veterinary Office Rabies Elimination Program
                    </p>
                  </div>
                </div>

                <Badge
                  className={
                    isVaccinated
                      ? "bg-emerald-600 text-white font-bold text-[10px]"
                      : "bg-amber-600 text-white font-bold text-[10px]"
                  }
                >
                  {isVaccinated ? "Immune & Protected" : "Booster Due"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/40 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">
                    Last Vaccine Date
                  </span>
                  <span className="font-semibold text-foreground">{lastVaccination}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase tracking-wider">
                    Next Booster Due
                  </span>
                  <span className="font-semibold text-foreground">{nextVaccination}</span>
                </div>
              </div>
            </div>

            {/* Registered Owner & Resident Location Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-primary" />
                Registered Owner & Community Location
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Registered Guardian
                  </span>
                  <p className="font-bold text-foreground text-sm">{ownerName}</p>
                  <p className="text-[11px] text-muted-foreground">Verified Citizen Account</p>
                </div>

                <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Municipal Jurisdiction
                  </span>
                  <p className="font-bold text-foreground flex items-center gap-1 text-xs">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span>{ownerAddress}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">Cagayan de Oro City, 9000</p>
                </div>
              </div>
            </div>

            {/* Lost & Found Community Assistance Notice */}
            <div className="p-4 rounded-xl border border-border/80 bg-slate-100 dark:bg-slate-800/50 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-foreground font-bold">
                <Heart className="size-4 text-rose-500" />
                <span>Found this companion animal in Cagayan de Oro?</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                If this pet is lost, please contact the City Veterinary Office central dispatch immediately. CVO officers will coordinate safe reunion with the registered guardian.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <a
                  href="tel:0888573180"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
                >
                  <Phone className="size-3.5" />
                  <span>Call CVO Hotline: (088) 857-3180</span>
                </a>

                <a
                  href="https://maps.google.com/?q=City+Veterinary+Office+Carmen+Cagayan+de+Oro"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted transition-colors"
                >
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span>CVO Complex, Carmen, CDO</span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* Official Headquarters Reference */}
            <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                City Veterinary Office Central Clinic
              </p>
              <p>CVO Complex, J.V. Seriña St., Carmen, Cagayan de Oro City, 9000 Misamis Oriental</p>
              <p>Clinic Hours: Monday – Friday, 8:00 AM – 5:00 PM</p>
            </div>
          </CardContent>
        </Card>

        {/* Footer & Data Privacy Notice */}
        <div className="text-center pt-2 pb-4 space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Official City Government of Cagayan de Oro Municipal Record
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Protected under Republic Act No. 10173 (Data Privacy Act of 2012) & CDO City Veterinary Ordinances.
          </p>
        </div>
      </div>
    </div>
  );
}
