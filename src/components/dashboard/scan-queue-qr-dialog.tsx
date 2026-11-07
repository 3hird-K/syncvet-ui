"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isValid } from "date-fns";
import {
  QrCode,
  Camera,
  Upload,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  RefreshCw,
  Building2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCVO } from "@/lib/cvo-context";
import { getTodayDateStr } from "@/lib/cvo-queue";
import { isBeforeClinicOpen, getFieldOpGracePeriod } from "@/lib/utils";

/**
 * Fast-path: Uses native browser BarcodeDetector API (GPU/hardware-accelerated, ~5ms)
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
    } catch {
      // Fallback to client-side resized scan
    }
  }
  return null;
}

/**
 * Downscales huge modern smartphone photos (12MP–48MP) to a quick canvas size (max 900px).
 * This prevents single-threaded ZXing in html5-qrcode from scanning millions of pixels,
 * dropping decode time from 30+ seconds down to <100ms.
 */
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

interface ScanQueueQrDialogProps {
  trigger?: React.ReactNode;
  onScanSuccess?: (decodedText: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ScanQueueQrDialog({
  trigger,
  onScanSuccess,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: ScanQueueQrDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (val: boolean) => {
    if (isControlled) {
      setControlledOpen?.(val);
    } else {
      setInternalOpen(val);
    }
  };

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const { fieldOperations = [], incrementFieldOpSlots } = useCVO();

  // Handle successful scan
  const handleSuccess = async (decodedText: string) => {
    // Before 8:00 AM the queue is not open. Reject any queue / appointment-pass QR
    // before it can create a check-in ticket.
    let isAppointmentPass = false;
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed && typeof parsed === "object" && parsed.appointmentId) {
        isAppointmentPass = true;
      }
    } catch {}

    const isQueueQr = decodedText.includes("queue-checkin") || isAppointmentPass;
    if (isQueueQr && isBeforeClinicOpen(todayStr)) {
      toast.error("Clinic Not Open Yet", {
        description:
          "Check-in opens at 8:00 AM (operating hours 8:00 AM – 5:00 PM). Please scan the clinic QR code at 8:00 AM, once the clinic opens.",
        duration: 6000,
      });
      return;
    }

    setDecodedResult(decodedText);
    toast.success("QR Code verified successfully!");

    // Clean up camera
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      setCameraActive(false);
    }

    if (onScanSuccess) {
      onScanSuccess(decodedText);
    }

    // Appointment pass QR codes contain a JSON payload identifying the exact
    // booking (vaccination, spay/neuter, etc.). Route to that specific check-in
    // instead of falling back to the generic station QR path.
    try {
      const payload = JSON.parse(decodedText);
      if (payload && typeof payload === "object" && payload.appointmentId) {
        const apptDate =
          typeof payload.date === "string" && payload.date
            ? payload.date.split("T")[0]
            : todayStr;
        setTimeout(() => {
          setOpen(false);
          router.push(
            `/queue-checkin?date=${apptDate}&appointmentId=${encodeURIComponent(
              payload.appointmentId
            )}`
          );
        }, 250);
        return;
      }
    } catch {}

    // Automatically handle outreach attendance check-in
    if (decodedText.includes("outreach-checkin") || decodedText.includes("outreach-attendance")) {
      // Validate date parameter: Attendance QR is strictly valid only on the date of outreach!
      let outreachDate: string | null = null;
      let opId: string | null = null;
      let barangay: string | null = null;
      try {
        const url = new URL(decodedText, window.location.origin);
        outreachDate = url.searchParams.get("date");
        opId = url.searchParams.get("opId");
        barangay = url.searchParams.get("barangay");
      } catch {}

      if (!outreachDate) {
        const match = decodedText.match(/[?&]date=([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (match) outreachDate = match[1];
      }
      if (!opId) {
        const match = decodedText.match(/[?&]opId=([A-Za-z0-9-_]+)/);
        if (match) opId = match[1];
      }
      if (!barangay) {
        const match = decodedText.match(/[?&]barangay=([^&]+)/);
        if (match) barangay = decodeURIComponent(match[1]);
      }

      // Look up operation record if available for rich validation
      const matchedOp = opId
        ? fieldOperations.find((o) => o.opId === opId || o.id === opId)
        : null;

      if (matchedOp) {
        if (!outreachDate) outreachDate = matchedOp.date;
        if (!barangay) barangay = matchedOp.barangay;

        const grace = getFieldOpGracePeriod(matchedOp.date, matchedOp.status);
        if (grace.isPastGracePeriod || matchedOp.status === "completed" || matchedOp.status === "cancelled") {
          toast.error("Expired Outreach QR Code", {
            description: `This field operation in Barangay ${matchedOp.barangay} has concluded. Attendance QR codes are no longer valid.`,
            duration: 6000,
          });
          return;
        }
      }

      if (outreachDate) {
        const cleanDate = outreachDate.includes("T") ? outreachDate.split("T")[0] : outreachDate.trim();
        if (cleanDate !== todayStr) {
          let formattedDate = cleanDate;
          try {
            const parts = cleanDate.split("-").map(Number);
            const d = new Date(parts[0], parts[1] - 1, parts[2]);
            if (isValid(d)) formattedDate = format(d, "MMMM d, yyyy");
          } catch {}

          const isFuture = cleanDate > todayStr;
          toast.error(isFuture ? "Outreach QR Not Yet Active" : "Expired Outreach QR", {
            description: isFuture
              ? `This attendance QR poster is for outreach scheduled on ${formattedDate}. It is valid for check-in on that day only.`
              : `This attendance QR was for outreach on ${formattedDate} and has expired. Attendance can only be recorded on the day of the outreach.`,
            duration: 6000,
          });
          return;
        }
      }

      // Automatically increment headcount on QR scan!
      if (opId) {
        incrementFieldOpSlots(opId, 1);
        toast.success("Attendance Verified (+1 Headcount)", {
          description: `Automatically registered attendance for Barangay ${barangay || "Outreach"}!`,
        });
      }

      setTimeout(() => {
        setOpen(false);
        const urlWithFlag = `${decodedText}${decodedText.includes("?") ? "&" : "?"}autoCounted=true`;
        window.dispatchEvent(new CustomEvent("syncvet-outreach-scanned", { detail: urlWithFlag }));
      }, 300);
      return;
    }

    // Check if the QR code is for queue checkin
    if (decodedText.includes("/queue-checkin") || decodedText.includes("queue-checkin")) {
      // Validate date parameter
      let qrDate: string | null = null;
      try {
        const url = new URL(decodedText, window.location.origin);
        qrDate = url.searchParams.get("date");
      } catch {}

      if (!qrDate) {
        const match = decodedText.match(/[?&]date=([0-9]{4}-[0-9]{2}-[0-9]{2})/);
        if (match) qrDate = match[1];
      }

      if (qrDate && qrDate !== todayStr) {
        let formattedQrDate = qrDate;
        try {
          const parts = qrDate.split("-").map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          if (isValid(d)) formattedQrDate = format(d, "MMMM d, yyyy");
        } catch {}

        toast.error("Expired QR Code", {
          description: `This Check-in QR code was generated for ${formattedQrDate} and is valid on that day only. QR codes from other days cannot be scanned.`,
          duration: 6000,
        });
        return;
      }

      setTimeout(() => {
        setOpen(false);
        try {
          const url = new URL(decodedText, window.location.origin);
          router.push(url.pathname + url.search);
        } catch {
          router.push(`/queue-checkin?date=${todayStr}`);
        }
      }, 250);
      return;
    }

    // Default fallback
    setTimeout(() => {
      setOpen(false);
      router.push(`/queue-checkin?date=${todayStr}`);
    }, 250);
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const elementId = "syncvet-camera-viewfinder";

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
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // Continuous frame scan error, ignore
        }
      );

      setCameraActive(true);
      setScanning(false);
    } catch (err: any) {
      console.warn("Camera start notice:", err);
      setScanning(false);
      setCameraActive(false);
      setCameraError(
        err?.message?.includes("Permission") || err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser or upload a QR image below."
          : "Could not access camera. Please allow camera access in your browser or upload a QR image below."
      );
    }
  };

