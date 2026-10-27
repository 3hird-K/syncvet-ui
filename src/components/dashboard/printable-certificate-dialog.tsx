"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Printer,
  Download,
  ShieldCheck,
  CheckCircle2,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type CVOHealthCertificate } from "@/data/cvo-store";
import Link from "next/link";

interface PrintableCertificateDialogProps {
  certificate: CVOHealthCertificate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrintableCertificateDialog({
  certificate,
  open,
  onOpenChange,
}: PrintableCertificateDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!certificate) return;
    const verifyUrl = `${window.location.origin}/verify/certificate/${certificate.certificateNumber}`;
    QRCode.toDataURL(verifyUrl, {
      width: 160,
      margin: 1,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("QR Code generation error:", err));
  }, [certificate]);

  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-background">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b pr-10 sm:pr-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-600" />
            <DialogTitle className="text-base font-bold">
              Official Veterinary Health Certificate Preview
            </DialogTitle>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
            {certificate.status.toUpperCase()}
          </Badge>
        </DialogHeader>

        {/* Printable Official Government Document Container */}
        <div id="printable-certificate" className="p-6 sm:p-8 bg-card rounded-xl border-2 border-border/80 shadow-md text-foreground space-y-6 font-sans">
          {/* Header */}
          <div className="text-center border-b-2 border-primary/20 pb-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Republic of the Philippines • City Government of Cagayan de Oro
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-primary uppercase">
              City Veterinary Office
            </h1>
            <p className="text-xs text-muted-foreground">
              Animal Health, Regulatory & Disease Prevention Services • Cagayan de Oro City
            </p>
            <div className="pt-2">
              <span className="inline-block px-4 py-1 text-sm font-black tracking-wider uppercase bg-primary/10 text-primary rounded-full border border-primary/20">
                Official Veterinary Health Certificate
              </span>
            </div>
          </div>

          {/* Certificate Identification & QR row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-lg bg-muted/20 border border-border/60">
            <div className="space-y-1 text-xs text-center sm:text-left">
              <p className="text-muted-foreground">
                Certificate Serial No.:{" "}
                <strong className="font-mono text-sm text-foreground font-extrabold">{certificate.certificateNumber}</strong>
              </p>
              <p className="text-muted-foreground">
                Date Issued: <strong className="text-foreground">{certificate.issueDate}</strong> • Valid Until:{" "}
                <strong className="text-foreground">{certificate.validUntil}</strong>
              </p>
              <p className="text-muted-foreground">
                Purpose: <strong className="text-primary font-semibold">{certificate.purpose}</strong>
              </p>
            </div>

            {/* QR Verification Badge */}
            <div className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border shrink-0">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR Verification for ${certificate.certificateNumber}`}
                  className="size-20 rounded"
                />
              )}
              <div className="text-[10px] space-y-0.5 text-muted-foreground max-w-[120px]">
                <p className="font-bold text-foreground leading-tight">Official CVO Verification</p>
                <p className="text-[9px] text-muted-foreground/80 leading-tight">Scan with any smartphone camera to verify authenticity</p>
              </div>
            </div>
          </div>

          {/* Patient Details & Owner Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Animal Information */}
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/10 space-y-1.5">
              <p className="font-bold text-[11px] uppercase tracking-wider text-primary border-b border-border/60 pb-1">
                Animal Identification
              </p>
              <p><span className="text-muted-foreground">Name:</span> <strong>{certificate.petName}</strong></p>
              <p><span className="text-muted-foreground">Species:</span> <strong>{certificate.species}</strong></p>
              <p><span className="text-muted-foreground">Breed:</span> <strong>{certificate.breed}</strong></p>
              <p><span className="text-muted-foreground">Sex / Age:</span> <strong>{certificate.sex} • {certificate.age}</strong></p>
              <p><span className="text-muted-foreground">Color / Markings:</span> <strong>{certificate.color}</strong></p>
              {certificate.microchipOrTag && (
                <p><span className="text-muted-foreground">Microchip / Tag:</span> <span className="font-mono font-bold">{certificate.microchipOrTag}</span></p>
              )}
            </div>

            {/* Owner Information */}
            <div className="p-3.5 rounded-lg border border-border/70 bg-muted/10 space-y-1.5">
              <p className="font-bold text-[11px] uppercase tracking-wider text-primary border-b border-border/60 pb-1">
                Owner Information
              </p>
              <p><span className="text-muted-foreground">Owner Name:</span> <strong>{certificate.ownerName}</strong></p>
              <p><span className="text-muted-foreground">Address:</span> <strong>{certificate.ownerAddress}</strong></p>
              <p><span className="text-muted-foreground">Barangay:</span> <strong>Barangay {certificate.ownerBarangay}</strong></p>
              <p><span className="text-muted-foreground">Jurisdiction:</span> <strong>Cagayan de Oro City, Misamis Oriental</strong></p>
              <p><span className="text-muted-foreground">Contact:</span> <strong>{certificate.ownerContact}</strong></p>
            </div>
          </div>

          {/* Rabies Immunization Record */}
          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-1.5 text-xs">
            <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-600 border-b border-emerald-500/20 pb-1 flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" /> Official Rabies Immunization Record
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-muted-foreground text-[10px] block">Vaccine Brand</span>
                <strong>{certificate.rabiesVaccination.brand}</strong>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Batch / Lot No.</span>
                <strong className="font-mono">{certificate.rabiesVaccination.batchNumber}</strong>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Date Administered</span>
                <strong>{certificate.rabiesVaccination.dateGiven}</strong>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Immunity Valid Until</span>
                <strong className="text-emerald-600 font-bold">{certificate.rabiesVaccination.validUntil}</strong>
              </div>
            </div>
          </div>

          {/* Veterinary Findings */}
          <div className="p-3.5 rounded-lg border border-border/70 bg-muted/10 space-y-1 text-xs">
            <p className="font-bold text-[11px] uppercase tracking-wider text-primary">
              Clinical Veterinary Inspection Findings
            </p>
            <p className="text-muted-foreground leading-relaxed">
              {certificate.findings}
            </p>
            <div className="flex items-center gap-2 pt-2 text-emerald-600 font-bold text-xs">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Certified rabies-free, clinically sound, and FIT FOR TRAVEL.</span>
            </div>
          </div>

          {/* Signature & Seal Block */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border/60">
            <div className="text-center sm:text-left text-[11px] text-muted-foreground space-y-0.5">
              <p className="font-bold text-foreground">ISSUED AT:</p>
              <p>{certificate.issuingOffice}</p>
              <p>Official Dry Seal Required for Paper Travel</p>
            </div>

            <div className="text-center sm:text-right space-y-0.5 text-xs">
              <div className="w-48 h-10 border-b border-foreground/40 mx-auto sm:ml-auto flex items-end justify-center pb-1">
                <span className="font-serif italic text-sm text-foreground/80 font-bold">
                  {certificate.issuingVet}
                </span>
              </div>
              <p className="font-extrabold text-foreground">{certificate.issuingVet}</p>
              <p className="text-[10px] text-muted-foreground">Licensed City Veterinarian</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {certificate.vetLicenseNo} • {certificate.vetPtrNo}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3">
          <Link
            href={`/verify/certificate/${certificate.certificateNumber}`}
            target="_blank"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 sm:mr-auto"
          >
            <ExternalLink className="size-3" /> Test Public Verification Page
          </Link>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-2 cursor-pointer">
            <Printer className="size-3.5" /> Print Certificate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
