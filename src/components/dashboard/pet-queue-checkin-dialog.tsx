"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { format, isValid } from "date-fns";
import {
  QrCode,
  Camera,
  Upload,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  MapPin,
  Clock,
  Ticket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  checkInPetOwnerToQueue,
  getTodayDateStr,
  QueueTicket,
} from "@/lib/cvo-queue";
import { getPublicSupabaseClient } from "@/lib/supabase/client";
import { isBeforeClinicOpen } from "@/lib/utils";

interface PetQueueCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  ownerProfile?: {
    name?: string;
    contact?: string;
    barangay?: string;
  };
  onCheckedIn?: (ticket: QueueTicket) => void;
}

/**
 * Fast-path: Uses native browser BarcodeDetector API (~5ms)
 */
async function tryNativeBarcodeDetector(file: File): Promise<string | null> {
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const barcodes = await detector.detect(bitmap);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue;
      }
    } catch {}
  }
  return null;
}

async function resizeImageForFastQrScan(file: File, maxDim = 900): Promise<File> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width <= maxDim && height <= maxDim) {
          resolve(file);
          return;
        }

        const scale = Math.min(maxDim / width, maxDim / height);
        const targetW = Math.round(width * scale);
        const targetH = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
        ctx.drawImage(img, 0, 0, targetW, targetH);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name || "qr-scan.jpg", { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    } catch {
      resolve(file);
    }
  });
}

