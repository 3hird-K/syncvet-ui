"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode,
  Users,
  UserCheck,
  Plus,
  Printer,
  Download,
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Sparkles,
  X,
  Stethoscope,
  Syringe,
  Scissors,
  Smartphone,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCVO } from "@/lib/cvo-context";
import { getFieldOpGracePeriod } from "@/lib/utils";
import type { CVOFieldOperation } from "@/data/cvo-store";
import { toast } from "sonner";

interface FieldOpAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: CVOFieldOperation | null;
}

export function FieldOpAttendanceDialog({
  open,
  onOpenChange,
  operation,
}: FieldOpAttendanceDialogProps) {
  const { incrementFieldOpSlots } = useCVO();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [customWalkinCount, setCustomWalkinCount] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  const grace = useMemo(() => {
    return operation ? getFieldOpGracePeriod(operation.date, operation.status) : null;
  }, [operation]);

  const isLocked = grace?.isPastGracePeriod || operation?.status === "completed" || operation?.status === "cancelled";

  // Construct attendance QR verification payload
  const qrPayload = useMemo(() => {
    if (!operation) return "";
    const params = new URLSearchParams({
      type: "outreach-attendance",
      opId: operation.opId,
      barangay: operation.barangay,
      date: operation.date,
      vet: operation.lead,
      venue: operation.venue || "Barangay Covered Court",
    });
    return `https://syncvet.cagayan-de-oro.gov.ph/outreach-checkin?${params.toString()}`;
  }, [operation]);

  // Generate crisp dark QR code
  useEffect(() => {
    if (!qrPayload) return;
    QRCode.toDataURL(qrPayload, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000", // Pure crisp black
        light: "#ffffff",
      },
    })
      .then(setQrDataUrl)
      .catch((err) => console.error("QR Code generation error:", err));
  }, [qrPayload]);

  if (!operation) return null;

  const targetSlots = operation.petsTarget || 100;
  const currentTotal = operation.petsVaccinated || 0;
  const pct = Math.min(100, Math.round((currentTotal / targetSlots) * 100));

  // Resolved services list
  const opServices = operation.services || (
    operation.type.toLowerCase().includes("kapon") || operation.type.toLowerCase().includes("spay")
      ? ["vaccination", "spay-neuter"]
      : operation.type.toLowerCase().includes("rabies")
      ? ["vaccination", "consultation"]
      : ["consultation", "vaccination"]
  );

  const handleIncrement = async (amt: number) => {
    if (isLocked) {
      toast.error("Editing Locked", {
        description: "1-day grace period has passed. Records are locked from further editing.",
      });
      return;
    }
    setIsUpdating(true);
    try {
      await incrementFieldOpSlots(operation.id, amt);
      toast.success(`+${amt} walk-in headcount added`, {
        description: `Total: ${currentTotal + amt} / ${targetSlots} slots filled`,
      });
    } catch {
      toast.error("Failed to update headcount");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetCustomCount = async () => {
    const val = parseInt(customWalkinCount, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive number");
      return;
    }
    await handleIncrement(val);
    setCustomWalkinCount("");
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `cvo-qr-attendance-${operation.opId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR Code Downloaded");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CVO Attendance Poster - ${operation.opId}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 20px; text-align: center; }
            .poster { border: 3px solid #111827; border-radius: 16px; padding: 28px; max-width: 560px; margin: 0 auto; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
            .logo-title { font-size: 11px; font-weight: 800; color: #059669; letter-spacing: 2px; text-transform: uppercase; }
            .headline { font-size: 24px; font-weight: 900; margin: 6px 0; color: #111827; }
            .meta { font-size: 13px; color: #4b5563; margin: 4px 0; }
            .badge { display: inline-block; background: #f3f4f6; color: #111827; font-weight: 700; font-size: 11px; padding: 3px 10px; border-radius: 999px; margin-top: 6px; border: 1px solid #d1d5db; }
            .qr-wrap { margin: 20px auto; padding: 12px; background: #fff; border: 2px solid #111827; border-radius: 14px; display: inline-block; }
            .instructions { font-size: 14px; font-weight: 800; color: #111827; margin-top: 14px; }
            .steps { font-size: 12px; color: #4b5563; text-align: left; max-width: 400px; margin: 8px auto; line-height: 1.6; }
            .footer { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="poster">
            <div class="header">
              <div class="logo-title">City Veterinary Office • Cagayan de Oro</div>
              <div class="headline">Barangay ${operation.barangay} Outreach</div>
              <div class="meta">${operation.venue || "Barangay Covered Court"} • ${operation.date}</div>
              <div class="meta">Attending Vet: ${operation.lead} (${operation.timeWindow || "08:00 AM - 05:00 PM"})</div>
              <div class="badge">Official Attendance & Check-In Station</div>
            </div>

            <div class="qr-wrap">
              <img src="${qrDataUrl}" width="280" height="280" alt="Attendance QR Code" />
            </div>

            <div class="instructions">Pet Owner Digital Check-In</div>
            <div class="steps">
              1. Open your <strong>SyncVet Pet Owner App</strong> on your phone.<br/>
              2. Tap the <strong>Scan QR</strong> camera button on your dashboard.<br/>
              3. Scan this poster code to record presence in your pet's passport history.
            </div>

            <div class="footer">
              Non-app attendees: Please proceed to the front desk to register in the manual community walk-in tally.<br/>
              Official Outreach Ref: ${operation.opId}
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[90] bg-black/60 backdrop-blur-xs"
        className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0 rounded-2xl bg-background border border-border/80 shadow-2xl z-[100]"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {/* ── Top-right Action Buttons (Print, Download, Close) pinned beside the X icon ── */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
            title="Print Standee Poster"
            aria-label="Print Standee Poster"
          >
            <Printer className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
            title="Download QR Image"
            aria-label="Download QR Image"
          >
            <Download className="size-4" />
          </button>

          <DialogClose asChild>
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
        </div>

        {/* ── Rich Header ── */}
        <div className="p-5 sm:p-6 pb-4 bg-muted/20 border-b border-border/70 pr-32 sm:pr-36">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Barangay {operation.barangay} Field Outreach
              </DialogTitle>
              <Badge variant="outline" className="text-[10px] font-mono border-border/80">
                {operation.opId}
              </Badge>
              {isLocked ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 font-semibold gap-1"
                >
                  <Lock className="size-2.5" />
                  <span>Locked (Grace Period Ended)</span>
                </Badge>
              ) : grace?.isGracePeriodActive ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-semibold gap-1"
                >
                  <Clock className="size-2.5" />
                  <span>1-Day Grace Period Active</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1"
                >
                  <Sparkles className="size-2.5" />
                  <span>Active Deployment</span>
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                100% Free CVO Public Service
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Official City Veterinary Office community mission, hybrid slot management, and citizen check-in terminal.
            </DialogDescription>
          </div>
        </div>

        {/* ── Unified 2-Column Command Terminal Layout (No Tabs) ── */}
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ── LEFT COLUMN: Outreach Mission, Capacity, Walk-in Tally & Field Protocols ── */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Deployment Overview & Mission Brief */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  <span>Field Mission Deployment Overview</span>
                </span>
                <span className="text-xs font-mono font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/60">
                  {operation.date}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue & Station</span>
                  <p className="font-semibold text-foreground truncate">{operation.venue || "Barangay Covered Court"}</p>
                  <p className="text-[10.5px] text-muted-foreground">{operation.timeWindow || "08:00 AM - 05:00 PM"}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Lead Veterinarian</span>
                  <p className="font-semibold text-foreground truncate">{operation.lead}</p>
                  <p className="text-[10.5px] text-primary font-medium">{operation.vetProfile?.role || "Field Operations Officer"}</p>
                </div>
              </div>

              {/* Badged Free Services */}
              <div className="space-y-1.5 pt-0.5">
                <span className="text-[10.5px] font-semibold text-muted-foreground">Free Veterinary Services Included Today:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {opServices.includes("consultation") && (
                    <Badge variant="outline" className="text-[10.5px] gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-medium">
                      <Stethoscope className="size-3" /> Clinical Consultation & Checkup
                    </Badge>
                  )}
                  {opServices.includes("vaccination") && (
                    <Badge variant="outline" className="text-[10.5px] gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                      <Syringe className="size-3" /> Anti-Rabies Immunization
                    </Badge>
                  )}
                  {opServices.includes("spay-neuter") && (
                    <Badge variant="outline" className="text-[10.5px] gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-medium">
                      <Scissors className="size-3" /> Free Spay & Neuter (Kapon)
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Hybrid Capacity & Dual-Stream Telemetry */}
            <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary" />
                  <span>Hybrid Slot Allocation & Live Headcount</span>
                </span>
                <span className="font-mono font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  {currentTotal} / {targetSlots} Slots ({pct}%)
                </span>
              </div>

              <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* 3-Part Metric Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-muted/25 border border-border/60 text-center space-y-0.5">
                  <span className="block text-[9.5px] uppercase font-bold tracking-wider text-muted-foreground">
                    Target Quota
                  </span>
                  <span className="text-base font-extrabold text-foreground">{targetSlots}</span>
                  <span className="block text-[9.5px] text-muted-foreground">Maximum Capacity</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center space-y-0.5">
                  <span className="block text-[9.5px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                    Filled Count
                  </span>
                  <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{currentTotal}</span>
                  <span className="block text-[9.5px] text-emerald-700/80 dark:text-emerald-300/80">Total Animals Served</span>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/25 border border-border/60 text-center space-y-0.5">
                  <span className="block text-[9.5px] uppercase font-bold tracking-wider text-muted-foreground">
                    Remaining
                  </span>
                  <span className="text-base font-extrabold text-foreground">
                    {Math.max(0, targetSlots - currentTotal)}
                  </span>
                  <span className="block text-[9.5px] text-muted-foreground">Available Spots</span>
                </div>
              </div>

              {/* Hybrid Model Explanation */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Info className="size-3.5 text-primary shrink-0" />
                  <span>How Hybrid Intake Works:</span>
                </div>
                <p>
                  <strong>1. Registered SyncVet App Users:</strong> Pet owners scan the attendance QR poster using their phone camera to instantly register, verify attendance, and receive an automated clinical entry into their pet&apos;s digital vaccination passport.
                </p>
                <p>
                  <strong>2. Community Walk-ins:</strong> Residents without accounts or smartphones are accommodated directly on-site and tallied via the manual walk-in registry below to maintain accurate barangay public health census.
                </p>
              </div>
            </div>

            {/* 3. Unregistered Walk-in Headcount Tally */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/15 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Plus className="size-3.5 text-primary" />
                    <span>Rapid Walk-in Intake Registry</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Fast on-site tally counter for walk-in barangay residents without SyncVet accounts
                  </p>
                </div>
              </div>

              {isLocked ? (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                  <Lock className="size-4 shrink-0 text-rose-600" />
                  <span>Outreach mission concluded & 24-hour grace period ended. Slot tallies are locked for municipal auditing.</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleIncrement(1)}
                    className="h-8 text-xs font-semibold gap-1 bg-card hover:bg-muted cursor-pointer"
                  >
                    <Plus className="size-3 text-primary" />
                    <span>+1 Walk-in</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleIncrement(5)}
                    className="h-8 text-xs font-semibold gap-1 bg-card hover:bg-muted cursor-pointer"
                  >
                    <Plus className="size-3 text-primary" />
                    <span>+5 Walk-ins</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isUpdating}
                    onClick={() => handleIncrement(10)}
                    className="h-8 text-xs font-semibold gap-1 bg-card hover:bg-muted cursor-pointer"
                  >
                    <Plus className="size-3 text-primary" />
                    <span>+10 Walk-ins</span>
                  </Button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="number"
                      placeholder="Custom count..."
                      value={customWalkinCount}
                      onChange={(e) => setCustomWalkinCount(e.target.value)}
                      className="h-8 text-xs w-32 bg-card"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isUpdating || !customWalkinCount}
                      onClick={handleSetCustomCount}
                      className="h-8 text-xs font-semibold cursor-pointer"
                    >
                      Add Tally
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. On-site Citizen Guidelines & 24h Policy */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border/70 bg-card text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="size-3.5 text-primary" />
                  <span>On-Site Citizen Guidelines</span>
                </span>
                <p className="text-[10.5px] leading-relaxed">
                  • Dogs must be on a leash or harness; cats in secure carriers.
                  <br />• Pets for anti-rabies vaccination must be at least 3 months of age and healthy.
                  <br />• 15-minute post-vaccination observation advised before departure.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-border/70 bg-card text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px]">
                  <AlertCircle className="size-3.5 text-amber-500" />
                  <span>24-Hour Grace Period & Auto-Archive</span>
                </span>
                <p className="text-[10.5px] leading-relaxed">
                  Field staff have 24 hours post-deployment to reconcile paper notes. When the grace window closes, records become permanently locked and bulletin announcements automatically move to pet owners&apos; archived records.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Official Dark Attendance Standee Poster Preview ── */}
          <div className="lg:col-span-5 space-y-3.5">
            <div
              ref={printableRef}
              className="p-5 sm:p-6 rounded-2xl border-2 border-slate-800/80 dark:border-slate-700 bg-card text-center space-y-3.5 shadow-sm select-none"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold tracking-widest uppercase text-primary block">
                  City Veterinary Office • Cagayan de Oro
                </span>
                <h3 className="text-base font-extrabold text-foreground">
                  Barangay {operation.barangay} Outreach
                </h3>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Building2 className="size-3.5 text-primary shrink-0" />
                  <span className="truncate max-w-[240px] font-medium">{operation.venue || "Barangay Covered Court"}</span>
                </div>
                <div className="text-[10.5px] text-muted-foreground">
                  {operation.date} • {operation.timeWindow || "08:00 AM - 05:00 PM"}
                </div>
              </div>

              {/* Crisp Dark QR Code */}
              <div className="p-3.5 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Attendance QR Code"
                    className="size-48 sm:size-52 object-contain"
                  />
                ) : (
                  <div className="size-52 flex items-center justify-center text-xs text-muted-foreground">
                    Generating Standee QR...
                  </div>
                )}
              </div>

              {/* QR Instructions for Citizens */}
              <div className="space-y-1.5 text-left bg-muted/25 p-3 rounded-xl border border-border/60">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-primary" />
                  <span>How to Check-In Digitally:</span>
                </span>
                <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside leading-snug">
                  <li>Open the <strong>SyncVet Pet Owner App</strong> on your mobile phone.</li>
                  <li>Tap the <strong>Scan QR</strong> camera icon on your dashboard.</li>
                  <li>Scan this QR standee to register your attendance and link to your pet&apos;s passport.</li>
                </ol>
              </div>

              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate max-w-[150px]">Vet: {operation.lead}</span>
                <span className="font-mono font-semibold text-foreground">{operation.opId}</span>
              </div>
            </div>

            {/* Staff Deployment Tip */}
            <p className="text-[10.5px] text-muted-foreground text-center leading-tight pt-1">
              Tip for field personnel: Use the download &amp; print icons at the top right to print this standee for the triage reception desk.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
