"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import {
  CheckCircle2,
  Building2,
  Calendar,
  Sparkles,
  User,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  Clock,
  Heart,
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

  const opId = searchParams.get("opId") || "FO-2026-OUTREACH";
  const barangay = searchParams.get("barangay") || "Cagayan de Oro";
  const dateStr = searchParams.get("date") || "";
  const vet = searchParams.get("vet") || "City Veterinary Staff";
  const venue = searchParams.get("venue") || "Barangay Covered Court";

  const [recorded, setRecorded] = useState(false);
  const hasCountedRef = useRef(false);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const cleanDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr.trim();
  const isDateToday = cleanDate ? cleanDate === todayStr : true;
  const isFutureDate = cleanDate ? cleanDate > todayStr : false;

  useEffect(() => {
    if (hasCountedRef.current) return;
    if (!isDateToday) return;

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
  }, [opId, barangay, isDateToday, incrementFieldOpSlots]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl border-border/80 overflow-hidden rounded-2xl">
        {/* Banner Top */}
        <div className="p-6 bg-gradient-to-br from-emerald-600 to-teal-700 text-white text-center space-y-2">
          <div className="size-16 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center mx-auto shadow-inner border border-white/30">
            {isDateToday ? (
              <CheckCircle2 className="size-9 text-white animate-in zoom-in-75 duration-300" />
            ) : (
              <AlertTriangle className="size-9 text-amber-200" />
            )}
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            {isDateToday ? "Attendance Verified!" : "Outreach Check-In Notice"}
          </h1>
          <p className="text-xs text-emerald-100 max-w-xs mx-auto">
            {isDateToday
              ? "+1 Headcount successfully recorded in live City Veterinary Office deployment census."
              : "This attendance station is only active on the scheduled outreach date."}
          </p>
        </div>

        <CardContent className="p-5 sm:p-6 space-y-4 text-xs">
          {!isDateToday && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0" />
                <span>QR Check-in Scheduled for {cleanDate}</span>
              </span>
              <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                {isFutureDate
                  ? `This outreach visit is scheduled for ${cleanDate}. Automatic QR attendance scans will unlock on the deployment day.`
                  : `This outreach concluded on ${cleanDate}. Attendance records are now locked.`}
              </p>
            </div>
          )}

          {/* Outreach Summary */}
          <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sm text-foreground">
                Barangay {barangay} Outreach
              </span>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary bg-primary/10">
                {opId}
              </Badge>
            </div>

            <div className="space-y-1 text-muted-foreground text-[11px]">
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 text-primary shrink-0" />
                <span>{venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-primary shrink-0" />
                <span>Date: {cleanDate || "Today"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="size-3.5 text-primary shrink-0" />
                <span>Attending Vet: {vet}</span>
              </div>
            </div>
          </div>

          {/* Citizen Perks */}
          <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-300 text-[11px] space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>Official 100% Free Public Service</span>
            </span>
            <p className="leading-relaxed">
              Your attendance has been tallied in the live City Veterinary Office records. Please proceed to the triage desk to have your pet examined or vaccinated.
            </p>
          </div>

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