export function PetQueueCheckInDialog({
  open,
  onOpenChange,
  transaction,
  ownerProfile,
  onCheckedIn,
}: PetQueueCheckInDialogProps) {
  const queryClient = useQueryClient();
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Perform queue check-in for the transaction
  const performCheckIn = async (scanMethod: "qr" | "manual" = "qr") => {
    if (!transaction || checkingIn) return;

    // A queue ticket is only valid for the clinic's current day. Do not create a
    // ticket for a booking that belongs to another date, otherwise the check-in
    // succeeds locally but never appears in the staff's Today's Clinic Queue.
    const scheduledDate = (transaction.date || "").split("T")[0];
    if (isBeforeClinicOpen(todayStr)) {
      toast.error("Clinic Not Open Yet", {
        description:
          "Check-in opens at 8:00 AM (operating hours 8:00 AM – 5:00 PM). Please scan the clinic QR code once the clinic opens.",
        duration: 5500,
      });
      return;
    }
    if (scheduledDate && scheduledDate !== todayStr) {
      let formattedDate = scheduledDate;
      try {
        const parts = scheduledDate.split("-").map(Number);
        const parsed = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isValid(parsed)) formattedDate = format(parsed, "MMMM d, yyyy");
      } catch {}
      toast.error("Check-in Not Yet Available", {
        description: `This booking is scheduled for ${formattedDate}. Please scan the clinic check-in QR on that date.`,
        duration: 5500,
      });
      return;
    }

    setCheckingIn(true);

    try {
      const petName = transaction.petName || "Pet";
      const { ticket, isExisting } = checkInPetOwnerToQueue({
        appointmentId: transaction.id,
        encounterNo: transaction.rawConsultation?.encounterNo || transaction.id,
        notes: transaction.notes,
        ownerId: transaction.owner_id || "citizen",
        ownerName: ownerProfile?.name || "Citizen Pet Owner",
        ownerContact: ownerProfile?.contact || "",
        ownerBarangay: ownerProfile?.barangay || "Carmen, CDO",
        petId: transaction.petId,
        petName,
        petPhotoUrl: transaction.photoUrl,
        species: transaction.species || "Dog",
        breed: transaction.breed || "",
        serviceId: transaction.serviceId || "consultation",
        serviceTitle: transaction.serviceLabel || "Veterinary Service",
        dateStr: todayStr,
        checkedInVia: scanMethod,
      });

      // Update Supabase and LocalStorage appointments if applicable
      if (transaction.rawAppointment || transaction.kind === "appointment") {
        try {
          const supabase = getPublicSupabaseClient();
          await supabase
            .from("appointments")
            .update({
              status: "checked-in",
              notes: `${transaction.notes || ""} [Checked-in Queue Ticket #${ticket.ticketNumber}]`.trim(),
            })
            .eq("id", transaction.id);
        } catch {}

        try {
          const local = JSON.parse(localStorage.getItem("syncvet_local_appointments") || "[]");
          const updated = local.map((item: any) =>
            item.id === transaction.id
              ? {
                  ...item,
                  status: "checked-in",
                  queue_ticket: ticket.ticketNumber,
                  checked_in_at: new Date().toISOString(),
                }
              : item
          );
          localStorage.setItem("syncvet_local_appointments", JSON.stringify(updated));
        } catch {}
      }

      // Update Supabase consultations if this is a consultation transaction
      if (transaction.rawConsultation || transaction.kind === "consultation-queue" || transaction.serviceId === "consultation") {
        try {
          const supabase = getPublicSupabaseClient();
          await supabase
            .from("consultations")
            .update({
              status: "waiting",
              veterinarian_notes: `${transaction.notes || ""} [Checked-in Queue Ticket #${ticket.ticketNumber}]`.trim(),
            })
            .or(`id.eq.${transaction.id},encounter_no.eq.${transaction.id}`);
        } catch (err) {
          console.warn("Supabase consultation checkin update notice", err);
        }

        // Optimistically update TanStack query cache for consultations
        try {
          queryClient.setQueryData<any[]>(["cvo_consultations"], (old = []) =>
            old.map((c) =>
              c.id === transaction.id || c.encounterNo === transaction.id || (transaction.rawConsultation && c.id === transaction.rawConsultation.id)
                ? {
                    ...c,
                    status: "waiting",
                    veterinarianNotes: `${c.veterinarianNotes || ""} [Checked-in Queue Ticket #${ticket.ticketNumber}]`.trim(),
                  }
                : c
            )
          );
        } catch {}
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["cvo_consultations"] });
      queryClient.invalidateQueries({ queryKey: ["user-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["user-consultations"] });
      queryClient.invalidateQueries({ queryKey: ["procedure-appointments-slots"] });
      queryClient.invalidateQueries({ queryKey: ["cvo-today-appointments-quota"] });

      // Notify window listeners
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("syncvet-consultation-status-changed", {
            detail: {
              id: transaction.id,
              encounterNo: transaction.rawConsultation?.encounterNo || transaction.id,
              status: "waiting",
              ticketNumber: ticket.ticketNumber,
            },
          })
        );
        window.dispatchEvent(new Event("syncvet-appointment-updated"));
        window.dispatchEvent(new Event("syncvet-consultation-updated"));
        window.dispatchEvent(new Event("syncvet-queue-updated"));
      }

      onCheckedIn?.(ticket);

      toast.success(
        isExisting
          ? `Already in Queue: Ticket #${ticket.ticketNumber}`
          : `Checked-in Successfully! Ticket #${ticket.ticketNumber}`,
        {
          description: `${petName} has been queued for ${transaction.serviceLabel}. Current position: #${ticket.queueSequence}.`,
          duration: 5000,
        }
      );

      // Close dialog
      setTimeout(() => {
        onOpenChange(false);
      }, 400);
    } catch (err: any) {
      console.error("Check-in error:", err);
      toast.error("Failed to check in to queue. Please try again.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // 1. Extract and validate date from the scanned QR code
    let qrDate: string | null = null;
    let isStationQr = false;

    try {
      if (
        decodedText.startsWith("http://") ||
        decodedText.startsWith("https://") ||
        decodedText.startsWith("/")
      ) {
        const parsedUrl = new URL(decodedText, window.location.origin);
        qrDate = parsedUrl.searchParams.get("date");
        if (
          parsedUrl.pathname.includes("queue-checkin") ||
          parsedUrl.searchParams.has("station") ||
          parsedUrl.searchParams.has("token")
        ) {
          isStationQr = true;
        }
      }
    } catch {}

    if (!qrDate) {
      const match = decodedText.match(/[?&]date=([0-9]{4}-[0-9]{2}-[0-9]{2})/);
      if (match) {
        qrDate = match[1];
        isStationQr = true;
      } else {
        const dateMatch = decodedText.match(/\b([0-9]{4}-[0-9]{2}-[0-9]{2})\b/);
        if (dateMatch) {
          qrDate = dateMatch[1];
        }
      }
    }

    if (
      decodedText.includes("cvo") ||
      decodedText.includes("queue-checkin") ||
      decodedText.includes("syncvet")
    ) {
      isStationQr = true;
    }

    // Validation 1: Must be an official station QR code
    if (!isStationQr && !qrDate) {
      toast.error("Invalid Station QR Code", {
        description:
          "This does not appear to be an official CVO Clinic Check-in QR code. Please scan the QR code displayed at the clinic check-in desk.",
        duration: 4500,
      });
      return;
    }

    // Validation 2: Station QR code is valid strictly on that day only!
    if (qrDate && qrDate !== todayStr) {
      let formattedQrDate = qrDate;
      try {
        const parts = qrDate.split("-").map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (isValid(d)) formattedQrDate = format(d, "MMMM d, yyyy");
      } catch {}

      toast.error("Expired QR Code", {
        description: `This Check-in QR code was generated for ${formattedQrDate} and is valid on that day only. QR codes from other days cannot be scanned. Please scan today's active station QR code.`,
        duration: 6500,
      });
      return;
    }

    // QR Code passed validation for today!
    setDecodedResult(decodedText);
    toast.success("Clinic Arrival QR Verified for Today!");

    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      setCameraActive(false);
    }

    await performCheckIn("qr");
  };

  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const elementId = "pet-queue-camera-viewfinder";

      if (!document.getElementById(elementId)) {
        setScanning(false);
        return;
      }

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current.clear();
        } catch {}
      }

      const qrScanner = new Html5Qrcode(elementId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minEdge * 0.75),
              height: Math.floor(minEdge * 0.75),
            };
          },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );

      setCameraActive(true);
      setScanning(false);
    } catch (err: any) {
      console.warn("Camera start notice:", err);
      setScanning(false);
      setCameraActive(false);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access or use photo upload / instant check-in below."
          : "Could not access live camera. You can snap a photo or use instant check-in below."
      );
    }
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        startCamera();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      if (html5QrCodeRef.current && cameraActive) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current.clear())
          .catch(() => {});
        setCameraActive(false);
      }
      setDecodedResult(null);
      setCameraError(null);
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);

    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      setCameraActive(false);
    }

    try {
      const nativeResult = await tryNativeBarcodeDetector(file);
      if (nativeResult) {
        setProcessingFile(false);
        handleScanSuccess(nativeResult);
        return;
      }

      const optimizedFile = await resizeImageForFastQrScan(file, 900);
      const { Html5Qrcode } = await import("html5-qrcode");
      const qrScanner = new Html5Qrcode("pet-queue-file-scanner-temp");
      const result = await qrScanner.scanFile(optimizedFile, false);
      try {
        qrScanner.clear();
      } catch {}

      setProcessingFile(false);
      handleScanSuccess(result);
    } catch {
      setProcessingFile(false);
      toast.error("Could not find a valid QR code in that image. Try instant check-in below.");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg p-0 overflow-hidden rounded-3xl border border-emerald-500/20 bg-card shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3.5 bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent border-b border-border/60 pr-12">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/25 shadow-xs">
              <QrCode className="size-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                Scan Clinic Arrival QR
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">
                Join live clinic queue for <strong className="text-foreground">{transaction.petName}</strong>
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 space-y-4">
          {/* Target Transaction Summary */}
          <div className="px-3.5 py-2.5 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-foreground truncate">
                  {transaction.petName}
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20">
                  {transaction.serviceLabel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3 text-muted-foreground/70" />
                {transaction.date} • {transaction.timeSlot || "Clinic Hours"}
              </p>
            </div>
          </div>

          {/* Viewfinder Area (Larger & Minimal) */}
          <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border border-emerald-500/30 shadow-inner flex flex-col items-center justify-center [&_video]:w-full [&_video]:h-full [&_video]:object-cover">
            <div id="pet-queue-camera-viewfinder" className="w-full h-full object-cover" />
            <div id="pet-queue-file-scanner-temp" className="hidden" />

            {/* Target Reticle */}
            {cameraActive && !decodedResult && (
              <div className="absolute inset-8 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between">
                  <span className="w-6 h-6 border-t-2 border-l-2 border-emerald-400 rounded-tl-md" />
                  <span className="w-6 h-6 border-t-2 border-r-2 border-emerald-400 rounded-tr-md" />
                </div>
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_12px_#10b981] animate-pulse" />
                <div className="flex justify-between">
                  <span className="w-6 h-6 border-b-2 border-l-2 border-emerald-400 rounded-bl-md" />
                  <span className="w-6 h-6 border-b-2 border-r-2 border-emerald-400 rounded-br-md" />
                </div>
              </div>
            )}

            {/* Loading */}
            {scanning && !cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4 text-center space-y-2">
                <RefreshCw className="size-6 text-emerald-400 animate-spin" />
                <p className="text-xs font-semibold">Opening Camera Viewfinder...</p>
                <p className="text-[10px] text-slate-400">Please allow camera permissions</p>
              </div>
            )}

            {/* Camera Error */}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white p-4 text-center space-y-2.5 animate-in fade-in-50">
                <AlertCircle className="size-7 text-amber-400" />
                <p className="text-xs font-bold text-amber-200">Camera Unavailable</p>
                <p className="text-[11px] text-slate-300 max-w-[240px] leading-relaxed">
                  Snap a photo or upload an image of the clinic standee QR code below.
                </p>
                <Button
                  size="sm"
                  onClick={() => cameraCaptureRef.current?.click()}
                  className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer gap-1.5"
                >
                  <Camera className="size-3.5" /> Snap QR Photo
                </Button>
              </div>
            )}

            {/* Processing File */}
            {processingFile && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 text-white p-4 text-center space-y-2 animate-in fade-in-50">
                <Loader2 className="size-8 text-emerald-400 animate-spin" />
                <p className="text-xs font-bold text-emerald-200">Decoding QR Code...</p>
              </div>
            )}

            {/* Success */}
            {decodedResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 text-white p-4 text-center space-y-2 animate-in fade-in-50">
                <CheckCircle2 className="size-10 text-emerald-400 animate-bounce" />
                <p className="text-sm font-bold text-emerald-200">Arrival Verified!</p>
                <p className="text-xs text-slate-300">Issuing Live Queue Ticket...</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Point your camera at the CVO Carmen Clinic Entrance standee to check in {transaction.petName}.
          </p>

          {/* Action buttons */}
          <div className="pt-2 border-t border-border/60">
            <input
              type="file"
              ref={cameraCaptureRef}
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={processingFile || checkingIn}
                onClick={() => cameraCaptureRef.current?.click()}
                className="h-9 rounded-xl border-border/70 text-xs font-semibold gap-2 cursor-pointer bg-muted/20 hover:bg-muted/50"
              >
                <Camera className="size-3.5 text-muted-foreground" />
                <span>Snap Photo</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={processingFile || checkingIn}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 rounded-xl border-border/70 text-xs font-semibold gap-2 cursor-pointer bg-muted/20 hover:bg-muted/50"
              >
                <Upload className="size-3.5 text-muted-foreground" />
                <span>Upload QR Photo</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
