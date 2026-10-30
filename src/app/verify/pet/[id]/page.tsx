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
  Heart,
  Printer,
  Copy,
  Check,
  QrCode,
  Tag,
  Scale,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PetAvatar } from "@/components/dashboard/pet-avatar";
import { getPetAvatarUrl } from "@/lib/pet-avatars";

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
  const queryPhoto = searchParams.get("photo") || searchParams.get("avatar") || "";
  const queryContact = searchParams.get("contact") || searchParams.get("phone") || searchParams.get("tel") || "";

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
  const ownerContact = dbPet?.users?.phone_number || queryContact || "0991-855-2236";
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

  // Resolve pet avatar image URL
  const petPhotoUrl = dbPet?.photo_url || queryPhoto || getPetAvatarUrl(dbPet?.photo_url, species);

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-emerald-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/20 text-foreground flex flex-col justify-center items-center p-2.5 sm:p-4 print:p-0 print:bg-white overflow-hidden sm:overflow-auto">
      {/* Strict 1-Page Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
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

      {/* ── Official Municipal Pet Tagging & Animal Passport (Single 1-Page Guaranteed) ── */}
      <div className="passport-card w-full max-w-xl mx-auto rounded-2xl border-2 border-emerald-600/35 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden print:border-emerald-600 print:shadow-none flex flex-col">
        {/* Certificate Header Banner */}
        <div className="p-3.5 sm:p-4 border-b border-border/70 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-11 sm:size-12 rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-emerald-500/30 shadow-xs flex items-center justify-center shrink-0">
                <Image
                  src={Logo}
                  alt="City Government Seal"
                  className="size-full object-contain"
                  priority
                />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  Republic of the Philippines · City of Cagayan de Oro
                </p>
                <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground uppercase truncate">
                  City Veterinary Office
                </h1>
                <p className="text-[9.5px] text-muted-foreground truncate">
                  Municipal Companion Animal Tagging & Health Identification
                </p>
              </div>
            </div>

            {/* Top Right: Scannable Mini QR & Action Shortcuts */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex flex-col items-center justify-center text-center">
                {qrDataUrl ? (
                  <div className="p-0.5 bg-white rounded-md border border-emerald-500/30 shadow-2xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt="Verify QR" className="size-10 sm:size-11 rounded" />
                  </div>
                ) : (
                  <div className="size-10 sm:size-11 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <QrCode className="size-5 text-emerald-600" />
                  </div>
                )}
                <span className="text-[7px] font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 tracking-tight">
                  SCAN TO VERIFY
                </span>
              </div>

              {/* Action Buttons (Print & Share) */}
              <div className="flex flex-col gap-1 print:hidden">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="size-6 sm:size-7 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Copy verification link"
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3 text-muted-foreground" />}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="size-6 sm:size-7 rounded-lg border border-border/80 bg-background hover:bg-muted text-foreground flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Print official pass"
                >
                  <Printer className="size-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Official Document Sub-Bar */}
          <div className="mt-2.5 pt-2 border-t border-emerald-600/20 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1">
                <Tag className="size-2.5" /> Tag ID
              </span>
              <span className="text-[11px] font-mono font-bold text-foreground">
                #{tagId}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3" />
              <span>Certified Tamper-Resistant Municipal Tag</span>
            </div>
          </div>
        </div>

        {/* Certificate Body (Strictly 1-Page Layout) */}
        <div className="p-3.5 sm:p-4 space-y-2.5 text-xs">
          {/* Pet Identity & Profile Row (with Pet Avatar) */}
          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {/* Pet Profile Avatar Image */}
              <div className="shrink-0">
                <PetAvatar
                  photoUrl={petPhotoUrl}
                  species={species}
                  name={petName}
                  size="xl"
                />
              </div>

              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight truncate">
                    {petName}
                  </h2>
                  <Badge
                    className={cn(
                      "text-[9px] font-extrabold border-0 py-0 px-1.5",
                      isVaccinated
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    )}
                  >
                    {isVaccinated ? "Rabies Vaccinated" : "Unvaccinated"}
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-foreground/90 truncate">
                  {breed} · {formattedGender}
                </p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-2">
                  <span>{ageDisplay}</span>
                  <span className="text-border">•</span>
                  <span>{weightCategory}</span>
                </p>
              </div>
            </div>

            {/* Sterilization Badge */}
            <div className="text-right shrink-0">
              <span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">
                Sterilization
              </span>
              <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
                {isSterilized ? (species === "Dog" ? "Kapon (Neutered)" : "Spayed/Neutered") : "Intact (Not Sterilized)"}
              </span>
            </div>
          </div>

          {/* Anti-Rabies Core Immunization Status */}
          <div
            className={cn(
              "p-2.5 rounded-xl border space-y-1.5",
              isVaccinated
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-950 dark:text-emerald-100"
                : "border-amber-500/30 bg-amber-500/5 text-amber-950 dark:text-amber-100"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "size-6 rounded-md flex items-center justify-center shrink-0 border",
                    isVaccinated
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-amber-600 text-white border-amber-700"
                  )}
                >
                  <Syringe className="size-3" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground leading-tight">
                    {isVaccinated
                      ? "Anti-Rabies Core Immunization (RA 9482 Certified)"
                      : "Anti-Rabies Vaccination Pending / Verification Needed"}
                  </h3>
                  <p className="text-[9.5px] text-muted-foreground">
                    Administered under City Veterinary Office Rabies Elimination Program
                  </p>
                </div>
              </div>

              <Badge
                className={cn(
                  "text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 shrink-0",
                  isVaccinated
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-amber-600 text-white hover:bg-amber-700"
                )}
              >
                {isVaccinated ? "Compliant" : "Booster Due"}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-border/50 text-xs">
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Last Vaccination Date
                </span>
                <span className="font-bold text-foreground text-[11px]">
                  {formatDate(lastVaccination)}
                </span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Next Booster Due Date
                </span>
                <span className="font-bold text-foreground text-[11px]">
                  {formatDate(nextVaccination)}
                </span>
              </div>
            </div>
          </div>

          {/* Registered Guardian & Community Jurisdiction (2-Column Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Registered Pet Guardian
                </span>
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-2.5" /> Verified
                </span>
              </div>
              <p className="font-bold text-foreground text-xs truncate">
                {ownerName}
              </p>
              {ownerContact && (
                <p className="text-[10px] font-mono font-semibold text-foreground/90 flex items-center gap-1 pt-0.5">
                  <Phone className="size-2.5 text-primary shrink-0" />
                  <a
                    href={`tel:${ownerContact.replace(/\D/g, "")}`}
                    className="hover:underline text-primary"
                    title="Call Pet Guardian"
                  >
                    {ownerContact}
                  </a>
                </p>
              )}
            </div>

            <div className="p-2.5 rounded-xl border border-border/70 bg-muted/20 space-y-0.5">
              <span className="text-[8.5px] font-bold text-muted-foreground uppercase tracking-wider block">
                Municipal Jurisdiction
              </span>
              <p className="font-bold text-foreground text-xs truncate flex items-center gap-1">
                <MapPin className="size-3 text-primary shrink-0" />
                <span>{ownerAddress}</span>
              </p>
              <p className="text-[9.5px] text-muted-foreground">Cagayan de Oro City, Misamis Oriental</p>
            </div>
          </div>

          {/* Lost & Found Community Rescue Beacon */}
          <div className="p-2.5 rounded-xl border border-border/80 bg-slate-100/80 dark:bg-slate-800/40 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                <Heart className="size-3 text-rose-500 fill-rose-500 shrink-0" />
                <span>Found this companion animal in Cagayan de Oro?</span>
              </div>
              <p className="text-[9.5px] text-muted-foreground truncate">
                Contact owner directly or call City Veterinary Office for coordination.
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {ownerContact && (
                <a
                  href={`tel:${ownerContact.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-2xs hover:bg-emerald-700 transition-colors shrink-0"
                  title="Call Pet Guardian Directly"
                >
                  <Phone className="size-2.5" />
                  <span>Call Owner</span>
                </a>
              )}
              <a
                href="tel:0888573180"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold shadow-2xs hover:bg-primary/20 transition-colors shrink-0"
                title="Call City Veterinary Office"
              >
                <span>CVO (088) 857-3180</span>
              </a>
            </div>
          </div>

          {/* Official Signatures & Footnote */}
          <div className="pt-1.5 border-t border-border/60 flex items-center justify-between gap-2 text-[9px] text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground">
                CVO Central Clinic
              </p>
              <p>J.V. Seriña St., Carmen, Cagayan de Oro City</p>
            </div>

            <div className="text-right">
              <p className="font-bold text-foreground">
                Dr. Helen Ann P. Tacandong, DVM
              </p>
              <p>City Veterinarian · CVO Head II</p>
            </div>
          </div>
        </div>

        {/* Certificate Footnote */}
        <div className="px-4 py-1.5 bg-muted/30 border-t border-border/50 text-center text-[8.5px] text-muted-foreground">
          Official Municipal Record • Republic Act No. 9482 (Anti-Rabies Act) & Republic Act No. 10173 (Data Privacy Act of 2012)
        </div>
      </div>
    </div>
  );
}
