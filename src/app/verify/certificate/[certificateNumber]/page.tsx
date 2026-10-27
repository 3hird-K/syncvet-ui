"use client";

import { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Logo from "@/assets/logo-dark.png";
import {
  CheckCircle2,
  ShieldCheck,
  Building2,
  Phone,
  Printer,
  Calendar,
  FileCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CertificateVerificationPage() {
  const params = useParams();
  const certNumber = (params?.certificateNumber as string) || "CDO-CVO-CERT";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-foreground flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xl mx-auto space-y-4">
        {/* Top Header */}
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
          >
            <Printer className="size-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>

        {/* Verification Status */}
        <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-emerald-800 dark:text-emerald-300">
                  Certificate Verified Genuine
                </h1>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold tracking-wider uppercase px-2 py-0.5">
                  Official Record
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Authentic municipal veterinary health certificate issued by the City Veterinary Office of Cagayan de Oro.
              </p>
            </div>
          </div>
        </div>

        {/* Certificate Card */}
        <Card className="rounded-2xl border border-border/80 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
          <CardHeader className="p-5 pb-3 bg-muted/20 border-b border-border/60">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  CERTIFICATE NUMBER
                </span>
                <p className="font-mono text-xl font-extrabold text-foreground tracking-tight">
                  {certNumber}
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                ACTIVE & VALID
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <FileCheck2 className="size-4 text-primary" />
                <span>Veterinary Health Clearance & Transport Permit</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This document officially certifies that the companion animal underwent clinical examination by a licensed CVO veterinarian, is free from communicable diseases, and has updated anti-rabies immunity.
              </p>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-3">
              <p className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" /> Issuing Authority
              </p>
              <p className="text-muted-foreground text-[11px]">
                City Veterinary Office Central Clinic, CVO Complex, J.V. Seriña St., Carmen, Cagayan de Oro City
              </p>
              <p className="text-muted-foreground text-[11px]">
                Official Hotline: (088) 857-3180 • Mon – Fri, 8:00 AM – 5:00 PM
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footnote */}
        <div className="text-center pt-2 pb-4 space-y-1 text-[11px] text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="size-3.5 text-emerald-600" />
            Official City Government of Cagayan de Oro Municipal Record
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            Republic Act No. 8485 (Animal Welfare Act) & RA 9482 (Anti-Rabies Act of 2007).
          </p>
        </div>
      </div>
    </div>
  );
}
