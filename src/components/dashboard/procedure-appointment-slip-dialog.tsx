"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import Image from "next/image";
import Logo from "@/assets/logo-dark.png";
import {
  Calendar,
  MapPin,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Syringe,
  Scissors,
  Building2,
  QrCode,
  FileText,
  User,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PROCEDURE_SERVICES, type ProcedureServiceType } from "@/lib/cvo-slots";

interface ProcedureAppointmentSlipProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: {
    id: string;
    service_id: string;
    date: string;
    time_slot: string;
    pet_name: string;
    pet_id?: string | null;
    status: string;
    location?: string | null;
    notes?: string | null;
    created_at?: string;
  } | null;
  petDetails?: {
    name?: string;
    species?: string;
    breed?: string;
    gender?: string;
    weightKg?: number;
    microchip?: string;
  };
  ownerDetails?: {
    name?: string;
    contact?: string;
    barangay?: string;
  };
}

export function ProcedureAppointmentSlipDialog({
  open,
  onOpenChange,
  appointment,
  petDetails,
  ownerDetails,
}: ProcedureAppointmentSlipProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const serviceType: ProcedureServiceType =
    appointment?.service_id === "spay-neuter" ? "spay-neuter" : "vaccination";
  const serviceConfig = PROCEDURE_SERVICES[serviceType];

  useEffect(() => {
    if (appointment?.id) {
      const resolvedPetName = petDetails?.name || (appointment as any)?.pets?.name || appointment.pet_name;
      const payload = JSON.stringify({
        appointmentId: appointment.id,
        service: appointment.service_id,
        pet: resolvedPetName,
        date: appointment.date,
        facility: "CVO Central Clinic, Cagayan de Oro",
      });

      QRCode.toDataURL(payload, { width: 160, margin: 1 })
        .then(setQrCodeDataUrl)
        .catch((err) => console.error("QR Code error:", err));
    }
  }, [appointment]);

  if (!appointment) return null;

  const handlePrint = () => {
    const element = document.getElementById("cvo-appointment-slip");
    if (!element) {
      window.print();
      return;
    }

    // Use isolated hidden print iframe so modal backdrop or dark theme does not print
    let iframe = document.getElementById("cvo-slip-print-iframe") as HTMLIFrameElement | null;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "cvo-slip-print-iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
      .map((s) => s.outerHTML)
      .join("\n");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CVO Appointment Pass - ${appointment.id}</title>
          ${styles}
          <style>
            @page {
              size: portrait;
              margin: 10mm 12mm;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              width: 100% !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #cvo-appointment-slip {
              border: 2px solid #000000 !important;
              border-radius: 12px !important;
              box-shadow: none !important;
              width: 100% !important;
              max-width: 580px !important;
              margin: 0 auto !important;
              padding: 18px 22px !important;
              box-sizing: border-box !important;
              background: #ffffff !important;
              color: #000000 !important;
            }
            #cvo-appointment-slip * {
              color: #000000 !important;
              border-color: #333333 !important;
              background-color: transparent !important;
            }
            #cvo-appointment-slip .bg-muted\\/20,
            #cvo-appointment-slip .bg-card {
              background-color: #f8fafc !important;
              border: 1px solid #cbd5e1 !important;
            }
            #cvo-appointment-slip .print-logo {
              filter: grayscale(100%) contrast(160%) brightness(0.9) !important;
              -webkit-filter: grayscale(100%) contrast(160%) brightness(0.9) !important;
            }
            #cvo-appointment-slip .qr-container {
              background-color: #ffffff !important;
              border: 1px solid #000000 !important;
              padding: 4px !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          </style>
        </head>
        <body>
          <div style="padding: 10px;">
            ${element.outerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe?.contentWindow?.focus();
      iframe?.contentWindow?.print();
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-white dark:bg-card rounded-2xl shadow-2xl border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Official Procedure Appointment Slip</DialogTitle>
        </DialogHeader>

        {/* Top Print Action (placed right before the dialog Close 'X' icon) */}
        <div className="absolute top-3.5 right-13 sm:top-4 sm:right-14 z-50 flex items-center gap-1.5 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 px-2.5 sm:px-3 rounded-full text-xs font-bold gap-1.5 border-border/80 bg-background/90 hover:bg-muted text-foreground shadow-2xs cursor-pointer transition-all hover:scale-105 active:scale-95"
            title="Print Appointment Pass"
          >
            <Printer className="size-3.5 text-primary" />
            <span>Print</span>
          </Button>
        </div>

        {/* Printable Pass Container */}
        <div id="cvo-appointment-slip" className="space-y-5 text-foreground print:p-0">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b border-border/80 pb-4 pr-32 sm:pr-36">
            <div className="flex items-center gap-3">
              <div className="size-13 rounded-xl bg-white p-1 border border-border/80 flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <Image
                  src={Logo}
                  alt="City Veterinary Office Seal"
                  width={52}
                  height={52}
                  className="size-full object-contain grayscale contrast-125 print-logo"
                  priority
                />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary print:text-black">
                  Republic of the Philippines • City of Cagayan de Oro
                </p>
                <h3 className="text-base font-bold tracking-tight text-foreground print:text-black">
                  City Veterinary Office Appointment Pass
                </h3>
                <p className="text-[11px] text-muted-foreground print:text-neutral-700">
                  Official intake voucher for scheduled clinical municipal procedures
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 print:border-black print:text-black"
            >
              {appointment.status}
            </Badge>
          </div>

          {/* Quick Intake QR & Booking Code Box */}
          <div className="p-4 rounded-2xl bg-muted/20 border border-border/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Appointment Reference Voucher
              </span>
              <p className="font-mono font-bold text-base text-foreground tracking-wider">
                #{appointment.id.slice(0, 13).toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground">
                Show this barcode / pass upon arrival at the CVO Carmen clinic triage desk.
              </p>
            </div>

            {qrCodeDataUrl && (
              <div className="p-1.5 rounded-xl bg-white border border-border/60 shadow-2xs shrink-0 qr-container">
                <img
                  src={qrCodeDataUrl}
                  alt="Appointment QR"
                  className="size-24 object-contain"
                />
              </div>
            )}
          </div>

          {/* Service & Schedule Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {serviceType === "vaccination" ? (
                  <Syringe className="size-3.5 text-emerald-600" />
                ) : (
                  <Scissors className="size-3.5 text-indigo-600" />
                )}
                Scheduled Procedure
              </span>
              <p className="font-bold text-sm text-foreground">{serviceConfig.title}</p>
              <p className="text-[11px] text-muted-foreground">{serviceConfig.category}</p>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Scheduled Date
              </span>
              <p className="font-bold text-sm text-foreground">
                {format(new Date(appointment.date), "EEEE, MMMM d, yyyy")}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium">
                Monday to Friday Clinic Schedule
              </p>
            </div>
          </div>

          {/* Pet & Owner Details */}
          <div className="p-4 rounded-xl border border-border/70 space-y-2.5 text-xs bg-card">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Patient & Guardian Record
              </span>
              <span className="text-[11px] text-muted-foreground">
                Venue: <strong>{appointment.location || "CVO Central Clinic, Carmen, CDO"}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground block">Patient (Pet)</span>
                <span className="font-bold text-foreground text-xs">{petDetails?.name || (appointment as any)?.pets?.name || appointment.pet_name}</span>
                {petDetails?.species && (
                  <span className="block text-[11px] text-muted-foreground">
                    {petDetails.species} • {petDetails.breed || "Mixed"}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block">Pet Owner</span>
                <span className="font-bold text-foreground text-xs">
                  {ownerDetails?.name || "Registered Citizen"}
                </span>
                {ownerDetails?.contact && (
                  <span className="block text-[11px] text-muted-foreground">
                    {ownerDetails.contact}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-muted-foreground block">Barangay LGU</span>
                <span className="font-bold text-foreground text-xs">
                  {ownerDetails?.barangay || "Cagayan de Oro"}
                </span>
                <span className="block text-[10px] text-emerald-600 font-semibold">
                  Free Municipal Care
                </span>
              </div>
            </div>
          </div>

          {/* Guidelines Reminder */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5 text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-primary" /> Key Preparation Reminders
            </span>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
              {serviceConfig.prepGuidelines.slice(0, 3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
