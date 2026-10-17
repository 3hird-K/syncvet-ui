"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
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
      const payload = JSON.stringify({
        appointmentId: appointment.id,
        service: appointment.service_id,
        pet: appointment.pet_name,
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
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto p-5 sm:p-7 bg-white dark:bg-card rounded-2xl shadow-2xl border-border">
        <DialogHeader className="sr-only">
          <DialogTitle>Official Procedure Appointment Slip</DialogTitle>
        </DialogHeader>

        {/* Printable Pass Container */}
        <div id="cvo-appointment-slip" className="space-y-5 text-foreground print:p-0">
          {/* Header Banner */}
          <div className="flex items-start justify-between border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shrink-0">
                CVO
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Republic of the Philippines • City of Cagayan de Oro
                </p>
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  City Veterinary Office Appointment Pass
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Official intake voucher for scheduled clinical municipal procedures
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
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
              <div className="p-1.5 rounded-xl bg-white border border-border/60 shadow-2xs shrink-0">
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
                <span className="font-bold text-foreground text-xs">{appointment.pet_name}</span>
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

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60 print:hidden">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs rounded-xl"
            >
              Close
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-bold rounded-xl gap-2 bg-primary text-primary-foreground shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5" />
              <span>Print Appointment Pass</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
