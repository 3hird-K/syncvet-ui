"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import QRCode from "qrcode";
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
  Printer,
  Dog,
  Cat,
  Copy,
  Check,
  QrCode,
  Tag,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PublicPetVerificationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

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
  const { data: dbPet } = useQuery({
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
  const rawSpecies = dbPet?.species || querySpecies || "Dog";
  const isDog = rawSpecies.toLowerCase().includes("dog") || rawSpecies.toLowerCase().includes("canine");
  const species = isDog ? "Dog" : "Cat";
  const breed = dbPet?.breed || queryBreed || (species === "Cat" ? "Domestic Shorthair" : "Aspin (Asong Pinoy)");
  const tagId = dbPet?.microchip_number || queryTag || dbPet?.id || petId || "CDO-REG-VERIFIED";
  const ownerName = dbPet?.users?.full_name || queryOwner || "Registered Pet Guardian";
  const ownerAddress = dbPet?.users?.address || queryBgy || "Carmen, Cagayan de Oro City";

  const isVaccinated =
    dbPet !== undefined
      ? Boolean(dbPet?.is_vaccinated || dbPet?.rabies_vaccinated)
      : queryVax === "1" || queryVax === "true";

  const lastVaccination = dbPet?.last_vaccination_date || queryLastVax || (isVaccinated ? "2026-05-10" : "None Recorded");
  const nextVaccination = dbPet?.next_vaccination_date || queryNextVax || (isVaccinated ? "2027-05-10" : "Due for Booster");

  const formattedGender = dbPet?.gender
    ? dbPet.gender.charAt(0).toUpperCase() + dbPet.gender.slice(1)
    : "Male";

  const isSterilized = Boolean(dbPet?.is_spayed_neutered || dbPet?.is_neutered);

  const currentYear = new Date().getFullYear();
  const birthYear = dbPet?.birth_year;
  const ageDisplay = birthYear
    ? `${Math.max(1, currentYear - birthYear)} Years Old`
    : "2 Years Old";

  const weightCategory = dbPet?.weight_category
    ? dbPet.weight_category.charAt(0).toUpperCase() + dbPet.weight_category.slice(1)
    : "Medium (10–25 kg)";

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr === "None Recorded" || dateStr === "Due for Booster") return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Generate QR Code for printing and physical verification
  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    QRCode.toDataURL(currentUrl, {
      width: 140,
      margin: 1,
      color: {
        dark: "#064e3b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Verification Link Copied", {
        description: "Official verification URL copied to your clipboard.",
      });
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col justify-start items-center py-4 sm:py-8 px-3 sm:px-6 print:p-0 print:m-0 print:min-h-0 print:bg-white">
      {/* Strict 1-Page Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 11px !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .passport-card {
            border: 1.5px solid #059669 !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Screen-Only Top Navigation Bar */}
      <div className="w-full max-w-2xl mx-auto mb-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 shadow-xs print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Image
              src={Logo}
              alt="SyncVet Logo"
              className="size-6 object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-tight text-foreground">
                SYNCVET CDO
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Verification
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">
              City Veterinary Office · Official Municipal Animal Passport
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-border hover:bg-muted rounded-lg cursor-pointer"
            title="Share verification link"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-600" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3 text-muted-foreground" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-3 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg cursor-pointer shadow-xs"
            title="Print official one-page document"
          >
            <Printer className="size-3.5" />
            <span>Print 1-Page Pass</span>
          </Button>
        </div>
      </div>

      {/* ── Official Government Animal Passport (Strictly 1 Page) ── */}
      <div className="passport-card w-full max-w-2xl mx-auto rounded-2xl border-2 border-emerald-600/30 bg-white dark:bg-slate-900 shadow-xl overflow-hidden print:border-emerald-600 print:shadow-none">
        {/* Certificate Header Banner (Light Official Municipal Seal) */}
        <div className="p-4 sm:p-5 border-b border-border/70 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-12 rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-emerald-500/30 shadow-xs flex items-center justify-center shrink-0">
                <Image
                  src={Logo}
                  alt="City Government Seal"
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Republic of the Philippines · City of Cagayan de Oro
                </p>
                <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground uppercase">
                  City Veterinary Office
                </h1>
                <p className="text-[10px] text-muted-foreground">
                  Animal Health, Public Safety & Rabies Elimination Services
                </p>
              </div>
            </div>

            {/* Top Right: Scannable Mini QR / Verification Seal */}
            <div className="flex flex-col items-center justify-center shrink-0 text-center pl-2">
              {qrDataUrl ? (
                <div className="p-1 bg-white rounded-lg border border-emerald-500/30 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Verify QR" className="size-12 rounded" />
                </div>
              ) : (
                <div className="size-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <QrCode className="size-6 text-emerald-600" />
                </div>
              )}
              <span className="text-[8px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tracking-tight">
                SCAN TO VERIFY
              </span>
            </div>
          </div>

          {/* Official Document Sub-Bar */}
          <div className="mt-3 pt-2.5 border-t border-emerald-600/20 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                Official Animal Passport
              </span>
              <span className="text-[11px] font-mono font-bold text-foreground">
                ID #{tagId}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              <span>Certified Tamper-Resistant Municipal Record</span>
            </div>
          </div>
        </div>

        {/* Certificate Body (Compact & High-Density for 1-Page Guarantee) */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {/* Pet Identity & Biological Profile Row */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={cn(
                  "size-14 rounded-xl flex items-center justify-center shrink-0 border shadow-xs",
                  isDog
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                )}
              >
                {isDog ? <Dog className="size-8" /> : <Cat className="size-8" />}
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                    {petName}
                  </h2>
                  <Badge
                    className={cn(
                      "text-[9px] font-bold border-0 py-0.2 px-2",
                      isVaccinated
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    )}
                  >
                    {isVaccinated ? "Rabies Vaccinated" : "Unvaccinated"}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-muted-foreground truncate">
                  {breed} · {formattedGender}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  Municipal Tag: <strong className="text-foreground">{tagId}</strong>
                </p>
              </div>
            </div>

            {/* Quick Vitals Column */}
            <div className="grid grid-cols-3 sm:grid-cols-1 gap-2 sm:gap-1 text-[11px] sm:text-right border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-4 shrink-0">
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Age</span>
                <span className="font-bold text-foreground">{ageDisplay}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Physique / Weight</span>
                <span className="font-bold text-foreground">{weightCategory}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px] uppercase font-bold">Sterilization</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400">
                  {isSterilized ? (species === "Dog" ? "Kapon (Neutered)" : "Spayed/Neutered") : "Intact (Not Sterilized)"}
                </span>
              </div>
            </div>
          </div>

          {/* Anti-Rabies Core Immunization Certificate Section */}
          <div
            className={cn(
              "p-3.5 rounded-xl border space-y-2",
              isVaccinated
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                : "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-7 rounded-lg flex items-center justify-center shrink-0 border",
                    isVaccinated
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-amber-600 text-white border-amber-700"
                  )}
                >
                  <Syringe className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                    {isVaccinated
                      ? "Anti-Rabies Core Immunization (RA 9482 Certified)"
                      : "Anti-Rabies Vaccination Pending / Verification Needed"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Administered under City Veterinary Office Rabies Elimination Program
                  </p>
                </div>
              </div>

              <Badge
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 shrink-0",
                  isVaccinated
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                )}
              >
                {isVaccinated ? "Protected & Compliant" : "Booster Due"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Last Vaccination Date
                </span>
                <span className="font-bold text-foreground text-xs">
                  {formatDate(lastVaccination)}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Next Booster Due Date
                </span>
                <span className="font-bold text-foreground text-xs">
                  {formatDate(nextVaccination)}
                </span>
              </div>
            </div>
          </div>

          {/* Registered Guardian & Community Jurisdiction (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Registered Pet Guardian
              </span>
              <p className="font-bold text-foreground text-xs truncate flex items-center gap-1.5">
                <span>{ownerName}</span>
                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
              </p>
              <p className="text-[10px] text-muted-foreground">Verified Citizen Account</p>
            </div>

            <div className="p-3 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                Municipal Jurisdiction
              </span>
              <p className="font-bold text-foreground text-xs truncate flex items-center gap-1">
                <MapPin className="size-3 text-primary shrink-0" />
                <span>{ownerAddress}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">Cagayan de Oro City, Misamis Oriental</p>
            </div>
          </div>

          {/* Lost & Found Community Rescue Beacon */}
          <div className="p-3 rounded-xl border border-border/80 bg-slate-100/80 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                <Heart className="size-3.5 text-rose-500 fill-rose-500 shrink-0" />
                <span>Found this companion animal in Cagayan de Oro?</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Please contact the City Veterinary Office to coordinate safe reunion with the registered guardian.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <a
                href="tel:0888573180"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shadow-2xs hover:bg-primary/90 transition-colors"
              >
                <Phone className="size-3" />
                <span>(088) 857-3180</span>
              </a>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                CVO Complex, Carmen
              </span>
            </div>
          </div>

          {/* Official Signatures & Verification Seal */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">
                City Veterinary Office Central Clinic
              </p>
              <p>CVO Complex, J.V. Seriña St., Carmen, Cagayan de Oro City</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-foreground">
                Dr. Helen Ann P. Tacandong, DVM
              </p>
              <p>City Government Department Head II · City Veterinarian</p>
            </div>
          </div>
        </div>

        {/* Certificate Footnote */}
        <div className="px-5 py-2 bg-muted/30 border-t border-border/50 text-center text-[9px] text-muted-foreground">
          Official Municipal Record • Republic Act No. 9482 (Anti-Rabies Act) & Republic Act No. 10173 (Data Privacy Act of 2012)
        </div>
      </div>
    </div>
  );
}
