"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { getTodayDateStr } from "@/lib/cvo-queue";

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
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Handle successful scan
  const handleSuccess = async (decodedText: string) => {
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

    // Automatically navigate if it's a queue check-in link or standard check-in
    setTimeout(() => {
      setOpen(false);
      if (decodedText.includes("/queue-checkin") || decodedText.includes("queue-checkin")) {
        // If relative or absolute
        try {
          const url = new URL(decodedText, window.location.origin);
          router.push(url.pathname + url.search);
        } catch {
          router.push(`/queue-checkin?date=${todayStr}`);
        }
      } else {
        router.push(`/queue-checkin?date=${todayStr}`);
      }
    }, 900);
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

  // Handle image file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qrScanner = new Html5Qrcode("syncvet-file-scanner-temp");
      const result = await qrScanner.scanFile(file, true);
      qrScanner.clear();
      handleSuccess(result);
    } catch (err) {
      toast.error("Could not find a valid QR code in that image. Please try another photo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            className="h-9 px-3.5 text-xs font-bold gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
          >
            <Camera className="size-4" />
            <span>Scan Clinic Arrival QR</span>
          </Button>
        )}
      </DialogTrigger>

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
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white p-4 text-center space-y-2.5">
                <AlertCircle className="size-7 text-amber-400" />
                <p className="text-xs font-semibold text-amber-200">Camera Access Notice</p>
                <p className="text-[10.5px] text-slate-300 leading-relaxed px-2">
                  {cameraError}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={startCamera}
                  className="h-7 text-[11px] rounded-lg border-white/20 text-white bg-white/10 hover:bg-white/20 mt-1 cursor-pointer"
                >
                  <RefreshCw className="size-3 mr-1" /> Try Camera Again
                </Button>
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
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-8.5 rounded-xl border-dashed border-border hover:border-emerald-500/50 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Upload className="size-3.5 text-muted-foreground" />
              <span>Upload QR Screenshot / Photo</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
