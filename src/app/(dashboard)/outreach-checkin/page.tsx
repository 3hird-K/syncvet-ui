"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Calendar,
  User,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCVO } from "@/lib/cvo-context";
import { toast } from "sonner";

function OutreachCheckInContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { incrementFieldOpSlots, fieldOperations } = useCVO();

  const rawType = (searchParams.get("type") || "").toLowerCase();
  const opId = searchParams.get("opId") || "";
  const hasOutreachReference = Boolean(opId) || rawType.includes("outreach");
  const barangay = searchParams.get("barangay") || "Cagayan de Oro";
  const dateStr = searchParams.get("date") || "";
  const vet = searchParams.get("vet") || "City Veterinary Staff";
  const venue = searchParams.get("venue") || "Barangay Covered Court";

  const matchedOp = useMemo(
    () => fieldOperations.find((op) => op.opId === opId || op.id === opId) || null,
    [fieldOperations, opId]
  );

  const [recorded, setRecorded] = useState(false);
  const hasCountedRef = useRef(false);
  const [scheduleSettled, setScheduleSettled] = useState(false);

  // Give the field operations query a brief moment to hydrate before declaring
  // an attendance QR unrecognised. This prevents a valid scan from briefly
  // flashing an error while the schedule list is still loading.
  useEffect(() => {
    if (scheduleSettled) return;
    const timer = setTimeout(() => setScheduleSettled(true), 1500);
    return () => clearTimeout(timer);
  }, [scheduleSettled]);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const isDateToday = cleanDate ? cleanDate === todayStr : true;
  const isFutureDate = cleanDate ? cleanDate > todayStr : false;

  const opDate = matchedOp
    ? matchedOp.date.includes("T")
      ? matchedOp.date.split("T")[0]
      : matchedOp.date.trim()
    : cleanDate;
  const isOpToday = opDate ? opDate === todayStr : false;
  const isFutureOp = opDate ? opDate > todayStr : false;

  // A field operation QR is only valid when it maps to a real schedule that is
  // running today and has not been completed or cancelled.
  const isUnknownOperation = hasOutreachReference && scheduleSettled && !matchedOp;
  const isLocked = Boolean(
    matchedOp && (matchedOp.status === "completed" || matchedOp.status === "cancelled")
  );
  const isValidScan = hasOutreachReference && Boolean(matchedOp) && isDateToday && isOpToday && !isLocked;
  const verified = recorded || isValidScan;

  useEffect(() => {
    if (hasCountedRef.current) return;
    if (!isValidScan) return;

    hasCountedRef.current = true;
    incrementFieldOpSlots(opId, 1)
      .then(() => {
        setRecorded(true);
        toast.success("Attendance Counted (+1 Headcount)", {
          description: `Automatically recorded attendance for Barangay ${barangay} Outreach.`,
        });
      })
      .catch((err) => {
        console.error("Error auto-incrementing outreach scan:", err);
      });
  }, [opId, barangay, isValidScan, incrementFieldOpSlots]);

  const heading = !hasOutreachReference
    ? "Wrong QR Code"
    : isUnknownOperation
    ? "Attendance QR Not Recognized"
    : isLocked
    ? "Outreach Concluded"
    : !isDateToday || !isOpToday
    ? "Outreach Check-In Notice"
    : verified
    ? "Attendance Verified!"
    : "Verifying Attendance...";

  const subheading = !hasOutreachReference
    ? "This is a clinic queue QR code, not a field operation attendance QR."
    : isUnknownOperation
    ? "This QR code is not linked to any scheduled field operation."
    : isLocked
    ? "This outreach has concluded and attendance is locked."
    : !isDateToday || !isOpToday
    ? "This attendance station is only active on the scheduled outreach date."
    : "+1 Headcount successfully recorded in live City Veterinary Office deployment census.";

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/80 overflow-hidden rounded-2xl">
        {/* Banner Top */}
        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-center space-y-2">
          <div className="size-16 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center mx-auto shadow-inner border border-white/30">
            {verified ? (
              <CheckCircle2 className="size-9 text-white animate-in zoom-in-75 duration-300" />
            ) : (
              <AlertTriangle className="size-9 text-amber-200" />
            )}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">{heading}</h1>
          <p className="text-xs text-emerald-100 max-w-xs mx-auto">{subheading}</p>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
          {!hasOutreachReference && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Clinic Queue QR Detected</span>
              </span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                This is a clinic queue check-in QR code. It cannot be scanned to record Barangay Outreach
                attendance. Please scan the attendance poster provided by the outreach team.
              </p>
            </div>
          )}

          {isUnknownOperation && (
            <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-900 dark:text-rose-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>No Matching Field Operation</span>
              </span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300/90 leading-relaxed">
                This attendance QR code is not linked to any scheduled field operation, so attendance
                cannot be recorded with it.
              </p>
            </div>
          )}

          {isLocked && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <Lock className="size-4 shrink-0" />
                <span>Attendance Locked</span>
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                The {matchedOp?.opId || "field"} operation in Barangay {matchedOp?.barangay || barangay} has
                concluded. Attendance QR codes are no longer valid.
              </p>
            </div>
          )}

          {hasOutreachReference && !isUnknownOperation && !isLocked && (!isDateToday || !isOpToday) && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>QR Check-in Scheduled for {opDate || cleanDate}</span>
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                {isFutureOp || isFutureDate
                  ? `This outreach visit is scheduled for ${opDate || cleanDate}. Automatic QR attendance scans will unlock on the deployment day.`
                  : `This outreach concluded on ${opDate || cleanDate}. Attendance records are now locked.`}
              </p>
            </div>
          )}

          {/* Outreach Summary */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-foreground">
                Barangay {matchedOp?.barangay || barangay} Outreach
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                {matchedOp?.opId || opId || "NO REFERENCE"}
              </Badge>
            </div>

            <div className="space-y-1 text-muted-foreground text-[11px]">
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span>{matchedOp?.venue || venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-primary shrink-0" />
                <span>Date: {opDate || cleanDate || "Today"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-primary shrink-0" />
                <span>Attending Vet: {matchedOp?.lead || vet}</span>
              </div>
            </div>
          </div>

          {/* Citizen Perks */}
          {verified && (
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>Official 100% Free Public Service</span>
              </span>
              <p className="leading-relaxed">
                Your attendance has been tallied in the live City Veterinary Office records. Please proceed
                to the triage desk to have your pet examined or vaccinated.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center gap-2">
            <Button
              type="button"
              onClick={() => router.push("/pet-owner")}
              className="flex-1 h-9 text-xs font-bold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <span>Go to Pet Owner Dashboard</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OutreachCheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs text-muted-foreground">
          Loading check-in station...
        </div>
      }
    >
      <OutreachCheckInContent />
    </Suspense>
  );
}
