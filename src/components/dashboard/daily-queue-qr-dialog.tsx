"use client";

import { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { format } from "date-fns";
import {
  QrCode,
  Printer,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getTodayDateStr } from "@/lib/cvo-queue";

interface DailyQueueQrDialogProps {
  isStaff: boolean;
  trigger?: React.ReactNode;
}

export function DailyQueueQrDialog({ isStaff, trigger }: DailyQueueQrDialogProps) {
  const [open, setOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const todayStr = useMemo(() => getTodayDateStr(), []);
  const todayFormatted = useMemo(() => format(new Date(), "MMMM d, yyyy"), []);

  const checkinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/queue-checkin?date=${todayStr}`;
  }, [todayStr]);

  // Generate high-resolution QR Code (600px for crisp download & printing)
  useEffect(() => {
    if (!checkinUrl) return;
    QRCode.toDataURL(checkinUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Failed to generate queue QR:", err));
  }, [checkinUrl]);

  // Download QR as PNG Image
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `cvo-queue-qr-${todayStr}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code downloaded as PNG");
  };

  // Print Standee
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CVO Clinic Queue Check-in Station - ${todayFormatted}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #0f172a;
              text-align: center;
              padding: 24px;
              margin: 0;
            }
            .border-wrap {
              border: 2px solid #059669;
              border-radius: 24px;
              padding: 36px 28px;
              max-width: 580px;
              margin: 0 auto;
            }
            .header-badge {
              display: inline-block;
              background: #ecfdf5;
              color: #065f46;
              border: 1px solid #a7f3d0;
              padding: 5px 14px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
            }
            h1 {
              color: #064e3b;
              font-size: 26px;
              margin: 0 0 6px 0;
              font-weight: 900;
              letter-spacing: -0.5px;
            }
            .sub {
              font-size: 13px;
              color: #64748b;
              margin: 0 0 24px 0;
            }
            .qr-card {
              background: #ffffff;
              display: inline-block;
              padding: 16px;
              border-radius: 20px;
              border: 1px solid #cbd5e1;
              box-shadow: 0 8px 20px rgba(0,0,0,0.06);
              margin-bottom: 20px;
            }
            .qr-card img {
              width: 300px;
              height: 300px;
              display: block;
            }
            .instruction {
              font-size: 14px;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 12px;
            }
            .steps {
              text-align: left;
              background: #f8fafc;
              border-radius: 14px;
              padding: 16px 20px;
              border: 1px solid #e2e8f0;
              margin-bottom: 20px;
              font-size: 12px;
              color: #475569;
              line-height: 1.6;
            }
            .notice {
              font-size: 11px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="border-wrap">
            <div class="header-badge">City Veterinary Office • Cagayan de Oro City</div>
            <h1>Clinic Queue Check-in Station</h1>
            <p class="sub">${todayFormatted} • J.V. Seriña St., Carmen Headquarters</p>
            
            <div class="qr-card">
              <img src="${qrDataUrl}" alt="Clinic Queue Check-in QR" />
            </div>

            <p class="instruction">Point phone camera at this QR code to join the queue</p>

            <div class="steps">
              <div>1. Scan QR with your smartphone camera to access check-in.</div>
              <div>2. System confirms today&apos;s scheduled procedure or consultation.</div>
              <div>3. Receive your live queue number and track your turn in real time.</div>
            </div>

            <div class="notice">
              Official SyncVet Public Veterinary Platform • CDO City Veterinary Office
            </div>
          </div>
          <script>
            window.onload = () => { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isStaff) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl cursor-pointer shadow-2xs transition-colors"
            title="Generate today's official queue check-in QR code for pet owners"
          >
            <QrCode className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Check-in QR Station</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl p-0 overflow-hidden border border-border/80 rounded-3xl bg-card shadow-2xl">
        {/* Top Action Icons (Download & Print right beside the dialog Close 'X' icon) */}
        <div className="absolute top-3.5 right-13 sm:top-4 sm:right-14 z-50 flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            className="size-8 rounded-full border border-border/60 bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Download QR Image (PNG)"
          >
            <Download className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="sr-only">Download QR</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            className="size-8 rounded-full border border-border/60 bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-xs"
            title="Print Counter Standee"
          >
            <Printer className="size-4" />
            <span className="sr-only">Print Standee</span>
          </Button>
        </div>

        {/* Minimalist Header */}
        <DialogHeader className="px-6 pt-6 pb-2 pr-32 sm:pr-36">
          <div>
            <DialogTitle className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
              Clinic Queue Check-in QR
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {todayFormatted} • Carmen Clinic
            </p>
          </div>
        </DialogHeader>

        {/* Pure Minimalist Body */}
        <div className="px-6 pb-6 space-y-4">
          {/* Centered QR Presentation Canvas */}
          <div className="flex flex-col items-center justify-center p-5 sm:p-6 rounded-2xl bg-muted/20 border border-border/60 text-center space-y-3">
            <div className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-200/90">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Clinic Queue Check-in QR"
                  className="size-52 sm:size-60 object-contain rounded-md"
                />
              ) : (
                <div className="size-52 sm:size-60 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <p className="text-xs sm:text-sm font-semibold text-foreground">
              Scan with phone camera to join queue
            </p>
          </div>

          {/* Minimalist Footnote */}
          <p className="text-[10.5px] text-muted-foreground text-center pt-1 border-t border-border/40">
            For pet owners with scheduled appointments today. Walk-ins please proceed to the reception desk.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