  // Stop camera when dialog closes
  useEffect(() => {
    if (open) {
      // Delay slightly for DOM element to mount
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

  // Handle image file upload with instant hardware barcode detection + auto-resizing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessingFile(true);

    // Stop active camera so CPU is 100% focused on decoding
    if (html5QrCodeRef.current && cameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {}
      setCameraActive(false);
    }

    try {
      // 1. Fast Path: Native Browser BarcodeDetector API (5ms - 15ms)
      const nativeResult = await tryNativeBarcodeDetector(file);
      if (nativeResult) {
        setProcessingFile(false);
        handleSuccess(nativeResult);
        return;
      }

      // 2. High-performance Fallback: Downscale 12MP/48MP phone photo to max 900px
      // Prevents ZXing from taking 30 seconds processing millions of pixels
      const optimizedFile = await resizeImageForFastQrScan(file, 900);

      const { Html5Qrcode } = await import("html5-qrcode");
      const qrScanner = new Html5Qrcode("syncvet-file-scanner-temp");
      const result = await qrScanner.scanFile(optimizedFile, false);
      try {
        qrScanner.clear();
      } catch {}

      setProcessingFile(false);
      handleSuccess(result);
    } catch (err) {
      setProcessingFile(false);
      toast.error("Could not find a valid QR code in that image. Please try another photo.");
    } finally {
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : trigger === null || isControlled ? null : (
        <DialogTrigger asChild>
          <Button
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
          >
            <Camera className="size-4" />
            <span>Scan Clinic Arrival QR</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-w-sm sm:max-w-md p-0 overflow-hidden rounded-3xl border border-emerald-500/30 bg-card shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 bg-gradient-to-r from-emerald-600/15 via-teal-600/10 to-transparent border-b border-border/70 pr-12">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-xs">
              <QrCode className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-extrabold text-foreground">
                Scan Clinic Arrival QR
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Carmen Clinic Queue Station
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Viewfinder Area */}
          <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 border-emerald-500/40 shadow-inner flex flex-col items-center justify-center">
            {/* Camera preview element */}
            <div id="syncvet-camera-viewfinder" className="w-full h-full object-cover" />
            <div id="syncvet-file-scanner-temp" className="hidden" />

            {/* Target Reticle / Corner brackets */}
            {cameraActive && !decodedResult && (
              <div className="absolute inset-5 pointer-events-none flex flex-col justify-between">
                <div className="flex justify-between">
                  <span className="w-5 h-5 border-t-3 border-l-3 border-emerald-400 rounded-tl-md" />
                  <span className="w-5 h-5 border-t-3 border-r-3 border-emerald-400 rounded-tr-md" />
                </div>
                {/* Laser scan animation line */}
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_10px_#10b981] animate-pulse" />
                <div className="flex justify-between">
                  <span className="w-5 h-5 border-b-3 border-l-3 border-emerald-400 rounded-bl-md" />
                  <span className="w-5 h-5 border-b-3 border-r-3 border-emerald-400 rounded-br-md" />
                </div>
              </div>
            )}

            {/* Loading / Camera Error States */}
            {scanning && !cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4 text-center space-y-2">
                <RefreshCw className="size-6 text-emerald-400 animate-spin" />
                <p className="text-xs font-semibold">Opening Camera Viewfinder...</p>
                <p className="text-[10px] text-slate-400">Please allow browser camera permissions</p>
              </div>
            )}

            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white p-4 text-center space-y-2.5 animate-in fade-in-50">
                <AlertCircle className="size-7 text-amber-400" />
                <p className="text-xs font-bold text-amber-200">Camera Permission Notice</p>
                <p className="text-[10.5px] text-slate-300 leading-relaxed px-1">
                  Your phone overlay blocked live video. You can snap a photo with your phone camera directly:
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <Button
                    size="sm"
                    onClick={() => cameraCaptureRef.current?.click()}
                    className="h-7 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                  >
                    <Camera className="size-3 mr-1" /> Snap QR Photo
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startCamera}
                    className="h-7 text-[11px] rounded-lg border-white/20 text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    <RefreshCw className="size-3 mr-1" /> Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Processing File State */}
            {processingFile && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/95 text-white p-4 text-center space-y-2.5 animate-in fade-in-50">
                <Loader2 className="size-8 text-emerald-400 animate-spin" />
                <p className="text-xs font-bold text-emerald-200">Decoding QR Code...</p>
                <p className="text-[10.5px] text-slate-300">
                  Verifying your photo with fast hardware recognition...
                </p>
              </div>
            )}

            {decodedResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 text-white p-4 text-center space-y-2 animate-in fade-in-50">
                <CheckCircle2 className="size-10 text-emerald-400 animate-bounce" />
                <p className="text-sm font-bold text-emerald-200">QR Code Scanned!</p>
                <p className="text-xs text-slate-300 font-mono truncate max-w-[200px]">
                  Verifying today's appointment...
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-foreground">
              Scan the Reception Counter Standee
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Upon arriving at the City Veterinary Office (Carmen Clinic), scan the QR code displayed at the triage stand to receive your queue ticket.
            </p>
          </div>

          {/* Quick Fallback / Test Actions */}
          <div className="pt-2 border-t border-border/70 flex flex-col gap-2">
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

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                size="sm"
                disabled={processingFile}
                onClick={() => cameraCaptureRef.current?.click()}
                className="h-8.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {processingFile ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
                <span>Snap with Camera</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={processingFile}
                onClick={() => fileInputRef.current?.click()}
                className="h-8.5 rounded-xl border-border hover:border-emerald-500/50 text-xs font-semibold gap-1.5 cursor-pointer bg-card hover:bg-muted disabled:opacity-50"
              >
                {processingFile ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5 text-muted-foreground" />}
                <span>Upload QR Photo</span>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
