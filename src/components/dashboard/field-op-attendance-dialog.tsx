"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { format, parseISO, isValid } from "date-fns";
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
import { cn, getFieldOpGracePeriod } from "@/lib/utils";
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
  operation: propOp,
}: FieldOpAttendanceDialogProps) {
  const { fieldOperations, incrementFieldOpSlots } = useCVO();
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [customWalkinCount, setCustomWalkinCount] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const printableRef = useRef<HTMLDivElement>(null);

  // Live operation lookup from CVO context
  const liveOp = useMemo(() => {
    if (!propOp) return null;
    return fieldOperations.find((o) => o.id === propOp.id || o.opId === propOp.opId) || propOp;
  }, [fieldOperations, propOp]);

  // Real-time listener for instant count updates across tabs & dialogs
  const [liveVaccinatedCount, setLiveVaccinatedCount] = useState<number | null>(null);

  useEffect(() => {
    setLiveVaccinatedCount(null);
  }, [propOp?.id, propOp?.opId]);

  useEffect(() => {
    const handleUpdate = (e: any) => {
      const detail = e.detail;
      if (
        detail &&
        (detail.id === propOp?.id ||
          detail.opId === propOp?.opId ||
          detail.id === liveOp?.id ||
          detail.opId === liveOp?.opId)
      ) {
        if (typeof detail.petsVaccinated === "number") {
          setLiveVaccinatedCount(detail.petsVaccinated);
        }
      }
    };
    window.addEventListener("syncvet-field-op-updated", handleUpdate);
    return () => {
      window.removeEventListener("syncvet-field-op-updated", handleUpdate);
    };
  }, [propOp?.id, propOp?.opId, liveOp?.id, liveOp?.opId]);

  const operation = liveOp;

  const grace = useMemo(() => {
    return operation ? getFieldOpGracePeriod(operation.date, operation.status) : null;
  }, [operation]);

  const isLocked = grace?.isPastGracePeriod || operation?.status === "completed" || operation?.status === "cancelled";

  const todayStr = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const cleanOpDate = operation?.date ? (operation.date.includes("T") ? operation.date.split("T")[0] : operation.date.trim()) : "";
  const isOpToday = cleanOpDate === todayStr;
  const isOpFuture = cleanOpDate > todayStr;

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
  const currentTotal = liveVaccinatedCount !== null ? liveVaccinatedCount : (operation.petsVaccinated || 0);
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
    if (!isOpToday && !grace?.isGracePeriodActive) {
      toast.error("Outreach Not Active Today", {
        description: isOpFuture
          ? `Headcount can only be recorded on the scheduled deployment date (${operation.date}).`
          : `This outreach concluded on ${operation.date} and is no longer active for walk-in entry.`,
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
        className="w-[96vw] sm:max-w-5xl lg:max-w-6xl max-h-[96vh] overflow-y-auto lg:overflow-hidden no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden p-0 rounded-2xl bg-background border border-border/80 shadow-2xl z-[100] flex flex-col"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        {/* ── Top-right Action Buttons (Print, Download, Close) pinned beside the X icon ── */}
        <div className="absolute right-3.5 top-3.5 z-20 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrint}
            className="flex size-7.5 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
            title="Print Standee Poster"
            aria-label="Print Standee Poster"
          >
            <Printer className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={handleDownloadQr}
            className="flex size-7.5 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
            title="Download QR Image"
            aria-label="Download QR Image"
          >
            <Download className="size-3.5" />
          </button>

          <DialogClose asChild>
            <button
              type="button"
              className="flex size-7.5 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-muted-foreground shadow-2xs transition-all hover:bg-muted hover:text-foreground hover:scale-105 active:scale-95 cursor-pointer"
              title="Close"
              aria-label="Close"
            >
              <X className="size-3.5" />
              <span className="sr-only">Close</span>
            </button>
          </DialogClose>
        </div>

        {/* ── Header ── */}
        <div className="p-3.5 sm:p-4 pb-2.5 bg-muted/20 border-b border-border/70 pr-28 sm:pr-32 shrink-0">
          <div className="space-y-0.5">
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
              ) : isOpToday ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold gap-1"
                >
                  <Sparkles className="size-2.5" />
                  <span>Active Deployment (Today)</span>
                </Badge>
              ) : isOpFuture ? (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold gap-1"
                >
                  <Calendar className="size-2.5" />
                  <span>Scheduled ({operation.date})</span>
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-muted/60 text-muted-foreground border-border/80 font-semibold gap-1"
                >
                  <Clock className="size-2.5" />
                  <span>Concluded</span>
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
                100% Free CVO Public Service
              </Badge>
            </div>
            <DialogDescription className="text-[11.5px] text-muted-foreground">
              Official City Veterinary Office community mission, hybrid slot management, and citizen check-in terminal.
            </DialogDescription>
          </div>
        </div>

        {/* ── Single-Page Command Terminal Layout (Zero Scroll on Desktop) ── */}
        <div className="p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* ── LEFT COLUMN: Outreach Mission, Capacity & Rapid Walk-in Tally ── */}
          <div className="lg:col-span-7 space-y-2.5">
            {/* 1. Deployment Overview & Mission Brief */}
            <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" />
                  <span>Field Mission Deployment Overview</span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
                  {operation.date}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block">Venue & Station</span>
                  <p className="font-semibold text-foreground truncate">{operation.venue || "Barangay Covered Court"}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{operation.timeWindow || "08:00 AM - 05:00 PM"}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/20 border border-border/50">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground block">Lead Veterinarian</span>
                  <p className="font-semibold text-foreground truncate">{operation.lead}</p>
                  <p className="text-[10px] text-primary font-medium truncate">{operation.vetProfile?.role || "Field Operations Officer"}</p>
                </div>
              </div>

              {/* Badged Free Services */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">Services:</span>
                {opServices.includes("consultation") && (
                  <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 font-medium">
                    <Stethoscope className="size-2.5" /> Consultation &amp; Checkup
                  </Badge>
                )}
                {opServices.includes("vaccination") && (
                  <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                    <Syringe className="size-2.5" /> Anti-Rabies Immunization
                  </Badge>
                )}
                {opServices.includes("spay-neuter") && (
                  <Badge variant="outline" className="text-[9.5px] py-0 px-1.5 gap-1 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 font-medium">
                    <Scissors className="size-2.5" /> Free Spay &amp; Neuter
                  </Badge>
                )}
              </div>
            </div>

            {/* 2. Hybrid Capacity & Live Walk-in Headcount Hub (Combined) */}
            <div className="p-3 rounded-xl border border-border/80 bg-card space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11.5px]">
                  <UserCheck className="size-3.5 text-primary" />
                  <span>Hybrid Slot Allocation &amp; Live Headcount</span>
                </span>
                <span className="font-mono font-bold text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                  {currentTotal} / {targetSlots} Slots ({pct}%)
                </span>
              </div>

              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* 3-Part Metric Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-1.5 rounded-lg bg-muted/25 border border-border/60">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Target Quota</span>
                  <span className="text-sm font-extrabold text-foreground">{targetSlots}</span>
                  <span className="block text-[8.5px] text-muted-foreground">Max Capacity</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-300">Filled Count</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{currentTotal}</span>
                  <span className="block text-[8.5px] text-emerald-700/80 dark:text-emerald-300/80">Animals Served</span>
                </div>
                <div className="p-1.5 rounded-lg bg-muted/25 border border-border/60">
                  <span className="block text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Remaining</span>
                  <span className="text-sm font-extrabold text-foreground">{Math.max(0, targetSlots - currentTotal)}</span>
                  <span className="block text-[8.5px] text-muted-foreground">Available Spots</span>
                </div>
              </div>

              {/* Seamless Inline Walk-in Tally Strip */}
              <div className="pt-2 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mr-0.5">Walk-in Tally:</span>
                  {isLocked ? (
                    <span className="text-[10px] text-rose-600 flex items-center gap-1 font-medium">
                      <Lock className="size-3" /> Mission Concluded &amp; Locked
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleIncrement(1)}
                        className="h-7 px-2 text-[11px] font-semibold gap-1 bg-muted/30 hover:bg-muted cursor-pointer"
                      >
                        <Plus className="size-2.5 text-primary" /> +1
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleIncrement(5)}
                        className="h-7 px-2 text-[11px] font-semibold gap-1 bg-muted/30 hover:bg-muted cursor-pointer"
                      >
                        <Plus className="size-2.5 text-primary" /> +5
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => handleIncrement(10)}
                        className="h-7 px-2 text-[11px] font-semibold gap-1 bg-muted/30 hover:bg-muted cursor-pointer"
                      >
                        <Plus className="size-2.5 text-primary" /> +10
                      </Button>
                    </div>
                  )}
                </div>

                {!isLocked && (
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      placeholder="Custom count..."
                      value={customWalkinCount}
                      onChange={(e) => setCustomWalkinCount(e.target.value)}
                      className="h-7 text-xs w-28 bg-muted/20"
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={isUpdating || !customWalkinCount}
                      onClick={handleSetCustomCount}
                      className="h-7 px-2.5 text-xs font-semibold cursor-pointer"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Compact Guidelines & Grace Window */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl border border-border/60 bg-muted/15 text-muted-foreground space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1 text-[10.5px]">
                  <ShieldCheck className="size-3 text-primary" />
                  <span>Citizen Protocols</span>
                </span>
                <p className="text-[10px] leading-relaxed">
                  Dogs on leash/harness, cats in carriers. Pets for rabies must be healthy &amp; ≥3 mos old.
                </p>
              </div>
              <div className="p-2.5 rounded-xl border border-border/60 bg-muted/15 text-muted-foreground space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1 text-[10.5px]">
                  <AlertCircle className="size-3 text-amber-500" />
                  <span>24h Grace Period</span>
                </span>
                <p className="text-[10px] leading-relaxed">
                  Staff have 24 hours post-mission to reconcile notes before automatic locking &amp; archiving.
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Official Dark Attendance Standee Poster Preview ── */}
          <div className="lg:col-span-5 space-y-2">
            {!isOpToday && (
              <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] leading-tight">
                  {isOpFuture
                    ? `Standee scheduled for ${operation.date}. Citizen check-in scans unlock on event day.`
                    : `Outreach concluded on ${operation.date}. QR code is now expired.`}
                </span>
              </div>
            )}

            <div
              ref={printableRef}
              className="p-3 sm:p-3.5 rounded-2xl border-2 border-slate-800/80 dark:border-slate-700 bg-card text-center space-y-2 shadow-sm select-none"
            >
              <div className="space-y-0.5">
                <span className="text-[9px] font-extrabold tracking-widest uppercase text-primary block">
                  City Veterinary Office • Cagayan de Oro
                </span>
                <h3 className="text-sm font-extrabold text-foreground truncate">
                  Barangay {operation.barangay} Outreach
                </h3>
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="size-3 text-primary shrink-0" />
                  <span className="truncate max-w-[200px] font-medium text-[11px]">{operation.venue || "Barangay Covered Court"}</span>
                </div>
                <div className="flex items-center justify-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-muted-foreground">{operation.date} • {operation.timeWindow || "08:00 AM - 05:00 PM"}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] py-0 px-1.5 font-semibold",
                      isOpToday
                        ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                        : "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                    )}
                  >
                    {isOpToday ? "✓ Valid to Scan Today" : `Valid on ${operation.date} Only`}
                  </Badge>
                </div>
              </div>

              {/* Crisp Dark QR Code - sized to 135px/145px for single-page zero scroll */}
              <div className="p-2 bg-white rounded-xl border-2 border-slate-900 shadow-sm inline-block">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Attendance QR Code"
                    className="size-32 sm:size-36 object-contain"
                  />
                ) : (
                  <div className="size-32 sm:size-36 flex items-center justify-center text-xs text-muted-foreground">
                    Generating Standee QR...
                  </div>
                )}
              </div>

              {/* QR Instructions for Citizens - compact 2-line layout */}
              <div className="text-left bg-muted/25 p-2 rounded-xl border border-border/60 space-y-0.5">
                <span className="text-[10.5px] font-bold text-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3 text-primary" />
                  <span>Pet Owner Digital Check-In:</span>
                </span>
                <p className="text-[9.5px] text-muted-foreground leading-snug">
                  Open <strong>SyncVet Pet Owner App</strong> → Tap <strong>Scan QR</strong> camera icon → Scan this standee to record attendance &amp; sync pet passport.
                </p>
              </div>

              <div className="pt-1 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate max-w-[130px]">Vet: {operation.lead}</span>
                <span className="font-mono font-semibold text-foreground">{operation.opId}</span>
              </div>
            </div>

            {/* Staff Deployment Tip */}
            <p className="text-[10px] text-muted-foreground text-center leading-tight">
              Tip for field personnel: Use the download &amp; print icons at top right for the reception standee.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
